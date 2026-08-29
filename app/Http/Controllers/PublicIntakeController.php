<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\ClientIntake;
use App\Models\IntakeFormTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicIntakeController extends Controller
{
    /**
     * Display public, unauthenticated intake form for patient self-completion.
     */
    public function show(Request $request): Response
    {
        $token = (string) ($request->route('token') ?? $request->route('token'));

        $intake = ClientIntake::withoutGlobalScopes()
            ->where('token', $token)
            ->with(['client', 'tenant', 'intakeFormTemplate'])
            ->first();

        if (! $intake) {
            return Inertia::render('Public/IntakeForm', [
                'state' => 'invalid_link',
                'errorMessage' => 'This intake form link is invalid or no longer exists.',
            ]);
        }

        if ($intake->isCompleted()) {
            return Inertia::render('Public/IntakeForm', [
                'state' => 'already_completed',
                'clinicName' => $intake->tenant?->name ?? 'Clinic',
                'clientFirstName' => $intake->client?->first_name ?? 'Valued Client',
                'submittedAt' => $intake->submitted_at?->toIso8601String(),
            ]);
        }

        if ($intake->isExpired()) {
            return Inertia::render('Public/IntakeForm', [
                'state' => 'expired',
                'clinicName' => $intake->tenant?->name ?? 'Clinic',
                'clientFirstName' => $intake->client?->first_name ?? 'Valued Client',
            ]);
        }

        // For pending links, resolve from the active template so template edits and client updates reflect immediately.
        // For completed records, preserve the immutable schema_snapshot.
        $baseSchema = ($intake->status !== ClientIntake::STATUS_PENDING && $intake->schema_snapshot)
            ? $intake->schema_snapshot
            : ($intake->intakeFormTemplate?->schema
                ?: $intake->schema_snapshot
                ?: IntakeFormTemplate::starterTemplateFor($intake->discipline)['schema']);

        $clientSex = $intake->client?->sex;
        $schema = IntakeFormTemplate::filterSchemaForSex($baseSchema, $clientSex);

        return Inertia::render('Public/IntakeForm', [
            'state' => 'active',
            'token' => $token,
            'clientFirstName' => $intake->client?->first_name ?? 'Client',
            'clientSex' => $clientSex,
            'clinicName' => $intake->tenant?->name ?? 'Clinic',
            'clinicPhone' => $intake->tenant?->phone,
            'clinicEmail' => $intake->tenant?->email,
            'discipline' => $intake->discipline,
            'templateName' => $intake->template_name,
            'schema' => $schema,
        ]);
    }

    /**
     * Process patient self-submission of intake form responses.
     */
    public function submit(Request $request): RedirectResponse|Response
    {
        $token = (string) ($request->route('token') ?? $request->route('token'));

        $intake = ClientIntake::withoutGlobalScopes()
            ->where('token', $token)
            ->with(['intakeFormTemplate', 'tenant', 'client'])
            ->firstOrFail();

        if ($intake->isCompleted() || $intake->isExpired()) {
            return redirect("/intake/{$token}");
        }

        $data = $request->validate([
            'responses' => ['required', 'array'],
        ]);

        $baseSchema = $intake->intakeFormTemplate?->schema
            ?: $intake->schema_snapshot
            ?: IntakeFormTemplate::starterTemplateFor($intake->discipline)['schema'];

        // Snapshot ONLY the questions shown to this client based on their sex
        $clientSex = $intake->client?->sex;
        $schema = IntakeFormTemplate::filterSchemaForSex($baseSchema, $clientSex);

        $flags = $this->evaluateContraindications($schema, $data['responses']);
        $status = count($flags) > 0 ? ClientIntake::STATUS_FLAGGED : ClientIntake::STATUS_COMPLETED;

        $intake->update([
            'schema_snapshot' => $schema,
            'responses' => $data['responses'],
            'contraindication_flags' => $flags,
            'status' => $status,
            'submitted_at' => now(),
            'ip_address' => $request->ip(),
        ]);

        AuditEvent::create([
            'tenant_id' => $intake->tenant_id,
            'user_id' => null, // Anonymous patient completion
            'action' => 'intake.submitted',
            'resource_type' => ClientIntake::class,
            'resource_id' => $intake->id,
            'metadata' => [
                'submission_type' => ClientIntake::SUBMISSION_PATIENT_LINK,
                'discipline' => $intake->discipline,
                'has_flags' => count($flags) > 0,
                'flags_count' => count($flags),
            ],
            'ip_address' => $request->ip(),
        ]);

        if (count($flags) > 0) {
            AuditEvent::create([
                'tenant_id' => $intake->tenant_id,
                'user_id' => null,
                'action' => 'intake.flagged',
                'resource_type' => ClientIntake::class,
                'resource_id' => $intake->id,
                'metadata' => ['flags' => $flags],
                'ip_address' => $request->ip(),
            ]);
        }

        return redirect("/intake/{$token}");
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
}
