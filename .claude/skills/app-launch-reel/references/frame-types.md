# Frame types

The first nine scene types are the reference's frame layouts. The last six (modules, metric,
dashboard, chat, matrix, burst) were added for minute-long reels that need more than one product
beat. The builder lays out each type, times every event on the beat grid, and cues its sounds. Times below are seconds after the scene's
cut at 120 BPM (beat 0.5 s, sixteenth 0.125 s). Other tempos scale the beat-based values. Plan
fields are in [plan-format.md](plan-format.md).

Default tones produce the luminance flip on every cut: ink (dark), brand (mid), paper
(light), violet (mid), night (dark), black (dark). Override `tone` only to keep that flip when you
reorder scenes. The builder warns when two neighbours share a luminance.

## identity (4 beats, ink, exits by iris)

- **Layout:** the brand mark centred on a breathing radial glow and a faint dot grid. The
  wordmark sits to its right, hidden. The HUD fades in at 0.3 s.
- **Motion:**
  - The mark's strokes draw one after another from 0.1 s, the last one landing just before
    the hit on beat 2 (1.0 s).
  - On the hit the mark punches to 112% and settles elastically while two rings pulse out.
  - At hit + 0.35 s the wordmark rises letter by letter (0.035 s apart) while the lockup
    slides to keep the pair centred.
  - The iris opens the next scene from the mark's centre.
- **Sound:** a riser peaks on the hit, the impact lands on the hit, and the bed swells in
  underneath. A soft pop sounds on the wordmark.
- **Image marks:** a raster logo (`brand.mark.image`) cannot be stroke-drawn. It resolves out of
  a 14 px blur through a circle growing from its centre, from 74% scale and -9 degrees, over the
  same build window. A `brand.badge` (for example "AI") pops after the last letter.
- **Portrait:** the lockup shrinks (mark 150 px tall, wordmark 100 px) so a long name and its
  badge fit 1080 px.
- **Fields:** `hitBeat` (default 2). The mark and name come from `brand`.

## statement (3 beats, brand, exits by pixel)

- **Layout:** a centred eyebrow and a one- or two-line H1 (138 px, 800 weight, -0.045 em).
  Oversized outlined ghost numerals drift left along the bottom.
- **Motion:**
  - The eyebrow fades up.
  - Words rise through masks a sixteenth apart from 0.06 s.
  - A peach underline draws under the last `*emphasised*` word as it lands.
  - A hand-drawn circle loops around the `circle` numeral, finishing just as the wipe starts.
- **Rules:** at most about 6 words. The circled numeral should mean something (a date, a
  count).
- **Tones:** on a light tone (`paper`) the underline and circle draw in brand blue, since peach
  disappears on white, and the ghost numerals turn ink.
- **Fields:** `eyebrow`, `title` (lines; `*word*` gets the underline), `ticker` (numerals or
  short words; a single entry such as the brand name is centred, shown whole at 250 px, and
  drifts 170 px across the scene), `circle`.

## product (8 beats, paper, exits by whip)

- **Layout:**
  - Copy on the left: eyebrow, H2 (86 px), sub.
  - A live phone on the right (440x920) with an app header, a gradient hero card with a
    total, and up to 5 list rows.
  - Portrait puts the copy on top and the phone below.
- **Motion:**
  - The phone flies in from below right at 0.1 s (0.55 s, expo out) with three echo copies,
    lands at 3 degrees, and then floats.
  - Header at +0.32 s and hero card at +0.4 s. Rows pop on sixteenths from about 0.62 s, one
    pop sound each.
  - Copy words rise on sixteenths from 0.42 s.
- **Steps** (`at` in beats from the cut):
  - `add`: the sheet slides up, the name and amount type in, a chip is tapped, and Save is
    tapped with a ripple. The sheet drops, the new row pops into its slot, the rows below make
    room, and the total counts up. It takes about 1.4 s, with sound on every action.
  - `swap`: the headline rises out and the next `copy` block rises in. It can overlap a phone
    step.
  - `complete`: a tap, then a swipe to a green label and a swipe away. A success chime,
    confetti inside the screen, the row collapses, the total counts down, and the toast pops.
    It takes about 1 s.
- **Rules:**
  - Show the product doing its main job, with realistic data.
  - Keep phone steps from overlapping (the builder warns).
  - Finish the last step about 0.4 s before the whip.
  - The reference order is add at beat 2, swap at 5, complete at 5.5.

## scan (2 beats, ink, exits by whip)

- **Layout:** copy on the left (a white line, then a `~soft~` line); on the right a paper
  document with labelled fields inside four viewfinder brackets. Detection tags sit to its
  right, overlapping its edge.
- **Motion:**
  - The document arrives with the whip and lags 110 px behind.
  - The brackets snap in (scale 1.2 -> 1).
  - A glowing scan line sweeps down over 0.5 s, and field outlines light up as it passes.
  - The tags pop on eighths from 0.38 s.
  - Copy words move at 32nds, since two-beat frames run at double speed.
- **Sound:** the scan sweep, plus a pop per tag.

## widget (2 beats, violet, exits by whip)

