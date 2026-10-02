---
name: cutout-strobe
description: Edit performance footage in the "cutout strobe" style in HyperFrames, a music-driven cut where the performer holds still and the world behind strobes. In each shot the subject is cut out and kept on top while a window cut into the shot behind (a closing slit, shutting blinds, an X, a growing disc, a corner panel) shows a montage of the film's other shots, blurred to texture, one picture a frame. The next shot steps in over the current one as white shapes (a bar, columns, a disc, the next subject's silhouette), lands through a two-frame whip, and a one-frame white flash with a thirteen-frame decay marks the backbeat. The picture is full while the track's bass is in and breaks into white shapes while it rests. Use for musician, dancer, athlete, fashion, and artist promos, playthrough and performance reels, or when asked for the RJ Pasin "remedy" style, the cutout edit, white silhouette flashes, or a montage behind the subject; 10-30 s, 16:9 by default, also 9:16 and square.
---

# Cutout strobe

This skill edits footage the way the measured reference does. The reference is a 19.3 s reel by a
guitarist for one of his tracks: he plays in a warehouse and on a laser-lit stage, and the edit
keeps him cut out and steady in front while everything behind him changes 25 times a second.

[references/reference-breakdown.md](references/reference-breakdown.md) holds the frame map, the
measurements, and the reasoning. Read "Why it is so good" before planning. The short version:
one thing holds still, the picture follows the track's bass frame for frame, every cut is
announced by white shapes, and white is the only graphic.

A plan (`cs-plan.json`) names the clips and lists the timeline in frames. The builder:
- Grades every shot into a proxy and cuts out its subject with `hyperframes remove-background`
  (a local model).
- Bakes the montage stills: blurred, pulled to near grey, and levelled to one brightness.
- Compiles every window outline, montage picture, white shape, whip, and flash into frame-exact
  state changes.
- Checks the plan against the track: bass in under the walls, out under the steps, an attack
  under every flash.
- Premixes the track and a quiet layer of effects.

The runtime turns all of this into one seekable GSAP timeline with no tweens. Everything runs
locally; the one networked step is downloading licensed audio and footage once. Read the
[hyperframes](../hyperframes/SKILL.md) contract before touching generated HTML, and change the
plan and rebuild instead.

## Workflow

1. **Create a project:** `npm run new-video -- <slug>`. Put footage in `assets/footage/`
   (symlinks to raw files are fine) and audio in `assets/audio/`.
2. **Pick the shots.** The style needs one performer and many angles of them:
   - For walls: shots where the performer is whole, clear of the frame edges, and in front of a
     background that is not them. Wide and medium shots work best. The cutout comes from a
     matte model, so avoid shots where the subject ducks out of frame or blurs into the ground.
   - For the calm after a flash and for the montage: details (hands, feet, an instrument, a
     face), and anything with strong shapes or colour.
   - Change scale at every cut: wide, medium, detail, low angle.
3. **Pick the track and map its bass.** The style needs a bass that plays in blocks and stops
   dead between them (see [references/sound-design.md](references/sound-design.md)):

   ```sh
   node .claude/skills/cutout-strobe/scripts/bass-map.mjs assets/audio/*.mp3 --len 20
   node .claude/skills/cutout-strobe/scripts/bass-map.mjs assets/audio/bed.mp3 --from <seconds> --len 20 --fps 30
   ```

   The first form scores each file and names its best window. The second prints that window's
   frame map (walls, rests, where each flash goes) and a timeline skeleton.
4. **Write `cs-plan.json`** from [templates/cs-plan.example.json](templates/cs-plan.example.json)
   and the skeleton. Every field is in [references/plan-format.md](references/plan-format.md).
   Then probe:

   ```sh
   node .claude/skills/cutout-strobe/scripts/build-cutout.mjs video-projects/<slug> --probe
   ```

   For every clip this writes `cs/probe/<clip>.png` (three frames with a 10% grid). For every
   wall's clip it also writes `cs/probe/<clip>-cutout.png`: the subject over magenta, as the matte
   model sees it. A wall whose cutout is a blob, a fragment, or the wrong object needs another
   clip or another `in`.
