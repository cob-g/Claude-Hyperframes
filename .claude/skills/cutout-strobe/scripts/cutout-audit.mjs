#!/usr/bin/env node
// Audit a rendered "cutout strobe" reel against its plan and the style's measurable rules.
//
// Usage: node .claude/skills/cutout-strobe/scripts/cutout-audit.mjs <project-dir> <render.mp4>
//
// Checks, against cs/cues.json:
// - Format, frame rate, length, an audio stream, no black frames.
// - Every flash is a white frame on its own frame, and decays after it.
// - Every step shows white on its hit frames (a bar, a column, a disc, or a silhouette).
// - Every whip is two soft frames with a sharp one after them.
// - The pace inside the walls (the montage should change on nearly every frame) and how still the
//   film is outside them.
// - Flashing: the busiest second of full-frame brightness swings.
// - Loudness, true peak, and A/V sync against cs/audio/mix.wav.
// - A sound onset on every cue's frame in the effects stem.
// - The track against the picture: bass in under the walls, out under the steps, and an attack
//   under every flash.
// Prints PASS / WARN / FAIL lines and exits 1 on any FAIL.

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { analyze, nearestOnset } from "./lib-bass.mjs";

const [projectArg, renderArg] = process.argv.slice(2);
if (!projectArg || !renderArg) {
  console.log("Usage: node cutout-audit.mjs <project-dir> <render.mp4>");
  process.exit(1);
}
const project = resolve(projectArg);
const render = resolve(project, renderArg);
const cuesPath = join(project, "cs", "cues.json");
if (!existsSync(render)) { console.error(`missing ${render}`); process.exit(1); }
if (!existsSync(cuesPath)) { console.error(`missing ${cuesPath}; build the project first`); process.exit(1); }
const cues = JSON.parse(readFileSync(cuesPath, "utf8"));
const FPS = cues.fps, TOTAL = cues.frames;
let fails = 0;
const out = (lvl, msg) => { if (lvl === "FAIL") fails++; console.log(`${lvl.padEnd(4)} ${msg}`); };
const r2 = n => Math.round(n * 100) / 100;
const list = (a, n = 10) => a.slice(0, n).join(", ") + (a.length > n ? `, and ${a.length - n} more` : "");

// ---------------------------------------------------------------- format
const pr = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", render], { encoding: "utf8" }).stdout);
const vs = pr.streams.find(s => s.codec_type === "video");
const [fn, fd] = vs.r_frame_rate.split("/").map(Number);
const dur = Number(pr.format.duration);
out(vs.width === cues.width && vs.height === cues.height ? "PASS" : "FAIL", `format ${vs.width}x${vs.height} (plan ${cues.width}x${cues.height})`);
out(Math.abs(fn / fd - FPS) < 0.01 ? "PASS" : "FAIL", `frame rate ${r2(fn / fd)} (plan ${FPS})`);
out(Math.abs(dur - cues.duration) <= 1.5 / FPS ? "PASS" : "WARN", `duration ${r2(dur)} s (plan ${cues.duration} s)`);
out(pr.streams.some(s => s.codec_type === "audio") ? "PASS" : "FAIL", "audio stream present");

// ---------------------------------------------------------------- picture metrics (quarter scale)
const W = 320, H = Math.round((320 * cues.height) / cues.width / 2) * 2;
const frames = await new Promise((res, rej) => {
  const p = spawn("ffmpeg", ["-v", "error", "-i", render, "-vf", `scale=${W}:${H},format=gray`, "-f", "rawvideo", "-"]);
  const size = W * H, rows = [];
  let pend = Buffer.alloc(0), prev = null;
  p.stdout.on("data", d => {
    pend = Buffer.concat([pend, d]);
    while (pend.length >= size) {
      const f = pend.subarray(0, size);
      pend = pend.subarray(size);
      let sum = 0, white = 0, grad = 0, diff = 0;
      for (let i = 0; i < size; i++) { const v = f[i]; sum += v; if (v > 235) white++; if (i % W) grad += Math.abs(v - f[i - 1]); if (prev) diff += Math.abs(v - prev[i]); }
      rows.push({ luma: sum / size / 255, white: white / size, sharp: grad / size, diff: prev ? diff / size / 255 : 0 });
      prev = Buffer.from(f);
    }
  });
  p.on("close", c => (c === 0 ? res(rows) : rej(new Error("ffmpeg decode failed"))));
});
const F = i => frames[Math.max(0, Math.min(frames.length - 1, i))];

