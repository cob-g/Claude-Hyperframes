#!/usr/bin/env node
// Find where a music track's beat drops and where to start it so the promo's cut lands on a bar.
//
// Usage: node .claude/skills/ip-17-pro-style/scripts/music-cue.mjs <audio> [--cut 5.403] [--first 0.25] [--from 0] [--to 60]
//
// Decodes the track locally with ffmpeg:
// - The kick/808 band (below 150 Hz) finds the drops: onsets where the bass level jumps.
// - The hi-hat band (above 5 kHz) finds the tempo, since trap 808s fall off the beat grid.
//   It uses autocorrelation of the onset envelope, 70-180 BPM.
// Each drop is taken as the first downbeat of a bar. A later drop that is not a whole number of
// bars after the first one may enter off the downbeat (on beat 2, say), and is flagged. For each one it prints the `musicStart`
// that puts the drop close to --first (default 0.25 s, when the products first show). The start
// is chosen so a grid line falls 30 ms after --cut: a bar line if any drop time up to one beat
// after --first allows it, else a half bar, else a beat. That way the cut never clips the next
// attack. --cut is the "bed cut" that build-promo.mjs prints (5.403 s with the default timing).
// Signal analysis only: listen before you commit.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
const usage = m => {
  if (m) console.error(m);
  console.error("Usage: node music-cue.mjs <audio> [--cut 5.403] [--first 0.25] [--from 0] [--to 60]");
  process.exit(1);
};
if (!args.length || args.includes("--help")) { console.log("Usage: node music-cue.mjs <audio> [--cut 5.403] [--first 0.25] [--from 0] [--to 60]"); process.exit(args.length ? 0 : 1); }
const file = args[0];
const opt = (k, d) => {
  const i = args.indexOf(`--${k}`);
  if (i < 0) return d;
  const v = Number(args[i + 1]);
  if (!Number.isFinite(v) || v < 0) usage(`--${k} must be a number, 0 or more.`);
  return v;
};
const CUT = opt("cut", 5.403), FIRST = opt("first", 0.25), FROM = opt("from", 0), TO = opt("to", 60);
if (!existsSync(file)) usage(`No file ${file}`);
if (TO <= FROM) usage("--to must be after --from.");
if (CUT < FIRST + 1) usage("--cut must be at least a second after --first (the bed plays from the drop to the cut).");

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
const LEN = Number(probe.stdout.trim());
if (!(LEN > 0)) usage(`${file} is not readable audio.`);
if (FROM >= LEN) usage(`--from ${FROM} is past the end of the file (${LEN.toFixed(2)} s).`);

