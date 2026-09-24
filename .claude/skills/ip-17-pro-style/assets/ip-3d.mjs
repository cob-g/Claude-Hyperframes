// iPhone 17 Pro style kit: the 3D product layer (three.js), bundled by build-promo.mjs into
// ip/ip-3d.js. Products are procedural (no downloads, no trademarks) or the user's own GLB files.
// State is a pure function of time; each frame averages several sub-frame renders for motion blur.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// The HyperFrames runtime waits on THREE.DefaultLoadingManager before capturing frames.
window.THREE = THREE;

const DEG = Math.PI / 180;

// ------------------------------------------------------------------ geometry helpers
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  r = Math.min(r, w / 2, h / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

// A slab with rounded corners and softly rounded edges, centred on the origin, depth along Z.
function slab(w, h, r, depth, bevel, segments = 5) {
  const b = Math.min(bevel, depth / 2 - 0.01);
  const g = new THREE.ExtrudeGeometry(roundedRect(w - 2 * b, h - 2 * b, Math.max(0.1, r - b)), {
    depth: Math.max(0.01, depth - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b,
    bevelSegments: segments, curveSegments: 28,
  });
  g.translate(0, 0, -(depth - 2 * b) / 2);
  g.computeVertexNormals();
  return g;
}

function flat(w, h, r) {
  const g = new THREE.ShapeGeometry(roundedRect(w, h, r), 28);
  // Planar UVs across the rectangle so a texture fills it.
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  return g;
}

function disc(r, depth, segments = 48) {
  const g = new THREE.CylinderGeometry(r, r, depth, segments, 1, false);
  g.rotateX(Math.PI / 2);
  return g;
}

// ------------------------------------------------------------------ materials
function metal(color, roughness = 0.3, extra = {}) {
  return new THREE.MeshPhysicalMaterial({ color, metalness: 0.95, roughness, clearcoat: 0.1, clearcoatRoughness: 0.3, ...extra });
}

// Glowing flow-line wallpaper, drawn once into a canvas (no image files, fully deterministic).
function wallpaper(accent, base = "#050505") {
  const c = document.createElement("canvas");
  c.width = 640; c.height = 1360;
  const g = c.getContext("2d");
  g.fillStyle = base;
  g.fillRect(0, 0, c.width, c.height);
  const glow = g.createRadialGradient(320, 900, 40, 320, 900, 900);
  glow.addColorStop(0, "rgba(255,255,255,0.05)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, c.width, c.height);
  const col = new THREE.Color(accent);
  const rgb = (k, a) => `rgba(${Math.round(Math.min(255, col.r * 255 * k))},${Math.round(Math.min(255, col.g * 255 * k))},${Math.round(Math.min(255, col.b * 255 * k))},${a})`;
  // A serpentine band of parallel strokes, like a lit neon tube folding down the screen.
  const rows = [300, 610, 920, 1230];
  for (let line = 0; line < 7; line++) {
    const o = (line - 3) * 16;
    g.beginPath();
    g.moveTo(-40, rows[0] + o - 180);
    g.lineTo(470 - o, rows[0] + o - 180);
    for (let r = 0; r < rows.length - 1; r++) {
      const left = r % 2 === 0;
      const y0 = rows[r] + o - 180 + (r ? 0 : 0), y1 = rows[r + 1] - 180 + (left ? -o : o);
      const rad = (y1 - y0) / 2;
      if (left) {
        g.arc(470 - o, y0 + rad, Math.abs(rad), -Math.PI / 2, Math.PI / 2, false);
        g.lineTo(170 + o, y1);
      } else {
        g.arc(170 + o, y0 + rad, Math.abs(rad), -Math.PI / 2, Math.PI / 2, true);
        g.lineTo(470 - o, y1);
      }
    }
    g.lineTo(700, rows[rows.length - 1] - 180 + o);
    const k = 1.35 - Math.abs(line - 3) * 0.16;
    g.strokeStyle = rgb(k, 0.95);
    g.lineWidth = line === 3 ? 7 : 4;
    g.shadowColor = rgb(1, 0.9);
    g.shadowBlur = 22;
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ------------------------------------------------------------------ procedural products
// A modern "Pro" phone in millimetres: aluminium unibody, full-width camera plateau with three
// lenses, a frosted glass window below it, side buttons, and a lit screen with an island.
// The back faces +Z and the top is +Y, so rotation.y = 0 shows the back to the camera.
function buildPhone(spec = {}) {
  const W = 71.9, H = 150, T = 8.75, R = 11.8;
  const f = spec.finish || {};
  const body = f.body || "#e0661e";
  const group = new THREE.Group();

  const alu = metal(body, f.roughness ?? 0.34);
  const alu2 = metal(f.plateau || body, f.plateauRoughness ?? 0.42);
  // Frosted back glass reads like brushed colour metal: reflections take the tint, so a lit
  // orange back blooms toward gold in the tone curve instead of washing out to white.
  const glass = new THREE.MeshPhysicalMaterial({
    color: f.glass || new THREE.Color(body).lerp(new THREE.Color("#ffffff"), 0.25),
    metalness: f.glassMetalness ?? 1, roughness: f.glassRoughness ?? 0.4,
  });
  const ring = metal(f.ring || body, 0.16);
  // Lenses stay nearly black even when the back catches the softbox.
  const lensGlass = new THREE.MeshPhysicalMaterial({ color: "#030304", metalness: 0.1, roughness: 0.3 });
  lensGlass.userData.envScale = 0.04;
  const lensCore = new THREE.MeshPhysicalMaterial({
    color: "#0b0b12", metalness: 0.5, roughness: 0.15,
    iridescence: 0.35, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 380],
  });
  lensCore.userData.envScale = 0.08;

  group.add(new THREE.Mesh(slab(W, H, R, T, 1.5), [alu, alu]));

  // Back: plateau across the top third, glass window below.
  const plateauH = 0.285 * H, inset = 2.4;
  const plateau = new THREE.Mesh(slab(W - 2 * inset, plateauH, R - inset, 1.5, 0.6, 4), alu2);
  plateau.position.set(0, H / 2 - inset - plateauH / 2, T / 2 + 0.55);
  group.add(plateau);
  const winTop = H / 2 - inset - plateauH - 2.6, winBottom = -H / 2 + 3.2;
  const win = new THREE.Mesh(flat(W - 2 * 3.4, winTop - winBottom, 8.4), glass);
  win.position.set(0, (winTop + winBottom) / 2, T / 2 + 0.02);
  group.add(win);

  const pz = T / 2 + 0.55 + 0.75;
  const py = plateau.position.y;
  const lens = (x, y) => {
    const g = new THREE.Group();
    const r1 = new THREE.Mesh(disc(8.5, 1.9), ring); r1.position.z = 0.9; g.add(r1);
    const r2 = new THREE.Mesh(disc(7.3, 2.0), lensGlass); r2.position.z = 1.0; g.add(r2);
    const core = new THREE.Mesh(new THREE.CircleGeometry(4.1, 40), lensCore); core.position.z = 2.02; g.add(core);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), new THREE.MeshBasicMaterial({ color: "#1a1a2a" })); dot.position.z = 2.03; g.add(dot);
    g.position.set(x, y, pz);
    group.add(g);
  };
  lens(-W / 2 + 14.2, py + 10.6);
  lens(-W / 2 + 14.2, py - 10.6);
  lens(-W / 2 + 32.8, py);
  const flash = new THREE.Mesh(disc(3.1, 0.6), new THREE.MeshPhysicalMaterial({ color: "#f3ead7", roughness: 0.35, emissive: "#3a3225" }));
  flash.position.set(W / 2 - 11, py + 12, pz);
  group.add(flash);
  const lidar = new THREE.Mesh(disc(3.3, 0.6), lensGlass);
  lidar.position.set(W / 2 - 11, py - 11, pz);
  group.add(lidar);
  const mic = new THREE.Mesh(disc(0.8, 0.4), new THREE.MeshBasicMaterial({ color: "#222" }));
  mic.position.set(W / 2 - 11, py + 1, pz);
  group.add(mic);

  // Front: black glass, lit display, island.
  const frontGlass = new THREE.MeshPhysicalMaterial({ color: "#020203", roughness: 0.06, metalness: 0.1, clearcoat: 1 });
  frontGlass.userData.envScale = 0.45;
  const front = new THREE.Mesh(flat(W - 1.2, H - 1.2, R - 0.6), frontGlass);
  front.rotation.y = Math.PI;
  front.position.z = -T / 2 - 0.02;
  group.add(front);
  const tex = spec.screenTexture || wallpaper(f.screen || body);
  const screen = new THREE.MeshPhysicalMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: tex, emissiveIntensity: 1.05, roughness: 0.08, clearcoat: 1 });
  screen.userData.envScale = 0.45;
  const display = new THREE.Mesh(flat(W - 5.2, H - 5.2, R - 2.6), screen);
  display.rotation.y = Math.PI;
  display.position.z = -T / 2 - 0.04;
  group.add(display);
  const island = new THREE.Mesh(flat(19.5, 6, 3), new THREE.MeshBasicMaterial({ color: "#000" }));
  island.rotation.y = Math.PI;
  island.position.set(0, H / 2 - 9.5, -T / 2 - 0.06);
  group.add(island);

  // Buttons: back-facing view has +X on the camera's right.
  const button = (len, y, side) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(1.4, len, 3.2, 2, 0.55), alu);
    m.position.set(side * (W / 2 + 0.25), y, 0);
    group.add(m);
  };
  button(17, 22, -1); // power (screen side left = back side right; mirrored when the back faces us)
  button(12, -20, -1); // camera control
  button(7.5, 38, 1); // action
  button(11, 24, 1); // volume up
  button(11, 10, 1); // volume down

  group.userData.heightMm = H;
  return group;
}

