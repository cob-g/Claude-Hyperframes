---
name: simplicity
description: Edit footage in the "simplicity" style in HyperFrames and deliver only the film, full frame at 1920x1080 and 24 fps. The look is a rich cream-and-cool grade with crushed blacks. The cut is dense while the song is thin and calm once the beat drops. Frame-level tricks last 1-5 frames and then get out of the way. The tricks are one-frame clips, glow flickers on the subject, stutters between takes, cutout previews of the next shot, tile mosaics, teleports against a clean plate, and freezes. A small extended-type film title holds still while the subject walks in front of it, over a song-led mix. It can also cut a music video to its own chorus, keeping lip sync across the chorus's repeats. Use for clean, minimal, premium-feeling short edits of vlog, travel, event, or music-video footage, 8-30 s, or when asked to "edit it in the simplicity style" or "make it feel like the birthday vlog edit".
---

# Simplicity

This skill edits footage the way the measured reference's film is edited. The reference is a
10.35 s birthday vlog shown inside an "edit breakdown" sheet. The skill takes only the film: the
grade, the pacing, the frame-level tricks, the film title, and the sound. It does not build the
presentation around it (the grid paper, masthead, technique labels, timeline panel, and credits).
The output is the video alone.

[references/reference-breakdown.md](references/reference-breakdown.md) holds the measurements and
the reasoning. Read "The edit" and "Sound design" before planning.

A plan (`simp-plan.json`) lists the shots and their effects in frames. The builder:
- Grades every shot into a 1920x1080 proxy.
- Masks subjects with Apple Vision and mattes them with `hyperframes remove-background`.
- Compiles every effect into frame-exact state changes.
- Premixes the song and the effects.

The runtime turns all of this into one seekable GSAP timeline. Everything runs locally; the one
networked step is downloading licensed audio once. Read the [hyperframes](../hyperframes/SKILL.md)
contract before touching generated HTML, and change the plan and rebuild instead.

## Workflow

1. **Create a project:** `npm run new-video -- <slug>`. Put footage in `assets/footage/`
   (symlinks to raw files are fine) and audio in `assets/audio/`.
2. **Pick the shots.** The style needs photographs, not coverage:
   - Wides, low angles, and locked or gimbal-smooth moves.
   - One subject per shot where you plan a glow or a cutout.
   - A tripod shot with and without the subject if you want the teleport.

   Sequence them so the story reads with the sound off: arrive, details, people, the place, the
   payoff.
3. **Pick the song** (see [references/sound-design.md](references/sound-design.md)). It needs a
   verse or build for the dense opening and a drop 7-9 s in. Measure the drop and set
   `music.start` so it lands on `music.drop`. To keep only the chorus, cut the song to length on
   its bar lines with `music.segments`.

   **Editing a music video to its own song:** `sync` puts every performance shot on its words.
   Because a chorus repeats, each chorus lends its takes to the others. `crop` removes a baked-in
   border. `"grade": "soft"` and `"exposure": false` respect the video's existing grade. See
   [references/music-video.md](references/music-video.md).
4. **Write `simp-plan.json`** from [templates/simp-plan.example.json](templates/simp-plan.example.json).
   Every field is in [references/plan-format.md](references/plan-format.md). Name each effect
   with `label`; labels are not drawn, but they document the edit in the report, `cues.json`, and
   `DESIGN.md`. Then probe:

   ```sh
   node .claude/skills/simplicity/scripts/build-simplicity.mjs video-projects/<slug> --probe
   ```

   This writes `simp/probe/shot-NN.png`: the first, middle, and last frame of every shot, graded,
   with a 10% grid. Use it to check the framing and to place `spot` glows.
5. **Build:** `node .claude/skills/simplicity/scripts/build-simplicity.mjs video-projects/<slug>`.
   The first build mattes every `behind` shot (about 12 s each). Later builds hit the cache. The
   builder prints the frame table, the techniques, the mix loudness, and the energy split around
   the drop.
6. **Verify** with the gates below. Then render the final:
   `npx hyperframes render --quality high --output renders/<slug>-final.mp4`.

## The style grammar

These rules come from the measured reference. Break one only when the brief says so.

1. **Only the film.** No on-screen labels, UI, lower thirds, captions, or graphics beyond the
   small film title.
2. **The grade does the premium work:**
   - `cream` gives rich contrast, crushed blacks, cream highlights, cool shadows, and more
     saturation.
   - `exposure: "auto"` levels the shots before the grade. Lift a backlit face with a number.
3. **Duration contrast:**
   - Two-frame clips sit beside 20-40 frame holds. Nothing is medium length.
   - Effects come in bursts of 2-5 frames, then the picture holds.
4. **Every transition previews the next shot.** A cutout (the next subject in place, over the
   title), a tile mosaic, or a stutter shows a piece of the incoming image before the cut.
   Plain cuts land 3% large and settle in five frames.
5. **Dense verse, calm drop.** Put the one-frame clips, glows, and stutters over the thin part of
   the song. Hold long locked shots with a single gag (a teleport or a freeze) on the drop. The
   builder and the audit both report the split.
