#!/usr/bin/env node
// Map a track's bass for a cutout strobe edit: where the bass is in (a "wall"), where it rests (a
// "gap"), and where the accents fall. The edit is written from this map.
//
// Usage:
//   node .claude/skills/cutout-strobe/scripts/bass-map.mjs <audio> [<audio> ...] [--len 20] [--fps 30]
//       Score each file and print its best window of --len seconds.
//   node .claude/skills/cutout-strobe/scripts/bass-map.mjs <audio> --from <seconds> [--len 20] [--fps 30]
//       Print the frame map of that window and a timeline skeleton for cs-plan.json.
//
// In the reference the bass plays in blocks of about 1.47 s with rests of 0.45 s (a 1.92 s cycle),
// it is in for half of the film, it falls more than 20 dB in the rests, and the strongest attack
// inside each block lands about 0.96 s after the block starts. The picture follows it frame for frame:
//   wall  -> a hero cutout over a montage strobing inside a window
//   accent (inside a wall) -> one white frame, then 13 frames of decay
//   gap   -> the next shot stepping in as white shapes
// A track fits when it has those rests. One without them can still be used with `music.gate`
// (the builder cuts the low end out of the bed under every step), but the rests are then made,
// not found, so listen before trusting it. Signal analysis only; listen before you commit.

import { existsSync } from "node:fs";
import { analyze, backbeat } from "./lib-bass.mjs";

const args = process.argv.slice(2);
const usage = (m, code = 1) => {
  if (m) console.error(m);
  console.error("Usage: node bass-map.mjs <audio> [<audio> ...] [--from <s>] [--len 20] [--fps 30]");
  process.exit(code);
};
if (!args.length || args.includes("--help")) usage(null, args.length ? 0 : 1);
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  if (i < 0) return d;
  const v = Number(args[i + 1]);
  if (!Number.isFinite(v) || v < 0) usage(`--${k} must be a number, 0 or more.`);
  return v;
};
const files = args.filter((a, i) => !a.startsWith("--") && !(i && args[i - 1].startsWith("--")));
const LEN = opt("len", 20), FPS = opt("fps", 30), FROM = opt("from", null);
if (!files.length) usage("Give at least one audio file.");
const r2 = n => Math.round(n * 100) / 100, r3 = n => Math.round(n * 1000) / 1000;
const fr = t => Math.round(t * FPS);

// How well a window suits the style, 0-1 on each count:
// - rests: a rest of 0.2 to 2.5 s between two walls, one every 4 s or more often
// - share: the bass in for 35% to 80% of the time (the reference: 50%)
// - depth: the bass 12 dB or more down in the rests
function fit(an, a, b) {
  const inner = an.spans.filter((s, i) => s.kind === "gap" && s.a >= a && s.b <= b && s.len >= 0.2 && s.len <= 2.5 && an.spans[i - 1]?.kind === "wall" && an.spans[i + 1]?.kind === "wall");
  const walls = an.spans.filter(s => s.kind === "wall" && s.b > a && s.a < b);
  const span = b - a;
  const rests = Math.min(1, inner.length / (span / 4));
  const onTime = walls.reduce((t, s) => t + Math.min(b, s.b) - Math.max(a, s.a), 0) / span;
  const share = onTime >= 0.35 && onTime <= 0.8 ? 1 : Math.max(0, 1 - Math.abs(onTime - 0.575) * 2.5);
  const depth = Math.min(1, an.gapDepth / 12);
  return { gaps: inner.length, onTime, rests, share, score: (rests * 0.6 + share * 0.4) * (inner.length ? depth : 1) };
}

