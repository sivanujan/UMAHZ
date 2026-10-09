<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\ScribeLanguage;
use App\Scribe\LanguageRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ScribeLanguageController extends Controller
{
    public function __construct(
        private readonly LanguageRegistry $registry,
    ) {}

    public function index(): Response
    {
        $languages = ScribeLanguage::orderBy('sort_order')->orderBy('label')->get();

        return Inertia::render('Admin/ScribeLanguages/Index', [
            'languages' => $languages,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:16', 'alpha_dash', 'unique:scribe_languages,code'],
            'label' => ['required', 'string', 'max:100'],
            'native_name' => ['required', 'string', 'max:100'],
            'provider' => ['required', 'string', 'max:50'],
            'provider_code' => ['required', 'string', 'max:32'],
            'supports_transcription' => ['required', 'boolean'],
            'supports_note_output' => ['required', 'boolean'],
            'status' => ['required', Rule::in([ScribeLanguage::STATUS_ACTIVE, ScribeLanguage::STATUS_BETA, ScribeLanguage::STATUS_HIDDEN])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $validated['sort_order'] = $validated['sort_order'] ?? ((ScribeLanguage::max('sort_order') ?? 0) + 1);

        $language = ScribeLanguage::create($validated);
        $this->registry->clearCache();

        AuditEvent::create([
            'tenant_id' => null,
            'user_id' => $request->user()->id,
            'action' => 'scribe.language_created',
            'resource_type' => ScribeLanguage::class,
            'resource_id' => (string) $language->id,
            'ip_address' => $request->ip(),
            'metadata' => ['code' => $language->code, 'label' => $language->label],
        ]);

        return redirect()->back()->with('success', "Language \"{$language->label}\" added successfully.");
    }

    public function update(Request $request, ScribeLanguage $scribeLanguage): RedirectResponse
    {
        $validated = $request->validate([
            'label' => ['required', 'string', 'max:100'],
            'native_name' => ['required', 'string', 'max:100'],
            'provider' => ['required', 'string', 'max:50'],
            'provider_code' => ['required', 'string', 'max:32'],
            'supports_transcription' => ['required', 'boolean'],
            'supports_note_output' => ['required', 'boolean'],
            'status' => ['required', Rule::in([ScribeLanguage::STATUS_ACTIVE, ScribeLanguage::STATUS_BETA, ScribeLanguage::STATUS_HIDDEN])],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $scribeLanguage->update($validated);
        $this->registry->clearCache();

        AuditEvent::create([
            'tenant_id' => null,
            'user_id' => $request->user()->id,
            'action' => 'scribe.language_updated',
            'resource_type' => ScribeLanguage::class,
            'resource_id' => (string) $scribeLanguage->id,
            'ip_address' => $request->ip(),
            'metadata' => ['code' => $scribeLanguage->code, 'changes' => $validated],
        ]);

        return redirect()->back()->with('success', "Language \"{$scribeLanguage->label}\" updated successfully.");
    }

    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'orders' => ['required', 'array'],
            'orders.*.id' => ['required', 'integer', 'exists:scribe_languages,id'],
            'orders.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($validated['orders'] as $item) {
            ScribeLanguage::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        $this->registry->clearCache();

        return redirect()->back()->with('success', 'Language order updated.');
    }
}
