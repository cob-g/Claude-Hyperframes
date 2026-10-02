#!/usr/bin/env node
// Measure how well a track suits a negative strobe edit, and suggest the plan's `music` block.
//
// Usage: node .claude/skills/negative-strobe/scripts/track-fit.mjs <audio> [<audio> ...]
//          [--len 10] [--fps 24] [--from 0] [--to 120]
//
// The reference's sound is a wall of bass with a fast tick on top: about nine tenths of its energy
// sits below 150 Hz, and a hat lands on every sixteenth (8.7 a second), so any cut has a sound
// within 60 ms of it. For each file this prints, decoded locally with ffmpeg (no network):
// - Tempo and beat phase: a comb search from 70 to 180 BPM over kick and full-band onsets, with
//   the phase then moved onto the attack (a kick's click comes before its energy peak).
// - The bar phase: the beat of four that carries the most low-band attack.
// - Bass share (energy below 150 Hz) and tick rate (onsets above 4 kHz per second), for the whole
//   file and for the best window of --len seconds starting on a bar line.
// - How the tempo sits on the frame grid: frames per sixteenth and per eighth at --fps, and the
//   group size a burst should use.
// - `"music": { "start", "grid" }` for that window.
// Signal analysis only; listen before you commit.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const usage = (m, code = 1) => {
  if (m) console.error(m);
  console.error("Usage: node track-fit.mjs <audio> [<audio> ...] [--len 10] [--fps 24] [--from 0] [--to 120]");
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
const LEN = opt("len", 10), VFPS = opt("fps", 24), FROM = opt("from", 0), TO = opt("to", 120);
if (!files.length) usage("Give at least one audio file.");

const SR = 12000, FPS = 200, HOP = SR / FPS;
const r2 = n => Math.round(n * 100) / 100, r3 = n => Math.round(n * 1000) / 1000;
function decode(file, filter) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(FROM), "-t", String(TO - FROM), "-i", file, "-ac", "1", "-ar", String(SR),
    ...(filter ? ["-af", filter] : []), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) return null;
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
// Mean power per hop (not its root): band shares are ratios of power.
const power = x => {
  const n = Math.floor(x.length / HOP), e = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; s += v * v; } e[i] = s / HOP; }
  return e;
};
const flux = e => e.map((v, i) => (i ? Math.max(0, Math.sqrt(v) - Math.sqrt(e[i - 1])) : 0));
const norm = a => { let m = 0; for (const v of a) if (v > m) m = v; m = m || 1; return a.map(v => v / m); };