// An open earbuds charging case for the "free gift" card: base with a recess, the lid swung
// back on its hinge, and two buds standing in it. Glossy white is lifted above the studio's
// grey surround so it reads white on the grey card.
function buildCase(spec = {}) {
  const f = spec.finish || {};
  const group = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: f.body || "#ffffff", roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  white.userData.envScale = 1.9;
  const inner = new THREE.MeshPhysicalMaterial({ color: "#cfcfcd", roughness: 0.6 });
  inner.userData.envScale = 2.0;
  const tip = new THREE.MeshPhysicalMaterial({ color: "#dededc", roughness: 0.9 });
  tip.userData.envScale = 2.0;
  const w = 50, d = 21.5, baseH = 34, lidH = 12;

  const base = new THREE.Mesh(new RoundedBoxGeometry(w, baseH, d, 6, 9), white);
  base.position.y = -baseH / 2;
  group.add(base);
  const recess = new THREE.Mesh(new RoundedBoxGeometry(w - 6, 1.2, d - 5, 3, 0.5), inner);
  recess.position.y = -0.3;
  group.add(recess);

  const hinge = new THREE.Group();
  hinge.position.set(0, 0, -d / 2 + 1);
  hinge.rotation.x = -1.75;
  const lid = new THREE.Mesh(new RoundedBoxGeometry(w, lidH, d, 6, 6), white);
  lid.position.set(0, lidH / 2, d / 2 - 1);
  hinge.add(lid);
  const lidInner = new THREE.Mesh(new RoundedBoxGeometry(w - 6, 1.2, d - 5, 3, 0.5), inner);
  lidInner.position.set(0, 0.4, d / 2 - 1);
  hinge.add(lidInner);
  group.add(hinge);

  for (const side of [-1, 1]) {
    const bud = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(7.6, 32, 24), white);
    head.scale.set(1, 1.05, 0.95);
    bud.add(head);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 16), tip);
    ear.scale.set(1, 1, 0.8);
    ear.position.set(-side * 5.4, 2.4, 3.2);
    bud.add(ear);
    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 15, 6, 16), white);
    stem.position.set(side * 1.2, -10, 0);
    bud.add(stem);
    bud.position.set(side * 10.5, 8, -1);
    bud.rotation.set(-0.1, side * 0.5, side * -0.1);
    group.add(bud);
  }
  group.userData.heightMm = baseH + 20;
  return group;
}

