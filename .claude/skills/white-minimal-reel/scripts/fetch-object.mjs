#!/usr/bin/env node
// Find a license-safe object photo on Wikimedia Commons, download it with provenance, and
// optionally lift it out of its background locally (Apple Vision on macOS).
//
// Usage:
//   node fetch-object.mjs "<search words>" [--list]
//   node fetch-object.mjs "<search words>" --pick N --out <project>/assets/objects/<name> [--cutout]
//   node fetch-object.mjs --trim <cutout.png>        (trim any existing transparent PNG)
//
//   --list      print candidates and exit (default when --pick is absent)
//   --pick N    download candidate N (1-based) from the printed list
//   --allow-by  also accept CC BY / CC BY-SA (attribution is recorded; credit it in the post)
//   --min PX    minimum long edge of the original (default 900)
//   --cutout    lift the object locally, then trim to the visible alpha. macOS uses Apple
//               Vision (cutout.swift, the Photos "lift subject" model). Elsewhere, supply a
//               transparent PNG yourself (for example with rembg) and run --trim on it.
//               `hyperframes remove-background` is tuned for people and fails on most objects.
//   --instance N  keep only Vision instance N (the lifter prints every instance and its box)
//   --largest     keep only the largest lifted instance
//
// Default licenses: public domain, CC0, and "no restrictions". Nothing is uploaded anywhere.

import { writeFileSync, mkdirSync, readFileSync, existsSync, renameSync } from "node:fs";
import { dirname, resolve, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import { argv, exit } from "node:process";

const UA = "hyperframes-student-kit/2.0 (white-minimal-reel object fetcher; local use)";
const args = argv.slice(2);
if (!args.length || args.includes("--help") || args.includes("-h")) {
  console.log('Usage: node fetch-object.mjs "<search words>" [--pick N --out <dir/name>] [--allow-by] [--min 900] [--cutout]\n       node fetch-object.mjs --trim <cutout.png>');
  exit(args.length ? 0 : 1);
}

const opts = { query: null, out: null, pick: 0, allowBy: false, min: 900, cutout: false, trim: null, lift: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--out") opts.out = args[++i];
  else if (a === "--pick") opts.pick = Number(args[++i]);
  else if (a === "--allow-by") opts.allowBy = true;
  else if (a === "--min") opts.min = Number(args[++i]);
  else if (a === "--cutout") opts.cutout = true;
  else if (a === "--trim") opts.trim = args[++i];
  else if (a === "--instance") opts.lift = ["--instance", args[++i]];
  else if (a === "--largest") opts.lift = ["--largest"];
  else if (a === "--list") opts.pick = 0;
  else if (a.startsWith("-")) { console.error(`Unknown option: ${a}`); exit(1); }
  else if (!opts.query) opts.query = a;
}

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const stripHtml = (s = "") => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Minimal PNG reader for the alpha bounding box (8-bit RGBA or gray+alpha, non-interlaced).
function alphaBox(file, threshold = 12) {
  const buf = readFileSync(file);
  let pos = 8, width = 0, height = 0, type = 0, depth = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const kind = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; type = data[9]; interlace = data[12];
    } else if (kind === "IDAT") idat.push(data);
    else if (kind === "IEND") break;
    pos += 12 + len;
  }
  const channels = type === 6 ? 4 : type === 4 ? 2 : 0;
  if (!channels || depth !== 8 || interlace) return null;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  let prev = Buffer.alloc(stride);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? line[i - channels] : 0;
      const up = prev[i];
      const upLeft = i >= channels ? prev[i - channels] : 0;
      let add = 0;
      if (filter === 1) add = left;
      else if (filter === 2) add = up;
      else if (filter === 3) add = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        add = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      }
      line[i] = (line[i] + add) & 255;
    }
    for (let x = 0; x < width; x++) {
      if (line[x * channels + channels - 1] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    prev = line;
  }
  return x1 < 0 ? null : { W: width, H: height, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Trim a cutout to its visible alpha (plus a small margin) and cap its long edge, so plan
// coordinates describe the object itself rather than empty canvas.
function trimCutout(file) {
  const box = alphaBox(file);
  if (!box) return null;
  const { W, H } = box;
  let { w, h, x, y } = box;
  const pad = Math.round(Math.max(w, h) * 0.03);
  x = Math.max(0, x - pad); y = Math.max(0, y - pad);
  w = Math.min(W - x, w + 2 * pad); h = Math.min(H - y, h + 2 * pad);
  const tmp = file.replace(/\.png$/i, ".trim.png");
  const run = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-i", file, "-vf",
    `crop=${w}:${h}:${x}:${y},scale='min(1400,iw)':-2:flags=lanczos`, "-pix_fmt", "rgba", tmp]);
  if (run.status !== 0 || !existsSync(tmp)) return null;
  renameSync(tmp, file);
  return { coverage: +((w * h) / (W * H)).toFixed(3), crop: { x, y, w, h } };
}

