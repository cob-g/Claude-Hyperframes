// Shared signal analysis for the cutout strobe kit: where a track's bass is in and out, where its
// attacks are, and its tempo. Used by bass-map.mjs (planning) and build-cutout.mjs (checking the
// plan against the track). Everything is decoded locally with ffmpeg; there is no network.
//
// The style hangs on one fact about the track: its bass plays in blocks ("walls") with short
// rests between them ("gaps"). The picture is full while the bass is in and breaks into white
// shapes while it is out. So the unit here is not the beat but the bass state.

import { spawnSync } from "node:child_process";

export const SR = 12000;   // analysis sample rate
export const EPS = 200;    // envelope frames per second (5 ms hops)
const HOP = SR / EPS;

function decode(file, from, len, filter) {
  const pre = [];
  if (from > 0) pre.push("-ss", String(from));
  if (len != null && Number.isFinite(len)) pre.push("-t", String(len));
  const r = spawnSync("ffmpeg", ["-v", "error", ...pre, "-i", file, "-ac", "1", "-ar", String(SR),
    ...(filter ? ["-af", filter] : []), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) return null;
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}
// Mean power per hop.
function power(x) {
  const n = Math.floor(x.length / HOP), e = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < HOP; j++) { const v = x[i * HOP + j]; s += v * v; } e[i] = s / HOP; }
  return e;
}
const db = v => 10 * Math.log10(v + 1e-12);
function percentile(a, p) {
  const s = Float64Array.from(a).sort();
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];
}

