<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AddOn;
use App\Models\AuditEvent;
use App\Models\TenantAddOn;
use App\Services\StripeSubscriptionSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AddOnController extends Controller
{
    public function __construct(private readonly StripeSubscriptionSyncService $syncService)
    {
    }

    public function index(Request $request): Response
    {
        $addOns = AddOn::withCount(['tenantAddOns as active_subscribers_count' => function ($q) {
            $q->where('status', 'active')->where('quantity', '>', 0);
        }])
            ->get()
            ->map(fn (AddOn $addOn) => [
                'id' => $addOn->id,
                'name' => $addOn->name,
                'slug' => $addOn->slug,
                'pricing_type' => $addOn->pricing_type,
                'price_monthly' => (float) $addOn->price_monthly,
                'price_annual' => (float) $addOn->price_annual,
                'is_active' => (bool) $addOn->is_active,
                'description' => $addOn->description,
                'stripe_product_id' => $addOn->stripe_product_id,
                'stripe_price_monthly_id' => $addOn->stripe_price_monthly_id,
                'stripe_price_annual_id' => $addOn->stripe_price_annual_id,
                'has_stripe_sync' => ! empty($addOn->stripe_product_id) && ! empty($addOn->stripe_price_monthly_id),
                'active_subscribers_count' => $addOn->active_subscribers_count,
            ]);

        return Inertia::render('Admin/AddOns/Index', [
            'addOns' => $addOns,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['nullable', 'string', 'max:50', 'unique:add_ons,slug'],
            'pricing_type' => ['required', 'string', 'in:flat_monthly,per_seat,usage_metered'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_annual' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
        ]);

        $slug = ! empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);

        $addOn = AddOn::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'pricing_type' => $validated['pricing_type'],
            'price_monthly' => $validated['price_monthly'],
            'price_annual' => $validated['price_annual'],
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'],
            'needs_review' => false,
            'needs_review_fields' => [],
        ]);

        try {
            $this->syncService->syncAddOn($addOn);
        } catch (\Throwable $e) {
            report($e);
        }

        AuditEvent::create([
            'user_id' => $request->user()?->id,
            'action' => 'addon.created',
            'resource_type' => AddOn::class,
            'resource_id' => $addOn->id,
            'ip_address' => $request->ip(),
            'metadata' => $validated,
        ]);

        return back()->with('success', "Add-on {$addOn->name} created successfully.");
    }

    public function update(Request $request, AddOn $addOn): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'pricing_type' => ['required', 'string', 'in:flat_monthly,per_seat,usage_metered'],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'price_annual' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
        ]);

        $oldValues = $addOn->only(['name', 'price_monthly', 'price_annual', 'is_active', 'pricing_type', 'description']);

        // Check if price changed
        $monthlyChanged = (float) $addOn->price_monthly !== (float) $validated['price_monthly'];
        $annualChanged = (float) $addOn->price_annual !== (float) $validated['price_annual'];

        $addOn->update($validated);

        if ($monthlyChanged || $annualChanged) {
            // Reset Stripe price IDs to generate new ones upon sync (grandfathering)
            if ($monthlyChanged) {
                $addOn->update(['stripe_price_monthly_id' => null]);
            }
            if ($annualChanged) {
                $addOn->update(['stripe_price_annual_id' => null]);
            }
        }

        try {
            $this->syncService->syncAddOn($addOn);
        } catch (\Throwable $e) {
            report($e);
        }

        AuditEvent::create([
            'user_id' => $request->user()?->id,
            'action' => 'addon.updated',
            'resource_type' => AddOn::class,
            'resource_id' => $addOn->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'old' => $oldValues,
                'new' => $validated,
                'price_changed' => $monthlyChanged || $annualChanged,
            ],
        ]);

        return back()->with('success', "Add-on {$addOn->name} updated successfully.");
    }

    public function syncStripe(AddOn $addOn): RedirectResponse
    {
        try {
            $this->syncService->syncAddOn($addOn);

            AuditEvent::create([
                'user_id' => auth()->id(),
                'action' => 'addon.stripe_synced',
                'resource_type' => AddOn::class,
                'resource_id' => $addOn->id,
                'ip_address' => request()->ip(),
                'metadata' => ['addon_name' => $addOn->name],
            ]);

            return back()->with('success', "Add-on {$addOn->name} synced with Stripe.");
        } catch (\Throwable $e) {
            report($e);
            return back()->withErrors(['stripe_sync' => "Failed to sync add-on: {$e->getMessage()}"]);
        }
    }
}