if (opts.trim) {
  const result = trimCutout(resolve(opts.trim));
  if (!result) { console.error("Not an 8-bit transparent PNG, or nothing visible to keep."); exit(1); }
  console.log(`Trimmed ${basename(opts.trim)} to ${result.crop.w}x${result.crop.h} (kept ${Math.round(result.coverage * 100)}% of the canvas).`);
  exit(0);
}
if (!opts.query) { console.error("Give search words."); exit(1); }

// Commons rate-limits bursts (HTTP 429). Honor Retry-After, otherwise back off exponentially.
async function politeFetch(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt >= 4) return res;
    const wait = Number(res.headers.get("retry-after")) * 1000 || 4000 * 2 ** attempt;
    console.error(`Commons asked us to slow down (HTTP ${res.status}); retrying in ${Math.round(wait / 1000)}s ...`);
    await sleep(wait);
  }
}

function licenseOk(short = "", usage = "") {
  const l = `${short} ${usage}`.toLowerCase();
  if (/public domain|^pd|\bpd-|cc0|no restrictions/.test(l)) return "free";
  if (opts.allowBy && /cc[ -]by/.test(l) && !/\bnc\b|noncommercial|\bnd\b|noderiv/.test(l)) return "attribution";
  return null;
}

async function search(query) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  const params = {
    action: "query", format: "json", generator: "search", gsrnamespace: "6",
    gsrsearch: `${query} filetype:bitmap`, gsrlimit: "40", prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata", iiurlwidth: "1600",
  };
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await politeFetch(url);
  if (!res.ok) throw new Error(`Commons search failed: HTTP ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const m = ii.extmetadata || {};
    const short = stripHtml(m.LicenseShortName?.value);
    const kind = licenseOk(short, stripHtml(m.UsageTerms?.value));
    if (!kind) continue;
    if (Math.max(ii.width, ii.height) < opts.min) continue;
    out.push({
      title: p.title,
      page: ii.descriptionurl,
      license: short,
      licenseUrl: m.LicenseUrl?.value || null,
      kind,
      artist: stripHtml(m.Artist?.value) || null,
      credit: stripHtml(m.Credit?.value) || null,
      width: ii.width,
      height: ii.height,
      download: ii.thumburl || ii.url,
    });
  }
  return out;
}

const candidates = await search(opts.query);
if (!candidates.length) {
  console.error("No license-safe candidates. Try other words (add 'museum', 'isolated', 'white background') or supply your own image.");
  exit(2);
}
if (!opts.pick) {
  candidates.slice(0, 15).forEach((c, i) =>
    console.log(`${String(i + 1).padStart(2)}. ${c.title}\n    ${c.license} | ${c.width}x${c.height} | ${c.page}`));
  console.log("\nInspect the pages (prefer opaque photographed objects), then rerun with --pick N --out <dir/name> --cutout.");
  exit(0);
}
if (!opts.out) { console.error("--out is required with --pick."); exit(1); }
const chosen = candidates[opts.pick - 1];
if (!chosen) { console.error(`No candidate ${opts.pick}.`); exit(1); }

const base = resolve(opts.out);
mkdirSync(dirname(base), { recursive: true });
const res = await politeFetch(chosen.download);
if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
const bytes = Buffer.from(await res.arrayBuffer());
const ext = (res.headers.get("content-type") || "").includes("png") ? ".png" : ".jpg";
const photo = base + ".source" + ext;
writeFileSync(photo, bytes);

const provenance = {
  ...chosen,
  query: opts.query,
  file: basename(photo),
  sha256: sha256(bytes),
  retrieved: new Date().toISOString().slice(0, 10),
  attributionRequired: chosen.kind === "attribution",
  cutout: null,
};

if (opts.cutout) {
  const cut = base + ".png";
  const lifter = join(dirname(fileURLToPath(import.meta.url)), "cutout.swift");
  if (process.platform !== "darwin") {
    console.error("Automatic lifting needs macOS Vision. Cut the photo out yourself, save it as " + basename(cut) + ", then run --trim on it.");
  } else {
    console.log("Lifting the object locally with Apple Vision (first run compiles, ~30s) ...");
  }
  const run = process.platform === "darwin" ? spawnSync("swift", [lifter, photo, cut, ...opts.lift], { stdio: "inherit" }) : { status: 1 };
  if (run.status !== 0 || !existsSync(cut)) {
    console.error("No cutout produced; keep the photo and cut it out another way.");
  } else {
    const trim = trimCutout(cut);
    provenance.cutout = { file: basename(cut), tool: "Apple Vision foreground instance mask", trim, sha256: sha256(readFileSync(cut)) };
    if (!trim) console.error("Could not trim the cutout; inspect it before use.");
    else if (trim.coverage < 0.04) console.error("The cutout is tiny or sparse. Glass, line art, and busy scenes cut out badly; inspect it or pick an opaque object.");
  }
}

writeFileSync(base + ".provenance.json", JSON.stringify(provenance, null, 2) + "\n");
console.log(`Saved ${basename(photo)}${provenance.cutout ? ` and ${provenance.cutout.file}` : ""} with provenance (${chosen.license}).`);
if (provenance.attributionRequired) console.log(`Attribution required: ${chosen.artist || chosen.credit || chosen.title}`);