const black = frames.map((f, i) => (f.luma < 0.012 ? i : -1)).filter(i => i >= 0);
out(!black.length ? "PASS" : "FAIL", `no black frames${black.length ? ` (black at ${list(black)})` : ""}`);

// Flashes: white on the frame, lower on the next, and lower again six frames on.
const badFlash = [], softDecay = [];
for (const f of cues.flashes) {
  if (F(f).luma < 0.9) badFlash.push(`${f} (luma ${r2(F(f).luma)})`);
  else if (!(F(f + 1).luma < F(f).luma && F(f + 6).luma < F(f + 1).luma)) softDecay.push(f);
}
out(!badFlash.length ? "PASS" : "FAIL", `flashes white on their frames: ${cues.flashes.length - badFlash.length}/${cues.flashes.length}${badFlash.length ? ` (not white: ${list(badFlash)})` : ""}`);
if (cues.flashes.length) out(!softDecay.length ? "PASS" : "WARN", `flashes decay over the following frames${softDecay.length ? ` (no decay after ${list(softDecay)})` : ""}`);

// Step hits: more white on the hit frame than on the frame before it.
const flat = [];
for (const f of cues.whites) if (!(F(f).white - F(f - 1).white > 0.01 || F(f).white > 0.5)) flat.push(`${f} (+${r2((F(f).white - F(f - 1).white) * 100)}%)`);
if (cues.whites.length) out(!flat.length ? "PASS" : flat.length <= cues.whites.length / 4 ? "WARN" : "FAIL", `step hits show white: ${cues.whites.length - flat.length}/${cues.whites.length}${flat.length ? ` (little or no white on ${list(flat)}; a small or dark subject makes a small silhouette)` : ""}`);

// Whips: the two smeared frames carry less edge detail than the frame after them.
const hard = [];
for (const f of cues.whips) if (!(F(f).sharp < F(f + 1).sharp * 0.8 && F(f - 1).sharp < F(f + 1).sharp)) hard.push(f);
if (cues.whips.length) out(!hard.length ? "PASS" : "WARN", `whips are soft, then sharp: ${cues.whips.length - hard.length}/${cues.whips.length}${hard.length ? ` (check ${list(hard)})` : ""}`);

// Pace. Inside a wall with a window the picture should change on nearly every frame.
const walls = cues.items.filter(o => o.type === "wall" && o.window !== "none");
let wallFrames = 0, wallChanges = 0;
for (const w of walls) for (let f = w.a + 1; f < w.b; f++) { wallFrames++; if (F(f).diff > 0.004) wallChanges++; }
const perSec = wallFrames ? (wallChanges / wallFrames) * FPS : 0;
if (walls.length) out(perSec >= FPS * 0.6 ? "PASS" : "WARN", `inside the walls the picture changes on ${Math.round((wallChanges / wallFrames) * 100)}% of frames (${r2(perSec)} a second; the reference: 22-29 a second)`);
let busiest = 0;
for (let s = 0; s + FPS <= frames.length; s += Math.round(FPS / 2)) { let n = 0; for (let f = s + 1; f < s + FPS; f++) if (Math.abs(F(f).luma - F(f - 1).luma) > 0.1) n++; busiest = Math.max(busiest, n); }
out(busiest <= 6 ? "PASS" : "WARN", `flashing: ${busiest} full-frame brightness swings in the busiest second${busiest > 6 ? " (over three flashes a second: this is flashing imagery, post it with a warning)" : ""}`);
let run = 0, longest = 0;
frames.slice(1).forEach(f => { if (f.diff < 0.0015) { run++; longest = Math.max(longest, run); } else run = 0; });
out(longest <= FPS ? "PASS" : "WARN", `longest frozen stretch: ${longest} frames`);