5. **Build:** `node .claude/skills/cutout-strobe/scripts/build-cutout.mjs video-projects/<slug>`.
   The first build cuts out every wall's subject (about 20 s a wall). Later builds hit the cache.
   The builder prints the frame table with the bass share under every item, how far each landing
   and flash sits from the track, and the mix. Fix every warning.
6. **Verify** with the gates below. Then render the final:
   `npx hyperframes render --quality high --output renders/<slug>-final.mp4`.

## The style grammar

These rules come from the measured reference. Break one only when the brief says so.

1. **The subject holds; the world strobes.** In a `wall` the subject is cut out and on top, sharp
   and steady, with a soft white halo. Everything that changes fast is behind them. Never strobe
   the subject. A `blink` (one white frame of the subject) is the only exception.
2. **The montage is texture.** Behind the subject, a window shows stills of the film's other
   shots: spun or zoom-blurred, seven in ten pulled to near grey, levelled to one brightness, one
   picture a frame. Nothing in it should be readable.
3. **One window shape per wall, and it moves one way.** `slit`, `blinds`, `cross`, `circle`,
   `quad`, or `full`. It closes, shuts, or grows across the wall, toward the flash. Do not repeat
   a shape in neighbouring walls.
4. **Every cut is announced.** A `step` brings the next shot in over the current one as white
   shapes: `bars`, `columns`, `circle`, `top`, or `hero` (the next subject's silhouette). White
   shows for the first frame of every 3 to 5; the next shot shows inside the shape after it.
   Three to five hits, then a two-frame whip, then the new wall.
5. **The picture is the waveform:**
   - Bass in: a wall.
   - Bass out: a step, or a run of plain shots.
   - Bass back: the landing.
   - The backbeat inside a wall (half a bass cycle in, on an attack): a `flash`.
6. **A flash is one white frame and thirteen of decay.** Under the decay the picture calms: hold
   the wall, or cut to a detail with `"enter": "flash"`. Leave a wall 16 frames after its flash,
   or the step after it turns grey.
7. **White is the only graphic.** No type, no logo, no second colour. The film is dark, so one
   white frame reads at full strength.
8. **Open the other way round.** Before the bass comes in, start with the montage over the whole
   frame and a `slit` closing to 5% as the track builds. Put a `hero` step on the last beats before
   the drop.
9. **The track carries it.** Effects mark the picture far under the bed: a tick on each step
   hit, a whoosh that peaks on each landing, a hit on each flash. The mix is -14 LUFS.
10. **It flashes.** Ten or more full-frame brightness swings in the busiest second is normal for
    this style. Post it with a flashing-images warning.

A reel in this style reads as cycles, each one bass block and the rest after it:

| Part | Bass | What it does | Typical items |
| --- | --- | --- | --- |
| Intro | none, building | The montage covers the frame and clears | `wall` with a `slit` from 1 to 0.05 |
| Count-in | stabs or silence | The first drop's subject, in white | `step: hero` at 5 frames |
| Wall | in | Subject over a shaped window, flash on the backbeat | `wall` with a window and `flash` |
| Calm | in | A detail, or the same wall, under the decay | `shot` with `"enter": "flash"` |
| Step | out | The next shot arrives as white shapes | `step: bars`, `circle`, `columns` |
| Breakdown | low | Plain shots, 8 to 12 frames each, more colour | `shot` items joined by `"enter": "whip"` |
| Payoff | in | The first subject again, the window opening | `wall` with a `circle` growing |
| End | out | A flash to one detail | `shot` with `"enter": "flash"` |

| Setting | Value |
| --- | --- |
| Canvas | 1920x1080 (`landscape`), 1080x1920 (`portrait`), or 1080x1080 (`square`), 30 fps |
| Montage | 3 stills a clip, 0.45 s apart; spin or zoom blur; 70% near grey; mean level 0.20 |
| Halo | Two white shadows, 16 px and 44 px on a 1080 px frame |
| Flash | White for 1 frame, then 0.69, 0.56, 0.47, 0.40, 0.35, 0.29, 0.25, 0.21, 0.17, 0.13, 0.09, 0.04 |
| Step | White for the first frame of every 3 (fast) to 5 (on the pulse) |
| Whip | 2 frames: the outgoing picture smeared, then the incoming one |
| Mix | -14 LUFS, limiter ceiling -5 dBFS, effects 7-15 dB under the bed's loudest 10 ms |

## Gates before delivery

Run from the project folder with `HYPERFRAMES_NO_TELEMETRY=1` set.

1. `npx hyperframes lint` reports 0 errors and 0 warnings.
2. Snapshot one frame per wall, step, flash, and landing and check each one:
   `npx hyperframes snapshot --at <t1,t2,...> --no-end --describe false`.
   - The subject is whole and reads against the montage.
   - No montage picture is brighter or sharper than the subject.
   - A silhouette is the subject's shape, not a blob.
   - The window does not hide the part of the shot that places the subject (the floor they
     stand on).
3. Render a draft and audit it:

   ```sh
   npx hyperframes render --quality draft --output renders/<slug>-draft.mp4
   node ../../.claude/skills/cutout-strobe/scripts/cutout-audit.mjs . renders/<slug>-draft.mp4
   ```

   The audit checks:
   - The format, the frame rate, and that no frame is black.
   - Every flash is white on its frame and decays; every step hit shows white; every whip is
     soft, then sharp.
   - The pace inside the walls and the flashing rate.
   - Loudness, true peak, A/V sync, and a sound onset on every cue.
   - The bass under the steps and an attack under every flash.

   Any FAIL blocks delivery.

   If the true peak FAILs while `cs/audio/mix.wav` sits at -5 dBFS, the renderer's AAC encoder
   overshot. Keep the render, remux the same mix with a cleaner encoder, and audit the remux:

   ```sh
   ffmpeg -i renders/<slug>-draft.mp4 -i cs/audio/mix.wav -map 0:v -map 1:a -c:v copy \
     -c:a aac_at -b:a 256k -shortest -movflags +faststart renders/<slug>-remux.mp4
   ```

   `aac_at` is macOS only; elsewhere use `-c:a aac -b:a 256k`.
4. Tile every frame and read the film in order:
   `ffmpeg -i <render> -vf "scale=384:-1,tile=6x5" -fps_mode passthrough frames%02d.png`.
   Check that each wall's matte holds for all of its frames, that each step counts up, and
   that every landing is two soft frames and then a sharp one.
5. Watch and listen at full speed. Check that the landings hit with the bass, that the flashes
   sit on the backbeat, and that no effect is louder than the track. Record what was and was
   not watched and heard in `VERIFY.md`.

## Do not

- Do not copy the reference's footage, performer, or track; borrow the mechanics.
- Do not strobe, flip, or stutter the subject.
- Do not add type, captions, lower thirds, stickers, or a logo.
- Do not add a colour to the white shapes, or a second graphic.
- Do not crossfade or dissolve. A shot enters through a step, a whip, or a flash.
- Do not put a step where the bass is in or a flash where the track has no hit.
- Do not use a track whose bass never rests without saying so; `music.gate` makes the rests, and
  somebody has to listen to the result.
- Do not use an unlicensed commercial track.
- Do not hand-edit `index.html` or `cs/`; change the plan and rebuild.
- Do not post it without a flashing-images warning.

## Files

- [scripts/build-cutout.mjs](scripts/build-cutout.mjs) builds the proxies, mattes, stills, mix,
  page, and `DESIGN.md` from the plan. `--probe` writes the planning sheets.
- [scripts/bass-map.mjs](scripts/bass-map.mjs) scores tracks for the style and prints a window's
  frame map and timeline skeleton.
- [scripts/cutout-audit.mjs](scripts/cutout-audit.mjs) checks a render against the plan and the
  style's measurable rules.
- [scripts/lib-bass.mjs](scripts/lib-bass.mjs) is the shared signal analysis: bass state, attacks,
  tempo, and the backbeat.
- [assets/cs-kit.css](assets/cs-kit.css) and [assets/cs-kit.js](assets/cs-kit.js) are the stage
  and the frame-exact runtime copied into each project.
- [templates/cs-plan.example.json](templates/cs-plan.example.json) is a complete 19 s reel.
