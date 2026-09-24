---
name: ip-17-pro-style
description: Recreate the Apple-style "iPhone 17 Pro" product promo in HyperFrames instead of After Effects, fully offline. A white stage where two photoreal 3D phones fly in from the top and bottom spinning a full turn, the offer copy slides in from the left in a staggered Montserrat stack with a green highlight drawn behind a white price, a gift card pops in, everything holds still and then plays exactly in reverse, and a brand mark bounces in and slides aside as its wordmark emerges. Motion blur throughout. Use when asked for the iPhone 17 Pro / Apple-style promo, a clean product commercial with 3D phones, or to match that reference ad; landscape 16:9 or portrait 9:16.
---

# iPhone 17 Pro style promo

This skill reproduces a reverse-engineered After Effects product ad as a deterministic
HyperFrames composition. The reference is https://www.youtube.com/watch?v=ALXSnlRJsgc.

- **What was measured, and how**: [references/reference-breakdown.md](references/reference-breakdown.md).
- **Each AE technique and its HTML/three.js equivalent**:
  [references/ae-to-hyperframes.md](references/ae-to-hyperframes.md).

**Building and rendering are entirely local.** No API keys, no network requests:

- The phones and the gift are procedural three.js models, or your own GLB files.
- The fonts ship with the kit and are the only families the page names.
- The page carries a Content-Security-Policy: the browser may only load the project's own files.
- The builder accepts only files inside the project. It rejects URLs, undeclared fonts, and
  markup wherever a plan value reaches the page: file fields, `css`, colours, SVG marks, and
  textures inside glTF models.

The one step that uses the network is sourcing the music. You find a real, licensed track and a
hit in the browser and download them once, with a provenance record
([references/music.md](references/music.md)). The skill does not synthesize music.

The HyperFrames CLI sends anonymous usage telemetry, and it checks npm and GitHub for updates
once a day. Every command below sets `HYPERFRAMES_NO_TELEMETRY=1`; alternatively, run
`npx hyperframes telemetry disable` once. Always pass `--describe false` to `snapshot`, so frames
never go to Gemini even if a `GEMINI_API_KEY` is set.
[scripts/offline-guard.cjs](scripts/offline-guard.cjs) proves a run is offline. It blocks and
logs every non-local connection from the CLI, the tools it runs, and the headless browser (a
local proxy that refuses everything). The update checks are refused too, and reported as
"suppressed".

Unlike the talking-head skills, this is a motion-graphics spot with no footage or transcript.
For a reel that cuts to it, render the spot here and edit it in with
[short-form-edit](../short-form-edit/SKILL.md). Read the
[hyperframes](../hyperframes/SKILL.md) contract before editing generated HTML by hand. Instead of
hand edits, change the plan and rebuild.

## Workflow

1. **Create a project**: `npm run new-video -- <slug>`. Every path below is inside
   `video-projects/<slug>/`.
2. **Write `ip-plan.json`**. Start from [templates/ip-plan.example.json](templates/ip-plan.example.json)
   (16:9, the reference layout) or [templates/ip-plan.portrait.json](templates/ip-plan.portrait.json)
   (9:16 for reels). The format is in [references/plan-format.md](references/plan-format.md).
   - **Copy**: keep the reference's shape. That is a product name, a short tagline, one to three
     offer lines, at most one price, and a gift line.
   - **Products**: default to the procedural phones. Only bring a GLB you have rights to; see
     [references/products.md](references/products.md).
3. **Find the music in the browser and download it**, from the kit root, as in step 4. Use a
   trap bed of about 140 BPM with a hard drop, and a clean hit for the lockup. Download both
   from a library whose licence allows commercial web video (Mixkit, or Pixabay tracks that are
   not Content ID registered). The recipe, the licences, and the picks the demo uses are in
   [references/music.md](references/music.md).

   ```sh
   node .agents/skills/ip-17-pro-style/scripts/fetch-audio.mjs <file-url> video-projects/<slug>/assets/audio/<name>.mp3 \
     --page "<track page>" --license "<licence>" --title "<title>" --artist "<artist>"
   ```

   Run it in a shell without the offline guard: it refuses when `NODE_OPTIONS` preloads the
   guard. Both templates expect `assets/audio/young-trizzy-02.mp3` and
   `big-cinematic-impact.mp3`. For a silent spot, delete the `audio` block.

