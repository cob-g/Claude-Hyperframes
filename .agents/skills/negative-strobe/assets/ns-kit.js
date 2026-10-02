/* negative strobe kit: the runtime. The builder compiles the edit into frame-exact state changes
   ("sets": a piece switches on, a piece switches off); this file turns them into one paused,
   seekable GSAP timeline. There are no tweens: in this style nothing eases.
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

    // In frame order. A set records the value it replaces, so seeking backwards restores it.
    var sets = (cfg.sets || []).slice().sort(function (a, b) { return a[0] - b[0]; });
    sets.forEach(function (s) {
      if (!root.querySelectorAll(s[1]).length) return;
      tl.set(s[1], s[2], f(s[0]));
    });
    // The timeline must span the film even when the last frames hold one piece.
    tl.set({}, {}, cfg.duration);

    return tl;
  }

  window.NS = { build: build };
})();
