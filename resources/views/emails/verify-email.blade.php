<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Verify your UMAHZ account</title>
    <style>
        /* Manrope where supported; graceful fallback everywhere else. */
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
        body { margin: 0; padding: 0; width: 100% !important; background-color: #F1F5F9; }
        a { text-decoration: none; }
        @media only screen and (max-width: 600px) {
            .umahz-card { width: 100% !important; border-radius: 0 !important; }
            .umahz-pad { padding-left: 24px !important; padding-right: 24px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    {{-- Preheader: shown in inbox preview, hidden in the body. --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#F1F5F9;">
        Confirm your email to activate your UMAHZ account. This link expires in 60 minutes.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="umahz-card" width="560" cellpadding="0" cellspacing="0" style="width:560px; max-width:560px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(13,27,42,0.08);">

                    {{-- Brand header (Deep Navy) --}}
                    <tr>
                        <td style="background-color:#0D1B2A; padding:28px 40px;">
                            <span style="font-size:22px; font-weight:800; letter-spacing:0.02em; color:#FFFFFF;">UMAHZ</span><span style="color:#22C55E; font-weight:800; font-size:22px;">.</span>
                            <div style="margin-top:2px; font-size:12px; font-weight:600; color:#06B6D4;">Wellness Platform</div>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td class="umahz-pad" style="padding:40px;">
                            <h1 style="margin:0 0 16px; font-size:22px; line-height:1.3; font-weight:800; color:#0D1B2A;">
                                Verify your email address
                            </h1>
                            <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#334155;">
                                Hi {{ $name }},
                            </p>
                            <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#334155;">
                                Thanks for creating a UMAHZ account. Please confirm this is your email
                                address by clicking the button below.
                            </p>

                            {{-- CTA button (Royal Blue) --}}
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                                <tr>
                                    <td align="center" style="border-radius:9999px; background-color:#2563EB;">
                                        <a href="{{ $url }}" target="_blank"
                                           style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:700; color:#FFFFFF; border-radius:9999px;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 24px; font-size:13px; line-height:1.6; color:#64748B;">
                                This link will expire in <strong style="color:#0D1B2A;">60 minutes</strong>.
                                If you didn&rsquo;t create a UMAHZ account, you can safely ignore this email.
                            </p>

                            <hr style="border:none; border-top:1px solid #E2E8F0; margin:0 0 24px;">

                            <p style="margin:0 0 8px; font-size:12px; line-height:1.6; color:#94A3B8;">
                                If the button doesn&rsquo;t work, copy and paste this URL into your browser:
                            </p>
                            <p style="margin:0; font-size:12px; line-height:1.6; word-break:break-all;">
                                <a href="{{ $url }}" target="_blank" style="color:#2563EB;">{{ $url }}</a>
                            </p>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background-color:#F8FAFC; padding:24px 40px; border-top:1px solid #E2E8F0;">
                            <p style="margin:0; font-size:12px; line-height:1.6; color:#94A3B8;">
                                &copy; {{ date('Y') }} UMAHZ Wellness. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