4. **Build**:

   ```sh
   node .agents/skills/ip-17-pro-style/scripts/build-promo.mjs video-projects/<slug>
   ```

   - It writes `index.html`, the runtime in `ip/`, trimmed audio in `ip/audio/`, and
     `DESIGN.md`.
   - It bundles three.js locally.
   - A hand-written `index.html` or `DESIGN.md` is archived, never overwritten.
   - `DESIGN.md` is regenerated on every build, so it always describes the current plan.
   - It prints the timeline landmarks. For the reference defaults, those are: settle 2.18 s,
     reverse from 3.52 s, mirror 5.70 s, mark pop 5.36 s, slide 5.97 s, end 8.0 s, bed cut
     5.403 s.
   - Cue the bed with that bed cut, put the suggested `musicStart` in the plan, and build
     again. The drop then lands under the products and the cut at the pop falls on a bar line:

     ```sh
     node .agents/skills/ip-17-pro-style/scripts/music-cue.mjs video-projects/<slug>/assets/audio/<name>.mp3 --cut <bed cut>
     ```
5. **Verify** using the gates below. Then, still with the guard exported, render the final and
   audit it the same way. The root carries `data-fps`, so the plan's fps is the default:

   ```sh
   npx hyperframes render --quality high --output renders/<slug>-final.mp4
   node "$KIT/scripts/promo-audit.mjs" . renders/<slug>-final.mp4 --network-log renders/offline.log
   ```

## The style grammar

These rules come from the measured reference. Break them only when the brief says so.

1. **White stage, two products, one copy column.**
   - **Landscape**: the copy stack is centred on x 570 and the products sit on the right.
   - **Portrait**: the copy is on top and the products are underneath.
   - No gradients, textures, shadows under type, or extra decoration.
2. **Products fly in from beyond opposite edges.**
   - The front one comes from below and the back one from above. Each spins one full turn about
     its long axis: back, edge, screen, edge, back.
   - Both settle together at 1.667 s with `cubic-bezier(0.34, 0, 0.03, 1)`: fast, then a very
     long settle. At rest the power-button edge is turned about 30 degrees toward camera.
3. **The glint.**
   - The orange back catches a softbox only in the last degrees of its settle, and turns from
     orange to gold.
   - This comes from the studio environment. Keep it when changing finishes.
4. **Copy slides in from the left as a centred stack.**
   - Montserrat 700 is used for the lines and 500 for the tagline; sizes are title 78, lines
     56.5, tagline 47.6 px at 1080p.
   - Each line starts 0.083 s after the previous one and travels 1.667 s with
     `cubic-bezier(0.69, 0, 0.10, 1)`, starting fully off-frame.
