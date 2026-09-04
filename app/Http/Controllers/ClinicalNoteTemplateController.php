<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\ClinicalNoteTemplate;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ClinicalNoteTemplateController extends Controller
{
    /**
     * Display the clinical note templates management settings page.
     */
    public function index(Request $request): Response
    {
        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::findOrFail($tenantId);

        $offeredDisciplines = $tenant->offeredDisciplineCodes();
        ClinicalNoteTemplate::ensureDefaultsForTenant($tenantId, $offeredDisciplines);

        $templates = ClinicalNoteTemplate::where('tenant_id', $tenantId)
            ->whereIn('discipline', $offeredDisciplines)
            ->get()
            ->keyBy('discipline');

        $disciplineLabels = $tenant->allDisciplineLabels();

        return Inertia::render('Settings/ClinicalNoteTemplates', [
            'templates' => $templates,
            'offeredDisciplines' => $offeredDisciplines,
            'disciplineLabels' => $disciplineLabels,
        ]);
    }

    /**
     * Update a specific clinical note template schema.
     */
    public function update(Request $request, ClinicalNoteTemplate $template): RedirectResponse
    {
        $this->authorize('update', $template);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'schema' => ['required', 'array'],
            'schema.sections' => ['required', 'array', 'min:1'],
            'schema.sections.*.id' => ['required', 'string'],
            'schema.sections.*.title' => ['required', 'string', 'max:255'],
            'schema.sections.*.description' => ['nullable', 'string', 'max:500'],
            'schema.sections.*.fields' => ['required', 'array', 'min:1'],
            'schema.sections.*.fields.*.id' => ['required', 'string'],
            'schema.sections.*.fields.*.label' => ['required', 'string', 'max:255'],
            'schema.sections.*.fields.*.type' => ['required', 'string', 'in:short_text,long_text,select,radio,multiselect'],
            'schema.sections.*.fields.*.options' => ['nullable', 'array'],
            'schema.sections.*.fields.*.placeholder' => ['nullable', 'string', 'max:255'],
            'schema.sections.*.fields.*.required' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        DB::transaction(function () use ($template, $validated, $request) {
            $oldVersion = $template->version;
            $newVersion = $oldVersion + 1;

            $template->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'schema' => $validated['schema'],
                'version' => $newVersion,
                'is_active' => $validated['is_active'] ?? $template->is_active,
            ]);

            AuditEvent::create([
                'tenant_id' => $template->tenant_id,
                'user_id' => $request->user()->id,
                'action' => 'clinical_note_template.updated',
                'resource_type' => 'ClinicalNoteTemplate',
                'resource_id' => $template->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'discipline' => $template->discipline,
                    'old_version' => $oldVersion,
                    'new_version' => $newVersion,
                ],
            ]);
        });

        return back()->with('success', 'Clinical note template updated successfully (v'.$template->version.').');
    }

    /**
     * Reset a clinical note template to platform starter defaults.
     */
    public function reset(Request $request, ClinicalNoteTemplate $template): RedirectResponse
    {
        $this->authorize('update', $template);

        DB::transaction(function () use ($template, $request) {
            $defaults = ClinicalNoteTemplate::starterTemplateForDiscipline($template->discipline);
            $newVersion = $template->version + 1;

            $template->update([
                'name' => $defaults['name'],
                'description' => $defaults['description'],
                'schema' => $defaults['schema'],
                'version' => $newVersion,
            ]);

            AuditEvent::create([
                'tenant_id' => $template->tenant_id,
                'user_id' => $request->user()->id,
                'action' => 'clinical_note_template.reset_to_default',
                'resource_type' => 'ClinicalNoteTemplate',
                'resource_id' => $template->id,
                'ip_address' => $request->ip(),
                'metadata' => [
                    'discipline' => $template->discipline,
                    'new_version' => $newVersion,
                ],
            ]);
        });

        return back()->with('success', 'Clinical note template reset to default starter schema.');
    }
}