- **Layout:** copy on the left; on the right a gold-framed phone showing a home screen of
  blank gradient tiles (never real app icons), with a dark widget card over the screen.
- **Motion:** the phone settles and drifts. The widget lifts out of the screen on the second
  eighth: 120% scale, up and left, and a deeper shadow. It is not clipped by the screen.
- **Sound:** a pop on the lift.

## stack (2 beats, paper, flips to night, exits by whip)

- **Layout:** a centred H3 headline with the `*emphasis*` tinted brand blue, over up to three
  (at most four) UI cards (720 px wide).
- **Motion:**
  - Words rise at 32nds and the cards pop on sixteenths from 0.2 s.
  - At `flip` beats (default 0.92, about 0.46 s) a slanted wipe runs left to right in 0.3 s,
    revealing the dark theme of the same frame. Three grey echo bands and a toggle knob with
    two ghost copies ride the edge.
  - The HUD turns white mid-wipe.
- **Sound:** a tap on the toggle and a soft whoosh under the wipe. Set `flip: false` for a plain
  stack. A plain stack on a dark or mid `tone` shows the dark cards only.

## lines (2 beats, brand, exits by focus)

- **Layout:** a centred eyebrow (an array joined with middle dots) and up to five short
  lines at 60 px.
- **Motion:** each line's words rise together (0.028 s apart), with the lines a sixteenth apart.
- **Use:** languages, integrations, platforms, or a list of short claims. The kit's font covers
  Latin scripts only. For CJK lines, bundle and declare a CJK font first; otherwise HyperFrames
  may fetch one.

## manifesto (3 beats, black, exits by iris)

- **Layout:** type only. A two-line H1 (the last line `~soft~`), a sub line, and up to three
  pills with line icons. Three lines are allowed when the second would not fit at 138 px.
- **Motion:**
  - Line 1 resolves out of a 22 px blur and 114% scale exactly on the drop (the cut).
  - Each further line does the same one beat later.
  - The sub words rise three quarters of a beat before the last line's beat ends, and the pills
    pop on sixteenths half a beat after it (1.25 and 1.5 beats for two lines).
  - The iris to the end card opens from the last line's centre.
- **Sound:** the bed's low end drops out for half a beat before the cut, a riser peaks on the
  cut, then a full impact on line 1 and a half-level impact on line 2, with a pop per pill.
  After the drop the bed comes back louder (`music.lift`).

## endcard (4 beats, brand, holds)

- **Layout:** the mark (white strokes, or the image mark), wordmark with its badge, tagline,
  and URL pill, plus a solid call-to-action pill when `brand.cta` is set, centred over five
  concentric rings. No HUD.
- **Motion:**
  - The mark pops from 40% with overshoot and redraws its strokes.
  - The wordmark rises from 0.22 s, the tagline at 0.44 s, and the URL pops at 0.62 s.
  - The rings expand slowly for the rest of the reel.
- **Sound:** a shimmer on the cut and a pop on the URL. The bed fades out over about a bar, so
  the last quarter second is near silence.

## modules (8 beats, paper, exits by whip)

- **Layout:** a centred eyebrow and one-line H2 at the top, and up to six white module tiles
  (icon, name, one meta line) scattered in a ring around the frame at slight angles.
- **Motion:**
  - The headline rises from 0.06 s. Tiles pop on sixteenths from 0.3 s, each with a pop,
    then bob gently.
  - At `merge` beats (default 4) every tile is pulled into the frame centre in 0.44 s
    (power3.in), shrinking and fading.
  - Right after, the platform card lands (from 62%, back.out) with a ring burst. It holds the
    brand mark (revealed), the name and badge, an optional sub, and one chip per module popping
    on 32nds.
- **Sound:** a pop per tile, a whoosh peaking as the tiles meet, a half-level impact on the
  card, and a pop on the chips.
- **Use:** "everything in one place": several tools, modules, or teams becoming one product.
- **Fields:** `eyebrow`, `title`, `tiles` (`icon`, `color`, `title`, `meta`), `merge`, `card`
  (`title`, `sub`, `chips`).

## metric (2 beats, brand, exits by whip)

- **Layout:** type only. A centred eyebrow, a 250 px tabular number with its prefix or suffix in
  the soft colour, a one-line label, and either a row of growing bars or a progress line.
- **Motion:** the number rises out of blur at 0.02 s and counts from `from` to `value` in
  0.62 s, then punches to 106% as it lands. The label rises at 32nds, the bars grow at 32nds
  from 0.16 s, and the progress line fills to the value from 0.14 s. The camera creeps in 5%.
- **Sound:** a pop as the number appears and a tap as it lands.
- **Use:** a stat montage: three or four one-second metric frames with alternating tones.
  Use the product's real numbers.
- **Fields:** `eyebrow`, `value`, `from`, `prefix`, `suffix`, `decimals`, `label`, `bars`
  (heights 0-1) or `progress` (0-1; a `%` suffix fills to the value by default).

## dashboard (8 beats, ink, exits by whip)

