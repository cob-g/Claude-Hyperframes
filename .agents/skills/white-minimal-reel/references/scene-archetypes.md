# Scene archetypes

Five layouts measured from the reference and proven in the demo build. Coordinates are
1080x1920 plan units: `x`/`y` is the anchor point of a word (its vertical centre) or the
centre of an object. Everything sits under the 110% camera, so keep essential type inside
x 70-1010 and y 150-1750; ghost words and props are meant to bleed.

Pick the archetype from the line's shape, then vary it: never use the same one twice in a row.

## 1. Centre object, title above (one concept)

For a line with one concept word, like "your self-image".

- Object: centre (540, 1000), width 600-680, `settle`, light up-left.
- Hero: centred at y 650-720, 200-260 px, **behind** the object so the object overlaps its
  lower half.
- Script ghost: a second key word, 200-240 px, centred at y ~1000, `layer: back`, faint.
- Small line: the rest of the phrase, 50-60 px, centred at y 1180-1400.
- Props: two blurred edge objects in opposite corners.

```json
{ "object": { "src": "assets/objects/brain.png", "x": 540, "y": 1000, "w": 640, "rotate": -4, "motion": "settle" },
  "words": [
    { "text": "Habits", "match": "habits", "role": "hero", "layer": "back", "x": 540, "y": 690, "size": 240 },
    { "text": "compound", "match": "compound", "role": "script", "layer": "back", "x": 540, "y": 1010, "size": 220, "width": 1200 },
    { "text": "what you repeat", "match": "repeat", "role": "small", "x": 540, "y": 1330, "size": 56 } ] }
```

## 2. Edge object, left text stack (a sentence fragment)

For a longer fragment with one heavy word in the middle.

- Object: bleeds off the right edge, centre x 880-940, width 650-900, `slide` (enters from
  the right across the whole scene), rotated 8-15 degrees.
- Stack, left-anchored at x 70-90, top to bottom: small (y 640), script accent (y 780), hero
  (y 930, 200-330 px, `width` 600-660 so it fits), small (y 1090), faint script (y 1200).
- Small connective words may sit on the hero's shoulder at a smaller size (`anchor: left`,
  x just right of the hero).
- Optional `sweep` stroke from top right to bottom left behind the stack.

## 3. Object over a giant ghost word (a turn or warning)

For a line whose key noun deserves weight, such as a consequence.

- Object: centre (540, 1000), width 680-760, `counter` (grows slightly while the camera
  settles, so it seems to hold still while the room moves).
- Ghost: the key noun, 250-330 px, centred at y ~1000, `layer: back`, 50% grey, bleeding off
  both edges (`width` 1300-1500).
- Hero A: left-anchored at x 60-80, y ~700, in front of the object's upper left.
- Hero B: right-anchored at x ~1010, y 1300-1350, in front of its lower right.
- Small lines: one at y ~450 above, one at y ~1450 below, both 50% opacity.
- Optional `zigzag` stroke behind for a downward idea.

## 4. Rising object with panel (an instruction)

For short imperative lines ("just keep going").

- Title stack at the top, centred: small (y 160-180), hero (y 300-450, 280-330 px), then a
  pair on one baseline: small italic right-anchored at x ~520 and a script or caps word
  left-anchored at x ~530.
- Panel: `{ "x": 110-150, "y": 760-880, "w": 780-860, "h": 1100-1260 }`, rising from below.
- Object: rises from below in front of the panel, centre y 1300-1450, `rise`.

## 5. Corner objects and a drawn line (a comparison or journey)

For two contrasting clauses ("you don't need X, just Y").

- Two text clusters: one near the top (small at y ~160, hero plus scripts at y 250-380),
  one lower (small at y ~1190, hero at y ~1330, scripts at y 1380-1490).
- Objects: one at the bottom centre (y 1750-1850, partly off-frame), one in a top corner.
  Use `objects` for the second hero or a heavy `depth` item with low blur.
- Stroke: `line` type, 14-20 px, a long S-curve from the top right to the bottom right,
  drawn over about 0.8 s starting at 0.3 s.

## Choosing roles

- **hero**: the one word the viewer should remember from the scene. One or two per scene.
- **small**: connective words, in reading order. Dim (`classes: ["dim"]`) the less important.
- **script**: emotion, names, or special words. Faint by default; `["gold", "solid"]` when it
  is the point of the line.
- **ghost**: at most one per scene, always behind the object.

Words must be said inside the scene window. `match` finds their onset; use `at` (seconds on
the reel timeline) only to override a mistimed transcript word.
