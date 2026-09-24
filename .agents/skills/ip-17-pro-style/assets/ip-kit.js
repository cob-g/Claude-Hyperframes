/* iPhone 17 Pro style kit: deterministic timing for the DOM layers of a promo.
   Everything on screen is a pure function of composition time, so HyperFrames can seek any
   frame in any order. The builder writes window.IP_CONFIG; ip-3d.mjs reads the same config and
   the same eases for the 3D products. Load this before the ip/ip-3d.js bundle. */
(function () {
  if (window.IP) return;

  var IP = {};

  // cubic-bezier(x1, y1, x2, y2), the curve After Effects' speed graph produces for a pair of
  // keyframes. Newton steps with a bisection fallback; exact at 0 and 1.
  IP.bezier = function (x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function X(s) { return ((ax * s + bx) * s + cx) * s; }
    function Y(s) { return ((ay * s + by) * s + cy) * s; }
    function dX(s) { return (3 * ax * s + 2 * bx) * s + cx; }
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      var s = p, i, e, d;
      for (i = 0; i < 8; i++) {
        e = X(s) - p;
        if (Math.abs(e) < 1e-7) return Y(s);
        d = dX(s);
        if (Math.abs(d) < 1e-6) break;
        s -= e / d;
      }
      var lo = 0, hi = 1;
      s = p;
      for (i = 0; i < 48; i++) {
        e = X(s) - p;
        if (Math.abs(e) < 1e-7) break;
        if (e < 0) lo = s; else hi = s;
        s = (lo + hi) / 2;
      }
      return Y(s);
    };
  };

  // A dropped-ball bounce: grows as u^pow to full size, then rebounds to 1 - a1, 1 - a1^2, ...
  // Fitted to the reference logo pop (a1 0.154, pow 2.08), which is shallower than bounce.out.
  IP.bounce = function (a1, pow, count) {
    a1 = a1 == null ? 0.154 : a1;
    pow = pow == null ? 2 : pow;
    count = count || 4;
    var heights = [], durs = [1], total = 1, k;
    for (k = 1; k <= count; k++) {
      heights.push(Math.pow(a1, k));
      durs.push(2 * Math.sqrt(heights[k - 1]));
      total += durs[k];
    }
    var edges = [0];
    for (k = 0; k < durs.length; k++) edges.push(edges[k] + durs[k] / total);
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      var i = 0;
      while (p > edges[i + 1]) i++;
      var u = (p - edges[i]) / (edges[i + 1] - edges[i]);
      if (i === 0) return Math.pow(u, pow);
      var w = 2 * u - 1;
      return 1 - heights[i - 1] * (1 - w * w);
    };
  };

  var cache = {};
  // Ease spec: [x1,y1,x2,y2] | "linear" | "hold" | { bounce: [a1, pow] }.
  IP.ease = function (spec) {
    if (typeof spec === "function") return spec;
    var key = JSON.stringify(spec || "linear");
    if (cache[key]) return cache[key];
    var fn;
    if (!spec || spec === "linear") fn = function (p) { return p; };
    else if (spec === "hold") fn = function (p) { return p >= 1 ? 1 : 0; };
    else if (spec.bounce) fn = IP.bounce(spec.bounce[0], spec.bounce[1]);
    else fn = IP.bezier(spec[0], spec[1], spec[2], spec[3]);
    cache[key] = fn;
    return fn;
  };

  // A keyframed channel: keys [{ t, v, e }] in seconds; `e` eases the segment that ends at that key.
  // Before the first key and after the last the value holds.
  IP.channel = function (keys) {
    keys = keys.slice().sort(function (a, b) { return a.t - b.t; });
    var eases = keys.map(function (k) { return IP.ease(k.e); });
    return function (t) {
      if (t <= keys[0].t) return keys[0].v;
      var n = keys.length - 1;
      if (t >= keys[n].t) return keys[n].v;
      var i = 1;
      while (t > keys[i].t) i++;
      var a = keys[i - 1], b = keys[i];
      var p = (t - a.t) / (b.t - a.t);
      return a.v + (b.v - a.v) * eases[i](p);
    };
  };

  // Mirrored exit: the reference duplicates the whole layout, time-reverses it, and cuts to it
  // mid-hold, so after mirror/2 every entrance plays backwards around `mirror`.
  IP.localTime = function (cfg, t, mirrored) {
    if (!mirrored || cfg.mirror == null) return t;
    return t > cfg.mirror / 2 ? cfg.mirror - t : t;
  };

  // Seconds of exposure per frame. 0.5 matches After Effects' default 180 degree shutter.
  IP.exposure = function (cfg) {
    return (cfg.shutter == null ? 0.5 : cfg.shutter) / (cfg.fps || 60);
  };

  function speed(fn, t) {
    var h = 1 / 960;
    return (fn(t + h) - fn(t - h)) / (2 * h);
  }

  var layers = [];
  var config = null;
  var lastT = null;

  IP.mount = function (cfg) {
    config = cfg;
    layers = (cfg.layers || []).map(function (L) {
      var el = document.getElementById(L.id);
      if (!el) throw new Error("IP: missing layer #" + L.id);
      var out = { L: L, el: el, ch: {} };
      ["x", "y", "scale", "opacity", "draw"].forEach(function (name) {
        if (L[name]) out.ch[name] = IP.channel(L[name]);
      });
      if (L.blur) out.blurNode = document.querySelector("#" + L.id + "-mb feGaussianBlur");
      if (L.clipTo) out.clipTo = L.clipTo;
      if (L.draw) {
        out.path = el.tagName.toLowerCase() === "path" ? el : el.querySelector("path");
        out.path.setAttribute("pathLength", "1");
        out.path.style.strokeDasharray = "1 1";
      }
      return out;
    });
    lastT = null;
  };

  IP.render = function (t) {
    if (!config) return;
    if (t === lastT) return;
    lastT = t;
    var exp = IP.exposure(config);
    var state = {};
    layers.forEach(function (o) {
      var L = o.L, ch = o.ch;
      var te = IP.localTime(config, t, L.mirror);
      var x = ch.x ? ch.x(te) : 0;
      var y = ch.y ? ch.y(te) : 0;
      var s = ch.scale ? ch.scale(te) : 1;
      state[L.id] = { x: x, y: y, s: s, draw: 1 };
      var tf = "translate3d(" + x.toFixed(3) + "px," + y.toFixed(3) + "px,0)";
      if (ch.scale) tf += " scale(" + Math.max(s, 0).toFixed(5) + ")";
      o.el.style.transform = tf;
      if (ch.opacity) o.el.style.opacity = String(Math.min(1, Math.max(0, ch.opacity(te))));
      if (ch.draw) {
        var d = Math.min(1, Math.max(0, ch.draw(te)));
        state[L.id].draw = d;
        o.path.style.strokeDashoffset = String(1 - d);
        o.path.style.visibility = d < 0.001 ? "hidden" : "visible";
      }
      if (o.blurNode) {
        // Motion blur: a moving edge smears over speed * exposure px; a Gaussian with the same
        // variance as that box has sigma = 0.29 * length.
        var k = 0.29 * exp * (L.blur.amount == null ? 1 : L.blur.amount);
        var sx = 0, sy = 0;
        if (ch.x) sx += Math.abs(speed(ch.x, te)) * k;
        if (ch.y) sy += Math.abs(speed(ch.y, te)) * k;
        if (ch.scale) {
          var grow = Math.abs(speed(ch.scale, te)) * k;
          sx += grow * (L.blur.w || 0) / 2;
          sy += grow * (L.blur.h || 0) / 2;
        }
        sx = Math.min(sx, 60);
        sy = Math.min(sy, 60);
        if (sx < 0.08 && sy < 0.08) o.el.style.filter = "none";
        else {
          o.blurNode.setAttribute("stdDeviation", sx.toFixed(2) + " " + sy.toFixed(2));
          o.el.style.filter = "url(#" + L.id + "-mb)";
        }
      }
    });
    // A revealed layer (the white price) only shows where the highlight stroke has been drawn.
    layers.forEach(function (o) {
      var r = o.L.revealBy;
      if (!r) return;
      var d = state[r.layer] ? state[r.layer].draw : 1;
      var right = d < 0.001 ? r.a : r.b0 + d * r.span;
      o.el.style.clipPath = "polygon(" + r.a.toFixed(2) + "px -400px, " + right.toFixed(2) + "px -400px, " +
        right.toFixed(2) + "px 9999px, " + r.a.toFixed(2) + "px 9999px)";
    });
    // A clipped layer (the wordmark) only shows to the right of a moving edge (the mark's centre).
    layers.forEach(function (o) {
      if (!o.clipTo) return;
      var src = state[o.clipTo.layer] || { x: 0 };
      var cut = Math.max(0, o.clipTo.edge + src.x - (o.L.left || 0) - state[o.L.id].x).toFixed(2);
      o.el.style.clipPath = "polygon(" + cut + "px -400px, 9999px -400px, 9999px 9999px, " + cut + "px 9999px)";
    });
  };

  window.IP = IP;
})();