async function loadModel(spec) {
  const gltf = await new GLTFLoader().loadAsync(spec.src);
  const inner = gltf.scene;
  const o = spec.orient || [0, 0, 0];
  inner.rotation.set(o[0] * DEG, o[1] * DEG, o[2] * DEG, "ZXY");
  const holder = new THREE.Group();
  holder.add(inner);
  const box = new THREE.Box3().setFromObject(holder);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  inner.position.sub(centre);
  holder.userData.heightMm = size.y || 1;
  return holder;
}

// ------------------------------------------------------------------ lighting
// A product-photography studio for reflections: a surround that is darker above and lighter
// below (a bright sweep floor), one tall softbox off to
// the right of the camera that the backs catch only as they settle (the reference's orange-to-gold
// glint), a broad fill on the left, and a top strip for the rims. Directions are degrees of
// azimuth from the camera axis (positive = camera right) and elevation.
const SOFTBOXES = [
  { az: 64, el: 6, w: 24, h: 60, intensity: 3.6 },
  { az: -40, el: 18, w: 70, h: 50, intensity: 1.3 },
  { az: 0, el: 70, w: 90, h: 24, intensity: 2.2 },
  { az: 180, el: 35, w: 40, h: 50, intensity: 1.6 },
];
function studio(look) {
  const env = new THREE.Scene();
  const geo = new THREE.SphereGeometry(100, 64, 32);
  const pos = geo.attributes.position, colors = [];
  const top = new THREE.Color(look.envTop ?? "#2e2e2e"), mid = new THREE.Color(look.envMid ?? "#5a5a5a"), bottom = new THREE.Color(look.envBottom ?? "#8c8c8c");
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 100;
    const c = y > 0 ? mid.clone().lerp(top, y) : mid.clone().lerp(bottom, -y);
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  for (const b of look.softboxes || SOFTBOXES) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(b.w, b.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(b.color || "#ffffff").multiplyScalar(b.intensity), side: THREE.DoubleSide }));
    const a = b.az * DEG, e = b.el * DEG, d = 60;
    m.position.set(d * Math.sin(a) * Math.cos(e), d * Math.sin(e), d * Math.cos(a) * Math.cos(e));
    m.lookAt(0, 0, 0);
    env.add(m);
  }
  return env;
}

