---
name: white-minimal-reel
description: Recreate the "white minimal" short-form edit in HyperFrames instead of After Effects and Premiere. A talking-head reel cuts to warm paper-white animation scenes, each with one desaturated photographed object, the spoken words set around it in gold compressed type, script, and a small grotesk, blurred props on the frame edges, and a 12 fps posterized, grained finish. Use when asked for the white minimal, minimal animation, or paper-object reel style, or to match that reference edit.
---

# White minimal reel

This skill reproduces a specific, reverse-engineered editing style with deterministic
HyperFrames compositions. The reference is an After Effects and Premiere tutorial
(https://www.youtube.com/watch?v=mQSYjBcosTs). What was measured, and how, is in
[references/reference-breakdown.md](references/reference-breakdown.md). The effect-by-effect
translation is in [references/ae-to-hyperframes.md](references/ae-to-hyperframes.md).

Use [short-form-edit](../short-form-edit/SKILL.md) for the story, hook, cut review, and audio
mix. This skill supplies the look, the scene grammar, and the motion system. Read the
[hyperframes](../hyperframes/SKILL.md) contract before editing generated HTML by hand.

## Workflow

1. **Cut the story first.** Choose a hook that raises a question, then the lines that build
   to one clear takeaway. Remove silences and flubs with `cut-silences` and `cut-mistakes`,
   keep natural breaths, and use J-cuts where a line needs air. Render one clean cut
   (`assets/cut.mp4`) with a keyframe every second before designing anything:
   `ffmpeg -i <edit> -c:v libx264 -r 30 -g 30 -keyint_min 30 -crf 16 -c:a aac assets/cut.mp4`.
   Sparse keyframes freeze footage in renders; the build warns when it finds them.
2. **Transcribe that cut locally**: `npm run transcribe:local -- video-projects/<slug>/assets/cut.mp4`.
   Every scene word and caption is timed from this file. Never time against the uncut source.
3. **Choose the scene beats.** Read the transcript and mark 3-5 lines per 40 seconds that carry
   a concept a viewer can picture. Each becomes a 2-4 second animation scene. Keep the face
   for the hook, for conviction lines, and for the payoff. Aim for 40-50% of the runtime
   animated. Chain two scenes back to back when one thought spans them.
4. **Get the objects.** Each scene needs one hero object that stands for its idea (a brain for
   self-image, a dumbbell for effort) and up to two edge props. Prefer the user's own images.
   Otherwise find public-domain or CC0 photos and lift them locally:

   ```sh
   node .claude/skills/white-minimal-reel/scripts/fetch-object.mjs "hourglass"
   node .claude/skills/white-minimal-reel/scripts/fetch-object.mjs "hourglass" --pick 2 \
     --out video-projects/<slug>/assets/objects/hourglass --cutout
   ```

   The fetcher keeps provenance and license beside each file. Cutouts use Apple Vision on
   macOS. `--instance N` keeps a single object when a photo holds several. Choose opaque,
   single, evenly lit objects. Glass, line art, cluttered scenes, and visible brand marks
   cut out or read badly. Inspect every cutout before use.
5. **Write `wm-plan.json`** in the project. The format is in
   [references/plan-format.md](references/plan-format.md), and five proven layouts with
   coordinates are in [references/scene-archetypes.md](references/scene-archetypes.md).
   Start from [templates/wm-plan.example.json](templates/wm-plan.example.json).
6. **Build the compositions:**

   ```sh
   node .claude/skills/white-minimal-reel/scripts/build-reel.mjs video-projects/<slug>
   ```

   It writes `index.html` (footage, audio, framing), `compositions/wm-captions.html`, one
   `compositions/wm-<scene>.html` per scene, the runtime kit in `wm/`, and a `DESIGN.md`.
   A hand-written `index.html` or `DESIGN.md` is archived, never overwritten. Rebuild
   after every plan change instead of editing generated files.
7. **Verify** (see the gates below), then render the final with
   `npx hyperframes render --quality high --output renders/<slug>-final.mp4`.

## The style grammar

These rules come from the measured reference. Break them only when the brief says so.

1. **Two worlds.** Footage runs at full frame rate with captions. Animation scenes are fully
   opaque paper worlds that replace the face while the audio continues. Captions never sit on
   an animation scene; the scene's own type carries those words.
2. **Build every scene in four layers:** textured background, one hero object, the spoken
   words around it, and blurred props on the frame edges.
3. **Background:** a four-point warm gradient (paper, greige, tan, shade), faint mottled
   paper texture, and soft window-blind shadows. Vary the shadow angle between scenes.
4. **Hero object:** desaturated (about 85%), slightly darkened, rotated a few degrees, with a
   long soft shadow streaking away from an off-frame light, an inner shade on its edges, and
   a fine halftone clipped to its silhouette.
5. **Words are the transcript, re-set.** Only words the speaker says in that window appear, in
   spoken order, each revealed on its own onset. Assign roles: the concept word is the
   **hero** (heavy compressed, gold-to-brown gradient); connective words are **small**
   (compact grotesk, ink gradient, often 50% opacity); an emotional or special word is
   **script** (formal script at 40-50% opacity, or solid gold when it is the point); one
   long word may become a **ghost** (huge, 50% grey, behind the object, bleeding off-frame).
   Put some type behind the object and some in front for depth.
6. **Word entrance:** rise about 27 px, fade in, defocus to sharp, 0.5 s, fast then slow.
   Stagger by speech, never by a fixed interval. No exits inside a scene.
7. **Edge props:** partial objects at corners or edges, blurred 8-12 px, drop-shadowed,
   drifting linearly 20-40 px with 2-4 degrees of rotation across the whole scene.
8. **Accent stroke (optional):** a trim-path line drawn behind the object: a wide, blurred,
   25%-opacity sweep that reads as a shadow, a zigzag for a downward idea, or a crisp dark
   curve for a journey.
9. **Camera:** a hard cut into a scene lands at 140% and heavily blurred, then settles to 110%
   and sharp in about one second. Back-to-back scenes use a blur push: the outgoing scene
   drifts 45 px right while blurring (slow then fast, 0.5 s); the next starts 55 px left and
   blurred and glides in (fast then slow, 0.9 s).
10. **Never frozen.** Objects and panels ease out over the whole scene: most of the move lands
    early, then it keeps creeping until the cut.
11. **Finish:** vignette, soft blur on the frame edges, about 13% grain that re-rolls every
    frame, and the whole scene posterized to 12 fps. Footage is never posterized.
12. **Captions over footage:** compact grotesk 600, 80 px, off-white, centered at y 1370.
    Groups of one to three words, at most 1.5 s, rise and defocus in over 0.3 s, and swap
    without exit animations. The opening line can stack word by word in mixed sizes.
13. **Returns to the face** are near-hard cuts: a 0.28 s micro-settle (this satisfies the
    HyperFrames no-jump-cut rule and still reads as a cut). Alternate a 1.16-1.18x punch-in
    between returns so a single camera feels like several angles.

| Setting | Value |
| --- | --- |
| Canvas | 1080x1920, 30 fps |
| Scene length | 2-4 s, settle ~1.0 s |
| Posterize | 12 fps inside scenes only |
| Hero type | Anton, 200-330 px, gradient #957838 -> #2b2210 |
| Small type | Familjen Grotesk 600, 50-70 px, ink #5a544e -> #161412 |
| Script | Pinyon Script, 120-230 px, 40-50% opacity |
| Word pop | y +27 px, blur 6 px -> 0, 0.5 s power3.out |
| Paper | base #c4b9ad, light #e2d9ce, shade #958a80 |
| Grain / vignette / edge blur | 0.13 / 0.42 / 9 px |

The fonts are free OFL stand-ins for the reference's commercial faces and ship with the kit.
To use licensed originals, see the font section of
[references/ae-to-hyperframes.md](references/ae-to-hyperframes.md).

## Gates before delivery

1. `npx hyperframes lint` has no errors. A dense caption-track warning is expected.
2. Snapshot every scene's hero frame and one frame per caption layout:
   `npx hyperframes snapshot --at <times> --no-end`. Check word order, overlaps you did not
   intend, readable small type at phone size, and that no word appears before it is spoken.
3. Render a draft, then run the motion audit. It must report about 12 unique frames per second
   inside scenes, no hold longer than 0.9 s, and full-rate footage:
   `node .claude/skills/white-minimal-reel/scripts/motion-audit.mjs video-projects/<slug> renders/<draft>.mp4`
4. Build a strip of each transition (10 frames at 0.1 s) and compare it with a reference
   strip when one is available. The recipe is in the reference breakdown.
5. Listen to every join and the first word after each scene cut.
6. Record results, object provenance, and anything unverified in `VERIFY.md`.

## Do not

- Do not reproduce another creator's footage, words, or branded assets; borrow the mechanics.
- Do not use saturated colour, neon, UI cards, emoji, or more than one hero object per scene.
- Do not caption over an animation scene or animate a word before it is spoken.
- Do not use `hyperframes remove-background` for objects; it is tuned for people.
- Do not edit generated HTML and then rebuild; change `wm-plan.json` and rebuild.

## Files

- [scripts/build-reel.mjs](scripts/build-reel.mjs) builds the project from the plan.
- [scripts/fetch-object.mjs](scripts/fetch-object.mjs) finds PD/CC0 objects and records provenance.
- [scripts/cutout.swift](scripts/cutout.swift) lifts objects with Apple Vision.
- [scripts/motion-audit.mjs](scripts/motion-audit.mjs) checks posterize and footage cadence.
- [assets/wm-kit.css](assets/wm-kit.css) and [assets/wm-kit.js](assets/wm-kit.js) are the
  look and motion runtime copied into each project.
- [assets/fonts/](assets/fonts/) holds the bundled OFL fonts and their licenses, declared with
  `@font-face` so rendering never depends on font discovery.
