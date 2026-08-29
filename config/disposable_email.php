<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Additional Blocked Domains
    |--------------------------------------------------------------------------
    |
    | Domains specified here or in .env will also be treated as disposable.
    | Comma-separated list supported via DISPOSABLE_EMAIL_BLOCKED_DOMAINS.
    |
    */
    'additional_blocked' => array_filter(array_map('trim', explode(',', env('DISPOSABLE_EMAIL_BLOCKED_DOMAINS', '')))),

    /*
    |--------------------------------------------------------------------------
    | Allowed / Whitelisted Domains
    |--------------------------------------------------------------------------
    |
    | Domains specified here will always be allowed even if they match a pattern
    | or rule (useful for internal staging/testing or explicit exemptions).
    |
    */
    'allowed' => array_filter(array_map('trim', explode(',', env('DISPOSABLE_EMAIL_ALLOWED_DOMAINS', '')))),

    /*
    |--------------------------------------------------------------------------
    | Known Disposable Email Domains
    |--------------------------------------------------------------------------
    |
    | Comprehensive list of popular disposable, temporary, and 10-minute email
    | provider domains.
    |
    */
    'domains' => [
        // Mailinator & related
        'mailinator.com',
        'mailinator.net',
        'mailinator2.com',
        'notmailinator.com',
        'suremail.info',
        'spamherelots.com',
        'tradermail.info',
        'binkmail.com',
        'safetymail.info',
        'mailinater.com',

        // 10 Minute Mail & variants
        '10minutemail.com',
        '10minutemail.net',
        '10minutemail.org',
        '10minemail.com',
        '10minuteemail.com',
        '10minutesmail.com',
        '20minutemail.com',

        // Guerrilla Mail
        'guerrillamail.com',
        'guerrillamail.net',
        'guerrillamail.org',
        'guerrillamail.biz',
        'guerrillamail.de',
        'guerrillamailblock.com',
        'sharklasers.com',
        'grr.la',
        'spam4.me',
        'pokemail.net',

        // TempMail
        'tempmail.com',
        'temp-mail.org',
        'temp-mail.io',
        'tempmail.net',
        'tempmailaddress.com',
        'temp-email.org',
        'tempmailo.com',
        'tempinbox.com',

        // YOPmail & related domains
        'yopmail.com',
        'yopmail.fr',
        'yopmail.net',
        'cool.fr.nf',
        'courriel.fr.nf',
        'mega.zik.dj',
        'jetable.fr.nf',
        'nospam.ze.tc',
        'nomail.xl.cx',

        // TrashMail
        'trashmail.com',
        'trashmail.net',
        'trashmail.me',
        'trashmail.at',
        'trashmail.io',
        'trashmail.org',

        // ThrowAwayMail & Burner
        'throwawaymail.com',
        'throwawayemailaddress.com',
        'burnermail.io',
        'burneremail.net',

        // Dispostable & FakeInbox
        'dispostable.com',
        'fakeinbox.com',
        'fakeemail.net',
        'fakemailgenerator.com',
        'generator.email',

        // Nada & Airmail
        'nada.ltd',
        'nada.email',
        'getairmail.com',
        'airmail.cc',
        'inboxkitten.com',

        // Mohmal
        'mohmal.com',
        'mohmal.in',
        'mohmal.im',

        // Maildrop & Mailnesia
        'maildrop.cc',
        'mailnesia.com',
        'mailcatch.com',
        'mailsac.com',

        // CrazyMailing, DropMail & MintEmail
        'crazymailing.com',
        'dropmail.me',
        'mintemail.com',
        'mytrashmail.com',
        'emailfake.com',
        'moakt.com',
        'mytemp.email',
        'mytempemail.com',
        'anonymousemail.me',
        'temporary-mail.net',
        'disposablemail.com',
        'getnada.com',
        'inbound.plus',
        'tmail.io',
        'internxt.com/temporary-email',
        'emailondeck.com',
        'byom.de',
        'instantemailaddress.com',
    ],

];
