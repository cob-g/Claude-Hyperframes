---
name: negative-strobe
description: Edit footage in the "negative strobe" style in HyperFrames, a black-and-white strobe cut. Clips are chopped into pieces of one to four frames, graded until the highlights blow out to paper white and the shadows crush to ink, and flipped between positive and negative from one piece to the next, so every frame is a silhouette, a logo, or a texture, and the picture changes as much as a frame can while no edge moves. Motion comes from keeping one frame and dropping two, zooms and blur move in steps, black frames punctuate, and nothing eases or fades, over a loud bass-heavy track with bursts locked to its grid. Use for fashion, streetwear, sports, outdoor, music, and nightlife teasers, for a hard "glitch" transition between clips, or when asked for the one-frame cut, the invert flicker, the black and white glitch transition, or a strobe edit; 1-15 s, vertical by default, also 16:9 and square.
---

# Negative strobe

This skill edits footage the way the measured reference does. The reference is a tutorial reel in
which a creator rebuilds his own "glitch transition": cut each clip into one-frame pieces, grade
them black and white with blown highlights and crushed shadows, and invert every other piece. His
posted edit uses the same grammar for eight seconds, on a four-frame grid.

[references/reference-breakdown.md](references/reference-breakdown.md) holds the measurements and
the reasoning: why two tones, why the negative, the eight kinds of frame, the pacing, and the
sound. Read "Why it is so good" before planning.

A plan (`ns-plan.json`) names the clips and lists the timeline in frames. The builder:
- Bakes every piece as a still with ffmpeg: cropped, greyed, grained, pushed through the curve,
  and inverted where the plan says. A one-frame flash is exactly one frame.
- Finds each clip's pivot (the luma that splits shape from ground) on its own.
- Locks bursts and holds to the track's beat grid.
- Premixes the track and a quiet layer of effects.

The runtime turns the plan into one seekable GSAP timeline of on and off switches. There are no
tweens and no video elements. Everything runs locally; the one networked step is downloading
licensed audio and footage once. Read the [hyperframes](../hyperframes/SKILL.md) contract before
touching generated HTML, and change the plan and rebuild instead.

## Workflow

1. **Create a project:** `npm run new-video -- <slug>`. Put footage in `assets/footage/`
   (symlinks to raw files are fine) and audio in `assets/audio/`.
2. **Pick the clips.** The grade throws away everything but shape, so choose frames that are
   already shapes:
   - A figure against sky, water, snow, or a lit wall, backlit if possible.
   - A head and shoulders from behind, or a masked or hooded face.
   - A logo or lettering on fabric, close.
   - A texture with no subject: folds, a crumpled surface, a fence, city lights out of focus.
   - An action with a clear peak: a jump, a flip, a stride.

   Skip mid-tone subjects on mid-tone grounds (a grey hoodie against grey hills). They come out
   as mush, or work only as the grey breath. Resolution matters little: the curve redraws every
   edge, so 720p footage holds up at 1080x1920.
3. **Pick the track.** It needs a wall of bass and a fast tick on top (see
   [references/sound-design.md](references/sound-design.md)). Score candidates:

   ```sh
   node .claude/skills/negative-strobe/scripts/track-fit.mjs assets/audio/*.mp3 --len 10
   ```

   It prints the tempo, the bar line, the bass share, the tick rate, how the tempo sits on the
   frame grid, and the `music` block for the best window.
4. **Write `ns-plan.json`** from [templates/ns-plan.example.json](templates/ns-plan.example.json).
   Every field is in [references/plan-format.md](references/plan-format.md). Then probe:

   ```sh
   node .claude/skills/negative-strobe/scripts/build-strobe.mjs video-projects/<slug> --probe
   ```

   For every clip this writes three sheets to `ns/probe/`:
   - `<clip>-frame.png`: the source frame with a 10% grid and the crop boxed. Read the subject's
     position off it for `focus`.
   - `<clip>.png`: grey, then ink at three pivots, then stamp. Pick `pivot` or `bias` from it.
   - `<clip>-strip.png`: every third frame from the in point, in ink. Pick `at` from it.