// ---------------------------------------------------------------- audio
const eb = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", render, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
const num = re => Number(((eb.match(re) || []).pop() || "").match(/-?[\d.]+/)?.[0]);
const I = num(/I:\s+-?[\d.]+ LUFS/g), TP = num(/Peak:\s+-?[\d.]+ dBFS/g);
out(Math.abs(I + 14) <= 1 ? "PASS" : "WARN", `loudness ${I} LUFS (want -14 ± 1)`);
out(TP <= -1 ? "PASS" : "FAIL", `true peak ${TP} dBTP (want ≤ -1; if the mix is lower, remux with a cleaner AAC encoder, see SKILL.md)`);
function pcm(file, sr = 8000) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
const mixPath = join(project, "cs", "audio", "mix.wav");
if (existsSync(mixPath)) {
  const a = pcm(render), m = pcm(mixPath);
  const env = x => { const e = []; for (let i = 0; i + 8 <= x.length; i += 8) { let s = 0; for (let j = 0; j < 8; j++) s += Math.abs(x[i + j]); e.push(s); } return e; };
  const ea = env(a), em = env(m);
  let best = -Infinity, lag = 0;
  for (let L = -120; L <= 120; L++) {
    let s = 0;
    for (let i = 200; i < Math.min(ea.length, em.length) - 200; i++) s += ea[i] * (em[i + L] || 0);
    if (s > best) { best = s; lag = L; }
  }
  out(Math.abs(lag) <= 1000 / FPS ? "PASS" : "FAIL", `A/V: render audio vs mix.wav offset ${lag} ms (≤ 1 frame)`);
}
const sfxStem = join(project, "cs", "audio", "stems", "sfx.wav");
const placed = cues.cues.filter(c => c.kind && c.kind !== "music" && c.start != null && !c.align);
if (existsSync(sfxStem) && placed.length) {
  const x = pcm(sfxStem, 8000), hop = 40;
  const e = []; for (let i = 0; i + hop <= x.length; i += hop) { let s = 0; for (let j = 0; j < hop; j++) s += x[i + j] * x[i + j]; e.push(Math.sqrt(s / hop)); }
  let ok = 0; const late = [];
  for (const c of placed) {
    const i0 = Math.max(0, Math.floor((c.at - 1 / FPS) * 200)), i1 = Math.floor((c.at + 1 / FPS) * 200);
    const before = Math.max(1e-5, ...e.slice(Math.max(0, i0 - 8), i0));
    const peak = Math.max(...e.slice(i0, i1 + 1));
    if (peak > before * 1.6 || peak > 0.02) ok++; else late.push(`${c.kind}@${c.frame}`);
  }
  out(ok === placed.length ? "PASS" : "WARN", `sound cues with an onset on their frame: ${ok}/${placed.length}${late.length ? ` (quiet or masked: ${list(late, 8)})` : ""}`);
}

// The track against the picture, read off the bed stem (what the film actually plays).
const bedStem = join(project, "cs", "audio", "stems", "bed.wav");
if (existsSync(bedStem)) {
  const an = analyze(bedStem);
  if (an) {
    const share = (a, b) => { let n = 0, on = 0; for (let f = a; f < b; f++) { n++; if (an.stateAt((f + 0.5) / FPS)) on++; } return n ? on / n : 0; };
    const steps = cues.items.filter(o => o.type === "step");
    const loudSteps = steps.filter(o => share(o.a, o.b) > 0.35).map(o => `${o.a}-${o.b} (${Math.round(share(o.a, o.b) * 100)}%)`);
    if (steps.length) out(!loudSteps.length ? "PASS" : "WARN", `steps sit in the bass's rests: ${steps.length - loudSteps.length}/${steps.length}${loudSteps.length ? ` (bass in under ${list(loudSteps, 6)})` : ""}`);
    const off = [];
    for (const f of cues.flashes) { const o = nearestOnset(an, f / FPS, 0.2); if (!o || Math.abs(o.d * FPS) > 1.5) off.push(`${f}${o ? ` (${o.d > 0 ? "+" : ""}${r2(o.d * FPS)} f)` : " (none)"}`); }
    if (cues.flashes.length) out(!off.length ? "PASS" : "WARN", `flashes on an attack within 1.5 frames: ${cues.flashes.length - off.length}/${cues.flashes.length}${off.length ? ` (off: ${list(off, 6)})` : ""}`);
    out(an.bassShare >= 0.4 ? "PASS" : "WARN", `bed: ${Math.round(an.bassShare * 100)}% of its energy below 120 Hz (the reference: 82%), bass in ${Math.round(an.wallShare * 100)}% of the film`);
  }
}

console.log(fails ? `\n${fails} FAIL` : "\nno FAIL");
process.exit(fails ? 1 : 0);
