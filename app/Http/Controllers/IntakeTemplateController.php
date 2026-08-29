<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Onboarding\ClinicRegistrationController;
use App\Models\AuditEvent;
use App\Models\IntakeFormTemplate;
use App\Models\Tenant;
use App\Scopes\TenantScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntakeTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::findOrFail($tenantId);

        $offeredDisciplines = $tenant->requested_disciplines ?: ClinicRegistrationController::DISCIPLINES;

        // Ensure starter templates exist for all offered disciplines
        IntakeFormTemplate::ensureDefaultsForTenant($tenantId, $offeredDisciplines);

        $templates = IntakeFormTemplate::where('tenant_id', $tenantId)
            ->whereIn('discipline', $offeredDisciplines)
            ->withCount('clientIntakes')
            ->orderBy('name')
            ->get();

        return Inertia::render('Settings/IntakeForms', [
            'tenant' => $tenant,
            'templates' => $templates,
            'offeredDisciplines' => $offeredDisciplines,
            'allDisciplines' => ClinicRegistrationController::DISCIPLINES,
        ]);
    }

    public function update(Request $request, IntakeFormTemplate $template): RedirectResponse
    {
        $this->authorize('update', $template);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'schema' => ['required', 'array'],
            'schema.sections' => ['required', 'array', 'min:1'],
            'is_active' => ['boolean'],
        ]);

        $template->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'schema' => $data['schema'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        AuditEvent::create([
            'tenant_id' => $template->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'intake_template.updated',
            'resource_type' => IntakeFormTemplate::class,
            'resource_id' => $template->id,
            'metadata' => [
                'discipline' => $template->discipline,
                'name' => $template->name,
            ],
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', "Intake questionnaire for \"{$template->name}\" updated.");
    }

    public function reset(Request $request, IntakeFormTemplate $template): RedirectResponse
    {
        $this->authorize('update', $template);

        $starter = IntakeFormTemplate::starterTemplateFor($template->discipline);
        if ($starter) {
            $template->update([
                'name' => $starter['name'],
                'description' => $starter['description'],
                'schema' => $starter['schema'],
            ]);

            AuditEvent::create([
                'tenant_id' => $template->tenant_id,
                'user_id' => $request->user()->id,
                'action' => 'intake_template.reset',
                'resource_type' => IntakeFormTemplate::class,
                'resource_id' => $template->id,
                'metadata' => ['discipline' => $template->discipline],
                'ip_address' => $request->ip(),
            ]);
        }

        return back()->with('success', 'Template reset to default starter questions.');
    }
}