// ------------------------------------------------------------------ motion
function makeProduct(IP, cfg, p) {
  const ch = {};
  for (const k of ["x", "y", "z", "rx", "ry", "rz", "scale"]) if (p[k] && Array.isArray(p[k])) ch[k] = IP.channel(p[k]);
  return (t) => {
    const te = IP.localTime(cfg, t, p.mirror !== false);
    const v = (k, d) => (ch[k] ? ch[k](te) : d);
    return { x: v("x", 0), y: v("y", 0), z: v("z", 0), rx: v("rx", 0), ry: v("ry", 0), rz: v("rz", 0), s: v("scale", 1) };
  };
}

// ------------------------------------------------------------------ renderer
const IP3 = {};
let ready = null;

IP3.init = function (cfg) {
  if (ready) return ready;
  const IP = window.IP;
  const W = cfg.width, H = cfg.height;
  const canvas = document.getElementById("ip-gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  // Sub-frames accumulate into one target, so every clear is explicit.
  renderer.autoClear = false;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const look = cfg.look || {};
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = look.env === "room" ? new RoomEnvironment() : studio(look);
  scene.environment = pmrem.fromScene(envScene, look.envBlur ?? 0.02).texture;
  scene.environmentIntensity = look.envIntensity ?? 1.0;
  scene.environmentRotation.set(0, (look.envRotation ?? 0) * DEG, 0);
  const key = new THREE.DirectionalLight("#ffffff", look.key ?? 1.6);
  key.position.set(-0.6, 0.9, 1.0);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#ffffff", look.rim ?? 0.8);
  rim.position.set(0.9, 0.2, -0.4);
  scene.add(rim);
  scene.add(new THREE.AmbientLight("#ffffff", look.ambient ?? 0.25));

  // One world unit is one pixel on the z = 0 plane.
  const fov = cfg.camera?.fov ?? 20;
  const dist = (H / 2) / Math.tan((fov / 2) * DEG);
  const camera = new THREE.PerspectiveCamera(fov, W / H, 50, dist * 4);
  camera.position.set(0, 0, dist);

  // Linear HDR accumulation, then one tone-mapping pass to the canvas.
  const rtOpts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: true };
  const sub = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, samples: 4 });
  const acc = new THREE.WebGLRenderTarget(W, H, { ...rtOpts, depthBuffer: false });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const addMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: sub.texture }, weight: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: "uniform sampler2D tex; uniform float weight; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tex, vUv) * weight; }",
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor, depthTest: false, depthWrite: false, transparent: true,
  });
  const outMat = new THREE.ShaderMaterial({
    uniforms: { tex: { value: acc.texture }, exposure: { value: look.exposure ?? 1.0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: `
      uniform sampler2D tex; uniform float exposure; varying vec2 vUv;
      vec3 aces(vec3 x){ x *= exposure / 0.6;
        const mat3 m1 = mat3(0.59719,0.07600,0.02840, 0.35458,0.90834,0.13383, 0.04823,0.01566,0.83777);
        const mat3 m2 = mat3(1.60475,-0.10208,-0.00327, -0.53108,1.10813,-0.07276, -0.07367,-0.00605,1.07602);
        vec3 v = m1 * x; vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
        return clamp(m2 * (a / b), 0.0, 1.0); }
      vec3 srgb(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
      void main(){ vec4 c = texture2D(tex, vUv); float a = clamp(c.a, 0.0, 1.0);
        vec3 col = a > 0.0001 ? c.rgb / a : vec3(0.0);
        gl_FragColor = vec4(srgb(aces(col)) * a, a); }`,
    depthTest: false, depthWrite: false, blending: THREE.NoBlending,
  });
  const addQuad = new THREE.Mesh(quadGeo, addMat);
  const outQuad = new THREE.Mesh(quadGeo, outMat);
  const addScene = new THREE.Scene(); addScene.add(addQuad);
  const outScene = new THREE.Scene(); outScene.add(outQuad);

  // Materials that must reflect less than the scene carry userData.envScale; binding the map
  // explicitly makes envMapIntensity apply.
  // Binding the map per material bypasses scene.environmentIntensity and environmentRotation, so
  // both are folded in here.
  const envTex = scene.environment;
  const scaleEnv = (root) => root.traverse((o) => {
    for (const m of [].concat(o.material || [])) {
      if (m.userData.envScale == null) continue;
      m.envMap = envTex;
      m.envMapIntensity = m.userData.envScale * scene.environmentIntensity;
      m.envMapRotation.copy(scene.environmentRotation);
    }
  });

  const items = [];
  const place = (obj, spec) => {
    scaleEnv(obj);
    const rot = new THREE.Group();
    rot.add(obj);
    const holder = new THREE.Group();
    holder.add(rot);
    scene.add(holder);
    items.push({ holder, rot, obj, spec, state: makeProduct(IP, cfg, spec) });
  };

  const jobs = [];
  for (const spec of [...(cfg.products || []), ...(cfg.gift3d ? [cfg.gift3d] : [])]) {
    if (spec.src) jobs.push(loadModel(spec).then((m) => place(m, spec)));
    else place(spec.kind === "case" ? buildCase(spec) : buildPhone(spec), spec);
  }

  function pose(t) {
    for (const it of items) {
      const st = it.state(t), sp = it.spec;
      // Screen-space placement: (x, y) is the product's centre in canvas px and h its height
      // in px when it sits on the z = 0 plane; depth keeps that size under perspective.
      const k = (dist - st.z) / dist;
      it.holder.position.set((st.x - W / 2) * k, (H / 2 - st.y) * k, st.z);
      const mm = it.obj.userData.heightMm || 150;
      it.holder.scale.setScalar((sp.h / mm) * k * st.s);
      it.rot.rotation.set(st.rx * DEG, st.ry * DEG, st.rz * DEG, "ZXY");
      it.holder.visible = st.s > 0.0005;
    }
  }

  let last = null;
  IP3.render = function (t) {
    if (t === last) return;
    last = t;
    const n = Math.max(1, cfg.motionBlur?.samples ?? 10);
    const exp = IP.exposure(cfg);
    renderer.setRenderTarget(acc);
    renderer.clear(true, true, true);
    for (let i = 0; i < n; i++) {
      // Centred shutter, like After Effects' default phase of -90 degrees at 180 degrees.
      const ts = n === 1 ? t : t + exp * ((i + 0.5) / n - 0.5);
      pose(ts);
      renderer.setRenderTarget(sub);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      addMat.uniforms.weight.value = 1 / n;
      renderer.setRenderTarget(acc);
      renderer.render(addScene, quadCam);
    }
    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(outScene, quadCam);
  };

  ready = Promise.all(jobs).then(() => {
    last = null;
    IP3.ready = true;
  });
  return ready;
};

IP3.render = function () {};
IP3.ready = false;
window.IP3 = IP3;
