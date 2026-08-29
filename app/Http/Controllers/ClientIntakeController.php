<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClientIntake;
use App\Models\IntakeFormTemplate;
use App\Models\Tenant;
use App\Notifications\ClientIntakeLinkNotification;
use App\Scopes\TenantScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClientIntakeController extends Controller
{
    /**
     * Generate a secure single-use magic link for patient self-completion.
     */
    public function storeLink(Request $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);

        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::find($tenantId);

        $offeredDisciplines = $tenant?->requested_disciplines ?: [
            IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            IntakeFormTemplate::DISCIPLINE_ACUPUNCTURE_TCM,
            IntakeFormTemplate::DISCIPLINE_PERSONAL_TRAINING,
            IntakeFormTemplate::DISCIPLINE_NUTRITION,
            IntakeFormTemplate::DISCIPLINE_COLON_HYDROTHERAPY,
        ];

        $data = $request->validate([
            'discipline' => ['required', 'string', Rule::in($offeredDisciplines)],
            'appointment_id' => [
                'nullable',
                Rule::exists('appointments', 'id')
                    ->where('tenant_id', $tenantId)
                    ->where('client_id', $client->id),
            ],
            'send_email' => ['boolean'],
        ]);

        IntakeFormTemplate::ensureDefaultsForTenant($tenantId);

        $template = IntakeFormTemplate::where('tenant_id', $tenantId)
            ->where('discipline', $data['discipline'])
            ->first();

        $intake = DB::transaction(function () use ($tenantId, $client, $data, $template, $request) {
            $token = ClientIntake::makeToken();

            $record = ClientIntake::create([
                'tenant_id' => $tenantId,
                'client_id' => $client->id,
                'appointment_id' => $data['appointment_id'] ?? null,
                'intake_form_template_id' => $template?->id,
                'discipline' => $data['discipline'],
                'template_name' => $template?->name ?? ucwords(str_replace('_', ' ', $data['discipline'])).' Intake',
                'schema_snapshot' => $template?->schema,
                'status' => ClientIntake::STATUS_PENDING,
                'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
                'token' => $token,
                'expires_at' => now()->addDays(7),
                'submitted_by_user_id' => null,
            ]);

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'intake.link_generated',
                'resource_type' => ClientIntake::class,
                'resource_id' => $record->id,
                'metadata' => [
                    'client_id' => $client->id,
                    'discipline' => $data['discipline'],
                    'expires_at' => $record->expires_at->toIso8601String(),
                ],
                'ip_address' => $request->ip(),
            ]);

            return $record;
        });

        $fillUrl = url("/intake/{$intake->token}");

        if ($request->boolean('send_email') && $client->email) {
            $this->notifySafely($client, new ClientIntakeLinkNotification($intake, $fillUrl));
            $msg = "Secure intake link generated and emailed to {$client->email}.";
        } else {
            $msg = "Secure intake link generated. Link expires in 7 days.";
        }

        return back()->with('success', $msg)->with('generated_intake_link', $fillUrl);
    }

    /**
     * Staff directly completes an intake form on behalf of a client (e.g. in-person walk-in).
     */
    public function storeStaff(Request $request, Client $client): RedirectResponse
    {
        $this->authorizeClient($client);

        $tenantId = TenantScope::getTenantId();
        $tenant = Tenant::find($tenantId);

        $offeredDisciplines = $tenant?->requested_disciplines ?: [
            IntakeFormTemplate::DISCIPLINE_MASSAGE_THERAPY,
            IntakeFormTemplate::DISCIPLINE_ACUPUNCTURE_TCM,
            IntakeFormTemplate::DISCIPLINE_PERSONAL_TRAINING,
            IntakeFormTemplate::DISCIPLINE_NUTRITION,
            IntakeFormTemplate::DISCIPLINE_COLON_HYDROTHERAPY,
        ];

        $data = $request->validate([
            'discipline' => ['required', 'string', Rule::in($offeredDisciplines)],
            'appointment_id' => [
                'nullable',
                Rule::exists('appointments', 'id')
                    ->where('tenant_id', $tenantId)
                    ->where('client_id', $client->id),
            ],
            'responses' => ['required', 'array'],
        ]);

        IntakeFormTemplate::ensureDefaultsForTenant($tenantId);

        $template = IntakeFormTemplate::where('tenant_id', $tenantId)
            ->where('discipline', $data['discipline'])
            ->firstOrFail();

        // Snapshot ONLY the questions applicable to this client based on their sex
        $filteredSchema = IntakeFormTemplate::filterSchemaForSex($template->schema, $client->sex);

        $flags = $this->evaluateContraindications($filteredSchema, $data['responses']);
        $status = count($flags) > 0 ? ClientIntake::STATUS_FLAGGED : ClientIntake::STATUS_COMPLETED;

        $intake = DB::transaction(function () use ($tenantId, $client, $data, $template, $filteredSchema, $flags, $status, $request) {
            $record = ClientIntake::create([
                'tenant_id' => $tenantId,
                'client_id' => $client->id,
                'appointment_id' => $data['appointment_id'] ?? null,
                'intake_form_template_id' => $template->id,
                'discipline' => $data['discipline'],
                'template_name' => $template->name,
                'schema_snapshot' => $filteredSchema,
                'responses' => $data['responses'],
                'contraindication_flags' => $flags,
                'status' => $status,
                'submission_type' => ClientIntake::SUBMISSION_STAFF_RECORDED,
                'submitted_by_user_id' => $request->user()->id,
                'submitted_at' => now(),
                'ip_address' => $request->ip(),
            ]);

            AuditEvent::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()->id,
                'action' => 'intake.submitted',
                'resource_type' => ClientIntake::class,
                'resource_id' => $record->id,
                'metadata' => [
                    'submission_type' => ClientIntake::SUBMISSION_STAFF_RECORDED,
                    'discipline' => $data['discipline'],
                    'has_flags' => count($flags) > 0,
                    'flags_count' => count($flags),
                ],
                'ip_address' => $request->ip(),
            ]);

            if (count($flags) > 0) {
                AuditEvent::create([
                    'tenant_id' => $tenantId,
                    'user_id' => $request->user()->id,
                    'action' => 'intake.flagged',
                    'resource_type' => ClientIntake::class,
                    'resource_id' => $record->id,
                    'metadata' => ['flags' => $flags],
                    'ip_address' => $request->ip(),
                ]);
            }

            return $record;
        });

        $alert = count($flags) > 0
            ? "Intake recorded with ".count($flags)." contraindication warning(s) flagged."
            : "Intake form successfully recorded.";

        return back()->with('success', $alert);
    }

    /**
     * Fetch complete intake details for staff view/print modal.
     */
    public function show(Request $request, Client $client, ClientIntake $intake): JsonResponse
    {
        $this->authorizeClient($client);

        if ($intake->client_id !== $client->id || $intake->tenant_id !== TenantScope::getTenantId()) {
            abort(404);
        }

        AuditEvent::create([
            'tenant_id' => $intake->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'intake.viewed',
            'resource_type' => ClientIntake::class,
            'resource_id' => $intake->id,
            'metadata' => ['discipline' => $intake->discipline],
            'ip_address' => $request->ip(),
        ]);

        $intake->loadMissing(['submittedByUser', 'appointment']);

        return response()->json([
            'intake' => [
                'id' => $intake->id,
                'client_id' => $intake->client_id,
                'client_name' => $client->full_name,
                'discipline' => $intake->discipline,
                'template_name' => $intake->template_name,
                'schema' => $intake->schema_snapshot,
                'responses' => $intake->responses,
                'contraindication_flags' => $intake->contraindication_flags ?? [],
                'status' => $intake->status,
                'submission_type' => $intake->submission_type,
                'submitted_by' => $intake->submittedByUser?->name,
                'submitted_at' => $intake->submitted_at?->toIso8601String(),
                'appointment' => $intake->appointment ? [
                    'id' => $intake->appointment->id,
                    'starts_at' => $intake->appointment->starts_at->toIso8601String(),
                    'service_name' => $intake->appointment->service_name,
                ] : null,
            ],
        ]);
    }

    /**
     * Delete/cancel a pending, uncompleted intake link.
     */
    public function destroy(Request $request, Client $client, ClientIntake $intake): RedirectResponse
    {
        $this->authorizeClient($client);

        if ($intake->client_id !== $client->id || $intake->tenant_id !== TenantScope::getTenantId()) {
            abort(404);
        }

        if ($intake->isCompleted()) {
            return back()->withErrors(['error' => 'Completed medical intake records cannot be deleted.']);
        }

        $intake->delete();

        AuditEvent::create([
            'tenant_id' => $intake->tenant_id,
            'user_id' => $request->user()->id,
            'action' => 'intake.cancelled',
            'resource_type' => ClientIntake::class,
            'resource_id' => $intake->id,
            'metadata' => [
                'discipline' => $intake->discipline,
                'status' => $intake->status,
            ],
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', 'Pending intake link removed.');
    }

    private function evaluateContraindications(?array $schema, array $responses): array
    {
        if (! $schema || empty($schema['sections'])) {
            return [];
        }

        $flags = [];
        foreach ($schema['sections'] as $section) {
            foreach ($section['fields'] ?? [] as $field) {
                if (empty($field['is_contraindication'])) {
                    continue;
                }

                $fieldId = $field['id'] ?? null;
                $userVal = $responses[$fieldId] ?? null;
                $trigger = $field['flag_trigger'] ?? 'yes';

                if ($userVal !== null && strtolower((string)$userVal) === strtolower((string)$trigger)) {
                    $flags[] = [
                        'field_id' => $fieldId,
                        'question' => $field['label'] ?? $fieldId,
                        'warning' => $field['flag_warning'] ?? 'Contraindication flag reported.',
                        'answer' => $userVal,
                    ];
                }
            }
        }

        return $flags;
    }

    private function authorizeClient(Client $client): void
    {
        $tenantId = TenantScope::getTenantId();
        if (! $tenantId || $client->tenant_id !== $tenantId) {
            abort(404);
        }
    }
}
