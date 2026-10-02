/* App launch reel kit: the motion runtime.
   build-reel.mjs writes the DOM and window.ALR_CONFIG, including every event time on the beat
   grid (the audio mix is cut from the same numbers). ALR.build(cfg) turns that into one paused
   GSAP timeline. Layout-dependent motion (the lockup slide, iris origins) and procedural text
   (counters, typing, the HUD timecode) are pure functions of time rendered through ALR.fx, so
   any frame can be seeked in any order. Load after gsap.min.js. */
(function () {
  if (window.ALR) return;
  var ALR = {};

  ALR.prng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // Queries skip echo copies, so a scene can be echoed after its elements are collected.
  function qa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel)).filter(function (e) { return !e.closest(".alr-echo"); });
  }
  function q(root, sel) { return qa(root, sel)[0] || null; }
  ALR.q = q;
  ALR.qa = qa;

  var ease3 = function (p) { p = Math.min(1, Math.max(0, p)); return 1 - Math.pow(1 - p, 3); };
  var easeIO = function (p) { p = Math.min(1, Math.max(0, p)); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };

  // ---------------------------------------------------------------- procedural layer
  var fx = [];
  ALR.fx = fx;
  ALR.renderFx = function (t) { for (var i = 0; i < fx.length; i++) fx[i](t); };

  // A value that eases to each new key over `dur` seconds (power3.out), formatted per frame.
  ALR.counter = function (el, keys, fmt, dur) {
    dur = dur || 0.6;
    var last = null;
    fx.push(function (t) {
      var v = keys[0].v;
      for (var i = 1; i < keys.length; i++) {
        if (t < keys[i].t) break;
        v = keys[i - 1].v + (keys[i].v - keys[i - 1].v) * ease3((t - keys[i].t) / dur);
        if (t >= keys[i].t + dur) v = keys[i].v;
      }
      var s = fmt(v);
      if (s !== last) { el.textContent = s; last = s; }
    });
  };

  // Typed text with a caret that blinks on the beat while the field is active.
  ALR.typer = function (el, text, t0, t1, beat, caretUntil) {
    var caret = document.createElement("span");
    caret.className = "alr-caret";
    var txt = document.createTextNode("");
    el.textContent = "";
    el.appendChild(txt);
    el.appendChild(caret);
    fx.push(function (t) {
      var n = t <= t0 ? 0 : t >= t1 ? text.length : Math.floor(((t - t0) / (t1 - t0)) * text.length + 1e-6);
      txt.nodeValue = text.slice(0, n);
      var on = t >= t0 - 0.2 && t < caretUntil && (t < t1 || Math.floor((t - t1) / (beat / 2)) % 2 === 0);
      caret.style.opacity = on ? "1" : "0";
    });
  };

  // ---------------------------------------------------------------- primitives
  // Masked rise: the word climbs through its clip with a little vertical blur.
  ALR.rise = function (tl, els, t, o) {
    o = o || {};
    els.forEach(function (w, i) {
      tl.fromTo(w, { yPercent: o.from == null ? 115 : o.from, rotation: o.rot || 0, filter: "blur(" + (o.blur == null ? 5 : o.blur) + "px)" },
        { yPercent: 0, rotation: 0, filter: "blur(0px)", duration: o.dur || 0.5, ease: o.ease || "power4.out", immediateRender: o.ir !== false }, t + i * (o.stagger == null ? 0.125 : o.stagger));
    });
  };
  ALR.riseOut = function (tl, els, t, o) {
    o = o || {};
    els.forEach(function (w, i) {
      tl.fromTo(w, { yPercent: 0 }, { yPercent: -115, duration: o.dur || 0.26, ease: "power3.in", immediateRender: false }, t + i * (o.stagger == null ? 0.02 : o.stagger));
    });
  };
  ALR.fadeUp = function (tl, el, t, o) {
    if (!el) return;
    o = o || {};
    tl.fromTo(el, { y: o.y == null ? 22 : o.y, opacity: 0 }, { y: 0, opacity: 1, duration: o.dur || 0.45, ease: o.ease || "power3.out", immediateRender: o.ir !== false }, t);
  };
  ALR.pop = function (tl, el, t, o) {
    if (!el) return;
    o = o || {};
    tl.fromTo(el, { scale: o.from == null ? 0.6 : o.from, opacity: 0, y: o.y || 0, x: o.x || 0 },
      { scale: 1, opacity: 1, y: 0, x: 0, duration: o.dur || 0.42, ease: o.ease || "back.out(1.8)", immediateRender: o.ir !== false }, t);
  };
  ALR.focusIn = function (tl, el, t, o) {
    o = o || {};
    tl.fromTo(el, { opacity: 0, scale: o.scale || 1.14, filter: "blur(" + (o.blur || 22) + "px)" },
      { opacity: 1, scale: 1, filter: "blur(0px)", duration: o.dur || 0.42, ease: "power3.out" }, t);
  };
  // Trim-path draw with pathLength=1. The gap is longer than the path and the start offset
  // overshoots, so no round cap shows as a dot before the stroke begins.
  ALR.draw = function (tl, path, t, dur, ease) {
    path.setAttribute("pathLength", "1");
    path.style.strokeDasharray = "1 2";
    // autoRound off: GSAP rounds px values to whole pixels, which would make the draw pop.
    tl.fromTo(path, { strokeDashoffset: 1.05, autoRound: false }, { strokeDashoffset: 0, duration: dur, ease: ease || "power2.inOut", autoRound: false }, t);
  };
  // Raster reveal: the image resolves out of blur through a circle growing from its centre.
  ALR.reveal = function (tl, img, t, dur) {
    tl.fromTo(img, { clipPath: "circle(0% at 50% 52%)", filter: "blur(14px)", scale: 0.74, rotation: -9 },
      { clipPath: "circle(78% at 50% 52%)", filter: "blur(0px)", scale: 1, rotation: 0, duration: dur, ease: "power2.inOut" }, t);
  };
  // A flash that appears at t and then animates away: its opacity is 0 before t on any seek.
  ALR.burst = function (tl, el, t, from, to) {
    tl.fromTo(el, { opacity: 0 }, { opacity: from.opacity == null ? 1 : from.opacity, duration: 0.001, ease: "none" }, t);
    to.immediateRender = false;
    tl.fromTo(el, from, to, t + 0.001);
  };
  // A hero object keeps drifting after it lands, so no frame is frozen.
  ALR.drift = function (tl, el, t, dur, vars) {
    if (!(dur > 0.05)) return;
    var to = { duration: dur, ease: "sine.inOut", immediateRender: false };
    var from = {};
    Object.keys(vars).forEach(function (k) { from[k] = vars[k][0]; to[k] = vars[k][1]; });
    tl.fromTo(el, from, to, t);
  };
  // Echo: time-offset copies trail a fast entrance, then vanish as it settles. `strip` removes
  // inner content from the copies (GSAP writes initial states lazily, so a deep copy taken while
  // the timeline is being built would still show it).
  ALR.echo = function (tl, el, from, to, t, o) {
    o = o || {};
    var n = o.copies || 3, lag = o.lag || 0.033, alphas = [0.42, 0.24, 0.12, 0.06];
    var dur = to.duration || 0.5;
    for (var i = n; i >= 1; i--) {
      var c = el.cloneNode(true);
      c.removeAttribute("id");
      Array.prototype.forEach.call(c.querySelectorAll("[id]"), function (x) { x.removeAttribute("id"); });
      if (o.strip) Array.prototype.forEach.call(c.querySelectorAll(o.strip), function (x) { x.remove(); });
      c.classList.add("alr-echo");
      c.setAttribute("aria-hidden", "true");
      c.style.left = "0px";
      c.style.top = "0px";
      el.parentNode.insertBefore(c, el);
      var toC = {};
      Object.keys(to).forEach(function (k) { toC[k] = to[k]; });
      tl.fromTo(c, from, toC, t + i * lag);
      tl.fromTo(c, { opacity: 0 }, { opacity: alphas[i - 1] || 0.05, duration: 0.001, immediateRender: true }, t + i * lag);
      tl.to(c, { opacity: 0, duration: 0.1, ease: "none" }, t + dur * 0.45 + i * lag);
    }
    tl.fromTo(el, from, to, t);
  };

  // ---------------------------------------------------------------- scenes
  var S = {};
  ALR.scenes = S;

  S.identity = function (tl, c) {
    var e = c.sc.ev, el = c.el;
    tl.fromTo(q(el, ".alr-bg"), { scale: 0.9, opacity: 0.35 }, { scale: 1.05, opacity: 1, duration: c.sc.end - c.sc.start + 0.4, ease: "sine.out" }, c.sc.start);
    tl.fromTo(q(el, ".alr-dots"), { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "none" }, c.sc.start);
    var mark = q(el, ".alr-mark");
    var strokes = qa(mark, ".stroke");
    // Strokes draw one after another across the build, the last one landing just before the hit.
    var span = e.draw[1] - e.draw[0], n = strokes.length, each = n > 1 ? span / (n * 0.77) : span;
    strokes.forEach(function (p, i) {
      ALR.draw(tl, p, e.draw[0] + (n > 1 ? i * (span - each) / (n - 1) : 0), each, "power1.inOut");
    });
    qa(mark, ".fill").forEach(function (f) { tl.fromTo(f, { scale: 0, transformOrigin: "50% 50%", opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2)" }, e.hit); });
    // A raster logo cannot be stroke-drawn: it resolves out of blur through a growing circle.
    var img = q(mark, ".alr-mark-img");
    if (img) ALR.reveal(tl, img, e.draw[0], e.draw[1] - e.draw[0]);
    tl.fromTo(mark, { scale: 1 }, { scale: 1.12, duration: 0.08, ease: "power2.out", immediateRender: false }, e.hit - 0.02);
    tl.to(mark, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)" }, e.hit + 0.06);
    qa(el, ".alr-ring").forEach(function (r, i) {
      ALR.burst(tl, r, e.hit + i * 0.12, { scale: 0.32, opacity: 0.9 }, { scale: 1.35 + 0.25 * i, opacity: 0, duration: 1.0, ease: "power2.out" });
    });
    // Lockup: the wordmark rises letter by letter while the mark slides left to make room.
    var chars = qa(el, ".alr-wordmark .alr-wi");
    ALR.rise(tl, chars, e.lock + 0.06, { stagger: 0.035, dur: 0.42, blur: 3 });
    ALR.pop(tl, q(el, ".alr-wordmark .alr-badge"), e.lock + 0.1 + chars.length * 0.035, { from: 0.4, ease: "back.out(2.2)" });
    var word = q(el, ".alr-wordmark"), lock = q(el, ".alr-lockup");
    fx.push(function (t) {
      var shift = (word.offsetWidth + (parseFloat(getComputedStyle(lock).columnGap) || 34)) / 2;
      var p = easeIO((t - e.lock) / 0.5);
      lock.style.transform = "translateX(" + (shift * (1 - p)).toFixed(2) + "px)";
    });
  };

  S.statement = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.045, duration: d + 0.4, ease: "none" }, c.sc.start);
    var tick = q(el, ".alr-ticker");
    var single = tick && tick.classList.contains("single");
    if (tick) tl.fromTo(tick, { x: single ? 85 : 0 }, { x: single ? -85 : -170, duration: d + 0.4, ease: "none" }, c.sc.start);
    ALR.fadeUp(tl, q(el, ".alr-eyebrow"), e.eyebrow, { y: 10 });
    ALR.rise(tl, qa(el, ".alr-title .alr-wi"), e.words, { stagger: e.stagger });
    var u = q(el, ".alr-anno.underline");
    if (u) tl.fromTo(u, { clipPath: "inset(-50% 100% -50% 0%)" }, { clipPath: "inset(-50% 0% -50% 0%)", duration: e.underline[1] - e.underline[0], ease: "power2.inOut" }, e.underline[0]);
    var ci = q(el, ".alr-anno.circle path");
    if (ci) ALR.draw(tl, ci, e.circle[0], e.circle[1] - e.circle[0], "power2.inOut");
  };

  function copyIn(tl, el, cp, stagger) {
    if (!cp) return;
    ALR.fadeUp(tl, q(el, ".alr-eyebrow"), cp.eyebrow, { y: 12 });
    ALR.rise(tl, qa(el, ".alr-title .alr-wi"), cp.words, { stagger: stagger });
    ALR.fadeUp(tl, q(el, ".alr-sub"), cp.sub, { y: 16 });
  }
  // The hero object lags behind a whip and catches up: momentum carried across the cut.
  function settle(tl, el, t, dx) {
    if (!el) return;
    tl.fromTo(el, { x: dx == null ? 90 : dx }, { x: 0, duration: 0.6, ease: "expo.out" }, t);
  }

  S.product = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    qa(el, ".alr-haze").forEach(function (h, i) { tl.fromTo(h, { x: 0, y: 0 }, { x: i ? 60 : -80, y: i ? -40 : 50, duration: d + 0.6, ease: "none" }, c.sc.start); });
    var copies = qa(el, ".alr-copy");
    copyIn(tl, copies[0], e.copy, e.copy.stagger);
    var phone = q(el, ".alr-phone");
    var screen = q(el, ".alr-screen");
    ALR.fadeUp(tl, q(screen, ".alr-app-head"), e.header, { y: 14 });
    ALR.pop(tl, q(screen, ".alr-hero"), e.hero, { from: 0.9, y: 12, ease: "back.out(1.4)" });
    var slots = qa(screen, ".alr-slot");
    var bySlot = function (n) { return slots.filter(function (s) { return Number(s.dataset.slot) === n; })[0]; };
    (e.rows || []).forEach(function (t, i) {
      var s = bySlot(i);
      if (s && t != null) ALR.pop(tl, q(s, ".alr-row"), t, { from: 0.92, y: 18, ease: "back.out(1.5)", dur: 0.38 });
    });
    var hv = q(screen, ".alr-hero-value");
    if (hv && e.counter) ALR.counter(hv, e.counter.keys, makeFmt(e.counter.fmt), 0.6);
    // Slots sit at their final positions; inserts and removals are offsets summed over time.
    var moves = [];
    (e.steps || []).forEach(function (s) {
      if (s.type === "add") { stepAdd(tl, screen, bySlot(s.index), s, c); moves.push({ after: s.index, at: s.insert - 0.05, dir: 1 }); }
      else if (s.type === "swap") stepSwap(tl, copies, s, c);
      else if (s.type === "complete") { stepComplete(tl, screen, bySlot(s.slot), s); moves.push({ after: s.slot, at: s.collapse + 0.05, dir: -1 }); }
    });
    if (moves.length) {
      var pitch = e.pitch || 96;
      fx.push(function (t) {
        slots.forEach(function (sl) {
          var n = Number(sl.dataset.slot), y = 0;
          moves.forEach(function (m) {
            if (n <= m.after) return;
            var p = easeIO((t - m.at) / 0.42);
            y += m.dir > 0 ? -pitch * (1 - p) : -pitch * p;
          });
          sl.style.transform = y ? "translateY(" + y.toFixed(2) + "px)" : "";
        });
      });
    }
    // Entrance last, so its echo copies carry the UI's initial state.
    var wrap = q(el, ".alr-hero-wrap");
    ALR.echo(tl, phone, { x: 180, y: 820, rotation: -16 }, { x: 0, y: 0, rotation: 3, duration: 0.55, ease: "expo.out" }, e.phone, { copies: 3, strip: ".alr-app, .alr-sheet, .alr-toast" });
    ALR.drift(tl, wrap, e.phone + 0.55, c.sc.end - e.phone - 0.2, { y: [0, -18], rotation: [0, -1.4] });
  };

  function stepAdd(tl, screen, slot, s, c) {
    var sheet = q(screen, ".alr-sheet");
    tl.fromTo(sheet, { yPercent: 105 }, { yPercent: 0, duration: 0.42, ease: "power3.out" }, s.sheetUp);
    var fields = qa(sheet, ".alr-field-value");
    s.fields.forEach(function (f, i) { if (fields[i]) ALR.typer(fields[i], f.text, f.t0, f.t1, c.cfg.beat, f.t1 + 0.35); });
    var on = q(sheet, ".alr-chip-opt .on");
    if (on) {
      tl.fromTo(on, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "none" }, s.chip);
      tl.fromTo(on.parentNode, { scale: 1 }, { scale: 0.92, duration: 0.08, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, s.chip);
    }
    var btn = q(sheet, ".alr-button"), rip = q(sheet, ".alr-ripple");
    tl.fromTo(btn, { scale: 1 }, { scale: 0.95, duration: 0.09, ease: "power2.out", yoyo: true, repeat: 1, immediateRender: false }, s.save);
    tl.fromTo(rip, { scale: 0, opacity: 0.8 }, { scale: 5, opacity: 0, duration: 0.45, ease: "power2.out" }, s.save);
    tl.fromTo(sheet, { yPercent: 0 }, { yPercent: 105, duration: 0.32, ease: "power3.in", immediateRender: false }, s.sheetDown);
    if (slot) ALR.pop(tl, q(slot, ".alr-row"), s.insert, { from: 0.85, y: -10, ease: "back.out(1.6)", dur: 0.45 });
  }

  function stepSwap(tl, copies, s, c) {
    var a = copies[s.from], b = copies[s.to];
    if (!a || !b) return;
    ALR.riseOut(tl, qa(a, ".alr-title .alr-wi"), s.out, { stagger: 0.02 });
    tl.to(q(a, ".alr-eyebrow"), { opacity: 0, duration: 0.2, ease: "none" }, s.out);
    tl.to(q(a, ".alr-sub"), { opacity: 0, y: -10, duration: 0.2, ease: "power2.in" }, s.out);
    ALR.fadeUp(tl, q(b, ".alr-eyebrow"), s.in, { y: 10 });
    ALR.rise(tl, qa(b, ".alr-title .alr-wi"), s.in + 0.04, { stagger: c.cfg.s16 });
    ALR.fadeUp(tl, q(b, ".alr-sub"), s.sub, { y: 14 });
  }

  function stepComplete(tl, screen, slot, s) {
    if (!slot) return;
    var row = q(slot, ".alr-row"), card = q(row, ".alr-row-card"), paid = q(row, ".alr-row-paid");
    tl.fromTo(paid, { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "none" }, s.tap);
    tl.fromTo(card, { x: 0 }, { x: -150, duration: 0.26, ease: "power2.out", immediateRender: false }, s.tap);
    tl.to(card, { x: -460, duration: 0.2, ease: "power3.in" }, s.swipe);
    tl.fromTo(row, { opacity: 1, scaleY: 1 }, { opacity: 0, scaleY: 0.4, duration: 0.3, ease: "power2.in", immediateRender: false }, s.collapse);
    // Confetti from the row, seeded so every render matches.
    var rand = ALR.prng(s.seed || 7);
    qa(slot, ".alr-confetti i").forEach(function (p) {
      var ang = -Math.PI / 2 + (rand() - 0.5) * 2.2, sp = 150 + rand() * 250;
      var dx = Math.cos(ang) * sp, up = Math.sin(ang) * sp;
      tl.fromTo(p, { opacity: 0 }, { opacity: 1, duration: 0.02, ease: "none" }, s.success);
      tl.fromTo(p, { x: 0, rotation: 0 }, { x: dx, rotation: (rand() - 0.5) * 720, duration: 1.0, ease: "power2.out" }, s.success);
      tl.fromTo(p, { y: 0 }, { keyframes: [{ y: up, duration: 0.32, ease: "power2.out" }, { y: up + 380, duration: 0.7, ease: "power2.in" }] }, s.success);
      tl.fromTo(p, { opacity: 1 }, { opacity: 0, duration: 0.25, ease: "none", immediateRender: false }, s.success + 0.75);
    });
    var toast = q(screen, ".alr-toast");
    if (toast) tl.fromTo(toast, { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "back.out(1.7)" }, s.toast);
  }

  S.scan = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.035, duration: d + 0.4, ease: "none" }, c.sc.start);
    copyIn(tl, q(el, ".alr-copy"), e.copy, e.copy.stagger);
    settle(tl, q(el, ".alr-hero-wrap"), c.sc.start, 110);
    ALR.drift(tl, q(el, ".alr-doc"), c.sc.start, d + 0.3, { rotation: [3, 1.5] });
    tl.fromTo(q(el, ".alr-brackets"), { scale: 1.2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.38, ease: "power4.out" }, e.brackets);
    var line = q(el, ".alr-scanline");
    tl.fromTo(line, { opacity: 0, y: 0 }, { opacity: 1, duration: 0.08, ease: "none" }, e.scan[0]);
    tl.fromTo(line, { y: 0 }, { y: 540, duration: e.scan[1] - e.scan[0], ease: "power1.inOut", immediateRender: false }, e.scan[0]);
    tl.to(line, { opacity: 0, duration: 0.12, ease: "none" }, e.scan[1]);
    qa(el, ".alr-doc-field .box").forEach(function (b, i) {
      if (e.boxes[i] != null) tl.fromTo(b, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.22, ease: "power2.out" }, e.boxes[i]);
    });
    qa(el, ".alr-tag").forEach(function (g, i) {
      if (e.tags[i] != null) ALR.pop(tl, g, e.tags[i], { from: 0.6, x: -30, ease: "back.out(1.9)" });
    });
  };

  S.widget = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.035, duration: d + 0.4, ease: "none" }, c.sc.start);
    copyIn(tl, q(el, ".alr-copy"), e.copy, e.copy.stagger);
    settle(tl, q(el, ".alr-hero-wrap"), c.sc.start, 110);
    ALR.drift(tl, q(el, ".alr-device"), c.sc.start, d + 0.3, { y: [10, -10], rotation: [4, 2.5] });
    var w = q(el, ".alr-widget");
    tl.fromTo(w, { scale: 1, x: 0, y: 0, boxShadow: "0 10px 30px -12px rgba(0,0,0,0.6)" },
      { scale: 1.2, x: -90, y: -50, boxShadow: "0 50px 80px -20px rgba(0,0,0,0.75)", duration: 0.5, ease: "back.out(1.6)" }, e.lift);
  };

  S.stack = function (tl, c) {
    var e = c.sc.ev, el = c.el;
    // The camera creeps in, so a stack without a flip never holds still.
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.04, duration: c.sc.end - c.sc.start + 0.4, ease: "none" }, c.sc.start);
    ALR.rise(tl, qa(el, ".alr-theme-light .alr-title .alr-wi"), e.words, { stagger: e.stagger });
    ALR.rise(tl, qa(el, ".alr-theme-dark .alr-title .alr-wi"), e.words, { stagger: e.stagger });
    [".alr-theme-light", ".alr-theme-dark"].forEach(function (layer) {
      qa(el, layer + " .alr-card").forEach(function (card, i) {
        if (e.cards[i] != null) ALR.pop(tl, card, e.cards[i], { from: 0.94, y: 34, ease: "back.out(1.4)", dur: 0.45 });
      });
    });
    if (e.flip) {
      var dur = e.flip[1] - e.flip[0];
      tl.fromTo(el, { "--alr-wipe": "-20%" }, { "--alr-wipe": "125%", duration: dur, ease: "power2.inOut" }, e.flip[0]);
      qa(el, ".alr-wipe-band, .alr-knob").forEach(function (b) {
        tl.fromTo(b, { opacity: 0 }, { opacity: Number(b.dataset.alpha || 1), duration: 0.03, ease: "none" }, e.flip[0]);
        tl.to(b, { opacity: 0, duration: 0.06, ease: "none" }, e.flip[1] - 0.04);
      });
    }
  };

  S.lines = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.035, duration: d + 0.4, ease: "none" }, c.sc.start);
    ALR.fadeUp(tl, q(el, ".alr-eyebrow"), e.eyebrow, { y: 10 });
    qa(el, ".alr-lines .alr-line").forEach(function (ln, i) {
      ALR.rise(tl, qa(ln, ".alr-wi"), e.lines[i], { stagger: 0.028, dur: 0.45 });
    });
  };

  S.manifesto = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(q(el, ".alr-bg"), { scale: 1.1, opacity: 0.6 }, { scale: 1, opacity: 1, duration: d + 0.3, ease: "sine.out" }, c.sc.start);
    qa(el, ".alr-title .alr-line").forEach(function (ln, i) { if (e.lines[i] != null) ALR.focusIn(tl, ln, e.lines[i]); });
    ALR.rise(tl, qa(el, ".alr-sub .alr-wi"), e.sub, { stagger: 0.045, dur: 0.4, blur: 3 });
    qa(el, ".alr-pill").forEach(function (p, i) { if (e.pills[i] != null) ALR.pop(tl, p, e.pills[i], { from: 0.7, y: 14 }); });
  };

  S.endcard = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(q(el, ".alr-rings"), { scale: 0.86, opacity: 0 }, { scale: 1.08, opacity: 1, duration: d + 0.3, ease: "power2.out" }, c.sc.start - 0.1);
    tl.fromTo(q(el, ".alr-bg"), { scale: 1.08 }, { scale: 1, duration: d + 0.3, ease: "power2.out" }, c.sc.start - 0.1);
    var mark = q(el, ".alr-endmark");
    tl.fromTo(mark, { scale: 0.4, rotation: -12, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease: "back.out(1.9)" }, e.mark);
    qa(mark, ".stroke").forEach(function (p, i) { ALR.draw(tl, p, e.mark + i * 0.06, 0.34, "power2.out"); });
    var chars = qa(el, ".alr-wordmark .alr-wi");
    ALR.rise(tl, chars, e.word, { stagger: 0.035, dur: 0.45, blur: 3 });
    ALR.pop(tl, q(el, ".alr-wordmark .alr-badge"), e.word + 0.04 + chars.length * 0.035, { from: 0.4, ease: "back.out(2.2)" });
    ALR.fadeUp(tl, q(el, ".alr-tagline"), e.tagline, { y: 18 });
    qa(el, ".alr-url").forEach(function (u, i) { ALR.pop(tl, u, e.url + i * c.cfg.s16, { from: 0.7, y: 10 }); });
    ALR.drift(tl, q(el, ".alr-center"), e.url + 0.4, c.sc.end - e.url - 0.4, { scale: [1, 1.025] });
  };

  // ---------------------------------------------------------------- more frame types
  // Tiles float in, then converge into one platform card that lands on a hit.
  S.modules = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    qa(el, ".alr-haze").forEach(function (h, i) { tl.fromTo(h, { x: 0, y: 0 }, { x: i ? 60 : -80, y: i ? -40 : 50, duration: d + 0.6, ease: "none" }, c.sc.start); });
    ALR.fadeUp(tl, q(el, ".alr-mod-head .alr-eyebrow"), e.eyebrow, { y: 10 });
    ALR.rise(tl, qa(el, ".alr-mod-head .alr-wi"), e.words, { stagger: e.stagger });
    var card = q(el, ".alr-mcard");
    var cx = parseFloat(card.style.left), cy = parseFloat(card.style.top);
    qa(el, ".alr-tile").forEach(function (tile, i) {
      var t0 = e.tiles[i];
      if (t0 == null) return;
      var rot = Number(tile.dataset.rot) || 0, x0 = parseFloat(tile.style.left), y0 = parseFloat(tile.style.top);
      var bob = (i % 2 ? 1 : -1) * 16;
      tl.fromTo(tile, { scale: 0.6, opacity: 0, rotation: rot * 2.2, y: 40 }, { scale: 1, opacity: 1, rotation: rot, y: 0, duration: 0.45, ease: "back.out(1.7)" }, t0);
      tl.fromTo(tile, { y: 0 }, { y: bob, duration: Math.max(0.1, e.merge - t0 - 0.45), ease: "sine.inOut", immediateRender: false }, t0 + 0.45);
      // Converge: every tile is pulled into the card's centre, shrinking as it goes.
      tl.fromTo(tile, { x: 0, y: bob, rotation: rot, scale: 1, opacity: 1 }, { x: cx - x0, y: cy - y0, rotation: 0, scale: 0.3, opacity: 0, duration: 0.44, ease: "power3.in", immediateRender: false }, e.merge + i * 0.012);
    });
    tl.fromTo(card, { scale: 0.62, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.6)" }, e.card);
    var ring = q(card, ".alr-ring");
    if (ring) ALR.burst(tl, ring, e.card, { scale: 0.4, opacity: 0.8 }, { scale: 1.6, opacity: 0, duration: 0.9, ease: "power2.out" });
    var img = q(card, ".alr-mark-img");
    if (img) ALR.reveal(tl, img, e.card, 0.45);
    qa(card, ".alr-mark .stroke").forEach(function (p, i) { ALR.draw(tl, p, e.card + i * 0.05, 0.4, "power2.out"); });
    ALR.pop(tl, q(card, ".alr-badge"), e.card + 0.22, { from: 0.4, ease: "back.out(2.2)" });
    qa(card, ".alr-mcard-chips span").forEach(function (sp, i) { if (e.chips[i] != null) ALR.pop(tl, sp, e.chips[i], { from: 0.6, y: 12, ease: "back.out(1.8)", dur: 0.36 }); });
    ALR.fadeUp(tl, q(card, ".alr-mcard-sub"), e.card + 0.3, { y: 10 });
    ALR.drift(tl, q(card, ".alr-mcard-in"), e.card + 0.55, c.sc.end - e.card - 0.3, { y: [0, -12] });
  };

  // One big number counts up and lands; bars or a progress line grow beneath it.
  S.metric = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.05, duration: d + 0.4, ease: "none" }, c.sc.start);
    ALR.fadeUp(tl, q(el, ".alr-eyebrow"), e.eyebrow, { y: 10 });
    var num = q(el, ".alr-metric-num");
    tl.fromTo(num, { yPercent: 38, opacity: 0, filter: "blur(10px)" }, { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.46, ease: "power4.out" }, e.number - 0.04);
    tl.fromTo(num, { scale: 1 }, { keyframes: [{ scale: 1.06, duration: 0.07, ease: "power2.out" }, { scale: 1, duration: 0.3, ease: "power3.out" }], immediateRender: false }, e.land);
    ALR.counter(q(el, ".alr-metric-val"), e.counter.keys, makeFmt(e.counter.fmt), 0.62);
    ALR.rise(tl, qa(el, ".alr-metric-label .alr-wi"), e.label, { stagger: c.cfg.s16 / 2, dur: 0.42 });
    qa(el, ".alr-metric-bars i").forEach(function (b, i) {
      if (e.bars && e.bars[i] != null) tl.fromTo(b, { scaleY: 0 }, { scaleY: 1, duration: 0.4, ease: "back.out(1.6)" }, e.bars[i]);
    });
    var tr = q(el, ".alr-metric-track i");
    if (tr && e.progress) tl.fromTo(tr, { scaleX: 0 }, { scaleX: e.progress.p, duration: e.progress.dur, ease: "power3.out" }, e.progress.at);
  };

  // A dashboard window settles in; KPI tiles pop and count; the chart grows bar by bar.
  S.dashboard = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start;
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.035, duration: d + 0.4, ease: "none" }, c.sc.start);
    copyIn(tl, q(el, ".alr-copy"), e.copy, e.copy.stagger);
    var win = q(el, ".alr-win");
    ALR.echo(tl, win, { y: 160, opacity: 0, rotationX: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "expo.out" }, e.win, { copies: 2, strip: ".alr-kpis, .alr-chart" });
    ALR.drift(tl, q(el, ".alr-hero-wrap"), e.win + 0.55, c.sc.end - e.win - 0.3, { y: [0, -14], rotation: [0, -0.6] });
    ALR.pop(tl, q(win, ".alr-live"), e.live, { from: 0.6 });
    var dot = q(win, ".alr-live i");
    if (dot) fx.push(function (t) { dot.style.opacity = t < e.live ? "1" : (0.35 + 0.65 * Math.abs(Math.cos((t - e.live) * Math.PI / (2 * c.cfg.beat)))).toFixed(3); });
    qa(win, ".alr-kpi").forEach(function (k, i) {
      if (e.tiles[i] == null) return;
      ALR.pop(tl, k, e.tiles[i], { from: 0.9, y: 18, ease: "back.out(1.5)", dur: 0.4 });
      var v = q(k, ".v"), cn = e.counters[i];
      if (v && cn) ALR.counter(v, cn.keys, makeFmt(cn.fmt), 0.8);
      ALR.fadeUp(tl, q(k, "em"), e.tiles[i] + 0.5, { y: 8, dur: 0.3 });
    });
    qa(win, ".alr-bars i").forEach(function (b, i) { if (e.bars[i] != null) tl.fromTo(b, { scaleY: 0 }, { scaleY: 1, duration: 0.42, ease: "back.out(1.4)" }, e.bars[i]); });
    ALR.fadeUp(tl, q(win, ".alr-chart-head"), (e.bars[0] || e.win + 0.6) - 0.1, { y: 8, dur: 0.3 });
  };

  // A call card with the avatar, and a conversation that types, answers, and draws.
  S.chat = function (tl, c) {
    var e = c.sc.ev, el = c.el, d = c.sc.end - c.sc.start, cfg = c.cfg;
    qa(el, ".alr-haze").forEach(function (h, i) { tl.fromTo(h, { x: 0, y: 0 }, { x: i ? 60 : -80, y: i ? -40 : 50, duration: d + 0.6, ease: "none" }, c.sc.start); });
    ALR.fadeUp(tl, q(el, ".alr-chat-eyebrow"), c.sc.start + 0.05, { y: 10 });
    // The call card must be at rest before its video starts (e.video.start).
    var call = q(el, ".alr-call");
    tl.fromTo(call, { y: 70, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "expo.out" }, e.card);
    var slot = q(el, ".alr-call-slot");
    var stillB = q(slot, ".alr-still.b");
    var wrap = document.getElementById("vw-" + c.sc.id);
    var main = document.getElementById("main");
    fx.push(function (t) {
      if (stillB && e.video) stillB.style.opacity = t >= e.video.mid ? "1" : "0";
      if (!wrap || !e.video) return;
      var on = t >= e.video.start - 0.05 && t < e.video.end + 0.05;
      wrap.style.opacity = on ? "1" : "0";
      if (!on) return;
      var r = slot.getBoundingClientRect(), m = main.getBoundingClientRect(), k = m.width ? cfg.W / m.width : 1;
      wrap.style.left = ((r.left - m.left) * k).toFixed(2) + "px";
      wrap.style.top = ((r.top - m.top) * k).toFixed(2) + "px";
      wrap.style.width = (r.width * k).toFixed(2) + "px";
      wrap.style.height = (r.height * k).toFixed(2) + "px";
    });
    // Voice meter: bars dance while the assistant speaks, and rest as dots otherwise.
    var bars = qa(el, ".alr-voice i"), rand = ALR.prng(31);
    var ph = bars.map(function () { return [1.7 + rand() * 2.6, rand() * 6.28, 3.1 + rand() * 3.3]; });
    fx.push(function (t) {
      var amp = 0;
      (e.speak || []).forEach(function (w) { amp = Math.max(amp, Math.min(1, (t - w[0]) / 0.12, (w[1] - t) / 0.2)); });
      amp = Math.max(0, amp);
      bars.forEach(function (b, i) {
        var p = ph[i], v = 0.5 + 0.5 * Math.sin(t * p[0] * 6.28 / 2 + p[1]) * Math.sin(t * p[2] + p[1] * 0.5);
        b.style.transform = "scaleY(" + (0.16 + amp * (0.25 + 0.75 * Math.abs(v))).toFixed(3) + ")";
      });
    });
    (e.items || []).forEach(function (it, i) {
      var node = q(el, '[data-item="' + i + '"]');
      if (!node) return;
      if (it.kind === "user") {
        ALR.pop(tl, q(node, ".alr-msg"), it.pop, { from: 0.9, y: 24, ease: "back.out(1.5)", dur: 0.4 });
        var tx = q(node, ".alr-msg-text");
        ALR.typer(tx, tx.getAttribute("data-text") || "", it.type[0], it.type[1], cfg.beat, it.type[1] + 0.3);
      } else if (it.kind === "ai") {
        var dots = q(node, ".alr-typing"), msg = q(node, ".alr-msg");
        ALR.pop(tl, dots, it.dots, { from: 0.6, dur: 0.3, ease: "back.out(2)" });
        tl.fromTo(dots, { opacity: 1 }, { opacity: 0, duration: 0.08, ease: "none", immediateRender: false }, it.pop - 0.04);
        var dd = qa(dots, "i");
        fx.push(function (t) {
          dd.forEach(function (x, k) {
            var y = t > it.dots && t < it.pop ? -7 * Math.max(0, Math.sin((t - it.dots) * 14 - k * 0.9)) : 0;
            x.style.transform = "translateY(" + y.toFixed(2) + "px)";
          });
        });
        ALR.pop(tl, msg, it.pop, { from: 0.92, y: 22, ease: "back.out(1.5)", dur: 0.42 });
        ALR.rise(tl, qa(msg, ".alr-msg-text .alr-wi"), it.pop + 0.05, { stagger: cfg.s16 / 2, dur: 0.4, blur: 3 });
      } else if (it.kind === "figure") {
        ALR.pop(tl, node, it.pop, { from: 0.85, y: 20, ease: "back.out(1.6)", dur: 0.42 });
        [".legs", ".right"].forEach(function (sel) { var p = q(node, sel); if (p) ALR.draw(tl, p, it.draw[0], it.draw[1] - it.draw[0], "power2.inOut"); });
        var hyp = q(node, ".hyp");
        if (hyp) ALR.draw(tl, hyp, it.hyp[0], it.hyp[1] - it.hyp[0], "power2.inOut");
        ALR.pop(tl, q(node, ".alr-figure-label span"), it.label, { from: 0.5, ease: "back.out(2)" });
      }
    });
    qa(el, ".alr-chat-chips .alr-pill").forEach(function (p, i) { if (e.chips[i] != null) ALR.pop(tl, p, e.chips[i], { from: 0.7, y: 14 }); });
    ALR.drift(tl, q(el, ".alr-thread"), c.sc.start + 0.6, d - 0.4, { y: [0, -16] });
  };

  // A permission grid fills in a diagonal wave.
  S.matrix = function (tl, c) {
    var e = c.sc.ev, el = c.el;
    tl.fromTo(c.cam, { scale: 1 }, { scale: 1.035, duration: c.sc.end - c.sc.start + 0.4, ease: "none" }, c.sc.start);
    copyIn(tl, q(el, ".alr-copy"), e.copy, e.copy.stagger);
    var win = q(el, ".alr-win");
    ALR.echo(tl, win, { y: 160, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "expo.out" }, e.win, { copies: 2, strip: ".alr-grid, .alr-grid-foot, .alr-grid-legend" });
    ALR.drift(tl, q(el, ".alr-hero-wrap"), e.win + 0.55, c.sc.end - e.win - 0.3, { y: [0, -14], rotation: [0, 0.6] });
    var cols = qa(win, ".alr-grid-col").length;
    qa(win, ".alr-grid-col").forEach(function (h, j) { ALR.fadeUp(tl, h, e.rows[0] + j * 0.03, { y: 8, dur: 0.3 }); });
    qa(win, ".alr-grid-row").forEach(function (r, i) { if (e.rows[i] != null) ALR.fadeUp(tl, r, e.rows[i], { y: 10, dur: 0.34 }); });
    qa(win, ".alr-grid-cell b").forEach(function (b, n) {
      var i = Math.floor(n / cols), j = n % cols;
      var t = e.cells[i] && e.cells[i][j];
      if (t == null) return;
      ALR.pop(tl, b, t, { from: 0.2, ease: "back.out(2.4)", dur: 0.36 });
      var ck = q(b, "path");
      if (ck) ALR.draw(tl, ck, t + 0.08, 0.22, "power2.out");
    });
    ALR.fadeUp(tl, q(win, ".alr-grid-legend"), e.foot - 0.06, { y: 8, dur: 0.3 });
    ALR.fadeUp(tl, q(win, ".alr-grid-foot"), e.foot, { y: 12 });
  };

  // One word per beat; each word brings its own background, so the frame flips on the beat.
  S.burst = function (tl, c) {
    var e = c.sc.ev, el = c.el;
    var layers = qa(el, ".alr-burst-layer");
    layers.forEach(function (ly, i) {
      var t0 = e.words[i];
      var w = q(ly, ".alr-burst-word");
      tl.fromTo(w, { scale: 1.32, filter: "blur(14px)", opacity: 0.2 }, { scale: 1, filter: "blur(0px)", opacity: 1, duration: 0.3, ease: "expo.out" }, t0);
      tl.fromTo(w, { scale: 1 }, { scale: 1.07, duration: e.each + 0.35, ease: "none", immediateRender: false }, t0 + 0.3);
      ALR.fadeUp(tl, q(ly, ".alr-burst-idx"), t0 + 0.04, { y: 8, dur: 0.25 });
    });
    // Layer visibility is a pure function of time, so any frame can be seeked in any order.
    fx.push(function (t) {
      layers.forEach(function (ly, i) {
        var on = i === 0 ? t < e.words[1] || layers.length === 1 : t >= e.words[i] && (i === layers.length - 1 || t < e.words[i + 1]);
        ly.style.opacity = on ? "1" : "0";
      });
    });
  };

  // ---------------------------------------------------------------- transitions
  var T = {};
  ALR.transitions = T;

  // Whip: a push with a horizontal smear that peaks at the cut.
  T.whip = function (tl, a, b, x, cfg) {
    var d = x.dur, t0 = x.at - d / 2, W = cfg.W;
    tl.fromTo(a.el, { x: 0 }, { x: -W, duration: d, ease: "power4.inOut", immediateRender: false }, t0);
    tl.fromTo(b.el, { x: W }, { x: 0, duration: d, ease: "power4.inOut" }, t0);
    [a, b].forEach(function (s) {
      var node = document.querySelector("#" + s.el.id + "-mb feGaussianBlur");
      if (!node) return;
      tl.set(s.el, { filter: "url(#" + s.el.id + "-mb)" }, t0);
      tl.fromTo(node, { attr: { stdDeviation: "0 0" } }, { attr: { stdDeviation: "90 0" }, duration: d / 2, ease: "power2.in", immediateRender: false }, t0);
      tl.to(node, { attr: { stdDeviation: "0 0" }, duration: d / 2, ease: "power2.out" }, x.at);
      tl.set(s.el, { filter: "none" }, t0 + d + 0.001);
    });
  };

  // Pixel stair: columns of the next scene's background fall in steps, left to right.
  T.pixel = function (tl, a, b, x, cfg) {
    var cols = qa(a.el, ".alr-pixel > i"), n = cols.length;
    var each = 0.16, lag = (x.dur - each) / Math.max(1, n - 1);
    cols.forEach(function (col, i) {
      tl.fromTo(col, { height: 0 }, { height: cfg.H + 66, duration: each, ease: "steps(4)" }, x.at - x.dur + i * lag);
    });
  };

  // Iris: the next scene is revealed through a circle growing from an element of this one;
  // two translucent discs of its colour lead the edge like echo rings.
  T.iris = function (tl, a, b, x, cfg) {
    var R = Math.sqrt(cfg.W * cfg.W + cfg.H * cfg.H) + 40;
    tl.fromTo(b.el, { "--alr-iris-r": "0px" }, { "--alr-iris-r": R + "px", duration: x.dur, ease: "power3.in" }, x.at - x.dur);
    var discs = qa(a.el, ".alr-iris");
    discs.forEach(function (dv, i) {
      dv.style.width = dv.style.height = 2 * R + "px";
      tl.fromTo(dv, { scale: 0 }, { scale: 1, duration: x.dur, ease: "power3.in" }, x.at - x.dur - (discs.length - i) * 0.05);
    });
    var origin = x.origin ? q(a.el, x.origin) : null;
    fx.push(function () {
      var cx = cfg.W / 2, cy = cfg.H / 2;
      if (origin) {
        var r = origin.getBoundingClientRect(), s = a.el.getBoundingClientRect();
        var k = s.width ? cfg.W / s.width : 1;
        cx = (r.left + r.width / 2 - s.left) * k;
        cy = (r.top + r.height / 2 - s.top) * k;
      }
      discs.forEach(function (dv) { dv.style.left = cx - R + "px"; dv.style.top = cy - R + "px"; });
      b.el.style.setProperty("--alr-iris-x", cx.toFixed(1) + "px");
      b.el.style.setProperty("--alr-iris-y", cy.toFixed(1) + "px");
    });
  };

  // Focus pull: the outgoing frame defocuses and pushes in; the next one resolves out of blur.
  T.focus = function (tl, a, b, x) {
    tl.fromTo(a.cam, { filter: "blur(0px)", scale: 1 }, { filter: "blur(28px)", scale: 1.1, duration: x.dur, ease: "power2.in", immediateRender: false }, x.at - x.dur);
    if (b.sc.type !== "manifesto") tl.fromTo(b.cam, { filter: "blur(28px)", scale: 1.1 }, { filter: "blur(0px)", scale: 1, duration: 0.4, ease: "power3.out" }, x.at);
  };

  T.cut = function () {};

  // ---------------------------------------------------------------- HUD
  function hud(tl, cfg) {
    var el = document.getElementById("alr-hud");
    if (!el) return;
    var tr = el.querySelector(".tr"), bl = el.querySelector(".bl"), bar = el.querySelector(".br span");
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "none" }, cfg.hud.showAt);
    tl.to(el, { opacity: 0, duration: 0.2, ease: "none" }, cfg.hud.hideAt);
    var lastLabel = null, lastLight = null;
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    fx.push(function (t) {
      var ch = cfg.hud.chapters[0];
      for (var i = 0; i < cfg.hud.chapters.length; i++) if (t >= cfg.hud.chapters[i].from - 1e-6) ch = cfg.hud.chapters[i];
      if (tr && ch.label !== lastLabel) { tr.textContent = ch.label; lastLabel = ch.label; }
      if (ch.light !== lastLight) { el.classList.toggle("on-light", !!ch.light); lastLight = ch.light; }
      var f = Math.round(t * cfg.fps), fps = Math.round(cfg.fps);
      var s = Math.floor(f / fps), fr = f % fps;
      if (bl) bl.textContent = "00:" + pad(Math.floor(s / 60)) + ":" + pad(s % 60) + ":" + pad(fr);
      if (bar) bar.style.transform = "scaleX(" + Math.min(1, t / cfg.D).toFixed(4) + ")";
    });
  }

  function makeFmt(f) {
    f = f || {};
    var dec = f.decimals == null ? 2 : f.decimals;
    return function (v) {
      var s = Math.abs(v).toFixed(dec).split(".");
      s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return (v < 0 ? "-" : "") + (f.prefix || "") + s.join(".") + (f.suffix || "");
    };
  }
  ALR.makeFmt = makeFmt;

  // ---------------------------------------------------------------- build
  ALR.build = function (cfg) {
    var tl = gsap.timeline({ paused: true });
    var ctx = cfg.scenes.map(function (sc) {
      var el = document.getElementById("s-" + sc.id);
      if (!el) throw new Error("ALR: missing scene #s-" + sc.id);
      return { sc: sc, el: el, cam: el.querySelector(".alr-cam"), cfg: cfg };
    });
    ctx.forEach(function (c) {
      var fn = S[c.sc.type];
      if (!fn) throw new Error("ALR: unknown scene type " + c.sc.type);
      fn(tl, c);
    });
    ctx.forEach(function (c, i) {
      var x = c.sc.exit;
      if (!x || !ctx[i + 1]) return;
      (T[x.type] || T.cut)(tl, c, ctx[i + 1], x, cfg);
    });
    hud(tl, cfg);
    // Scenes outside their clip window leave the render tree entirely. A long reel carries dozens
    // of gradient, blur, and clip-path layers, and even hidden ones load the capture compositor.
    // This runs before every other procedural function, so layout reads see the live scenes.
    var windows = ctx.map(function (c) {
      var a = Number(c.el.getAttribute("data-start")) || 0;
      return { el: c.el, a: a, b: a + (Number(c.el.getAttribute("data-duration")) || 0), last: null };
    });
    fx.unshift(function (t) {
      windows.forEach(function (w) {
        var d = t >= w.a - 0.05 && t <= w.b + 0.05 ? "" : "none";
        if (d !== w.last) { w.el.style.display = d; w.last = d; }
      });
    });
    var clock = { t: 0 };
    tl.fromTo(clock, { t: 0 }, { t: cfg.D, duration: cfg.D, ease: "none", onUpdate: function () { ALR.renderFx(clock.t); } }, 0);
    window.addEventListener("hf-seek", function (ev) { ALR.renderFx(ev.detail.time); });
    ALR.renderFx(0);
    return tl;
  };

  window.ALR = ALR;
})();
