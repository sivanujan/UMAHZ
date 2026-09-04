<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionTierConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Cashier;

class SubscriptionPlanController extends Controller
{
    /**
     * Display a listing of the subscription tiers & pricing for editing.
     */
    public function index(): Response
    {
        $tiers = SubscriptionTierConfig::allTiers();

        return Inertia::render('Admin/Plans/Index', [
            'tiers' => array_values($tiers),
        ]);
    }

    /**
     * Update the specified subscription tier.
     */
    public function update(Request $request, string $tier): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'base_price' => ['required', 'numeric', 'min:0', 'max:99999.99'],
            'included_full_time' => ['required', 'integer', 'min:1', 'max:100'],
            'max_practitioners' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'max_appointments_per_month' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'allows_addons' => ['required', 'boolean'],
            'addon_price_ft' => ['required', 'numeric', 'min:0', 'max:9999.99'],
            'addon_price_pt' => ['required', 'numeric', 'min:0', 'max:9999.99'],
            'stripe_price_id' => ['nullable', 'string', 'max:255'],
            'stripe_addon_price_ft_id' => ['nullable', 'string', 'max:255'],
            'stripe_addon_price_pt_id' => ['nullable', 'string', 'max:255'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'badge' => ['nullable', 'string', 'max:50'],
        ]);

        // Clean features array (remove empty rows)
        if (isset($validated['features'])) {
            $validated['features'] = array_values(array_filter(array_map('trim', $validated['features'])));
        }

        $tierRecord = SubscriptionTierConfig::updateOrCreate(
            ['tier' => $tier],
            $validated
        );

        SubscriptionTierConfig::clearTierCache();

        return back()->with('success', "{$tierRecord->name} plan updated successfully.");
    }

    /**
     * Remove the specified subscription tier.
     */
    public function destroy(string $tier): RedirectResponse
    {
        $tierConfig = SubscriptionTierConfig::where('tier', $tier)->first();
        $name = $tierConfig ? $tierConfig->name : ucfirst($tier);

        if ($tierConfig) {
            $tierConfig->delete();
        }

        SubscriptionTierConfig::clearTierCache();

        return redirect()->route('admin.plans.index')->with('success', "{$name} plan removed successfully.");
    }
}
