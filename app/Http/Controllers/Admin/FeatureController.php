<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Feature;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class FeatureController extends Controller
{
    public function index(Request $request): Response
    {
        $features = Feature::withCount('plans')
            ->orderBy('category')
            ->orderBy('name')
            ->get()
            ->groupBy('category');

        return Inertia::render('Admin/Features/Index', [
            'featuresByCategory' => $features,
            'categories' => [
                'core' => 'Core Capabilities',
                'clinical' => 'Clinical & Documentation',
                'practice_management' => 'Practice Management',
                'communication' => 'Client Communication & Portal',
                'advanced' => 'Advanced & Enterprise',
                'compliance' => 'Compliance & Security',
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'key' => ['required', 'string', 'max:50', 'unique:features,key'],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'category' => ['required', 'string', 'max:50'],
            'is_implemented' => ['required', 'boolean'],
        ]);

        $validated['key'] = Str::snake(strtolower($validated['key']));

        $feature = Feature::create($validated);

        AuditEvent::create([
            'user_id' => $request->user()?->id,
            'action' => 'feature.created',
            'resource_type' => Feature::class,
            'resource_id' => $feature->id,
            'ip_address' => $request->ip(),
            'metadata' => $validated,
        ]);

        return back()->with('success', "Feature {$feature->name} added to catalog.");
    }

    public function update(Request $request, Feature $feature): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'category' => ['required', 'string', 'max:50'],
            'is_implemented' => ['required', 'boolean'],
        ]);

        $oldValues = $feature->only(['name', 'description', 'category', 'is_implemented']);

        $feature->update($validated);

        AuditEvent::create([
            'user_id' => $request->user()?->id,
            'action' => 'feature.updated',
            'resource_type' => Feature::class,
            'resource_id' => $feature->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'old' => $oldValues,
                'new' => $validated,
            ],
        ]);

        return back()->with('success', "Feature {$feature->name} updated.");
    }

    public function destroy(Feature $feature): RedirectResponse
    {
        $plansCount = $feature->plans()->count();
        if ($plansCount > 0) {
            $feature->plans()->detach();
        }

        $featureName = $feature->name;
        $featureId = $feature->id;
        $feature->delete();

        AuditEvent::create([
            'user_id' => auth()->id(),
            'action' => 'feature.deleted',
            'resource_type' => Feature::class,
            'resource_id' => $featureId,
            'ip_address' => request()->ip(),
            'metadata' => ['deleted_feature_name' => $featureName],
        ]);

        return back()->with('success', "Feature {$featureName} removed.");
    }
}
