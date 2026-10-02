#!/usr/bin/env node
// Check a rendered app launch reel against the style's measurable rules.
//
// Usage: node .claude/skills/app-launch-reel/scripts/reel-audit.mjs <project-dir> <render.mp4>
//
// Reads the plan grid from <project>/index.html (window.ALR_CONFIG) and <project>/alr/cues.json,
// decodes the render locally with ffmpeg, and checks:
//   - format: size, frame rate, duration
//   - cuts: a real picture change lands within 0.2 s of every planned cut
//   - luminance: adjacent scenes differ in brightness or hue (the flip on every cut)
//   - no pure black frames, and no frozen stretch longer than 0.5 s before the end card
//   - audio: -14 +/- 1 LUFS, true peak <= -1 dBTP, a loudness range of at least 4 LU,
//     a whoosh (high band peak) at every cut, the bed's kicks on the cut grid, and an ending
//     that rings out to near silence
// It prints PASS / WARN / FAIL per check and exits 1 on any FAIL. Structural checks only:
// watch and listen to the render as well.

import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const [projArg, renderArg] = process.argv.slice(2);
if (!projArg || !renderArg || projArg === "--help") {
  console.log("Usage: node reel-audit.mjs <project-dir> <render.mp4>");
  process.exit(projArg ? 0 : 1);
}
const project = resolve(projArg), render = resolve(project, renderArg);
if (!existsSync(render)) { console.error(`No render at ${render}`); process.exit(1); }
const html = readFileSync(join(project, "index.html"), "utf8");
const m = html.match(/window\.ALR_CONFIG = (\{.*\});/);
if (!m) { console.error("index.html has no ALR_CONFIG; build it with build-reel.mjs."); process.exit(1); }
const cfg = JSON.parse(m[1]);
const cues = existsSync(join(project, "alr/cues.json")) ? JSON.parse(readFileSync(join(project, "alr/cues.json"), "utf8")) : { cues: [] };

let failed = 0;
const out = (level, name, msg) => { if (level === "FAIL") failed++; console.log(`${level.padEnd(4)}  ${name.padEnd(12)} ${msg}`); };
const r2 = n => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- format
const pr = JSON.parse(spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration", "-of", "json", render], { encoding: "utf8" }).stdout || "{}");
const vs = (pr.streams || []).find(s => s.codec_type === "video"), as = (pr.streams || []).find(s => s.codec_type === "audio");
const fps = vs ? eval(vs.r_frame_rate) : 0, dur = Number(pr.format?.duration);
const fmtOk = vs && vs.width === cfg.W && vs.height === cfg.H && Math.abs(fps - cfg.fps) < 0.01 && Math.abs(dur - cfg.D) < 0.1;
out(fmtOk ? "PASS" : "FAIL", "format", `${vs?.width}x${vs?.height} @ ${r2(fps)} fps, ${r2(dur)} s (plan ${cfg.W}x${cfg.H} @ ${cfg.fps}, ${cfg.D} s)`);

// ---------------------------------------------------------------- picture
const GW = 96, GH = Math.round(96 * cfg.H / cfg.W);
const raw = spawnSync("ffmpeg", ["-v", "error", "-i", render, "-vf", `scale=${GW}:${GH},format=rgb24`, "-f", "rawvideo", "-"], { maxBuffer: 1 << 30 }).stdout;
const FS = GW * GH * 3, N = Math.floor(raw.length / FS);
const luma = [], hue = [], diff = [0];
for (let f = 0; f < N; f++) {
  let l = 0, r = 0, g = 0, b = 0;
  for (let i = f * FS; i < (f + 1) * FS; i += 3) { r += raw[i]; g += raw[i + 1]; b += raw[i + 2]; }
  const n = GW * GH; r /= n; g /= n; b /= n;
  l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  luma.push(l); hue.push([r, g, b]);
  if (f) { let d = 0; for (let i = 0; i < FS; i++) d += Math.abs(raw[f * FS + i] - raw[(f - 1) * FS + i]); diff.push(d / FS); }
}
const frameAt = t => Math.min(N - 1, Math.max(0, Math.round(t * fps)));

// Cuts: the settled frame before a transition must differ clearly from the frame just after
// the cut, and the fastest change must fall inside the transition window.
const frameDiff = (fa, fb) => { let d = 0; for (let i = 0; i < FS; i++) d += Math.abs(raw[fa * FS + i] - raw[fb * FS + i]); return d / FS; };
const cutRows = (cues.cuts || []).map(c => {
  const sc = cfg.scenes.find(s => s.id === c.from), x = sc?.exit || { dur: 0.3 };
  const before = frameAt(c.at - Math.max(0.3, x.dur) - 0.05), after = frameAt(c.at + 0.12);
  const a = frameAt(c.at - Math.max(0.3, x.dur)), b = frameAt(c.at + 0.2);
  let best = a; for (let f = a; f <= b; f++) if (diff[f] > diff[best]) best = f;
  return { ...c, change: frameDiff(before, after), peak: best / fps };
});
const weak = cutRows.filter(c => c.change < 12);
out(weak.length ? "WARN" : "PASS", "cuts", cutRows.map(c => `${c.at} ${c.type || ""} (change ${Math.round(c.change)})`).join(", ") + (weak.length ? `; the frame barely changes across ${weak.map(c => c.at).join(", ")}` : ""));

// Luminance / hue flip between adjacent scenes, sampled at each scene's settled middle.
const sceneRows = cfg.scenes.map(s => {
  const f = frameAt(s.start + Math.min(0.75, (s.end - s.start) * 0.6));
  return { id: s.id, tone: s.tone, l: luma[f], c: hue[f] };
});
const flips = [];
for (let i = 1; i < sceneRows.length; i++) {
  const a = sceneRows[i - 1], b = sceneRows[i];
  const dl = Math.abs(a.l - b.l);
  const dc = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1], a.c[2] - b.c[2]);
  flips.push({ a: a.id, b: b.id, dl, dc, ok: dl >= 25 || dc >= 28 });
}
const flat = flips.filter(f => !f.ok);
out(flat.length ? "WARN" : "PASS", "luminance", sceneRows.map(s => `${s.tone}:${Math.round(s.l)}`).join(" -> ") + (flat.length ? `; weak contrast ${flat.map(f => `${f.a}->${f.b}`).join(", ")}` : ""));