5. **Build:** `node .claude/skills/negative-strobe/scripts/build-strobe.mjs video-projects/<slug>`.
   It prints the frame table, the pivots, the pace, how far each hit sits from the grid, and the
   mix. Fix every warning: a flat clip (no shape at this pivot), a hit off the grid, effects too
   close to the bed.
6. **Verify** with the gates below. Then render the final:
   `npx hyperframes render --quality high --output renders/<slug>-final.mp4`.

## The style grammar

These rules come from the measured reference. Break one only when the brief says so.

1. **Two tones.** Black and white, no colour, no tint. `ink` is the reference's exaggerated
   S-curve. `stamp` is a near threshold for textures and marks. `soft` keeps the mid-tones and is
   used one piece at a time.
2. **The flip is the cut.** Inside a clip, neighbouring pieces alternate positive and negative.
   The negative changes every pixel and moves no edge, so the eye takes the hit and keeps the
   subject. Use odd counts (`PNP`, `PNPNP`): the clip ends on the polarity it began with.
3. **Count in frames.** There are two speeds and nothing between them:
   - A **burst**: one frame a piece, three pieces a clip, four to eight clips. It is a
     transition and lasts under a second.
   - A **hold**: two to four frames a piece. The reference's posted edit sits on a four-frame
     grid, six changes a second.

   A hold of eight frames is long. Nothing eases, fades, or dissolves.
4. **Keep one, drop two.** Pieces step three source frames (`"step": 3`), so three kept frames
   span seven and the action plays as a flipbook. A clip keeps its place: the next time it
   appears, the action has moved on. Bring the main action back several times, flipping polarity
   as it advances.
5. **Stepped camera.** A zoom is a jump in scale per piece (`punch`). So is a reframe (`shift`)
   and a focus pull (`blur`, `blurIn`). They are baked before the curve, so every step has hard
   edges.
6. **One grey breath per phrase.** A single `G` piece before a hard one makes the hard one look
   harder. More than one in a row is just a black-and-white video.
7. **Black is punctuation.** Two frames of black stop the strobe so the next image hits. With
   `"mute": true` the track stops with it.
8. **Bursts start on the beat.** End the item before a burst with `"to": "bar"` or `"beat"`, and
   give the burst `"on": "grid"`, so each clip of it lands on a sixteenth.
9. **The track carries it.** The bed is loud, bass-heavy, and nearly mono. Effects mark the
   picture far under it: a hit on each burst, a tick on each clip, a rise into a burst. The mix
   is -14 LUFS. End on a muted black, not a fade.
10. **No type.** The marks are the ones in the footage. The builder can set a `card` (one word,
    black on white or its negative) for work that must end on a name. The reference has none, so
    leave it out unless the brief asks for it.
11. **It flashes.** A positive frame and its negative are a full-screen flash, 12 a second in a
    burst. Keep runs of one-frame pieces under a second, and post with a flashing-images warning.

A reel in this style reads as phrases, each ending on a bar line:

| Phrase | What it does | Typical items |
| --- | --- | --- |
| Open | Texture or a mark, then black | `TtT` at 2 frames, `black` 2 |
| Statement | The subject, held and flipped | `PN` at 4 frames, a `T` with a punch, hold `to` the bar |
| Burst | Every clip in three frames each | `burst` with `on: grid` and `rise` |
| Subject | Silhouettes on the four-frame grid | `PN`, `P`, `N` at 4 frames, a `TtT` |
| Action | One move, returned to with the pose advanced | `P`, `PN`, `TPN` with `at` set to the peaks |
| Burst | The action in flashes, cut against everything else | `burst` alternating the action clip with the rest |
| Payoff | One image, held, then stepped in | `G` to the bar, `P` at 8 frames, `NPN` with `punch` |
| End | Flips that keep stepping in, then black | `PN` at 4 frames with a rising `punch`, `to` the bar; `black` with `mute` |