- **Layout:** copy on the left; on the right an 820 px dark window with traffic-light dots, a
  title, a pulsing Live pill, up to four KPI tiles in a 2x2 grid (label, counter, delta chip),
  and a bar chart whose last bar is highlighted.
- **Motion:** the window rises in with two echo copies at 0.04 s and then drifts. The tiles pop
  on sixteenths from 0.34 s, and each counts up over 0.8 s. The chart grows bar by bar on 32nds
  from 0.62 s.
- **Sound:** a pop per tile and the scan sweep under the chart.
- **Fields:** `copy`, `window` (`title`, `tiles` with `label`, `value`, `from`, `prefix`,
  `suffix`, `decimals`, and `delta`; `chart` with `label`, `note`, and `bars`).

## chat (12 beats, paper, exits by whip)

- **Layout:**
  - On the left, a dark call card (520 px): the assistant's name with a voice meter, a
    488x610 video slot, and two footer labels.
  - On the right, a conversation column: user bubbles (white, right-aligned) and assistant
    bubbles (brand gradient, left-aligned), an optional figure card, and feature chips.
  - An item with `beside: true` shares a row with the item before it.
- **Motion:**
  - The card rises in and is at rest by 0.45 s, when its video starts.
  - A user message pops and its text types (about 0.03 s a character) with a caret.
  - Before each assistant message, three typing dots bounce for 0.42 s; then the bubble pops
    and its words rise at 32nds.
  - A figure card pops, its legs draw, the highlighted edge draws, and its label pops.
  - The voice meter dances while the assistant speaks; the chips pop on sixteenths at
    `chipsAt`.
- **Video:** `avatar.video` is a short silent clip (for example a crop of the product's own
  avatar footage).
  - HyperFrames never nests media in a timed div. The builder therefore places the `<video>` at
    the top level on track 3, above the scene and below the next one.
  - The runtime lays it over the slot each frame.
  - The slot holds stills of the clip's first and last frames, so entrances and exits show
    the right picture.
  - The clip plays from the card's rest to just before the exit starts. Give it at least that
    long.
- **Sound:** typing under the question, a pop per bubble, the figure card, and its label, a
  light whoosh as it draws, and pops on the chips.
- **Fields:** `eyebrow`, `avatar` (`video` or `image`, `name`, `meta`, `meta2`), `messages`
  (`from`: `user`, `ai`, or `figure`; `label`, `text`, `at` in beats, `beside`; a figure has
  `kind: "triangle"` and `label`), `chips` (`icon`, `text`), `chipsAt`.

## matrix (6 beats, ink, exits by whip)

- **Layout:** copy on the left; on the right a dark window with a roles-by-modules grid.
  - Cells are full (a brand disc with a check), view-only (a soft ring with a dot), or none
    (a faint dash).
  - Below the grid sit a legend and a footer strip, for example the audit trail.
- **Motion:** the window rises in with echo copies. Row labels fade up on 32nds, and the cells
  pop in a diagonal wave (32nds per diagonal from 0.36 s) with their checks drawing. The legend
  and footer follow the last cell.
- **Sound:** a soft tap on each diagonal, which reads as a quick ratchet, and a pop on the footer.
- **Fields:** `copy`, `table` (`title`, `badge`, `cols`, `rows` with `label` and `cells` of
  `true`, `"view"`, or `0`, `footer`, `footerIcon`, `legend`, `fullLabel`, `viewLabel`).

## burst (8 beats, brand/paper/ink, exits by iris)

- **Layout:** one 200 px word per beat, centred, with a mono index (`03 / 08`). Every word
  brings its own background, cycling `tones` (default brand, paper, ink), so the frame flips
  luminance on the beat.
- **Motion:** each word slams in from 132% out of a 14 px blur in 0.3 s (expo out), then creeps
  larger. Layer visibility is a pure function of time. The HUD inverts with the light words.
  The iris to the end card opens from the last word.
- **Sound:** a tap on every word, a light whoosh into each flip, and a half-level impact on the
  last word.
- **Rules:** use it once, right after the drop. Two flips a second stays under the
  photosensitivity limit of three flashes a second. Do not make it faster.
- **Fields:** `words`, `each` (beats per word, default 1), `tones`, `index` (`false` hides the
  counter).

## Transitions

| Type | Window | What happens | Sound |
| --- | --- | --- | --- |
| `iris` | 0.3 s ending on the cut | The next scene opens through a circle growing from an element (the mark, the manifesto's second line) or the frame centre; two translucent discs of its colour lead the edge | whoosh peaking 0.06 s before the cut |
| `pixel` | 0.36 s ending on the cut | 8 columns of the next scene's background fall in 4 steps each, left to right, with 3 tint bands on each leading edge | whoosh peaking at the wipe's midpoint |
| `whip` | 0.34 s centred on the cut | Both scenes push left (power4.inOut) with a horizontal SVG blur up to 90 px at the cut; the incoming hero lags 110 px and settles | whoosh peaking one frame before the cut |
| `focus` | 0.26 s ending on the cut | The outgoing camera blurs to 28 px and pushes to 110%; the next scene resolves out of blur | whoosh peaking 0.06 s before the cut |
| `cut` | none | A hard cut; use it rarely | none |
