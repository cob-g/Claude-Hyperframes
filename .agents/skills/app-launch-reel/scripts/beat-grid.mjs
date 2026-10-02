#!/usr/bin/env node
// Measure a music bed's tempo, beat phase, and drops, and suggest the plan's `music` block so a
// drop lands on the reel's opening hit and every cut sits on the beat grid.
//
// Usage: node .claude/skills/app-launch-reel/scripts/beat-grid.mjs <audio> [--hit 1.0] [--from 0] [--to 90]
//
// Decodes locally with ffmpeg (no network):
// - Kick band (below 150 Hz) and full-band onset envelopes at 200 frames per second.
// - Tempo: a comb search from 90 to 160 BPM in 0.05 BPM steps. For every tempo the best phase
//   is found, and the comb score is the mean onset strength on the grid. House and pop beds are
//   usually felt at 100-140 BPM, so a candidate there wins unless another is clearly stronger.
// - Drops: kick onsets where the next 4 s carry far more bass than the previous 4 s, snapped to
//   the grid. A drop is assumed to start a bar.
// `--hit` is the reel time of the opening hit (the identity scene's hit beat, printed by the
// builder). For each drop it prints `"start"`: the track time the bed must start from so that
// drop lands on the hit. Signal analysis only; listen before you commit.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const usage = (m, code = 1) => {
  if (m) console.error(m);
  console.error("Usage: node beat-grid.mjs <audio> [--hit 1.0] [--from 0] [--to 90]");
  process.exit(code);
};
if (!args.length || args.includes("--help")) usage(null, args.length ? 0 : 1);
const file = args[0];
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  if (i < 0) return d;
  const v = Number(args[i + 1]);
  if (!Number.isFinite(v) || v < 0) usage(`--${k} must be a number, 0 or more.`);
  return v;
};
const HIT = opt("hit", 1.0), FROM = opt("from", 0), TO = opt("to", 90);
if (!existsSync(file)) usage(`No file ${file}`);
if (TO <= FROM + 8) usage("--to must be at least 8 s after --from.");

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
const LEN = Number(probe.stdout.trim());
if (!(LEN > 0)) usage(`${file} is not readable audio.`);

const SR = 12000, FPS = 200, HOP = SR / FPS;
function decode(filter) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(FROM), "-t", String(TO - FROM), "-i", file, "-ac", "1", "-ar", String(SR),
    ...(filter ? ["-af", filter] : []), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) usage(`ffmpeg could not decode ${file}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
const env = x => {
  const n = Math.floor(x.length / HOP), e = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; s += v * v; } e[i] = Math.sqrt(s / HOP); }
  return e;
};
const flux = e => e.map((v, i) => (i ? Math.max(0, v - e[i - 1]) : 0));
const eLow = env(decode("lowpass=f=150,lowpass=f=150"));
const eFull = env(decode(null));
const oLow = flux(eLow), oFull = flux(eFull);
const norm = a => { const m = Math.max(...a) || 1; return a.map(v => v / m); };
const onset = norm(oLow).map((v, i) => v + 0.5 * norm(oFull)[i]);
const N = onset.length;
if (N < FPS * 8 || Math.max(...eFull) < 1e-4) usage("No beat found: the window is too short or silent. Try --from/--to.");

const at = x => { const i = Math.floor(x); if (i < 0 || i + 1 >= N) return 0; const f = x - i; return onset[i] * (1 - f) + onset[i + 1] * f; };
function comb(bpm) {
  const P = (60 / bpm) * FPS;
  let best = -1, phase = 0;
  for (let ph = 0; ph < P; ph += 1) {
    let s = 0, n = 0;
    for (let x = ph; x < N; x += P) { s += at(x); n++; }
    s /= n;
    if (s > best) { best = s; phase = ph; }
  }
  // Refine the phase to a quarter frame.
  for (let ph = phase - 1; ph <= phase + 1; ph += 0.25) {
    let s = 0, n = 0;
    for (let x = ph; x < N; x += P) { s += at(x); n++; }
    s /= n;
    if (s > best) { best = s; phase = ph; }
  }
  return { bpm, score: best, phase: ((phase % P) + P) % P };
}
const scores = [];
for (let b = 90; b <= 160.0001; b += 0.05) scores.push(comb(Math.round(b * 100) / 100));
const top = scores.reduce((a, b) => (b.score > a.score ? b : a));
const pref = scores.filter(s => s.bpm >= 100 && s.bpm <= 140).reduce((a, b) => (b.score > a.score ? b : a));
const pick = pref.score >= 0.85 * top.score ? pref : top;
const bpm = pick.bpm, beat = 60 / bpm, bar = 4 * beat;
const gridT = k => FROM + (pick.phase / FPS) + k * beat;

// Drops: strong kick onsets with a big bass lift, snapped to the grid.
const mean = (a, b) => { let s = 0, n = 0; for (let i = Math.max(0, a); i < Math.min(N, b); i++) { s += eLow[i]; n++; } return n ? s / n : 0; };
const peak = Math.max(...oLow);
const hits = [];
for (let i = 1; i < N - 1; i++)
  if (oLow[i] > 0.3 * peak && oLow[i] >= oLow[i - 1] && oLow[i] >= oLow[i + 1] && (!hits.length || i - hits[hits.length - 1] > 20)) hits.push(i);
const W = 4 * FPS;
const cands = hits.map(i => ({ t: FROM + i / FPS, lift: mean(i, i + W) / (mean(i - W, i) + 1e-6) })).filter(d => d.lift > 2.2 && d.t > FROM + 1);
const drops = [];
for (const d of cands.sort((a, b) => b.lift - a.lift)) if (!drops.some(x => Math.abs(x.t - d.t) < 2 * bar)) drops.push(d);
drops.sort((a, b) => a.t - b.t);
for (const d of drops) {
  const k = Math.round((d.t - gridT(0)) / beat);
  d.grid = gridT(k);
}

const conf = pick.score / (scores.reduce((s, x) => s + x.score, 0) / scores.length);
console.log(`${file}`);
console.log(`  tempo ~${bpm.toFixed(2)} BPM (beat ${beat.toFixed(4)} s, bar ${bar.toFixed(3)} s), comb contrast x${conf.toFixed(2)}${conf < 1.6 ? " (weak: the pulse is not clear; pick another bed or check by ear)" : ""}`);
if (top !== pick) console.log(`  (strongest comb was ${top.bpm.toFixed(2)} BPM; ${bpm.toFixed(2)} is its house-tempo reading)`);
console.log(`  first grid beat at ${gridT(0).toFixed(3)} s in the file`);
if (!drops.length) console.log("  No clear drop in this window. Try --from/--to around where the kick comes in, or start on any bar line.");
for (const d of drops.slice(0, 5)) {
  const start = d.grid - HIT;
  const tail = LEN - start;
  const note = start < 0 ? " (too early in the file to pre-roll; lower --hit or pick a later drop)" : tail < 20 ? ` (only ${tail.toFixed(1)} s of track after it)` : "";
  console.log(`  drop ${d.grid.toFixed(3)} s (bass x${d.lift.toFixed(1)}): "music": { "bpm": ${bpm.toFixed(2)}, "start": ${start.toFixed(3)} } lands it on the ${HIT} s hit${note}`);
}
const lufs = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr.match(/I:\s+(-?[\d.]+) LUFS/g);
if (lufs) console.log(`  integrated loudness ${lufs.pop().replace(/\s+/g, " ")}; the builder mixes the reel to -14 LUFS.`);
