/* simplicity kit: the motion runtime. The builder compiles every cut, glow hop, stutter,
   cutout, tile, and title flicker into frame-exact state changes ("sets") and a few short settles
   ("tweens"); this file turns them into one paused, seekable GSAP timeline.
   Nothing here is random or time-based: the builder already resolved every pattern from a seed.
   See ../SKILL.md. */
(function () {
  "use strict";

  function build(cfg) {
    var fps = cfg.fps || 24;
    // A state change lands half a millisecond before its frame's timestamp, so a renderer that
    // seeks to exactly frame/fps always sees it, whatever the float rounding.
    var f = function (frame) { return frame > 0 ? Math.round((frame / fps - 0.0005) * 1000000) / 1000000 : 0; };
    var tl = gsap.timeline({ paused: true });
    var root = document.getElementById(cfg.root || "main");
    var q = function (sel) { return root.querySelectorAll(sel); };

    // Short settles: an incoming shot lands 3% large and snaps to rest over a few frames.
    // immediateRender stays off so nothing leaks backwards.
    (cfg.tweens || []).forEach(function (tw) {
      if (!q(tw.sel).length) return;
      var to = Object.assign({ immediateRender: false }, tw.to, { duration: f(tw.frames), ease: tw.ease || "expo.out" });
      tl.fromTo(tw.sel, tw.from, to, f(tw.at));
    });

    // Frame-exact state changes, in frame order. A set on an element records the value it
    // replaces, so seeking backwards restores the earlier state.
    var sets = (cfg.sets || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    sets.forEach(function (s) {
      if (!q(s[1]).length) return;
      tl.set(s[1], s[2], f(s[0]));
    });

    return tl;
  }

  window.SIMP = { build: build };
})();