for (const file of files) {
  if (!existsSync(file)) { console.error(`No file ${file}`); continue; }
  const full = decode(file, null), low = decode(file, "lowpass=f=150,lowpass=f=150"), high = decode(file, "highpass=f=4000,highpass=f=4000");
  if (!full || !low || !high || full.length < SR * 3) { console.error(`${file}: not readable audio, or shorter than 3 s in this window.`); continue; }
  const pF = power(full), pL = power(low), pH = power(high);
  const N = pF.length;
  const oL = norm(flux(pL)), oF = norm(flux(pF)), oH = norm(flux(pH));
  const onset = oL.map((v, i) => v + 0.5 * oF[i]);

  // Tempo: the comb whose teeth collect the most onset strength.
  const at = x => { const i = Math.floor(x); if (i < 0 || i + 1 >= N) return 0; const f = x - i; return onset[i] * (1 - f) + onset[i + 1] * f; };
  const comb = bpm => {
    const P = (60 / bpm) * FPS;
    let best = -1, phase = 0;
    for (let ph = 0; ph < P; ph += 0.5) {
      let s = 0, n = 0;
      for (let x = ph; x < N; x += P) { s += at(x); n++; }
      s /= n;
      if (s > best) { best = s; phase = ph; }
    }
    return { bpm, score: best, phase };
  };
  const scores = [];
  for (let b = 70; b <= 180.0001; b += 0.05) scores.push(comb(Math.round(b * 100) / 100));
  const top = scores.reduce((a, b) => (b.score > a.score ? b : a));
  const beat = 60 / top.bpm, P = beat * FPS;
  const sum = (a, i0, i1) => { let s = 0; for (let i = Math.max(0, i0); i < Math.min(N, i1); i++) s += a[i]; return s; };
  // The comb finds the beat from energy, and a kick's energy peaks tens of milliseconds after its
  // click. A cut belongs on the click. So the phase is refined on the attack (the rise in log
  // power, which is largest where a sound starts), searched from 120 ms before the energy phase.
  const floor = (sum(pF, 0, N) / N) * 0.01;
  const attack = pF.map((v, i) => (i ? Math.max(0, Math.log((v + floor) / (pF[i - 1] + floor))) : 0));
  let phase = top.phase, bestA = -1;
  for (let ph = top.phase - 0.12 * FPS; ph <= top.phase + 0.02 * FPS; ph += 0.25) {
    let s = 0, n = 0;
    for (let x = ph; x < N - 1; x += P) { if (x < 0) continue; const i = Math.floor(x), f = x - i; s += attack[i] * (1 - f) + attack[i + 1] * f; n++; }
    if (n && s / n > bestA) { bestA = s / n; phase = ph; }
  }
  phase = ((phase % P) + P) % P;
  // Bar phase: of the four beats, the one with the most low-band attack starts the bar. The low
  // band peaks late, so it is read at the energy phase.
  const barSum = [0, 0, 0, 0];
  const k0 = Math.round((top.phase - phase) / P);
  for (let k = 0, x = top.phase; x < N; x += P, k++) barSum[(((k + k0) % 4) + 4) % 4] += oL[Math.round(x)] || 0;
  const b0 = barSum.indexOf(Math.max(...barSum));
  const down = FROM + (phase + b0 * P) / FPS;

  // Shares over a span of envelope frames.
  const ticksIn = (i0, i1) => { let n = 0; for (let i = Math.max(2, i0); i < Math.min(N - 2, i1); i++) if (oH[i] > 0.12 && oH[i] >= oH[i - 1] && oH[i] > oH[i + 1] && oH[i] >= oH[i - 2] && oH[i] >= oH[i + 2]) n++; return n; };
  const describe = (i0, i1) => ({ bass: sum(pL, i0, i1) / (sum(pF, i0, i1) || 1), ticks: ticksIn(i0, i1) / ((i1 - i0) / FPS), level: 10 * Math.log10(sum(pF, i0, i1) / (i1 - i0) + 1e-12) });
  const whole = describe(0, N);
  // The best window of LEN seconds starting on a bar line: bass-heavy, loud, and ticking.
  let best = null;
  for (let t = down; t + LEN <= FROM + N / FPS; t += 4 * beat) {
    const i0 = Math.round((t - FROM) * FPS), d = describe(i0, i0 + Math.round(LEN * FPS));
    const score = d.bass * 2 + Math.min(1, d.ticks / 8) + (d.level - whole.level) / 12;
    if (!best || score > best.score) best = { t, ...d, score };
  }

  const f16 = (beat / 4) * VFPS, f8 = (beat / 2) * VFPS;
  const whole16 = Math.abs(f16 - Math.round(f16)) < 0.12, whole8 = Math.abs(f8 - Math.round(f8)) < 0.12;
  const lufs = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-ss", String(FROM), "-t", String(TO - FROM), "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr.match(/I:\s+(-?[\d.]+) LUFS/g);
  const verdict = d => `${d.bass >= 0.4 ? "bass wall" : d.bass >= 0.25 ? "bass present" : "thin low end"}, ${d.ticks >= 6 ? "dense ticks" : d.ticks >= 3.5 ? "some ticks" : "sparse highs (add the tick and buzz sfx)"}`;
  const conf = top.score / (scores.reduce((s, x) => s + x.score, 0) / scores.length);
  console.log(`${file}`);
  console.log(`  tempo ~${top.bpm.toFixed(2)} BPM (beat ${beat.toFixed(4)} s), comb contrast x${conf.toFixed(2)}${conf < 1.6 ? " (weak pulse: check by ear, or try half or double)" : ""}; bar starts at ${down.toFixed(3)} s`);
  console.log(`  frame grid at ${VFPS} fps: a sixteenth is ${r2(f16)} frames, an eighth ${r2(f8)}. ${whole16 ? `Bursts of ${Math.round(f16)}-frame groups sit on the sixteenths.` : whole8 ? `Groups of ${Math.round(f8)} frames sit on the eighths.` : `Use "on": "grid" for bursts, so each group lands on the nearest frame.`}`);
  console.log(`  whole file: ${Math.round(whole.bass * 100)}% of the energy below 150 Hz, ${r2(whole.ticks)} ticks/s above 4 kHz (${verdict(whole)})${lufs ? `, ${lufs.pop().replace(/\s+/g, " ")}` : ""}`);
  if (best) {
    console.log(`  best ${LEN} s: from ${best.t.toFixed(3)} s: ${Math.round(best.bass * 100)}% bass, ${r2(best.ticks)} ticks/s, ${best.level - whole.level >= 0 ? "+" : ""}${r2(best.level - whole.level)} dB against the file (${verdict(best)})`);
    console.log(`  "music": { "file": "<path>", "start": ${r3(best.t)}, "grid": { "bpm": ${top.bpm.toFixed(2)}, "downbeat": ${r3(down)} } }`);
  } else console.log(`  The file is shorter than --len ${LEN} s from its first bar line.`);
  console.log("  reference: 87% bass, 15.9 ticks/s, -9.0 LUFS (its 3 s of sound through this script; see references/sound-design.md)");
}