for (const file of files) {
  if (!existsSync(file)) { console.error(`No file ${file}`); continue; }
  if (FROM == null) {
    // Scan the whole file for the best window.
    const an = analyze(file);
    if (!an) { console.error(`${file}: not readable audio.`); continue; }
    let best = null;
    const gaps = an.spans.filter(s => s.kind === "gap");
    // Candidate starts: 2 s before each wall that follows a gap (room for an intro), and 0.
    const starts = [0, ...an.spans.filter((s, i) => s.kind === "wall" && i > 0).map(s => Math.max(0, s.a - 4))];
    for (const t of starts) {
      if (t + LEN > an.duration) continue;
      const f = fit(an, t, t + LEN);
      if (!best || f.score > best.score) best = { t, ...f };
    }
    const verdict = !best ? "shorter than --len" : best.score >= 0.75 ? "FITS: the bass rests on its own" : best.score >= 0.45 ? "PARTLY: some rests; add music.gate on the steps without one" : "NO RESTS: use music.gate on every step, or pick another track";
    console.log(`${file}`);
    console.log(`  ${r2(an.duration)} s, tempo ~${an.tempo.bpm.toFixed(2)} BPM (comb contrast x${an.tempo.contrast.toFixed(2)}${an.tempo.contrast < 1.6 ? ", weak pulse" : ""}), ${Math.round(an.bassShare * 100)}% of the energy below 120 Hz`);
    console.log(`  whole file: bass in ${Math.round(an.wallShare * 100)}% of the time${an.cycle ? `, a cycle of ${r2(an.cycle)} s` : ""}, ${gaps.length} rests${gaps.length ? `, median ${r2(gaps.map(g => g.len).sort((x, y) => x - y)[gaps.length >> 1])} s, bass ${r2(an.gapDepth)} dB down in them` : ""}`);
    if (best) console.log(`  best ${LEN} s: from ${r3(best.t)} s: ${best.gaps} rests between walls, bass in ${Math.round(best.onTime * 100)}% of it, score ${r2(best.score)}  ->  ${verdict}`);
    else console.log(`  ${verdict}`);
    console.log("  reference (its 19.3 s through this script): 5 rests between walls, bass in 49%, a 1.92 s cycle, score 1");
    continue;
  }

  // The frame map of one window.
  const an = analyze(file, { from: FROM, len: LEN });
  if (!an) { console.error(`${file}: not readable audio in that window.`); continue; }
  const f = fit(an, 0, an.duration);
  console.log(`${file} from ${FROM} s, ${r2(an.duration)} s at ${FPS} fps (${fr(an.duration)} frames)`);
  console.log(`  tempo ~${an.tempo.bpm.toFixed(2)} BPM${an.cycle ? `; a cycle of ${r2(an.cycle)} s (${r2(an.cycle * FPS)} frames)` : ""}; ${f.gaps} rests between walls; bass in ${Math.round(f.onTime * 100)}% of the window; the bass falls ${r2(an.gapDepth)} dB in the rests\n`);
  console.log("  frames        seconds          what   notes");
  const skeleton = [];
  an.spans.forEach((s, i) => {
    const a = fr(s.a), b = fr(s.b);
    let note = "";
    if (s.kind === "wall") {
      const acc = backbeat(an, s);
      if (acc) note = `flash at frame ${fr(acc.t)} (${r3(acc.t)} s, ${fr(acc.t) - a} frames in${acc.snapped ? "" : ", no attack near it"})`;
      if (s.dips?.length) note += `${note ? "; " : ""}${s.dips.length} dips, so stabs start at frames ${[a, ...s.dips.map(d => fr(d.b))].slice(0, s.dips.length + 1).join(", ")}`;
      skeleton.push({ wall: "<hero clip>", until: b, ...(acc ? { flash: [fr(acc.t) - a] } : {}) });
    } else if (s.kind === "gap") {
      note = s.len < 0.2 ? "too short for a step: leave it inside the wall" : `${b - a} frames: ${b - a >= 12 ? "a step of 5 at 3 frames, or 3 at 5" : "a step of " + Math.max(2, Math.floor((b - a) / 3)) + " at 3 frames"}`;
      if (i === 0) { note = "no bass: the intro (slit closing over the build)"; skeleton.push({ wall: "<hero clip>", until: b, window: { shape: "slit", from: 1, to: 0.05 } }); }
      else if (s.len >= 0.2) skeleton.push({ step: "bars", until: b });
    } else {
      note = "a stab: one white silhouette on its first frame";
    }
    console.log(`  ${String(a).padStart(4)}-${String(b).padEnd(4)}   ${r3(s.a).toFixed(3).padStart(6)}-${r3(s.b).toFixed(3).padEnd(6)}  ${s.kind.padEnd(5)}  ${note}`);
  });
  console.log(`\n  "music": { "file": "<path>", "start": ${FROM} }`);
  console.log("  timeline skeleton (name the clips, pick the windows and the step shapes):");
  console.log(skeleton.map(o => "    " + JSON.stringify(o)).join(",\n"));
}