6. **Title depth.** Two small blocks, each a kicker over a wide word, enter with three one-frame
   jumps and a letter flicker, then hold still. The subject passes in front of the title on shots
   marked `behind`. The builder measures each matte and keeps the title in front when the subject
   would bury it. `"title": "dark"` on a shot switches the ink over a bright sky.
7. **Sound:** the song leads. There are optional tiny transients on the picture events (a
   shutter, a click, a pop, a swoosh, a sparkle), each 10-14 dB under the song. The mix is
   -14 LUFS.
   - Before the drop, use the song's own breath if it has one. `dropout` only adds a breath to a
     song without one, and it must end before the drop's first kick attack.
8. **Close on an echo, not a cut.** End the song on a bar line (the last segment's `to`) and let
   `music.outro.echo` repeat its final beat. The repeats are tempo-synced, each quieter and
   darker, and they alternate left and right. Freeze the picture on the same frame, extend the last
   shot through the tail, and fade to black over the last `film.fadeOut` frames.
9. **Transitions land on the beat.** Measure the song's grid from real kick attacks
   (`music.grid`) and put the cuts on it. A `tiles` exit with `"on": "grid"` builds one tile per
   step into a cut on a downbeat: sixteenths, then thirty-seconds through the last beat. Every
   tile lands with a click that climbs an octave, over a riser that ends exactly on the cut. It
   sounds like something being built, and then the drop.

| Setting | Value |
| --- | --- |
| Canvas | 1920x1080, 24 fps, full frame |
| Film title | Archivo width 125, weight 760, 78 px, with a 25 px kicker and "++", at 52% height, 8.4% from each side |
| Settle | scale 1.03 to 1 over 5 frames, expo.out |
| Glow | subject mask to white, bloom 15 px and 46 px, 1-2 frames per hop |
| Tiles | 4x3 by default, seeded order, some tiles flash cream for a frame, full by the cut |
| Mix | -14 LUFS, limiter ceiling -5 dBFS, effects 10-14 dB under the song |

## Gates before delivery

Run from the project folder with `HYPERFRAMES_NO_TELEMETRY=1` set.

1. `npx hyperframes lint` reports 0 errors and 0 warnings.
2. Snapshot one frame per technique and check each one:
   `npx hyperframes snapshot --at <t1,t2,...> --no-end --describe false`.
   - The title is readable.
   - A cutout is aligned with the next shot's subject.
   - No face is crushed. If one is, lift that shot's `exposure`.
3. Render a draft and audit it:

   ```sh
   npx hyperframes render --quality draft --output renders/<slug>-draft.mp4
   node ../../.claude/skills/simplicity/scripts/simp-audit.mjs . renders/<slug>-draft.mp4
   ```

   The audit checks:
   - The format.
   - No black frames.
   - The energy split around the drop.
   - The longest stall.
   - Loudness, true peak, and A/V sync.
   - The dropout.
   - A sound onset on every cue frame.

   Any FAIL blocks delivery.

   If the true peak FAILs while `simp/audio/mix.wav` sits at -5 dBFS, the renderer's AAC encoder
   overshot a transient (seen once: a single +0.8 dBFS sample). Keep the render, remux the same
   mix with a cleaner encoder, and audit the remux:

   ```sh
   ffmpeg -i renders/<slug>-draft.mp4 -i simp/audio/mix.wav -map 0:v -map 1:a -c:v copy \
     -c:a aac_at -b:a 256k -shortest -movflags +faststart renders/<slug>-remux.mp4
   ```

   `aac_at` is macOS only; elsewhere use `-c:a aac -b:a 256k`.
4. Tile every frame and read the effects in order:
   `ffmpeg -i <render> -vf "scale=320:-1,tile=6x8" -fps_mode passthrough frames%02d.png`.
5. Listen at full speed. Check that the verse sits under the dense opening, the breath comes
   before the drop, the drop lands on the calm shot, and no effect sits louder than the song.
   Record what was and was not heard in `VERIFY.md`.

## Do not

- Do not copy the reference's footage, names, song, or title words; borrow the mechanics.
- Do not add labels, a timeline, credits, or any frame around the film.
- Do not cut every beat on a metronome. Cut on the picture and the lyric.
- Do not use an unlicensed commercial song.
- Do not hand-edit `index.html` or `simp/`; change the plan and rebuild.

## Files

- [scripts/build-simplicity.mjs](scripts/build-simplicity.mjs) builds the proxies, masks, mattes,
  mix, page, and `DESIGN.md` from the plan. `--probe` writes framing sheets.
- [scripts/simp-audit.mjs](scripts/simp-audit.mjs) checks a render against the style's measurable
  rules.
- [scripts/mv-map.mjs](scripts/mv-map.mjs) maps a music video: frame-accurate cuts with border
  flags, and the chorus repeats with their `sync` offsets.
- [scripts/simp-mask.swift](scripts/simp-mask.swift) gives full-frame subject masks per instance
  (Apple Vision, macOS 14+), compiled once per project.
- [assets/simp-kit.css](assets/simp-kit.css) and [assets/simp-kit.js](assets/simp-kit.js) are the
  look and the frame-exact runtime copied into each project.
- [assets/fonts/](assets/fonts/) holds Archivo (Latin subset, OFL) and its license.
- [templates/simp-plan.example.json](templates/simp-plan.example.json) is a complete edit with
  every effect.
