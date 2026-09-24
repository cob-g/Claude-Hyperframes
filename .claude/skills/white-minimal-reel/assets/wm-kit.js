/* White Minimal Reel kit: deterministic motion helpers for HyperFrames scenes.
   Load after GSAP. Every helper adds tweens to a timeline you pass in; nothing plays itself.
   Times are scene-local seconds. Pixel values are at 1080x1920. */
(function () {
  if (window.WM) return;

  var WM = {};
  WM.POSTER_FPS = 12;

  // After Effects "Blurriness" -> CSS blur() radius, calibrated against the reference frames.
  WM.aeBlur = function (value) {
    return value * 0.4;
  };

  // Seeded PRNG (mulberry32). Never use Math.random in a composition.
  WM.prng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function blur(px) {
    return "blur(" + px + "px)";
  }

  // Shrink a word until its text fits its own box (width = data-fit). Runs synchronously; the
  // compiler embeds fonts. scrollWidth only exceeds clientWidth when the text overflows.
  function fit(el) {
    if (!Number(el.dataset.fit)) return;
    var size = parseFloat(getComputedStyle(el).fontSize);
    var guard = 0;
    while (el.scrollWidth > el.clientWidth + 1 && size > 12 && guard < 200) {
      size -= 2;
      el.style.fontSize = size + "px";
      guard++;
    }
  }

  // Build the DOM that depends on measured geometry: cast-shadow stacks, halftone mattes,
  // stroke dash lengths, and fitted text. Call once per scene before adding tweens.
  WM.prepare = function (scope) {
    scope.querySelectorAll(".wm-obj").forEach(function (obj) {
      // Use the resolved URL of the rendered image: sub-composition paths are rewritten on load.
      var body = obj.querySelector(".wm-obj-img");
      var src = (body && (body.currentSrc || body.src)) || obj.dataset.src;
      var shadow = obj.querySelector(".wm-obj-shadow");
      if (shadow && !shadow.childElementCount && src) {
        var steps = Number(obj.dataset.shadowSteps || 9);
        var reach = Number(obj.dataset.shadowReach || 0.2);
        var strength = Number(obj.dataset.shadowStrength || 0.2);
        var origin = (obj.dataset.lightX || "88%") + " " + (obj.dataset.lightY || "4%");
        for (var i = 1; i <= steps; i++) {
          var img = document.createElement("img");
          img.src = src;
          img.alt = "";
          img.style.transformOrigin = origin;
          img.style.transform = "scale(" + (1 + (reach * i) / steps).toFixed(4) + ")";
          img.style.opacity = (strength * (1 - (i - 1) / (steps + 2))).toFixed(3);
          shadow.appendChild(img);
        }
      }
      var tone = obj.querySelector(".wm-obj-tone");
      if (tone && src) {
        var mask =
          'url("' + src + '"), linear-gradient(' + (obj.dataset.toneAngle || "165deg") +
          ", rgba(0,0,0,0.2) 5%, #000 80%)";
        tone.style.webkitMaskImage = mask;
        tone.style.maskImage = mask;
      }
    });
    scope.querySelectorAll(".wm-stroke path").forEach(function (path) {
      var length = path.getTotalLength();
      path.dataset.len = String(length);
      path.style.strokeDasharray = length + " " + length;
      path.style.strokeDashoffset = String(length);
    });
    scope.querySelectorAll("[data-fit]").forEach(fit);
  };

  // ---------------- Camera (the adjustment-layer Transform + Gaussian Blur) ----------------

  // Hard cut in, then the scene settles: 140% -> 110% scale, heavy blur -> sharp, fast then slow.
  WM.camIntro = function (tl, cam, t, o) {
    o = o || {};
    var to = o.to || 1.1, d = o.duration || 1.0;
    tl.fromTo(
      cam,
      { scale: o.from || 1.4, x: 0, filter: blur(WM.aeBlur(o.blur == null ? 30 : o.blur)) },
      { scale: to, filter: blur(0), duration: d, ease: o.ease || "power3.out" },
      t || 0
    );
    WM.camCreep(tl, cam, (t || 0) + d, o.hold - d, to, o.creep);
  };

  // After the settle the frame keeps creeping in (linear), so a posterized scene never holds
  // a frozen frame once its objects have eased to rest. `hold` is the scene duration.
  WM.camCreep = function (tl, cam, t, d, from, amount) {
    if (!(d > 0.2)) return;
    var a = amount == null ? 0.04 : amount;
    if (!a) return;
    tl.fromTo(cam, { scale: from }, { scale: from + a, duration: d, ease: "none", immediateRender: false }, t);
  };

  // Incoming half of the blur push: starts left of rest and blurred, glides right into place.
  WM.camPushIn = function (tl, cam, t, o) {
    o = o || {};
    var d = o.duration || 0.9;
    tl.fromTo(
      cam,
      { scale: o.scale || 1.1, x: -(o.dx || 55), filter: blur(WM.aeBlur(o.blur == null ? 30 : o.blur)) },
      { x: 0, filter: blur(0), duration: d, ease: o.ease || "power2.out" },
      t || 0
    );
    WM.camCreep(tl, cam, (t || 0) + d, o.hold - d, o.scale || 1.1, o.creep);
  };

  // Outgoing half of the blur push: slow then fast drift right while blurring. This is the
  // transition itself, so it is the only "exit" a scene gets.
  WM.camPushOut = function (tl, cam, t, o) {
    o = o || {};
    tl.to(
      cam,
      { x: o.dx || 45, filter: blur(WM.aeBlur(o.blur == null ? 30 : o.blur)), duration: o.duration || 0.5, ease: o.ease || "power2.in" },
      t
    );
  };

  // A scene that keeps its 110% frame without any intro (rare; used after a push-in).
  WM.camHold = function (tl, cam, t) {
    tl.set(cam, { scale: 1.1, x: 0, filter: blur(0) }, t || 0);
  };

  // ---------------- Text ----------------

  // The pop-up blur: rise ~27px, fade in, defocus -> sharp. Ends at the element's CSS opacity.
  WM.pop = function (tl, el, t, o) {
    o = o || {};
    var target = Number(getComputedStyle(el).opacity);
    tl.fromTo(
      el,
      { opacity: 0, y: o.dy == null ? 27 : o.dy, filter: blur(WM.aeBlur(o.blur == null ? 15 : o.blur)) },
      { opacity: target, y: 0, filter: blur(0), duration: o.duration || 0.5, ease: o.ease || "power3.out" },
      t
    );
  };

  // ---------------- Objects ----------------

  // settle: shrink and unrotate into place. rise: travel up from below. slide: drift in from a
  // frame edge. counter: grow slightly while the camera zooms out. Pass duration = the scene
  // length: the strong ease-out lands most of the move early, then keeps creeping until the
  // cut, so a posterized scene is never frozen.
  WM.objectIn = function (tl, el, t, o) {
    o = o || {};
    var motion = o.motion || "settle";
    var d = o.duration || 2.5;
    var ease = o.ease || "power4.out";
    if (motion === "settle") {
      tl.fromTo(el, { scale: o.fromScale || 1.2, rotation: o.fromRotation == null ? -7 : o.fromRotation },
        { scale: 1, rotation: 0, duration: d, ease: ease }, t);
    } else if (motion === "rise") {
      tl.fromTo(el, { y: o.dy || 520 }, { y: 0, duration: d, ease: ease }, t);
    } else if (motion === "slide") {
      tl.fromTo(el, { x: o.dx == null ? 260 : o.dx, rotation: o.fromRotation == null ? 5 : o.fromRotation },
        { x: 0, rotation: 0, duration: d, ease: o.ease || "power1.out" }, t);
    } else if (motion === "counter") {
      tl.fromTo(el, { scale: o.fromScale || 0.84 }, { scale: 1, duration: d, ease: o.ease || "power3.out" }, t);
    } else if (motion === "drift") {
      WM.drift(tl, el, t, d, o);
    }
  };

  // Linear keyframe drift used by edge objects: small translation and a subtle rotation.
  WM.drift = function (tl, el, t, duration, o) {
    o = o || {};
    tl.fromTo(
      el,
      { x: 0, y: 0, rotation: 0 },
      { x: o.dx || 0, y: o.dy || 0, rotation: o.dr || 0, duration: duration, ease: o.ease || "none" },
      t
    );
  };

  // Rising panel (gradient rectangle behind the object).
  WM.panelIn = function (tl, el, t, o) {
    o = o || {};
    tl.fromTo(el, { y: o.dy == null ? 700 : o.dy }, { y: 0, duration: o.duration || 2.5, ease: o.ease || "power4.out" }, t);
  };

  // Trim-path draw-on for an SVG path prepared by WM.prepare.
  WM.draw = function (tl, path, t, o) {
    o = o || {};
    var length = Number(path.dataset.len || path.getTotalLength());
    tl.fromTo(path, { strokeDashoffset: length }, { strokeDashoffset: 0, duration: o.duration || 0.9, ease: o.ease || "power3.out" }, t);
  };

  // ---------------- Finishing ----------------

  // Grain that re-rolls on every posterized frame (deterministic offsets).
  WM.grain = function (tl, el, duration, seed, fps) {
    var rate = fps || WM.POSTER_FPS;
    var rand = WM.prng(seed || 1);
    var frames = Math.ceil(duration * rate);
    for (var i = 0; i <= frames; i++) {
      var x = Math.floor(rand() * 320);
      var y = Math.floor(rand() * 320);
      tl.set(el, { backgroundPosition: x + "px " + y + "px" }, Math.min(i / rate, duration));
    }
  };

  // Posterize Time: wrap the scene's timeline so its playhead only lands on 1/fps steps.
  // Register the returned wrapper in window.__timelines; keep the inner timeline private.
  WM.posterize = function (inner, duration, fps) {
    var rate = fps || WM.POSTER_FPS;
    var steps = Math.max(1, Math.round(duration * rate));
    var wrapper = gsap.timeline({ paused: true });
    wrapper.fromTo(inner, { time: 0 }, { time: duration, duration: duration, ease: "steps(" + steps + ")", immediateRender: true }, 0);
    return wrapper;
  };

  window.WM = WM;
})();
