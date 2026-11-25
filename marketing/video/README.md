# UMAHZ promo videos

Three cuts made from real captures of the UMAHZ app (demo clinic "Astrogen Wellness Centre", demo data only).
Source project: `Desktop/remotion-studio` (Remotion). Everything here can be re-rendered from it.

| File | Use | Spec |
|---|---|---|
| `umahz-promo-main-1080p.mp4` / `.webm` | Main product video (website, YouTube, sales) | 90 s · 1920×1080 · 30 fps · music + UI sound |
| `umahz-hero-loop-1080p.mp4` / `.webm` | Website hero background | 18 s · 1920×1080 · 30 fps · **muted, seamless loop**, < 6 MB |
| `umahz-social-1080x1920.mp4` / `.webm` | Instagram / TikTok / Shorts / LinkedIn vertical | 30 s · 1080×1920 · 30 fps · music + UI sound |
| `*-poster.png` | Poster/thumbnail for each video | same size as its video |

MP4 = H.264, yuv420p, `+faststart` (plays before fully downloaded). WebM = VP9 (+ Opus audio).

## Website hero embed

```html
<video autoplay muted loop playsinline preload="auto" poster="/marketing/video/umahz-hero-loop-1080p-poster.png">
  <source src="/marketing/video/umahz-hero-loop-1080p.webm" type="video/webm" />
  <source src="/marketing/video/umahz-hero-loop-1080p.mp4" type="video/mp4" />
</video>
```

`muted` + `playsinline` are required for autoplay on iOS/Chrome. The last frame flows into the first, so `loop` is seamless.

## Audio

The music and sound effects are **original**, synthesised from scratch by `remotion-studio/scripts/compose_audio.py`
(no samples, no third-party or copyrighted music). To use a licensed track instead, drop it into
`remotion-studio/public/audio/` and pass it as the `music` prop (the `sfx` stem stays in sync).

## Content rules followed

- Only features that exist in the app; claims verified in code (e.g. "No double-booking" = `BookingService::assertNoConflicts`, plans $39 / $69 / $90 CAD per month, Scribe languages English / Mandarin / French).
- No compliance claims (HIPAA/PHIPA/PIPEDA), no accuracy claims, no rankings, statistics, ratings or testimonials.
- AI Scribe is shown as drafting help the practitioner reviews and signs ("Draft – review before signing"), never as automatic notes. AI Scribe pricing is not mentioned (it may be an add-on).
- Demo data only (example.com emails, 555 phone numbers); every capture passed an automated privacy scan.
  No login screen, passwords, localhost/dev URLs, `.env`, terminals or admin pages appear.
  The browser frame is our own and shows `astrogenapp.umahz.com` (clinic) or `umahz.com` (public pages).

## Re-rendering

```bash
cd ../remotion-studio
npx remotion render src/index.ts PromoMain out/promo-main.mp4 --image-format=png --crf=16 --x264-preset=slow
npx remotion render src/index.ts HeroLoop  out/hero-loop.mp4  --image-format=png --crf=21 --x264-preset=slow --muted
npx remotion render src/index.ts Social    out/social.mp4     --image-format=png --crf=16 --x264-preset=slow
```

Captures are refreshed with `node capture/capture.mjs` (needs the local demo instances; see that file's header).
