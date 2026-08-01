/* STREET YEET — fx.js
   Particles, shockwaves, comic bursts, craters, floating text, screen shake. */
(function (root) {
  'use strict';
  var THREE = root.THREE;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  /* ---------- canvas sprite helpers ---------- */

  function textTexture(txt, opts) {
    opts = opts || {};
    var size = opts.size || 128;
    var pad = 24;
    var c = document.createElement('canvas');
    var g = c.getContext('2d');
    g.font = '900 ' + size + 'px "Arial Black", Impact, sans-serif';
    var w = Math.ceil(g.measureText(txt).width) + pad * 2;
    c.width = Math.max(8, w); c.height = size * 1.6;
    g = c.getContext('2d');
    g.font = '900 ' + size + 'px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var x = c.width / 2, y = c.height / 2;

    if (opts.glow) {
      g.shadowColor = opts.glow; g.shadowBlur = size * 0.5;
    }
    g.lineWidth = size * 0.17; g.strokeStyle = opts.stroke || '#120f1a';
    g.lineJoin = 'round';
    g.strokeText(txt, x, y);
    g.shadowBlur = 0;
    if (opts.grad) {
      var lg = g.createLinearGradient(0, y - size * 0.6, 0, y + size * 0.6);
      lg.addColorStop(0, opts.grad[0]); lg.addColorStop(1, opts.grad[1]);
      g.fillStyle = lg;
    } else g.fillStyle = opts.fill || '#ffd23f';
    g.fillText(txt, x, y);

    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return { tex: t, aspect: c.width / c.height };
  }

  // comic starburst: POW / WHAM / SPLAT
  function burstTexture(word) {
    var S = 512;
    var c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d');
    var cx = S / 2, cy = S / 2, spikes = 13;
    g.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      var r = i % 2 ? S * 0.27 : S * 0.47 * rnd(0.88, 1);
      var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath();
    var rg = g.createRadialGradient(cx, cy, 20, cx, cy, S * 0.47);
    rg.addColorStop(0, '#fff6c9'); rg.addColorStop(.55, '#ffd23f'); rg.addColorStop(1, '#ff8a1f');
    g.fillStyle = rg; g.fill();
    g.lineWidth = 14; g.strokeStyle = '#120f1a'; g.stroke();

    g.save();
    g.translate(cx, cy); g.rotate(-0.12);
    g.font = '900 ' + (word.length > 5 ? 84 : 108) + 'px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 16; g.strokeStyle = '#120f1a'; g.lineJoin = 'round';
    g.strokeText(word, 0, 0);
    g.fillStyle = '#ff3b6b'; g.fillText(word, 0, 0);
    g.restore();
    return new THREE.CanvasTexture(c);
  }

  function ringTexture() {
    var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d');
    var rg = g.createRadialGradient(S / 2, S / 2, S * 0.30, S / 2, S / 2, S * 0.5);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(.55, 'rgba(255,255,255,.95)');
    rg.addColorStop(.8, 'rgba(255,210,63,.55)');
    rg.addColorStop(1, 'rgba(255,210,63,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }

  function puffTexture() {
    var S = 128, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d');
    var rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, 'rgba(255,255,255,.9)');
    rg.addColorStop(.45, 'rgba(228,222,235,.5)');
    rg.addColorStop(1, 'rgba(228,222,235,0)');
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    return new THREE.CanvasTexture(c);
  }

  function craterTexture() {
    var S = 256, c = document.createElement('canvas'); c.width = c.height = S;
    var g = c.getContext('2d');
    g.translate(S / 2, S / 2);
    // dark splat blob
    g.beginPath();
    for (var i = 0; i <= 34; i++) {
      var a = i / 34 * Math.PI * 2;
      var r = S * 0.34 * (0.72 + Math.sin(a * 3.1) * 0.11 + Math.sin(a * 5.7) * 0.08);
      i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    var rg = g.createRadialGradient(0, 0, 4, 0, 0, S * 0.36);
    rg.addColorStop(0, 'rgba(12,10,18,.85)');
    rg.addColorStop(.7, 'rgba(20,17,28,.5)');
    rg.addColorStop(1, 'rgba(20,17,28,0)');
    g.fillStyle = rg; g.fill();
    // radiating cracks
    g.strokeStyle = 'rgba(10,8,14,.6)'; g.lineWidth = 3;
    for (var k = 0; k < 9; k++) {
      var aa = rnd(0, Math.PI * 2), len = rnd(S * .18, S * .44);
      g.beginPath(); g.moveTo(0, 0);
      g.lineTo(Math.cos(aa) * len, Math.sin(aa) * len);
      g.stroke();
    }
    return new THREE.CanvasTexture(c);
  }

  /* ---------- main FX system ---------- */

  function create(scene, camera) {
    var texRing = ringTexture(), texPuff = puffTexture(), texCrater = craterTexture();
    var burstCache = {};
    var WORDS = ['POW', 'WHAM', 'BONK', 'SPLAT', 'KRAK', 'THWACK', 'BOOM', 'YEET'];

    // --- shard particles (pooled boxes) ---
    var SHARDS = 220, shards = [], shardPool = [];
    var shardGeo = new THREE.BoxGeometry(1, 1, 1);
    for (var i = 0; i < SHARDS; i++) {
      var m = new THREE.Mesh(shardGeo, new THREE.MeshLambertMaterial({
        color: 0xffffff, flatShading: true, transparent: true
      }));
      m.visible = false; m.frustumCulled = false;
      scene.add(m); shardPool.push(m);
    }

    // --- sprite pool (puffs / rings / bursts / text) ---
    var SPR = 150, sprites = [], sprPool = [];
    for (var j = 0; j < SPR; j++) {
      var s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texPuff, transparent: true, depthWrite: false
      }));
      s.visible = false; s.frustumCulled = false;
      scene.add(s); sprPool.push(s);
    }

    // --- ground decals ---
    var DEC = 26, decals = [], decIdx = 0;
    var decGeo = new THREE.PlaneGeometry(1, 1);
    for (var d = 0; d < DEC; d++) {
      var dm = new THREE.Mesh(decGeo, new THREE.MeshBasicMaterial({
        map: texCrater, transparent: true, depthWrite: false, opacity: 0
      }));
      dm.rotation.x = -Math.PI / 2;
      dm.visible = false;
      scene.add(dm); decals.push(dm);
    }

    var shake = { t: 0, mag: 0 }, freeze = 0;

    function getShard() {
      var m = shardPool.pop();
      if (!m) { // recycle oldest
        var old = shards.shift();
        if (!old) return null;
        m = old.m;
      }
      return m;
    }
    function getSprite() {
      var s = sprPool.pop();
      if (!s) { var old = sprites.shift(); if (!old) return null; s = old.s; }
      return s;
    }

    /* ---- emitters ---- */

    function shardsBurst(pos, opt) {
      opt = opt || {};
      var n = opt.count || 14;
      var colors = opt.colors || [0xffd23f, 0xff8a1f, 0xffffff];
      for (var i = 0; i < n; i++) {
        var m = getShard(); if (!m) return;
        m.visible = true;
        m.position.copy(pos);
        m.material.color.setHex(pick(colors));
        m.material.opacity = 1;
        var sc = rnd(0.09, 0.3) * (opt.scale || 1);
        m.scale.set(sc, sc * rnd(.6, 1.5), sc);
        var sp = opt.speed || 9;
        shards.push({
          m: m,
          v: new THREE.Vector3(rnd(-1, 1), rnd(0.2, 1.5), rnd(-1, 1))
            .normalize().multiplyScalar(rnd(sp * .35, sp)),
          av: new THREE.Vector3(rnd(-14, 14), rnd(-14, 14), rnd(-14, 14)),
          life: 0, max: opt.life || rnd(0.7, 1.6),
          g: opt.gravity == null ? 26 : opt.gravity,
          bounce: opt.bounce !== false
        });
      }
    }

    function puff(pos, opt) {
      opt = opt || {};
      var n = opt.count || 5;
      for (var i = 0; i < n; i++) {
        var s = getSprite(); if (!s) return;
        s.visible = true;
        s.material.map = texPuff;
        s.material.color.setHex(opt.color == null ? 0xdad3e6 : opt.color);
        s.material.opacity = opt.opacity || 0.6;
        s.material.rotation = rnd(0, 6.28);
        s.position.copy(pos).add(new THREE.Vector3(rnd(-.4, .4), rnd(-.2, .5), rnd(-.4, .4)));
        var s0 = (opt.size || 1.4) * rnd(.7, 1.3);
        s.scale.set(s0, s0, 1);
        sprites.push({
          s: s, kind: 'puff', life: 0, max: opt.life || rnd(.5, 1.1),
          v: new THREE.Vector3(rnd(-1, 1), rnd(.4, 1.8), rnd(-1, 1))
            .multiplyScalar(opt.speed || 1.6),
          grow: opt.grow || 2.6, o0: opt.opacity || 0.6
        });
      }
    }

    function shockwave(pos, opt) {
      opt = opt || {};
      var s = getSprite(); if (!s) return;
      s.visible = true;
      s.material.map = texRing;
      s.material.color.setHex(opt.color == null ? 0xffffff : opt.color);
      s.material.opacity = 0.95;
      s.material.rotation = 0;
      s.position.copy(pos);
      s.scale.set(1, 1, 1);
      sprites.push({
        s: s, kind: 'ring', life: 0, max: opt.life || 0.55,
        from: opt.from || 1, to: opt.to || 14, o0: 0.95,
        v: new THREE.Vector3(0, opt.rise || 0.6, 0)
      });
    }

    function comicBurst(pos, word) {
      word = word || pick(WORDS);
      if (!burstCache[word]) burstCache[word] = burstTexture(word);
      var s = getSprite(); if (!s) return;
      s.visible = true;
      s.material.map = burstCache[word];
      s.material.color.setHex(0xffffff);
      s.material.opacity = 1;
      s.material.rotation = rnd(-.25, .25);
      s.position.copy(pos);
      s.scale.set(0.4, 0.4, 1);
      sprites.push({
        s: s, kind: 'burst', life: 0, max: 0.72, o0: 1,
        peak: rnd(6.5, 8.5), v: new THREE.Vector3(0, 2.2, 0)
      });
    }

    function floatText(pos, txt, opt) {
      opt = opt || {};
      var t = textTexture(txt, {
        size: 96,
        fill: opt.fill || '#ffd23f',
        grad: opt.grad || ['#fff7cf', '#ffb020'],
        glow: opt.glow || 'rgba(255,210,63,.9)'
      });
      var s = getSprite(); if (!s) return;
      s.visible = true;
      s.material.map = t.tex;
      s.material.color.setHex(0xffffff);
      s.material.opacity = 1;
      s.material.rotation = 0;
      s.position.copy(pos);
      var h = opt.size || 2.4;
      s.scale.set(h * t.aspect, h, 1);
      sprites.push({
        s: s, kind: 'text', life: 0, max: opt.life || 1.7, o0: 1,
        v: new THREE.Vector3(0, opt.rise == null ? 3.4 : opt.rise, 0),
        h: h, aspect: t.aspect, own: t.tex, pop: opt.pop !== false
      });
    }

    function crater(pos, size) {
      var m = decals[decIdx % DEC]; decIdx++;
      m.visible = true;
      m.position.set(pos.x, 0.03, pos.z);
      m.rotation.z = rnd(0, 6.28);
      var s = size || 4;
      m.scale.set(s, s, 1);
      m.material.opacity = 0.9;
      m.userData.fade = 0;
    }

    function trail(pos, color) {
      var s = getSprite(); if (!s) return;
      s.visible = true;
      s.material.map = texPuff;
      s.material.color.setHex(color == null ? 0xffffff : color);
      s.material.opacity = 0.5;
      s.position.copy(pos);
      s.scale.set(1, 1, 1);
      sprites.push({
        s: s, kind: 'puff', life: 0, max: 0.5, o0: 0.5,
        v: new THREE.Vector3(0, .5, 0), grow: 2.2
      });
    }

    function addShake(mag, dur) {
      shake.mag = Math.max(shake.mag, mag);
      shake.t = Math.max(shake.t, dur || 0.35);
    }

    function flash(strength, ms) {
      var el = document.getElementById('flash');
      if (!el) return;
      el.style.transition = 'none';
      el.style.opacity = String(Math.min(strength == null ? 0.8 : strength, 1));
      requestAnimationFrame(function () {
        el.style.transition = 'opacity ' + (ms || 220) + 'ms ease-out';
        el.style.opacity = '0';
      });
    }

    /* ---- update ---- */

    function update(dt) {
      // shards
      for (var i = shards.length - 1; i >= 0; i--) {
        var p = shards[i];
        p.life += dt;
        if (p.life >= p.max) {
          p.m.visible = false; shardPool.push(p.m); shards.splice(i, 1); continue;
        }
        p.v.y -= p.g * dt;
        p.m.position.addScaledVector(p.v, dt);
        if (p.bounce && p.m.position.y < 0.06) {
          p.m.position.y = 0.06;
          p.v.y *= -0.42; p.v.x *= 0.7; p.v.z *= 0.7;
          if (Math.abs(p.v.y) < 0.6) p.v.set(0, 0, 0);
        }
        p.m.rotation.x += p.av.x * dt;
        p.m.rotation.y += p.av.y * dt;
        p.m.rotation.z += p.av.z * dt;
        var k = 1 - p.life / p.max;
        p.m.material.opacity = k < 0.35 ? k / 0.35 : 1;
      }

      // sprites
      for (var j = sprites.length - 1; j >= 0; j--) {
        var q = sprites[j], u = q.life / q.max;
        q.life += dt;
        if (q.life >= q.max) {
          q.s.visible = false;
          if (q.own) q.own.dispose();
          sprPool.push(q.s); sprites.splice(j, 1); continue;
        }
        if (q.v) q.s.position.addScaledVector(q.v, dt);
        if (q.kind === 'puff') {
          q.v.multiplyScalar(1 - 1.6 * dt);
          var g0 = 1 + u * q.grow;
          q.s.scale.set(g0, g0, 1);
          q.s.material.opacity = q.o0 * (1 - u);
        } else if (q.kind === 'ring') {
          var e = 1 - Math.pow(1 - u, 2.2);
          var r = q.from + (q.to - q.from) * e;
          q.s.scale.set(r, r, 1);
          q.s.material.opacity = q.o0 * (1 - u) * (1 - u);
        } else if (q.kind === 'burst') {
          // overshoot pop
          var sc = u < .28 ? q.peak * (u / .28) * 1.18
                 : q.peak * (1.18 - .18 * Math.min(1, (u - .28) / .22));
          q.s.scale.set(sc, sc, 1);
          q.s.material.opacity = u > .6 ? (1 - u) / .4 : 1;
          q.v.multiplyScalar(1 - 2 * dt);
        } else if (q.kind === 'text') {
          var ss = q.pop
            ? (u < .18 ? q.h * (0.4 + 1.0 * (u / .18)) : q.h * (1.4 - .4 * Math.min(1, (u - .18) / .2)))
            : q.h;
          q.s.scale.set(ss * q.aspect, ss, 1);
          q.s.material.opacity = u > .62 ? (1 - u) / .38 : 1;
          q.v.y *= (1 - 0.9 * dt);
        }
      }

      // decals slowly fade
      for (var d2 = 0; d2 < DEC; d2++) {
        var dm2 = decals[d2];
        if (!dm2.visible) continue;
        dm2.material.opacity -= dt * 0.012;
        if (dm2.material.opacity <= 0) dm2.visible = false;
      }

      // shake decay
      if (shake.t > 0) {
        shake.t -= dt;
        if (shake.t <= 0) { shake.t = 0; shake.mag = 0; }
        else shake.mag *= Math.pow(0.02, dt);
      }
    }

    function shakeOffset() {
      if (shake.t <= 0) return null;
      var m = shake.mag;
      return new THREE.Vector3(rnd(-m, m), rnd(-m, m) * 0.7, rnd(-m, m));
    }

    return {
      shards: shardsBurst, puff: puff, shockwave: shockwave, comicBurst: comicBurst,
      floatText: floatText, crater: crater, trail: trail,
      addShake: addShake, shakeOffset: shakeOffset, flash: flash,
      update: update, WORDS: WORDS, textTexture: textTexture
    };
  }

  root.SY = root.SY || {};
  root.SY.fx = { create: create, textTexture: textTexture };
})(window);