5. **The price is revealed, not animated.**
   - It is set in white on white. A round-capped green stroke (#67e172) draws behind it, left to
     right, in 0.49 s at 1.07 s, so the price appears as the stroke passes.
6. **Gift card**: a 25% black rounded card scales 0 -> 115% -> 100% (0.5 s + 0.5 s) from 1.10 s.
   The gift pops five frames later and spins in.
7. **Complete stillness.** Once everything settles, nothing moves for about 1.3 s.
8. **The exit is the entrance played backwards.**
   - After the mirror point, every entrance property is evaluated at `mirror - t`: the highlight
     un-draws, the card shrinks, the copy slides out, and the phones spin away.
   - Never design a separate exit.
9. **End card**: the mark pops at centre with a shallow bounce as the last phone leaves. It
   slides left 0.61 s later while the wordmark slides out from behind it. The mark is painted
   above the word, and the word only shows right of the mark's edge. Then everything holds for
   1.2 s.
10. **Motion blur on everything**, at a 180-degree shutter. Type smears horizontally with speed,
    cards and the mark blur as they scale, and the 3D layer averages ten sub-frames.
11. **Sound**:
    - The music bed runs under the products and stops dead as the mark pops.
    - A single stinger lands on the lockup slide.
    - No whooshes.

| Setting | Value |
| --- | --- |
| Canvas | 1920x1080 or 1080x1920, 60 fps, 8.0 s with defaults |
| Products | 0-1.667 s, 360-degree spin, rest ry 30 / 36, heights 785 / 770 px |
| Copy | start -0.196 s, stagger 0.083 s, 1.667 s, from 0.83 W left |
| Highlight | 1.074-1.565 s, easy ease, 1.17 em tall, 0.9 em overhang |
| Card | 258 x 310, radius 14, rgba(0,0,0,0.25) |
| Hold | settle 2.18 s, 1.333 s of stillness, mirror at 5.70 s (snapped to a whole frame) |
| End | lockup slide end + 1.2 s (8.0 s); without a lockup, 0.5 s of empty stage after the exit |
| Lockup | pop 0.52 s (bounce a1 0.154), slide 0.83 s `cubic-bezier(0.33, 0, 0, 1)` |
| Motion blur | shutter 0.5 frame, 10 sub-frames |

## Gates before delivery

Run these from the project folder with the guard preloaded. The audit then proves nothing
reached the network:

```sh
cd video-projects/<slug>
KIT="$(git rev-parse --show-toplevel)/.agents/skills/ip-17-pro-style"
rm -f renders/offline.log
export HYPERFRAMES_NO_TELEMETRY=1 IP_OFFLINE_LOG="$PWD/renders/offline.log" NODE_OPTIONS="--require \"$KIT/scripts/offline-guard.cjs\""
```

The audit ties the log to the exact file it checks: path, size, and modification time, as the
guard recorded them when the render finished successfully. An interrupted render records
nothing. Always render with `--output`. Unset the exports
(`unset NODE_OPTIONS IP_OFFLINE_LOG`) before sourcing more music.

1. `npx hyperframes lint` reports 0 errors.
2. Snapshots: `npx hyperframes snapshot --at 0.5,0.8,1.2,3,4.9,5.6,6.2,7.5 --no-end --describe false`.
   - Check that the copy fits its column, and that no line runs under the products.
   - The price must be fully covered by the highlight at rest.
   - The gift must sit inside its card, and the lockup must be centred and fully legible.
3. Render a draft (`npx hyperframes render --quality draft --output renders/<draft>.mp4`), then
   run the audit:

   ```sh
   node "$KIT/scripts/promo-audit.mjs" . renders/<draft>.mp4 --network-log renders/offline.log
   ```

   It checks:
   - Frame size, rate, and count.
   - A perfectly still hold.
   - The exit mirroring the entrance (frame n against frame mirror - n).
   - No blank gap after the opening.
   - A still end card.
   - The bed running up to the pop and stopping exactly there. The file must be long enough and
     not silent.
   - The stinger's hit landing on the slide. Its first 0.4 s must be its loudest part and
     within 15 dB of the bed. A riser, or a start in the decaying tail, fails.
   - True peak of -1 dBTP or lower.
   - Offline: this exact file came from a guarded render that proxied its browser, and no
     guarded command was blocked.
   - Without a lockup: no long empty tail. The spot ends about 0.5 s after the exit.
4. Watch the draft at full speed. Listen to the cut at the pop and to the stinger.
5. Optional, and it needs the network once: compare the draft with the reference side by side at
   5 fps. The download and the recipe are in the reference breakdown; a local copy you already
   have works too.
6. Record results, model and music sources and licences (copy the `.provenance.json` records),
   and anything unverified in `VERIFY.md`.

## Do not

- Do not use a third party's logo, product design, or trademarks, including Apple's. The
  procedural phones carry no logo and the default mark is a placeholder.
- Do not add a hand-made exit, extra transitions, or per-letter animation.
- Do not use Draco or Meshopt compressed GLB files (no decoders ship), remote files, or font
  families the kit does not bundle. An undeclared family makes HyperFrames fetch it from Google
  Fonts.
- Do not edit the generated `index.html`; change `ip-plan.json` and rebuild.

## Files

- [scripts/build-promo.mjs](scripts/build-promo.mjs) builds the project from the plan and bundles
  three.js.
- [scripts/fetch-audio.mjs](scripts/fetch-audio.mjs) downloads a track or hit you found and records
  its source, licence, and checksum.
- [scripts/music-cue.mjs](scripts/music-cue.mjs) finds a track's tempo and drops and suggests
  `musicStart`.
- [scripts/promo-audit.mjs](scripts/promo-audit.mjs) checks a render against the style's
  structure.
- [scripts/offline-guard.cjs](scripts/offline-guard.cjs) is a Node preload that blocks and logs
  any non-local connection from the CLI and from the headless browser.
- [assets/ip-kit.js](assets/ip-kit.js) holds the time-pure channels, eases, mirror time, and
  motion blur for the DOM layers.
- [assets/ip-3d.mjs](assets/ip-3d.mjs) holds the procedural products, the GLB loader, the studio
  lighting, and the sub-frame motion blur.
- [assets/ip-kit.css](assets/ip-kit.css) and [assets/fonts/](assets/fonts/) hold the look,
  Montserrat, and Inter (OFL, licences included).
