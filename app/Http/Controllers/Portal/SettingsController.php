<?php

namespace App\Http\Controllers\Portal;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Rules\NotDisposableEmail;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function show(Request $request): Response
    {
        /** @var Client $client */
        $client = $request->attributes->get('clientRecord');
        $user = $request->user();

        return Inertia::render('Portal/Settings', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
            ],
            'notificationPreferences' => $client->notificationPreferences(),
            'deletionRequested' => $client->deletion_requested_at !== null,
            'themePreference' => $client->theme_preference,
        ]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $client = $request->attributes->get('clientRecord');
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id), new NotDisposableEmail()],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $emailChanged = $data['email'] !== $user->email;

        $user->fill([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
        ]);

        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($emailChanged) {
            $this->notifySafely($user, new VerifyEmail());
        }

        [$firstName, $lastName] = array_pad(explode(' ', $data['name'], 2), 2, '');

        $client->update([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $data['email'],
            'phone' => $data['phone'],
        ]);

        return back()->with('success', 'Profile updated.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()->min(12)],
        ]);

        $user = $request->user();
        $user->update(['password' => Hash::make($data['password'])]);

        return back()->with('success', 'Password updated.');
    }

    public function updateNotifications(Request $request): RedirectResponse
    {
        $client = $request->attributes->get('clientRecord');

        $data = $request->validate([
            'email_reminders' => ['required', 'boolean'],
            'sms_reminders' => ['required', 'boolean'],
        ]);

        $client->update(['notification_preferences' => $data]);

        return back()->with('success', 'Notification preferences saved.');
    }

    public function updateTheme(Request $request): RedirectResponse
    {
        $client = $request->attributes->get('clientRecord');

        $data = $request->validate([
            'theme_preference' => ['required', 'in:light,dark,system'],
        ]);

        $client->update($data);

        return back();
    }

    public function requestDeletion(Request $request): RedirectResponse
    {
        $client = $request->attributes->get('clientRecord');

        if (!$client->deletion_requested_at) {
            $client->update(['deletion_requested_at' => now()]);
        }

        return back()->with('success', 'Deletion request received. Our team will follow up by email.');
    }
}
