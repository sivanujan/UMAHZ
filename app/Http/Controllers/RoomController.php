<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Location;
use App\Models\Room;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Rooms belong to one location and one tenant. Both the parent {location} and
 * the {room} are tenant-scoped by the BelongsToTenant global scope, so nesting
 * stays safe across clinics. Owner-only via route middleware.
 */
class RoomController extends Controller
{
    public function store(Request $request, Location $location): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $location, $data) {
            // create() through the relation sets location_id; tenant_id is
            // auto-assigned by BelongsToTenant.
            $room = $location->rooms()->create($data);
            $this->audit($request, 'room.created', $room);
        });

        return back()->with('success', "Room \"{$data['name']}\" added.");
    }

    public function update(Request $request, Room $room): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $room, $data) {
            $room->update($data);
            $this->audit($request, 'room.updated', $room);
        });

        return back()->with('success', 'Room updated.');
    }

    public function toggle(Request $request, Room $room): RedirectResponse
    {
        DB::transaction(function () use ($request, $room) {
            $room->update(['is_active' => ! $room->is_active]);
            $this->audit($request, $room->is_active ? 'room.reactivated' : 'room.deactivated', $room);
        });

        return back()->with('success', $room->is_active
            ? "Room \"{$room->name}\" reactivated."
            : "Room \"{$room->name}\" deactivated.");
    }

    public function destroy(Request $request, Room $room): RedirectResponse
    {
        if (Appointment::where('room_id', $room->id)->exists()) {
            return back()->withErrors(['room' => 'This room has appointment history and can\'t be deleted. Deactivate it instead.']);
        }

        $name = $room->name;

        DB::transaction(function () use ($request, $room) {
            $this->audit($request, 'room.deleted', $room);
            $room->delete();
        });

        return back()->with('success', "Room \"{$name}\" deleted.");
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    protected function audit(Request $request, string $action, Room $room): void
    {
        AuditEvent::create([
            'tenant_id' => TenantScope::getTenantId(),
            'user_id' => $request->user()->id,
            'action' => $action,
            'resource_type' => Room::class,
            'resource_id' => $room->id,
            'ip_address' => $request->ip(),
        ]);
    }
}