const SR = 12000; // 120-sample hops give a 100 Hz envelope
function decode(filter) {
  const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(FROM), "-t", String(TO - FROM), "-i", file, "-ac", "1", "-ar", String(SR),
    ...(filter ? ["-af", filter] : []), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) usage(`ffmpeg could not decode ${file}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
const low = decode("lowpass=f=150,lowpass=f=150");
const high = decode("highpass=f=5000,highpass=f=5000");

const HOP = SR / 100;
const env = (x) => {
  const n = Math.floor(x.length / HOP), e = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; s += v * v; } e[i] = Math.sqrt(s / HOP); }
  return e;
};
const flux = e => e.map((v, i) => (i ? Math.max(0, v - e[i - 1]) : 0));
const eLow = env(low), eHigh = env(high);
const onset = flux(eLow), hat = flux(eHigh);
const peakOn = Math.max(0, ...onset);
const level = 20 * Math.log10(Math.max(...eLow, ...eHigh, 1e-9));
if (eLow.length < 400 || level < -60 || peakOn < 1e-4) usage("No beat found: the window is too short or too quiet. Try another track or --from/--to.");

// Tempo: autocorrelation of the hi-hat onsets, 70-180 BPM, with the half and double lags voting
// too so an eighth-note hat pattern does not win over the beat.
const ac = lag => { let s = 0; for (let i = 0; i + lag < hat.length; i++) s += hat[i] * hat[i + lag]; return s; };
let best = -1, bestLag = 0;
for (let lag = Math.round(100 * 60 / 180); lag <= Math.round(100 * 60 / 70); lag++) {
  const s = ac(lag) + 0.5 * ac(2 * lag) + 0.5 * ac(Math.round(lag / 2));
  if (s > best) { best = s; bestLag = lag; }
}
const [a0, a1, a2] = [ac(bestLag - 1), ac(bestLag), ac(bestLag + 1)];
const frac = (a0 - a2) / (2 * (a0 - 2 * a1 + a2) || 1);
const bpm = 6000 / (bestLag + (Math.abs(frac) < 1 ? frac : 0));
// Trap is often felt in half time (~70) over a 140 grid; bars are counted on the faster grid.
const grid = bpm < 95 ? bpm * 2 : bpm;
const beat = 60 / grid, bar = 4 * beat;

// Drops: strong bass onsets where the next 2 s are much louder than the previous 2 s. Onsets
// within a bar of a stronger one belong to the same drop.
const mean = (a, b) => { let s = 0, n = 0; for (let i = Math.max(0, a); i < Math.min(eLow.length, b); i++) { s += eLow[i]; n++; } return n ? s / n : 0; };
const hits = [];
for (let i = 1; i < onset.length - 1; i++)
  if (onset[i] > 0.35 * peakOn && onset[i] >= onset[i - 1] && onset[i] >= onset[i + 1] && (!hits.length || i - hits[hits.length - 1] > 12)) hits.push(i);
const cands = hits.map(i => ({ t: FROM + i / 100, lift: mean(i, i + 200) / (mean(i - 200, i) + 1e-6) })).filter(d => d.lift > 3);
const drops = [];
for (const d of cands.sort((a, b) => b.lift - a.lift)) if (!drops.some(x => Math.abs(x.t - d.t) < bar)) drops.push(d);
drops.sort((a, b) => a.t - b.t);

console.log(`${file}: ~${grid.toFixed(1)} BPM${grid !== bpm ? ` (half-time feel ~${bpm.toFixed(1)})` : ""}, beat ${beat.toFixed(3)} s, bar ${bar.toFixed(3)} s`);
if (!drops.length) console.log("No clear drop in this window; try --from/--to around where the beat comes in.");
const AIM = CUT + 0.03; // a grid line just after the cut
const first = drops.length ? drops[0].t : 0;
for (const d of drops.slice(0, 4)) {
  const downbeat = d.t;
  const beatsFromFirst = (d.t - first) / beat;
  const offBeats = Math.abs(beatsFromFirst - 4 * Math.round(beatsFromFirst / 4)) > 0.25 ? beatsFromFirst : 0;
  // Grid lines sit at drop + k * unit. Choose a drop time between 0.05 s and one beat after
  // --first that puts a line at AIM: a bar line if possible, else a half bar, else a beat.
  let pick = null;
  for (const [unit, name] of [[bar, "a bar line"], [bar / 2, "a half-bar line"], [beat, "a beat"]]) {
    const ats = [];
    for (let k = Math.floor((AIM - FIRST - beat) / unit); k <= Math.ceil((AIM - 0.05) / unit); k++) {
      const at = AIM - k * unit;
      if (k > 0 && at >= 0.05 && at <= FIRST + beat) ats.push(at);
    }
    if (ats.length) { pick = { at: ats.sort((x, y) => Math.abs(x - FIRST) - Math.abs(y - FIRST))[0], name }; break; }
  }
  const at = pick ? pick.at : FIRST;
  const start = downbeat - at;
  if (start < 0) { console.log(`  drop at ${d.t.toFixed(2)} s: too close to the start of the file to cue.`); continue; }
  const short = start + CUT > LEN ? ` (only ${(LEN - start).toFixed(2)} s of track after it: too short for a ${CUT} s bed)` : "";
  const where = pick ? `${pick.name} 30 ms after the ${CUT} s cut` : `the ${CUT} s cut off the beat grid (no alignment fits)`;
  const entry = offBeats ? ` (it is ${offBeats.toFixed(1)} beats after the first drop, not a whole number of bars: it may not start a bar, so check by ear)` : "";
  console.log(`  drop at ${d.t.toFixed(2)} s (bass x${d.lift.toFixed(1)}): "musicStart": ${start.toFixed(2)} puts the drop at ${at.toFixed(2)} s and ${where}${entry}${short}`);
}
const lufs = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr.match(/I:\s+(-?[\d.]+) LUFS/g);
if (lufs) console.log(`Integrated loudness ${lufs.pop().replace(/\s+/g, " ")}; the builder levels the bed toward -14 LUFS behind a -4.5 dBFS ceiling.`);