| Setting | Value |
| --- | --- |
| Canvas | 1080x1920 (`portrait`), 1920x1080 (`landscape`), or 1080x1080 (`square`), 24 fps |
| Bands | `stamp` 0.06, `ink` 0.30, `soft` 0.80 of the tonal range, centred on the clip's pivot |
| Pivot | Otsu's threshold over the frames in use, plus `bias`; or a number |
| Grain | Uniform luma noise, strength 9, before the curve |
| Burst | 3 pieces a clip, 1 frame each, 3 source frames apart, `PN` |
| Card | Archivo width 125, weight 800, upper case, fitted to 84% of the width |
| Mix | -14 LUFS, limiter ceiling -5 dBFS, effects 10-22 dB under the bed's loudest 10 ms |

## Gates before delivery

Run from the project folder with `HYPERFRAMES_NO_TELEMETRY=1` set.

1. `npx hyperframes lint` reports 0 errors and 0 warnings.
2. Snapshot one frame per clip and grade and check each one:
   `npx hyperframes snapshot --at <t1,t2,...> --no-end --describe false`.
   - The subject reads as a shape. If the frame is nearly all black or all white, set that
     clip's `pivot`.
   - The subject is inside the crop. If not, set `focus`.
   - A punch keeps the subject in frame on its last step.
3. Render a draft and audit it:

   ```sh
   npx hyperframes render --quality draft --output renders/<slug>-draft.mp4
   node ../../.claude/skills/negative-strobe/scripts/strobe-audit.mjs . renders/<slug>-draft.mp4
   ```

   The audit checks:
   - The format and the frame rate.
   - Every planned state is on its own frames. A one-frame piece that lands late, twice, or not
     at all is the failure this style invites.
   - The picture is neutral and two-tone.
   - The pace, the flash rate, the longest strobe run, and the longest frozen still.
   - Loudness, true peak, A/V sync, the mutes, a sound onset on every cue, and the bed's bass.

   Any FAIL blocks delivery.

   If the true peak FAILs while `ns/audio/mix.wav` sits at -5 dBFS, the renderer's AAC encoder
   overshot. Keep the render, remux the same mix with a cleaner encoder, and audit the remux:

   ```sh
   ffmpeg -i renders/<slug>-draft.mp4 -i ns/audio/mix.wav -map 0:v -map 1:a -c:v copy \
     -c:a aac_at -b:a 256k -shortest -movflags +faststart renders/<slug>-remux.mp4
   ```

   `aac_at` is macOS only; elsewhere use `-c:a aac -b:a 256k`.
4. Tile every frame and read the film in order:
   `ffmpeg -i <render> -vf "scale=160:-1,tile=12x5" -fps_mode passthrough frames%02d.png`.
   Check that each clip flips, that no two neighbouring frames are the same image by accident,
   and that the bursts end on a hold.
5. Watch and listen at full speed. Check that the bursts land on the beat, that the black lands
   with the mute, and that no effect sits louder than the track. Record what was and was not
   watched and heard in `VERIFY.md`.

## Do not

- Do not copy the reference's footage, brand marks, or track; borrow the mechanics.
- Do not add colour, a tint, a vignette, or a gradient.
- Do not ease, fade, crossfade, or motion-blur between pieces.
- Do not add captions, lower thirds, or stickers.
- Do not strobe for more than about a second without a hold or a black frame.
- Do not use a face as the subject. The style is shapes and marks.
- Do not use an unlicensed commercial track.
- Do not hand-edit `index.html` or `ns/`; change the plan and rebuild.
- Do not post it without a flashing-images warning.

## Files

- [scripts/build-strobe.mjs](scripts/build-strobe.mjs) builds the stills, the mix, the page, and
  `DESIGN.md` from the plan. `--probe` writes the planning sheets.
- [scripts/strobe-audit.mjs](scripts/strobe-audit.mjs) checks a render against the plan and the
  style's measurable rules.
- [scripts/track-fit.mjs](scripts/track-fit.mjs) scores a track against the reference's sound and
  prints its beat grid.
- [assets/ns-kit.css](assets/ns-kit.css) and [assets/ns-kit.js](assets/ns-kit.js) are the stage
  and the frame-exact runtime copied into each project.
- [assets/fonts/](assets/fonts/) holds Archivo (Latin subset, OFL) and its license, for the card.
- [templates/ns-plan.example.json](templates/ns-plan.example.json) is a complete ten-second reel
  in eight phrases.
