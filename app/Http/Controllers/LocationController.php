<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Location;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Locations for the current clinic. Every query and mutation is scoped to the
 * active tenant automatically by the BelongsToTenant global scope (route-model
 * binding included), so a clinic can never see or touch another's locations.
 * Owner-only via the staff.role:clinic_owner middleware on the routes.
 */
class LocationController extends Controller
{
    public function index(Request $request): Response
    {
        $locations = Location::query()
            ->withCount([
                'rooms',
                'rooms as active_rooms_count' => fn ($q) => $q->where('is_active', true),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Location $location) => $this->summary($location));

        return Inertia::render('Locations/Index', [
            'locations' => $locations,
            'timezones' => timezone_identifiers_list(),
            'provinces' => \App\Support\ClinicOptions::PROVINCES,
        ]);
    }

    public function show(Request $request, Location $location): Response
    {
        $rooms = $location->rooms()
            ->orderBy('name')
            ->get()
            ->map(fn ($room) => [
                'id' => $room->id,
                'name' => $room->name,
                'description' => $room->description,
                'is_active' => $room->is_active,
            ]);

        return Inertia::render('Locations/Show', [
            'location' => [
                'id' => $location->id,
                'name' => $location->name,
                'address' => $location->address,
                'phone' => $location->phone,
                'timezone' => $location->timezone,
                'is_active' => $location->is_active,
            ],
            'rooms' => $rooms,
            'timezones' => timezone_identifiers_list(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $data) {
            $location = Location::create($data); // tenant_id auto-assigned by BelongsToTenant
            $this->audit($request, 'location.created', $location);
        });

        return back()->with('success', "Location \"{$data['name']}\" created.");
    }

    public function update(Request $request, Location $location): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $location, $data) {
            $location->update($data);
            $this->audit($request, 'location.updated', $location);
        });

        return back()->with('success', 'Location updated.');
    }

    /**
     * Flip active/inactive. Deactivating is the safe way to retire a location:
     * it hides it from new bookings without touching existing references.
     */
    public function toggle(Request $request, Location $location): RedirectResponse
    {
        DB::transaction(function () use ($request, $location) {
            $location->update(['is_active' => ! $location->is_active]);
            $this->audit($request, $location->is_active ? 'location.reactivated' : 'location.deactivated', $location);
        });

        return back()->with('success', $location->is_active
            ? "Location \"{$location->name}\" reactivated."
            : "Location \"{$location->name}\" deactivated.");
    }

    /**
     * Hard delete — only when it leaves nothing dangling. A location with rooms
     * or appointment history is blocked and the operator is steered to
     * deactivate instead, so history is never silently cascaded away.
     */
    public function destroy(Request $request, Location $location): RedirectResponse
    {
        if ($location->rooms()->exists()) {
            return back()->withErrors(['location' => 'Remove this location\'s rooms first, or deactivate it instead of deleting.']);
        }

        if (Appointment::where('location_id', $location->id)->exists()) {
            return back()->withErrors(['location' => 'This location has appointment history and can\'t be deleted. Deactivate it instead.']);
        }

        $name = $location->name;

        DB::transaction(function () use ($request, $location) {
            $this->audit($request, 'location.deleted', $location);
            $location->delete();
        });

        return redirect('/app/locations')->with('success', "Location \"{$name}\" deleted.");
    }

    protected function summary(Location $location): array
    {
        return [
            'id' => $location->id,
            'name' => $location->name,
            'address' => $location->address,
            'latitude' => $location->latitude,
            'longitude' => $location->longitude,
            'phone' => $location->phone,
            'timezone' => $location->timezone,
            'is_active' => $location->is_active,
            'rooms_count' => $location->rooms_count,
            'active_rooms_count' => $location->active_rooms_count,
        ];
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'address' => ['nullable', 'string', 'max:2000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'phone' => ['nullable', 'string', 'max:50'],
            'timezone' => ['required', 'string', Rule::in(timezone_identifiers_list())],
        ]);
    }

    protected function audit(Request $request, string $action, Location $location): void
    {
        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => Location::class,
            'resource_id' => $location->id,
            'ip_address' => $request->ip(),
        ]);
    }
}