// Black frames and frozen stretches.
const black = luma.map((l, f) => ({ l, f })).filter(x => x.l < 2.5);
out(black.length ? "FAIL" : "PASS", "black", black.length ? `${black.length} near-black frames, first at ${r2(black[0].f / fps)} s` : "no black frames");
const endStart = (cfg.scenes.find(s => s.type === "endcard") || { start: cfg.D }).start;
let run = 0, worst = { len: 0, at: 0 };
for (let f = 1; f < N; f++) {
  if (f / fps >= endStart) break;
  run = diff[f] < 0.05 ? run + 1 : 0;
  if (run > worst.len) worst = { len: run, at: (f - run) / fps };
}
out(worst.len / fps > 0.5 ? "WARN" : "PASS", "motion", worst.len ? `longest still stretch ${r2(worst.len / fps)} s at ${r2(worst.at)} s` : "never still before the end card");

// ---------------------------------------------------------------- audio
if (!as) out("FAIL", "audio", "the render has no audio stream");
else {
  const eb = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", render, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const I = Number((eb.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  const LRA = Number((eb.match(/LRA:\s+(-?[\d.]+) LU/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  const TP = Number((eb.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  out(Math.abs(I + 14) <= 1 ? "PASS" : "FAIL", "loudness", `${I} LUFS integrated (target -14 +/- 1)`);
  out(TP <= -1 ? "PASS" : "FAIL", "true peak", `${TP} dBTP (limit -1)`);
  out(LRA >= 4 ? "PASS" : "WARN", "dynamics", `loudness range ${LRA} LU (the reference is ~7: quiet build, loud drop, ring-out)`);

  const SR = 12000, HOP = 60, R = SR / HOP;
  const dec = (file, f) => { const b = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), ...(f ? ["-af", f] : []), "-f", "f32le", "-"], { maxBuffer: 1 << 29 }).stdout; return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4))); };
  const env = x => { const n = Math.floor(x.length / HOP), e = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; s += v * v; } e[i] = Math.sqrt(s / HOP); } return e; };
  const db = v => 20 * Math.log10(v + 1e-9);
  const median = a => { const s = Array.from(a).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const all = env(dec(render));

  // A/V sync: the render's soundtrack must line up with the premixed mix.wav.
  const mixFile = join(project, "alr/audio/mix.wav");
  if (existsSync(mixFile)) {
    const ref = env(dec(mixFile));
    let best = 0, bestLag = 0;
    for (let lag = -30; lag <= 30; lag++) {
      let s = 0;
      for (let i = 0; i < ref.length; i++) { const j = i + lag; if (j >= 0 && j < all.length) s += ref[i] * all[j]; }
      if (s > best) { best = s; bestLag = lag; }
    }
    const ms = Math.round((bestLag / R) * 1000);
    out(Math.abs(ms) <= 34 ? "PASS" : "FAIL", "a/v sync", `soundtrack is ${ms} ms ${ms >= 0 ? "late" : "early"} against alr/audio/mix.wav (one frame is ${Math.round(1000 / cfg.fps)} ms)`);
  }

  // Whooshes, measured on the sfx stem so the bed cannot mask them.
  const sfxStem = join(project, "alr/audio/stems/sfx.wav");
  if (existsSync(sfxStem)) {
    const sm = env(dec(sfxStem));
    const whooshes = cutRows.map(c => {
      const a = Math.max(0, Math.round((c.at - 0.3) * R)), b = Math.min(sm.length - 1, Math.round((c.at + 0.2) * R));
      let best = a; for (let i = a; i <= b; i++) if (sm[i] > sm[best]) best = i;
      const before = median(sm.slice(Math.max(0, a - Math.round(0.6 * R)), a));
      return { at: c.at, lead: c.at - best / R, lift: db(sm[best]) - db(before) };
    });
    const quiet = whooshes.filter(w => w.lift < 6), late = whooshes.filter(w => w.lead < -0.05 || w.lead > 0.26);
    out(quiet.length || late.length ? "WARN" : "PASS", "whooshes", whooshes.map(w => `${w.at}: ${w.lead >= 0 ? "leads" : "lags"} ${Math.round(Math.abs(w.lead) * 1000)} ms`).join(", ") + (quiet.length ? `; no clear whoosh at ${quiet.map(w => w.at).join(", ")}` : "") + (late.length ? `; want the peak 0-250 ms before the cut at ${late.map(w => w.at).join(", ")}` : ""));
  } else out("WARN", "whooshes", "no alr/audio/stems/sfx.wav; rebuild to check whoosh timing");

  // Kick grid vs cut grid, measured on the bed stem with the same comb as beat-grid.mjs.
  const bedStem = join(project, "alr/audio/stems/bed.wav");
  if (existsSync(bedStem)) {
    const lo = env(dec(bedStem, "lowpass=f=150,lowpass=f=150")), full = env(dec(bedStem));
    const fl = e => { const f = Array.from(e).map((v, i) => (i ? Math.max(0, v - e[i - 1]) : 0)); const mx = Math.max(...f) || 1; return f.map(v => v / mx); };
    const fLo = fl(lo), fAll = fl(full), on = fLo.map((v, i) => v + 0.5 * fAll[i]);
    const P = cfg.beat * R, from = Math.round((cfg.scenes[0].ev?.hit ?? 0) * R);
    let bestS = -1, phase = 0;
    for (let ph = -P / 2; ph < P / 2; ph += 0.5) {
      let s = 0, n = 0;
      for (let x = from + ph; x < on.length - 1; x += P) { const i = Math.floor(x); if (i < 0) continue; const f = x - i; s += on[i] * (1 - f) + on[i + 1] * f; n++; }
      if (n && s / n > bestS) { bestS = s / n; phase = ph / R; }
    }
    out(Math.abs(phase) <= 0.04 ? "PASS" : "WARN", "beat grid", `bed kicks sit ${Math.round(Math.abs(phase) * 1000)} ms ${phase >= 0 ? "after" : "before"} the cut grid (beat ${r2(cfg.beat)} s)`);
  } else out("WARN", "beat grid", "no alr/audio/stems/bed.wav; rebuild to check the kick grid");

  // Voiceover: during speech the voice should sit well above the (ducked) bed.
  const voStem = join(project, "alr/audio/stems/voice.wav");
  if (existsSync(voStem) && existsSync(bedStem)) {
    const vo = env(dec(voStem)), bd = env(dec(bedStem));
    const gaps = [];
    for (let i = 0; i < vo.length; i += 20) {
      let a = 0, b = 0; for (let j = i; j < i + 20 && j < vo.length; j++) { a += vo[j] * vo[j]; b += (bd[j] || 0) ** 2; }
      if (db(Math.sqrt(a / 20)) > -30) gaps.push(db(Math.sqrt(a / 20)) - db(Math.sqrt(b / 20)));
    }
    gaps.sort((x, y) => x - y);
    const med = gaps[Math.floor(gaps.length / 2)], p10 = gaps[Math.floor(gaps.length * 0.1)];
    out(gaps.length && med >= 8 ? "PASS" : "WARN", "voice", gaps.length ? `voice sits ${Math.round(med)} dB over the bed during speech (10th percentile ${Math.round(p10)} dB; want a median of 8 or more)` : "no speech found in the voice stem");
  }

  // Ending: the last 0.25 s should be far below the body of the reel.
  const bodyRms = median(all.slice(Math.round(2 * R), Math.round(Math.min(cfg.D - 2, 10) * R)));
  const tail = all.slice(Math.round((cfg.D - 0.25) * R)); const tailRms = tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length);
  const drop = db(bodyRms) - db(tailRms);
  out(drop >= 18 ? "PASS" : "WARN", "ending", `last 0.25 s is ${Math.round(drop)} dB under the body (rings out: want >= 18)`);
}

console.log(failed ? `\n${failed} check(s) failed.` : "\nAll structural checks passed. Now watch it and listen to it.");
process.exit(failed ? 1 : 0);
