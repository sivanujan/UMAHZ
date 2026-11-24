<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AssessmentTest;
use App\Models\AuditEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssessmentTestController extends Controller
{
    /**
     * Display the platform clinical assessment test library.
     */
    public function index(Request $request): Response
    {
        $statusFilter = $request->query('status', 'all');
        $regionFilter = $request->query('body_region', 'all');
        $search = trim((string) $request->query('search', ''));

        $query = AssessmentTest::platform()
            ->with('reviewer:id,name,email')
            ->orderBy('body_region')
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($statusFilter !== 'all' && in_array($statusFilter, [
            AssessmentTest::STATUS_DRAFT,
            AssessmentTest::STATUS_REVIEWED,
            AssessmentTest::STATUS_ARCHIVED,
        ], true)) {
            $query->where('status', $statusFilter);
        }

        if ($regionFilter !== 'all' && array_key_exists($regionFilter, AssessmentTest::BODY_REGIONS)) {
            $query->where('body_region', $regionFilter);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $lower = mb_strtolower($search);
                $q->whereRaw('LOWER(name) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('LOWER(purpose) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('LOWER(positive_finding) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('CAST(aliases AS TEXT) ILIKE ?', ["%{$search}%"]);
            });
        }

        $tests = $query->paginate(25)->through(fn (AssessmentTest $t) => [
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
            'reviewed_by' => $t->reviewer ? [
                'id' => $t->reviewer->id,
                'name' => $t->reviewer->name,
            ] : null,
            'reviewed_at' => $t->reviewed_at?->format('M j, Y H:i'),
            'created_at' => $t->created_at->format('M j, Y'),
        ]);

        $stats = [
            'total' => AssessmentTest::platform()->count(),
            'draft' => AssessmentTest::platform()->where('status', AssessmentTest::STATUS_DRAFT)->count(),
            'reviewed' => AssessmentTest::platform()->where('status', AssessmentTest::STATUS_REVIEWED)->count(),
            'archived' => AssessmentTest::platform()->where('status', AssessmentTest::STATUS_ARCHIVED)->count(),
        ];

        return Inertia::render('Admin/Tests/Index', [
            'tests' => $tests,
            'stats' => $stats,
            'filters' => [
                'status' => $statusFilter,
                'body_region' => $regionFilter,
                'search' => $search,
            ],
            'bodyRegions' => AssessmentTest::BODY_REGIONS,
            'disciplines' => AssessmentTest::DISCIPLINES,
        ]);
    }

    /**
     * Create a new platform assessment test.
     */
    public function store(Request $request): RedirectResponse
    {
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
            'status' => ['required', 'string', Rule::in([AssessmentTest::STATUS_DRAFT, AssessmentTest::STATUS_REVIEWED])],
        ]);

        $status = $validated['status'];
        $reviewedBy = null;
        $reviewedAt = null;

        if ($status === AssessmentTest::STATUS_REVIEWED) {
            $reviewedBy = $request->user()->id;
            $reviewedAt = now();
        }

        $test = AssessmentTest::create([
            'tenant_id' => null,
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
            'status' => $status,
            'reviewed_by' => $reviewedBy,
            'reviewed_at' => $reviewedAt,
        ]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'action' => 'assessment_test.created',
            'resource_type' => AssessmentTest::class,
            'resource_id' => $test->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'name' => $test->name,
                'body_region' => $test->body_region,
                'status' => $test->status,
            ],
        ]);

        return back()->with('success', "Assessment test '{$test->name}' created successfully.");
    }

    /**
     * Update an existing platform assessment test.
     */
    public function update(Request $request, AssessmentTest $test): RedirectResponse
    {
        abort_unless($test->isPlatform(), 404);

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
            'status' => ['required', 'string', Rule::in([
                AssessmentTest::STATUS_DRAFT,
                AssessmentTest::STATUS_REVIEWED,
                AssessmentTest::STATUS_ARCHIVED,
            ])],
        ]);

        $status = $validated['status'];
        $reviewedBy = $test->reviewed_by;
        $reviewedAt = $test->reviewed_at;

        if ($status === AssessmentTest::STATUS_REVIEWED && $test->status !== AssessmentTest::STATUS_REVIEWED) {
            $reviewedBy = $request->user()->id;
            $reviewedAt = now();
        }

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
            'status' => $status,
            'reviewed_by' => $reviewedBy,
            'reviewed_at' => $reviewedAt,
        ]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'action' => 'assessment_test.updated',
            'resource_type' => AssessmentTest::class,
            'resource_id' => $test->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'name' => $test->name,
                'status' => $test->status,
            ],
        ]);

        return back()->with('success', "Assessment test '{$test->name}' updated.");
    }

    /**
     * Mark an assessment test as reviewed.
     */
    public function review(Request $request, AssessmentTest $test): RedirectResponse
    {
        abort_unless($test->isPlatform(), 404);

        $validated = $request->validate([
            'reviewer_name' => ['nullable', 'string', 'max:255'],
            'reviewer_credential' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $reviewerName = ! empty($validated['reviewer_name']) ? trim($validated['reviewer_name']) : $user->name;
        $reviewerCredential = ! empty($validated['reviewer_credential']) ? trim($validated['reviewer_credential']) : null;

        $test->update([
            'status' => AssessmentTest::STATUS_REVIEWED,
            'reviewed_by' => $user->id,
            'reviewer_name' => $reviewerName,
            'reviewer_credential' => $reviewerCredential,
            'reviewed_at' => now(),
        ]);

        AuditEvent::create([
            'user_id' => $user->id,
            'action' => 'assessment_test.reviewed',
            'resource_type' => AssessmentTest::class,
            'resource_id' => $test->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'name' => $test->name,
                'reviewed_by' => $user->id,
                'reviewer_name' => $reviewerName,
                'reviewer_credential' => $reviewerCredential,
                'reviewed_at' => now()->toIso8601String(),
            ],
        ]);

        return back()->with('success', "Test '{$test->name}' marked as reviewed.");
    }

    /**
     * Archive an assessment test.
     */
    public function archive(Request $request, AssessmentTest $test): RedirectResponse
    {
        abort_unless($test->isPlatform(), 404);

        $test->update(['status' => AssessmentTest::STATUS_ARCHIVED]);

        AuditEvent::create([
            'user_id' => $request->user()->id,
            'action' => 'assessment_test.archived',
            'resource_type' => AssessmentTest::class,
            'resource_id' => $test->id,
            'ip_address' => $request->ip(),
            'metadata' => [
                'name' => $test->name,
            ],
        ]);

        return back()->with('success', "Test '{$test->name}' archived.");
    }

    /**
     * Preview CSV import before committing to database.
     */
    public function importPreview(Request $request): JsonResponse
    {
        $file = $request->file('csv_file') ?? $request->file('file');
        if (! $file || ! $file->isValid()) {
            return response()->json([
                'message' => 'The csv file field is required.',
                'errors' => ['csv_file' => ['A valid CSV file is required.']],
            ], 422);
        }

        $parsed = $this->parseCsv($file->getPathname());

        return response()->json($parsed);
    }

    /**
     * Execute CSV import: imported rows are always created as 'draft'.
     */
    public function import(Request $request): RedirectResponse
    {
        $file = $request->file('csv_file') ?? $request->file('file');
        if (! $file || ! $file->isValid()) {
            return back()->withErrors(['csv_file' => 'A valid CSV file is required.']);
        }

        $parsed = $this->parseCsv($file->getPathname());

        if (empty($parsed['valid_rows'])) {
            return back()->withErrors(['csv_file' => 'No valid rows found in the CSV file. Please check formatting errors.']);
        }

        $importedCount = 0;

        DB::transaction(function () use ($parsed, $request, &$importedCount) {
            foreach ($parsed['valid_rows'] as $row) {
                AssessmentTest::create([
                    'tenant_id' => null,
                    'body_region' => $row['body_region'],
                    'name' => $row['name'],
                    'aliases' => $row['aliases'],
                    'purpose' => $row['purpose'],
                    'procedure' => $row['procedure'],
                    'positive_finding' => $row['positive_finding'],
                    'interpretation_notes' => $row['interpretation_notes'],
                    'disciplines' => $row['disciplines'],
                    'references' => $row['references'],
                    'status' => AssessmentTest::STATUS_DRAFT,
                ]);
                $importedCount++;
            }

            AuditEvent::create([
                'user_id' => $request->user()->id,
                'action' => 'assessment_test.imported',
                'resource_type' => AssessmentTest::class,
                'resource_id' => 'bulk',
                'ip_address' => $request->ip(),
                'metadata' => [
                    'count' => $importedCount,
                ],
            ]);
        });

        return back()->with('success', "Successfully imported {$importedCount} assessment tests as drafts.");
    }

    /**
     * Download a clean CSV template for assessment test imports.
     * Contains only the header row and one clearly fake example row.
     */
    public function template(): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="assessment_tests_template.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM

            // CSV Header
            fputcsv($handle, [
                'body_region',
                'name',
                'aliases',
                'purpose',
                'procedure',
                'positive_finding',
                'interpretation_notes',
                'disciplines',
                'references',
            ]);

            // Exactly one clearly fake example row
            fputcsv($handle, [
                'shoulder',
                'Example test - replace me',
                'Example Alias',
                'Example purpose - replace me',
                '1. Step one. 2. Step two. 3. Step three.',
                'Example positive finding - replace me',
                '',
                'physio;chiro',
                '',
            ]);

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Export platform assessment test library to CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="umahz-assessment-tests-' . date('Y-m-d') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF)); // UTF-8 BOM

            // CSV Header
            fputcsv($handle, [
                'body_region',
                'name',
                'aliases',
                'purpose',
                'procedure',
                'positive_finding',
                'interpretation_notes',
                'disciplines',
                'references',
                'status',
            ]);

            AssessmentTest::platform()
                ->orderBy('body_region')
                ->orderBy('name')
                ->chunk(100, function ($tests) use ($handle) {
                    foreach ($tests as $t) {
                        fputcsv($handle, [
                            $t->body_region,
                            $t->name,
                            is_array($t->aliases) ? implode(', ', $t->aliases) : '',
                            $t->purpose,
                            $t->procedure,
                            $t->positive_finding,
                            $t->interpretation_notes ?? '',
                            is_array($t->disciplines) ? implode(', ', $t->disciplines) : '',
                            $t->references ?? '',
                            $t->status,
                        ]);
                    }
                });

            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Parse and validate CSV rows.
     */
    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if (! $handle) {
            return ['valid_rows' => [], 'errors' => ['Could not open CSV file.']];
        }

        $header = null;
        $validRows = [];
        $errors = [];
        $rowNumber = 1;

        $validRegions = array_keys(AssessmentTest::BODY_REGIONS);

        while (($row = fgetcsv($handle, 10000, ',')) !== false) {
            if (! $header) {
                // Remove UTF-8 BOM if present
                $row[0] = preg_replace('/[\x00-\x1F\x80-\xFF]/', '', $row[0]);
                $header = array_map(fn ($col) => strtolower(trim($col)), $row);

                $requiredColumns = ['body_region', 'name', 'purpose', 'procedure', 'positive_finding'];
                $missing = array_diff($requiredColumns, $header);
                if (! empty($missing)) {
                    fclose($handle);
                    return [
                        'valid_rows' => [],
                        'errors' => ['Missing required columns: ' . implode(', ', $missing)],
                    ];
                }
                continue;
            }

            $rowNumber++;

            // Skip empty rows
            if (empty(array_filter($row))) {
                continue;
            }

            if (count($row) < count($header)) {
                $row = array_pad($row, count($header), '');
            }

            $data = array_combine(array_slice($header, 0, count($row)), array_slice($row, 0, count($header)));

            $region = strtolower(trim($data['body_region'] ?? ''));
            $name = trim($data['name'] ?? '');
            $purpose = trim($data['purpose'] ?? '');
            $procedure = trim($data['procedure'] ?? '');
            $positive = trim($data['positive_finding'] ?? '');
            $notes = trim($data['interpretation_notes'] ?? '');
            $references = trim($data['references'] ?? '');

            // Validate fields
            if (! in_array($region, $validRegions, true)) {
                $errors[] = "Row {$rowNumber}: Invalid body_region '{$region}'. Valid regions: " . implode(', ', $validRegions);
                continue;
            }

            if (empty($name)) {
                $errors[] = "Row {$rowNumber}: Name is required.";
                continue;
            }

            if (empty($purpose) || empty($procedure) || empty($positive)) {
                $errors[] = "Row {$rowNumber}: Purpose, procedure, and positive_finding are required.";
                continue;
            }

            // Parse aliases
            $rawAliases = trim($data['aliases'] ?? '');
            $aliases = [];
            if (! empty($rawAliases)) {
                if (str_starts_with($rawAliases, '[') && str_ends_with($rawAliases, ']')) {
                    $decoded = json_decode($rawAliases, true);
                    $aliases = is_array($decoded) ? $decoded : [];
                } else {
                    $aliases = array_map('trim', explode(',', $rawAliases));
                }
            }

            // Parse disciplines
            $rawDisciplines = trim($data['disciplines'] ?? '');
            $disciplines = [];
            if (! empty($rawDisciplines)) {
                if (str_starts_with($rawDisciplines, '[') && str_ends_with($rawDisciplines, ']')) {
                    $decoded = json_decode($rawDisciplines, true);
                    $disciplines = is_array($decoded) ? $decoded : [];
                } else {
                    $disciplines = array_map('trim', explode(',', $rawDisciplines));
                }
            }

            $validRows[] = [
                'body_region' => $region,
                'name' => $name,
                'aliases' => array_values(array_filter($aliases)),
                'purpose' => $purpose,
                'procedure' => $procedure,
                'positive_finding' => $positive,
                'interpretation_notes' => ! empty($notes) ? $notes : null,
                'disciplines' => array_values(array_filter($disciplines)),
                'references' => ! empty($references) ? $references : null,
            ];
        }

        fclose($handle);

        return [
            'total_rows' => $rowNumber - 1,
            'total_processed' => $rowNumber - 1,
            'valid_count' => count($validRows),
            'error_count' => count($errors),
            'valid_rows' => $validRows,
            'preview' => array_slice($validRows, 0, 10),
            'errors' => $errors,
        ];
    }
}
