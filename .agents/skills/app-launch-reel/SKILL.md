---
name: app-launch-reel
description: Build a chaptered app or product launch reel in HyperFrames in the style of the "motionref" NextDue reel. It opens on a logo build and hit, then a kinetic statement with a hand-drawn annotation, a live phone demo (rows pop in, a form is typed, a total counts, a row is completed with confetti), a one-second-per-frame feature montage (scan, widget, light/dark flip, languages), a type-only manifesto on a drop, and an end card. Every cut sits on a 120 BPM grid and flips luminance, a mono HUD counts the chapters, whips, pixel wipes, and irises carry the cuts, and every visual event has a synced sound. Six more frame types carry minute-long reels: modules converging into one card, stat counters, a dashboard, an AI chat with a video avatar, a permission grid, and a one-word-per-beat burst. Use for app promos, SaaS or product launch videos, feature reels, re-cutting a narrated product video into a music-driven reel, "motion reel" or "make it feel like motionref.mp4", 15 to 60 seconds, in 16:9 or 9:16.
---

# App launch reel

This skill turns a product into the kind of launch reel measured in `motionref.mp4`:
confident, optimistic, premium-tech, and fast without being frantic. The reference is 15
seconds. The same grammar stretches to a minute when the story follows the music's sections;
see [Minute-long reels](#minute-long-reels).

- **What was measured and why it works:**
  [references/reference-breakdown.md](references/reference-breakdown.md). Read its first
  section before designing; it is the brief for this style.
- **The fifteen frame types and their choreography:**
  [references/frame-types.md](references/frame-types.md). Nine come from the reference; six
  were added for longer reels.
- **The sound design system, sourcing, and the mix:**
  [references/sound-design.md](references/sound-design.md).
- **Every plan field:** [references/plan-format.md](references/plan-format.md).

A plan (`alr-plan.json`) describes the story. The builder lays out every frame, puts every
event on the beat grid, cues every sound from those same times, and premixes the soundtrack.
The motion runtime turns that into one seekable GSAP timeline. This is a motion-graphics spot.
Its only footage is an optional short silent clip inside the `chat` frame's call card, for
example a crop of the product's own avatar. For a reel that cuts to it, render it here and edit
it in with [short-form-edit](../short-form-edit/SKILL.md). Read the [hyperframes](../hyperframes/SKILL.md)
contract before touching generated HTML; change the plan and rebuild instead.

Building and rendering are local. Fonts (Inter 4.1 and JetBrains Mono, OFL) ship with the kit,
and the page carries a Content-Security-Policy limiting it to its own files. The one networked
step is downloading licensed music and effects once, with provenance. Set
`HYPERFRAMES_NO_TELEMETRY=1` and pass `--describe false` to `snapshot`.

## Workflow

1. **Create a project:** `npm run new-video -- <slug>`. Every path below is inside
   `video-projects/<slug>/`.
2. **Write the story before the plan.** Fill the arc with the product's real content:
   - **Identity:** the mark and the name.
   - **Promise:** one sentence of at most 6 words that names the pain.
   - **Proof:** the product doing its main job, with realistic data and one completed action.
   - **Breadth:** three to four features, one per one-second frame.
   - **Values:** two short lines, the second the twist.
   - **Call to action:** tagline and URL.

   Each frame carries one idea. Cut words until every headline fits on two lines.

   When re-cutting an existing narrated product video, transcribe it locally
   (`npm run transcribe:local`) and take the story, the copy, and the numbers from it and from
   the product's site. Never invent features or figures. Use the brand's own logo file as an
   image mark.
3. **Write `alr-plan.json`** from [templates/alr-plan.example.json](templates/alr-plan.example.json).
   Keep the reference grid (4, 3, 8, 2, 2, 2, 2, 3, 4 beats = 15 s at 120 BPM) unless the brief
   needs more product time. Add beats to `product` first.
4. **Get the audio.** Download a 118-124 BPM bed with a drop, plus the nine effect kinds, from a
   library whose licence allows commercial web video. Mixkit is the default; the demo's exact
   picks are in [references/sound-design.md](references/sound-design.md).

   ```sh
   node .agents/skills/ip-17-pro-style/scripts/fetch-audio.mjs <file-url> video-projects/<slug>/assets/audio/<name>.mp3 \
     --page "<page>" --license "<licence>" --license-url "<url>" --title "<title>" --artist "<artist>"
   ```

5. **Build, then cue the bed.** The first build prints the opening hit time (1.0 s by default).
   Measure the bed against it, put the printed `bpm` and `start` in `music`, and build again:

   ```sh
   node .agents/skills/app-launch-reel/scripts/build-reel.mjs video-projects/<slug>
   node .agents/skills/app-launch-reel/scripts/beat-grid.mjs video-projects/<slug>/assets/audio/<bed>.mp3 --hit 1.0
   ```

   The builder writes:
   - `index.html` and the kit in `alr/`.
   - The premixed `alr/audio/mix.wav`, plus stems for the audit.
   - The cue sheet `alr/cues.json`.
   - `DESIGN.md`, regenerated on every build.

   It prints the timeline and warns about crowded scenes, overlapping phone steps, and
   neighbours that share a luminance. A hand-written `index.html` or `DESIGN.md` is archived,
   never overwritten.
6. **Verify** with the gates below. Then render the final:
   `npx hyperframes render --quality high --output renders/<slug>-final.mp4`, and audit it too.

## The style grammar

These rules come from the measured reference. Break one only when the brief says so.

1. **One grid.** At 120 BPM, a beat is 0.5 s and a sixteenth 0.125 s.
   - Cuts land on beats.
   - Feature frames are two beats long.
   - Headline words, list rows, cards, and pills stagger on sixteenths; two-beat frames use
     32nds for copy.
2. **Flip luminance on every cut.** Dark (ink, black, night), mid (brand blue, violet), and
   light (paper) alternate. A hue shift (ink to violet) is the weakest acceptable change.
3. **One idea per frame.** One sentence of at most 7 words, one hero object, one accent.
   Eyebrows name the feature in spaced caps; subs are one short line.
4. **Type:**
   - Inter at optical size 32, weight 750-800, tracking -0.04 to -0.05 em.
   - H1 138 px, H2 86 px, H3 64 px, wordmark 118-132 px.
   - Eyebrows 19 px at 600 with 0.24 em tracking. Sub copy 30 px at 450.
   - Every word rises through a mask in about 0.5 s (power4.out) with a 5 px blur. Nothing
     fades in whole.
5. **HUD on every frame but the end card:**
   - JetBrains Mono caps at 15 px with 0.16 em tracking.
   - Top left: brand / reel. Top right: `03 / 06 — CHAPTER`. Bottom left: a running
     timecode. Bottom right: a progress bar.
   - It inverts on light frames.
6. **Colour:**
   - One brand blue family (#1a76fc to #434dd0) plus ink #050811, paper #f9f9fb, violet
     #2f248d, and black.
   - Soft blue #83afff marks second lines on dark.
   - A black-and-white brand uses `"palette": { "mono": true }`: graphite replaces the blue,
     and the accents turn black, white, or grey (see plan-format.md).
   - The warm accent (#ffc9a8) appears once, as the hand-drawn annotation.
   - Success green lives only in the UI.
7. **Show the product working.** It gets the longest scene: rows pop in, a sheet slides up, text
   is typed, buttons are tapped with a ripple, a total counts, and a row completes with confetti
   and a toast. Use real-looking data and no real brand icons.
8. **Transitions are motivated:**
   - iris: the logo opens into the promise.
   - pixel stair: into the product.
   - whips: through the montage.
   - theme wipe: the light/dark feature itself.
   - focus pull: slowing into the manifesto.
   - iris: into the end card, mirroring the opening.

   No crossfades, no fades to black, no jump cuts.
9. **Nothing is ever frozen before the end card.** Devices drift, glows breathe, ghost numerals
   slide, and cameras creep. Fast moves carry motion blur or echo copies.
10. **Every visual event has a sound, on the grid.** Whooshes lead each cut by 1-4 frames, and
    pops land on rows, cards, pills, and tags. Taps, typing, the scan sweep, the success chime,
    a riser into the opening hit and into the drop, and a shimmer on the lockup complete the
    set. Levels: -14 LUFS, at least 4 LU of range (quiet build, loud drop, ring-out), and a true
    peak of -1 dBTP or lower.

| Setting | Value |
| --- | --- |
| Canvas | 1920x1080 or 1080x1920, 30 fps |
| Default grid | 120 BPM, 30 beats = 15.0 s |
| Word rise | yPercent 115 -> 0, blur 5 -> 0 px, 0.5 s power4.out, 1/16 stagger |
| Phone entry | from (+180, +820) px at -16 deg to 3 deg, 0.55 s expo.out, 3 echo copies 33 ms apart |
| Whip | 0.34 s power4.inOut push, horizontal blur up to 90 px at the cut, 110 px hero lag |
| Pixel stair | 8 columns, 0.16 s each in 4 steps, completing on the cut |
| Iris | 0.3 s power3.in circular reveal from an element, two leading echo discs |
| Theme wipe | 0.3 s, slanted about 18 deg, 3 echo bands and a knob |
| Mix | bed 0.5, lift 3.2 after the drop, half-beat gap before it, -14 LUFS, -4 dBFS ceiling (a minute-long reel: bed 0.7, lift 2.0, fade 3.2) |

## Voiceover

Add a `voice` block to the plan (see [references/plan-format.md](references/plan-format.md)
and the voiceover notes in [references/sound-design.md](references/sound-design.md)).
- **Lines:** one line per frame or less, each generated as its own file (local Kokoro works
  well) and placed on a scene beat.
- **Mix:** the builder levels the voice, ducks the bed and effects under it, and writes a voice
  stem. The audit checks that the voice sits above the bed.
- **Checks:** transcribe the lines locally to catch mispronounced names before building.

## Vertical (9:16) versions

Copy the project's plan and assets into a new project, set `"format": "portrait"`, and
rebuild. Nothing else changes: the timing, the sound, and the voiceover are shared. Then
snapshot every scene.
- **Long statements:** an H1 is 118 px in portrait, so a line holds about 15 characters. Re-break
  longer lines into more lines (for example "This isn't" / "another" / "*disconnected*" /
  "*system.*"). The underline follows the last emphasised line.
- **Pure-black drops:** a pure-black (`black`) scene whose text fades in can register as a
  black frame in the tall frame. Use `ink` there.

## Minute-long reels

A minute at 120 BPM is 120 beats. It holds three acts only if the story follows the bed's own
structure: its first drop, its breakdown, and its second drop.

1. **Map the bed first.** `beat-grid.mjs` lists every drop. Profile the bars between them for
   the breakdown, where the bass drops out. For example, Electro Dreams from 15.03 s gives the
   hit at 1.0 s, a full groove to 33 s, a breakdown to 47 s, a build, and the second drop at
   49 s.
2. **Act 1, the full groove:**
   - Identity, the problem (`statement`), and the platform (`modules`).
   - The product working: `scan`, then a long `product` of 16-18 beats with three steps.
   - Breadth: a dark `stack`, a `metric` montage of four one-second numbers, and a `dashboard`.
   - Change chapter on the 8-second phrase boundaries where you can.
3. **Act 2, the breakdown:** the calmer, human beats.
   - Focus-pull into it. A `chat` with the assistant or avatar, then languages in `lines`.
   - Then trust: a `matrix`, a light `statement`, and a tension `statement` over the build.
4. **Act 3, the second drop:** a `manifesto` on the drop itself (three lines if the tagline is
   long), a `burst` of one word per beat, then an 8-beat `endcard` while the bed fades.

Keep one idea per frame. Keep the luminance flip at every cut; the builder warns about
neighbours that share a luminance. Keep at most one video. Write the storyboard as a table in the
project's `PLAN.md` before the plan file: time, beats, frame type, tone, chapter, content, exit.
It is the plan the user reviews, and it is where the music map lives.

## Gates before delivery

Run from the project folder with `HYPERFRAMES_NO_TELEMETRY=1` set:

1. `npx hyperframes lint` reports 0 errors. Two `timeline_track_too_dense` warnings are expected:
   the reel is one composition by design.
2. Snapshot the hero frames and check them. For the 15 s grid:
   `npx hyperframes snapshot --at 1.8,2.95,4.3,5.3,6.9,8.3,9.3,9.9,10.3,11.2,12.6,14.5 --no-end --describe false`.
   For other grids, take a time about two thirds into each scene from the printed timeline.
   - No text overflows or collides with the device.
   - The underline sits under the emphasised word.
   - The tags stay on screen.
   - The widget is not clipped.
   - The dark half of the theme flip is readable.
   - A chat's video sits exactly in its slot, and the render shows it moving: the
     frame-to-frame change inside the slot is above zero between the stills.
3. Render a draft and audit it:

   ```sh
   npx hyperframes render --quality draft --output renders/<slug>-draft.mp4
   node ../../.agents/skills/app-launch-reel/scripts/reel-audit.mjs . renders/<slug>-draft.mp4
   ```

   It checks:
   - Format.
   - A clear picture change across every cut.
   - The luminance flip.
   - No black frames and no frozen stretch.
   - Loudness, true peak, and range.
   - A/V sync against `mix.wav`.
   - Whoosh timing, on the sfx stem.
   - The bed's kicks on the cut grid, on the bed stem.
   - A ring-out ending.

   Any FAIL blocks delivery; read every WARN.
4. Watch the draft at full speed with sound. Look for:
   - The hit at 1 s.
   - Each whoosh pulling its cut.
   - The typed field and the counting total.
   - The confetti.
   - The drop into the manifesto.
   - The ring-out.

   Extract frames at 10 fps around every cut (see the reference breakdown's recipe) and inspect
   them.
5. If the render's true peak lands at -1 dBTP or above while `mix.wav` sits near -5, the
   renderer's AAC encoder has overshot a transient. Keep the render, and deliver a remux of the
   same mix with a cleaner encoder, then audit that file:

   ```sh
   ffmpeg -i renders/<slug>-render.mp4 -i alr/audio/mix.wav -map 0:v -map 1:a -c:v copy \
     -c:a aac_at -b:a 256k -shortest -movflags +faststart renders/<slug>-final.mp4
   ```

   `aac_at` is the macOS AudioToolbox encoder; elsewhere use `-c:a aac -b:a 256k`.
6. Record the checks, the audio sources and licences (copy each `.provenance.json`), and
   anything unverified in `VERIFY.md`.
7. **Readability:** a two-beat frame (one second) suits one word or one short number. A metric
   with a label, three lines of text, or a lockup that must be read needs at least three beats
   after it lands. In a minute-long reel, pay for extra beats from the long holds (the product
   demo, the dashboard) inside the same music section, so the breakdown and the drop stay put.

## Do not

- Do not copy the reference app's name, icon, copy, or UI, or use any real brand's logo or app
  icons in the device. The mark presets and blank home-screen tiles are placeholders.
- Do not put two ideas in one frame, write paragraphs, or let a headline wrap to three lines.
- Do not cut off the grid, leave a transition silent, or use synthesized music.
- Do not use CJK or other non-Latin scripts without bundling and declaring a font for them. The
  Latin subset has no peso sign (₱); write "PHP".
- Do not put media inside a scene: the builder places the chat video at the top level.
- Do not edit `index.html`, `alr/`, or `mix.wav` by hand; change the plan and rebuild.

## Files

- [scripts/build-reel.mjs](scripts/build-reel.mjs) builds the page, the grid, the cue sheet, the
  premixed soundtrack, the stems, and `DESIGN.md` from the plan.
- [scripts/beat-grid.mjs](scripts/beat-grid.mjs) measures a bed's tempo, phase, and drops, and
  prints the `music` block.
- [scripts/reel-audit.mjs](scripts/reel-audit.mjs) checks a render against the style's
  measurable rules.
- [assets/alr-kit.js](assets/alr-kit.js) is the motion runtime: scene choreographies,
  transitions, echo, counters, typing, and the HUD.
- [assets/alr-kit.css](assets/alr-kit.css) is the look: tones, HUD, type, the phone UI, and
  frame layouts.
- The runtime removes each scene from the render tree outside its clip window. A 60 s reel
  carries dozens of gradient, blur, and clip-path layers, and HyperFrames lint warns about the
  count. Check the audit's black-frame line.
- [assets/fonts/](assets/fonts/) holds Inter 4.1 and JetBrains Mono (Latin subsets, OFL).
- [templates/alr-plan.example.json](templates/alr-plan.example.json) is a complete 15 s reel for
  a fictional subscription tracker.
- Audio downloads use [../ip-17-pro-style/scripts/fetch-audio.mjs](../ip-17-pro-style/scripts/fetch-audio.mjs).