// Spectral flux at EPS frames a second: 256-sample Hann windows (21 ms), log-compressed
// magnitudes, positive differences summed over the bins. A frame's value is stamped at the time
// its window's centre reaches the sound, so a peak sits on the attack, not after it.
function flux(x) {
  const W = 256, n = Math.max(0, Math.floor((x.length - W) / HOP));
  const win = new Float64Array(W);
  for (let i = 0; i < W; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (W - 1));
  const out = new Float64Array(n + Math.round(W / 2 / HOP));
  const re = new Float64Array(W), im = new Float64Array(W);
  let prev = null;
  for (let f = 0; f < n; f++) {
    for (let i = 0; i < W; i++) { re[i] = x[f * HOP + i] * win[i]; im[i] = 0; }
    for (let i = 1, j = 0; i < W; i++) { let bit = W >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= W; len <<= 1) {
      const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < W; i += len) {
        let cr = 1, ci = 0;
        for (let j = 0; j < len / 2; j++) {
          const a = i + j, b = a + len / 2;
          const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
    const mag = new Float64Array(W / 2);
    let s = 0;
    for (let k = 1; k < W / 2; k++) { mag[k] = Math.log1p(40 * Math.hypot(re[k], im[k])); if (prev) { const d = mag[k] - prev[k]; if (d > 0) s += d; } }
    prev = mag;
    out[f + Math.round(W / 2 / HOP)] = s;
  }
  return out;
}

// Decode a span of a file and measure it. Times in the result are seconds from `from`.
export function analyze(file, { from = 0, len = null, lowHz = 120 } = {}) {
  const full = decode(file, from, len, null);
  const low = decode(file, from, len, `lowpass=f=${lowHz},lowpass=f=${lowHz}`);
  const high = decode(file, from, len, "highpass=f=4000,highpass=f=4000");
  if (!full || !low || !high || full.length < SR) return null;
  const pF = power(full), pL = power(low), pH = power(high);
  const N = Math.min(pF.length, pL.length, pH.length);

  // Bass state. A 40 Hz wave has a 25 ms period, so the low band's power dips inside every cycle;
  // a 40 ms running maximum bridges the dips without smearing a real rest.
  const lowMax = new Float64Array(N);
  for (let i = 0; i < N; i++) { let m = 0; for (let j = Math.max(0, i - 4); j <= Math.min(N - 1, i + 4); j++) if (pL[j] > m) m = pL[j]; lowMax[i] = m; }
  // The wall level is the low band's 90th percentile: the level the bass sits at when it is in.
  const wall = percentile(lowMax, 0.9);
  const rel = Array.from(lowMax, v => db(v) - db(wall));
  const ON = -9, OFF = -15; // dB against the wall level, with hysteresis
  const state = new Uint8Array(N);
  let on = rel[0] > ON;
  for (let i = 0; i < N; i++) { if (on && rel[i] < OFF) on = false; else if (!on && rel[i] > ON) on = true; state[i] = on ? 1 : 0; }
  // Spans. A rest shorter than 120 ms is part of the wall (a gated kick, or the silence between
  // two stabs) and is kept as a "dip"; a block shorter than 250 ms is a stab, not a wall.
  let spans = [];
  for (let i = 0, s = 0; i <= N; i++) if (i === N || state[i] !== state[s]) { spans.push({ on: !!state[s], a: s, b: i }); s = i; }
  // The picture leaves on the first frame the bass starts to fall, not when its tail has rung
  // out. So a rest starts where the level first drops 4 dB under the wall.
  for (let k = 1; k < spans.length; k++) if (!spans[k].on) {
    let i = spans[k].a;
    while (i > spans[k - 1].a + 1 && rel[i - 1] < -4) i--;
    spans[k].a = i; spans[k - 1].b = i;
  }
  const dips = [];
  for (let again = true; again;) {
    again = false;
    for (let k = 1; k < spans.length - 1; k++) {
      if (!spans[k].on && (spans[k].b - spans[k].a) / EPS < 0.12) {
        dips.push({ a: spans[k].a / EPS, b: spans[k].b / EPS });
        spans.splice(k - 1, 3, { on: true, a: spans[k - 1].a, b: spans[k + 1].b });
        again = true;
        break;
      }
    }
  }
  spans = spans.map(sp => ({ a: sp.a / EPS, b: sp.b / EPS })).map((sp, k) => ({ ...sp, len: sp.b - sp.a, kind: spans[k].on ? (sp.b - sp.a < 0.25 ? "stab" : "wall") : "gap" }));
  for (const sp of spans) if (sp.kind === "wall") sp.dips = dips.filter(d => d.a >= sp.a && d.b <= sp.b).sort((x, y) => x.a - y.a);

  // Attacks. Inside a wall the mix is flat against the limiter, so a snare or a crash barely moves
  // the total power; it shows as new energy in some bands while others duck. Spectral flux (the
  // summed rise of the log magnitude in every bin) sees it. Peaks at least 60 ms apart.
  const fl = flux(full);
  const M = Math.min(N, fl.length);
  const amax = Math.max(...fl) || 1;
  const onsets = [];
  for (let i = 2; i < M - 2; i++) {
    const v = fl[i];
    if (v < amax * 0.15) continue;
    let peak = true, around = 0, n = 0;
    for (let j = Math.max(0, i - 12); j <= Math.min(M - 1, i + 12); j++) { if (fl[j] > v) { peak = false; break; } around += fl[j]; n++; }
    if (peak && v > 1.5 * (around / n)) onsets.push({ t: i / EPS, strength: v / amax });
  }

  // Tempo: the comb whose teeth collect the most onset strength (low-band rise plus full-band).
  const rise = e => Array.from(e, (v, i) => (i ? Math.max(0, Math.sqrt(v) - Math.sqrt(e[i - 1])) : 0));
  const norm = a => { const m = Math.max(...a) || 1; return a.map(v => v / m); };
  const oL = norm(rise(pL)), oF = norm(rise(pF));
  const onset = oL.map((v, i) => v + 0.5 * oF[i]);
  const at = x => { const i = Math.floor(x); if (i < 0 || i + 1 >= N) return 0; const f = x - i; return onset[i] * (1 - f) + onset[i + 1] * f; };
  let top = null; const scores = [];
  for (let bpm = 70; bpm <= 180.0001; bpm += 0.25) {
    const P = (60 / bpm) * EPS;
    let best = -1, phase = 0;
    for (let ph = 0; ph < P; ph += 1) { let s = 0, n = 0; for (let x = ph; x < N; x += P) { s += at(x); n++; } s /= n; if (s > best) { best = s; phase = ph; } }
    scores.push(best);
    if (!top || best > top.score) top = { bpm, score: best, phase: phase / EPS };
  }
  const contrast = top.score / (scores.reduce((a, b) => a + b, 0) / scores.length);

  const sum = (a, i0, i1) => { let s = 0; for (let i = Math.max(0, i0); i < Math.min(N, i1); i++) s += a[i]; return s; };
  const bassShare = sum(pL, 0, N) / (sum(pF, 0, N) || 1);
  const walls = spans.filter(s => s.kind === "wall"), gaps = spans.filter(s => s.kind === "gap" && s.a > 0 && s.b < N / EPS - 0.01);
  // The cycle: a wall plus the rest after it, where the rest is under a second. Its lower quartile
  // is taken (a wall that opens with stabs, or a breakdown, only ever makes a cycle longer) and
  // snapped to a whole number of beats when the tempo is clear.
  const cyc = [];
  spans.forEach((sp, k) => { const g = spans[k + 1]; if (sp.kind === "wall" && sp.len > 0.5 && g?.kind === "gap" && g.len < 1 && spans[k + 2]?.kind === "wall") cyc.push(sp.len + g.len); });
  cyc.sort((x, y) => x - y);
  let cycle = cyc.length ? cyc[Math.floor((cyc.length - 1) * 0.25)] : null;
  const beat = 60 / top.bpm;
  if (cycle && contrast >= 1.5 && Math.abs(cycle / beat - Math.round(cycle / beat)) < 0.12) cycle = Math.round(cycle / beat) * beat;
  const wallShare = walls.reduce((a, s) => a + s.len, 0) / (N / EPS);
  // How far the bass falls in the rests: the wall level against the median level inside the gaps.
  let depth = 0;
  if (gaps.length) {
    const inGap = [];
    for (const g of gaps) for (let i = Math.round(g.a * EPS); i < Math.round(g.b * EPS); i++) inGap.push(rel[i]);
    depth = -percentile(inGap, 0.5);
  }
  return {
    duration: N / EPS, spans, onsets, cycle, bassShare, wallShare, gapDepth: depth,
    tempo: { bpm: top.bpm, phase: top.phase, contrast },
    level: i => rel[Math.max(0, Math.min(N - 1, Math.round(i * EPS)))],
    // Whether the bass is in at a time, by the spans (so a rest starts where the bass starts to
    // fall, not where its tail has rung out).
    stateAt: t => { for (const sp of spans) if (t >= sp.a && t < sp.b) return sp.kind !== "gap"; return false; },
    highAt: (a, b) => db(sum(pH, Math.round(a * EPS), Math.round(b * EPS)) / Math.max(1, Math.round((b - a) * EPS))),
  };
}

// The nearest attack to a time, within `within` seconds; null when there is none.
export function nearestOnset(an, t, within = 0.2) {
  let best = null;
  for (const o of an.onsets) { const d = o.t - t; if (Math.abs(d) <= within && (!best || Math.abs(d) < Math.abs(best.d))) best = { ...o, d }; }
  return best;
}

// Where a wall's flash goes. Inside a wall the attacks come every few frames and none stands out
// by loudness; the reference puts its flash on the backbeat, half a cycle after the bass comes in
// (for a wall that opens with stabs, after the last stab). The result is that time, moved onto the
// nearest attack within 70 ms. Null when the wall is too short to hold a flash and its decay.
export function backbeat(an, wall) {
  if (!an.cycle) return null;
  const start = wall.dips?.length ? wall.dips[wall.dips.length - 1].b : wall.a;
  const t = start + an.cycle / 2;
  if (t > wall.b - 0.2) return null;
  const o = nearestOnset(an, t, 0.07);
  return { t: o ? o.t : t, snapped: !!o };
}
