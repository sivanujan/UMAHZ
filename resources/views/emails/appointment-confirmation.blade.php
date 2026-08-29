<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Appointment Confirmation - {{ $clinicName }}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
        body { margin: 0; padding: 0; width: 100% !important; background-color: #F1F5F9; }
        a { text-decoration: none; }
        @media only screen and (max-width: 600px) {
            .umahz-card { width: 100% !important; border-radius: 0 !important; }
            .umahz-pad { padding-left: 20px !important; padding-right: 20px !important; }
        }
    </style>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#334155;">
    {{-- Preheader: inbox snippet preview --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#F1F5F9;">
        Your appointment at {{ $clinicName }} on {{ $appointmentDate }} at {{ $appointmentTime }} is confirmed.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" class="umahz-card" width="560" cellpadding="0" cellspacing="0" style="width:560px; max-width:560px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(13,27,42,0.08);">

                    {{-- Clinic Branded Header --}}
                    <tr>
                        <td style="background-color:#0D1B2A; padding:28px 40px;">
                            <div style="font-size:22px; font-weight:800; letter-spacing:0.01em; color:#FFFFFF;">
                                {{ $clinicName }}
                            </div>
                            <div style="margin-top:4px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#06B6D4;">
                                Appointment Confirmation
                            </div>
                        </td>
                    </tr>

                    {{-- Body Content --}}
                    <tr>
                        <td class="umahz-pad" style="padding:36px 40px;">
                            <h1 style="margin:0 0 16px; font-size:20px; line-height:1.3; font-weight:800; color:#0D1B2A;">
                                Your appointment is confirmed
                            </h1>
                            <p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#334155;">
                                Hi {{ $clientName }},
                            </p>
                            <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#334155;">
                                We look forward to seeing you at <strong>{{ $clinicName }}</strong>. Here are your appointment details:
                            </p>

                            {{-- Appointment Details Card --}}
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; margin:0 0 28px; overflow:hidden;">
                                <tr>
                                    <td style="padding:20px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; font-weight:600; color:#64748B; width:130px;" valign="top">Service</td>
                                                <td style="padding:6px 0; font-size:14px; font-weight:700; color:#0D1B2A;">{{ $serviceName }}</td>
                                            </tr>
                                            @if($practitionerName)
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; font-weight:600; color:#64748B; width:130px;" valign="top">Practitioner</td>
                                                <td style="padding:6px 0; font-size:14px; font-weight:600; color:#0D1B2A;">{{ $practitionerName }}</td>
                                            </tr>
                                            @endif
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; font-weight:600; color:#64748B; width:130px;" valign="top">Date</td>
                                                <td style="padding:6px 0; font-size:14px; font-weight:600; color:#0D1B2A;">{{ $appointmentDate }}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; font-weight:600; color:#64748B; width:130px;" valign="top">Time</td>
                                                <td style="padding:6px 0; font-size:14px; font-weight:600; color:#0D1B2A;">{{ $appointmentTime }} ({{ $clinicTimezone }})</td>
                                            </tr>
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; font-weight:600; color:#64748B; width:130px;" valign="top">Duration</td>
                                                <td style="padding:6px 0; font-size:14px; color:#334155;">{{ $durationMinutes }} minutes</td>
                                            </tr>
                                            @if($locationName)
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; font-weight:600; color:#64748B; width:130px;" valign="top">Location</td>
                                                <td style="padding:6px 0; font-size:14px; color:#334155;">
                                                    <strong>{{ $locationName }}</strong>
                                                    @if($locationAddress)
                                                        <br><span style="font-size:12px; color:#64748B;">{{ $locationAddress }}</span>
                                                    @endif
                                                </td>
                                            </tr>
                                            @endif
                                            @if($roomName)
                                            <tr>
                                                <td style="padding:6px 0; font-size:13px; font-weight:600; color:#64748B; width:130px;" valign="top">Room</td>
                                                <td style="padding:6px 0; font-size:14px; color:#334155;">{{ $roomName }}</td>
                                            </tr>
                                            @endif
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            {{-- Reschedule or Cancel notice --}}
                            <div style="background-color:#F0FDF4; border:1px solid #BBF7D0; border-radius:10px; padding:16px 20px; margin:0 0 24px;">
                                <div style="font-size:13px; font-weight:700; color:#166534; margin-bottom:4px;">
                                    Need to reschedule or cancel?
                                </div>
                                <p style="margin:0; font-size:13px; line-height:1.5; color:#15803D;">
                                    Please contact <strong>{{ $clinicName }}</strong> directly
                                    @if($clinicPhone)
                                        by phone at <a href="tel:{{ $clinicPhone }}" style="color:#15803D; font-weight:700; text-decoration:underline;">{{ $clinicPhone }}</a>
                                    @endif
                                    @if($clinicPhone && $clinicEmail)
                                        or
                                    @endif
                                    @if($clinicEmail)
                                        by email at <a href="mailto:{{ $clinicEmail }}" style="color:#15803D; font-weight:700; text-decoration:underline;">{{ $clinicEmail }}</a>
                                    @endif
                                    .
                                </p>
                            </div>

                            <p style="margin:0; font-size:13px; line-height:1.6; color:#64748B;">
                                Thank you for choosing {{ $clinicName }}. We look forward to your visit.
                            </p>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background-color:#F8FAFC; border-top:1px solid #E2E8F0; padding:20px 40px; text-align:center;">
                            <p style="margin:0; font-size:12px; color:#94A3B8;">
                                Sent on behalf of <strong>{{ $clinicName }}</strong> via UMAHZ Wellness Platform.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
