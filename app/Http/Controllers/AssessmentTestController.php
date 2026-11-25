<?php

namespace App\Http\Controllers;

use App\Models\AssessmentTest;
use App\Models\AuditEvent;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AssessmentTestController extends Controller
{
    /**
     * Browse clinical assessment tests (reviewed platform tests + clinic's own tests).
     */
    public function index(Request $request): Response
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 404);

        $regionFilter = $request->query('body_region', $request->query('region', 'all'));
        $disciplineFilter = $request->query('discipline', 'all');
        $search = trim((string) $request->query('search', ''));

        $baseQuery = AssessmentTest::visibleToPractitioner($tenantId);

        if ($disciplineFilter !== 'all' && array_key_exists($disciplineFilter, AssessmentTest::DISCIPLINES)) {
            $baseQuery->whereRaw('CAST(disciplines AS TEXT) ILIKE ?', ["%\"{$disciplineFilter}\"%"]);
        }

        if ($search !== '') {
            $baseQuery->where(function ($q) use ($search) {
                $lower = mb_strtolower($search);
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('LOWER(purpose) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('LOWER(positive_finding) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('CAST(aliases AS TEXT) ILIKE ?', ["%{$search}%"]);
            });
        }

        // Per-region counts for the current discipline/search filters
        $regionCounts = [];
        $counts = (clone $baseQuery)
            ->selectRaw('body_region, count(*) as count')
            ->groupBy('body_region')
            ->pluck('count', 'body_region');

        $totalTests = 0;
        foreach (AssessmentTest::BODY_REGIONS as $key => $label) {
            $cnt = (int) ($counts[$key] ?? 0);
            $regionCounts[$key] = $cnt;
            $totalTests += $cnt;
        }

        $query = (clone $baseQuery)
            ->orderBy('body_region')
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($regionFilter !== 'all' && array_key_exists($regionFilter, AssessmentTest::BODY_REGIONS)) {
            $query->where('body_region', $regionFilter);
        }

        $tests = $query->paginate(24)->through(fn (AssessmentTest $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'body_region' => $t->body_region,
            'body_region_label' => $t->bodyRegionLabel(),
            'aliases' => $t->aliases ?? [],
            'purpose' => $t->purpose,
            'procedure' => $t->procedure,
            'positive_finding' => $t->positive_finding,
            'interpretation_notes' => $t->interpretation_notes,
            'disciplines' => $t->disciplines ?? [],
            'image_path' => $t->image_path,
            'video_url' => $t->video_url,
            'references' => $t->references,
            'status' => $t->status,
            'is_custom' => ! $t->isPlatform(),
            'can_edit' => ! $t->isPlatform() && $t->tenant_id === $tenantId,
        ]);

        return Inertia::render('Tests/Index', [
            'tests' => $tests,
            'filters' => [
                'body_region' => $regionFilter,
                'discipline' => $disciplineFilter,
                'search' => $search,
            ],
            'bodyRegions' => AssessmentTest::bodyRegionsList(),
            'regionCounts' => $regionCounts,
            'disciplines' => AssessmentTest::disciplinesList(),
            'totalTests' => $totalTests,
        ]);
    }

    /**
     * Create a clinic-specific assessment test.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'body_region' => ['required', 'string', Rule::in(array_keys(AssessmentTest::BODY_REGIONS))],
            'aliases' => ['nullable', 'array'],
            'aliases.*' => ['string', 'max:255'],
            'purpose' => ['required', 'string', 'max:5000'],
            'procedure' => ['required', 'string', 'max:10000'],
            'positive_finding' => ['required', 'string', 'max:5000'],
            'interpretation_notes' => ['nullable', 'string', 'max:5000'],
            'disciplines' => ['nullable', 'array'],
            'references' => ['nullable', 'string', 'max:5000'],
            'video_url' => ['nullable', 'url', 'max:500'],
        ]);

        $test = AssessmentTest::create([
            'tenant_id' => $tenantId,
            'body_region' => $validated['body_region'],
            'name' => trim($validated['name']),
            'aliases' => array_values(array_filter($validated['aliases'] ?? [])),
            'purpose' => trim($validated['purpose']),
            'procedure' => trim($validated['procedure']),
            'positive_finding' => trim($validated['positive_finding']),
            'interpretation_notes' => ! empty($validated['interpretation_notes']) ? trim($validated['interpretation_notes']) : null,
            'disciplines' => array_values(array_filter($validated['disciplines'] ?? [])),
            'references' => ! empty($validated['references']) ? trim($validated['references']) : null,
            'video_url' => ! empty($validated['video_url']) ? trim($validated['video_url']) : null,
            'status' => AssessmentTest::STATUS_REVIEWED, // Clinic's own tests are immediately active for their practitioners
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'assessment_test.created',
            'resource_type' => AssessmentTest::class,
            'resource_id' => $test->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'name' => $test->name,
                'body_region' => $test->body_region,
                'is_clinic_custom' => true,
            ],
        ]);

        return back()->with('success', "Clinic assessment test '{$test->name}' created.");
    }

    /**
     * Update clinic's own assessment test.
     */
    public function update(Request $request, AssessmentTest $test): RedirectResponse
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId && $test->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'body_region' => ['required', 'string', Rule::in(array_keys(AssessmentTest::BODY_REGIONS))],
            'aliases' => ['nullable', 'array'],
            'aliases.*' => ['string', 'max:255'],
            'purpose' => ['required', 'string', 'max:5000'],
            'procedure' => ['required', 'string', 'max:10000'],
            'positive_finding' => ['required', 'string', 'max:5000'],
            'interpretation_notes' => ['nullable', 'string', 'max:5000'],
            'disciplines' => ['nullable', 'array'],
            'references' => ['nullable', 'string', 'max:5000'],
            'video_url' => ['nullable', 'url', 'max:500'],
        ]);

        $test->update([
            'body_region' => $validated['body_region'],
            'name' => trim($validated['name']),
            'aliases' => array_values(array_filter($validated['aliases'] ?? [])),
            'purpose' => trim($validated['purpose']),
            'procedure' => trim($validated['procedure']),
            'positive_finding' => trim($validated['positive_finding']),
            'interpretation_notes' => ! empty($validated['interpretation_notes']) ? trim($validated['interpretation_notes']) : null,
            'disciplines' => array_values(array_filter($validated['disciplines'] ?? [])),
            'references' => ! empty($validated['references']) ? trim($validated['references']) : null,
            'video_url' => ! empty($validated['video_url']) ? trim($validated['video_url']) : null,
        ]);

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'assessment_test.updated',
            'resource_type' => AssessmentTest::class,
            'resource_id' => $test->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'name' => $test->name,
            ],
        ]);

        return back()->with('success', "Assessment test '{$test->name}' updated.");
    }

    /**
     * Delete clinic's own assessment test.
     */
    public function destroy(Request $request, AssessmentTest $test): RedirectResponse
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId && $test->tenant_id === $tenantId, 404);

        $name = $test->name;
        $test->delete();

        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()->id,
            'action' => 'assessment_test.deleted',
            'resource_type' => AssessmentTest::class,
            'resource_id' => $test->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'name' => $name,
            ],
        ]);

        return back()->with('success', "Assessment test '{$name}' deleted.");
    }

    /**
     * Quick search/lookup endpoint for the clinical note test picker.
     */
    public function lookup(Request $request): JsonResponse
    {
        $tenantId = TenantScope::getTenantId();
        abort_unless($tenantId, 404);

        $region = $request->query('body_region');
        $search = trim((string) $request->query('query', ''));

        $query = AssessmentTest::visibleToPractitioner($tenantId)
            ->orderBy('name');

        if ($region && array_key_exists($region, AssessmentTest::BODY_REGIONS)) {
            $query->where('body_region', $region);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $lower = mb_strtolower($search);
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('LOWER(purpose) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('CAST(aliases AS TEXT) ILIKE ?', ["%{$search}%"]);
            });
        }

        $tests = $query->limit(50)->get()->map(fn (AssessmentTest $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'body_region' => $t->body_region,
            'body_region_label' => $t->bodyRegionLabel(),
            'aliases' => $t->aliases ?? [],
            'purpose' => $t->purpose,
            'procedure' => $t->procedure,
            'positive_finding' => $t->positive_finding,
            'interpretation_notes' => $t->interpretation_notes,
            'is_custom' => ! $t->isPlatform(),
        ]);

        return response()->json($tests);
    }
}
