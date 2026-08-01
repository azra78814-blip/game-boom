/* STREET YEET — actors.js
   Character rigs: the player (and their absurd fist), pedestrians, dogs, pigeons. */
(function (root) {
  'use strict';
  var THREE = root.THREE;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function damp(cur, tgt, dt, rate) { return cur + (tgt - cur) * Math.min(1, dt * rate); }

  var SKIN = [0xf2c9a0, 0xe0a878, 0xc78b5c, 0x8d5a3b, 0x6b4229, 0xf7d9b8];
  var SHIRT = [0xff3b6b, 0x3fd0ff, 0x5ef38c, 0xffd23f, 0xf0e6d2, 0x8d5fd8,
               0xff8a1f, 0x3f6fd8, 0xd8264f, 0x2fb08a];
  var PANTS = [0x3a4a6b, 0x2c2a38, 0x6b4a35, 0x4b4756, 0x8d8798, 0x25405c];
  var HAIR = [0x2b2118, 0x4a3323, 0x8a6b3a, 0xd8b46a, 0xb03a2a, 0x1a1a20, 0x9a9aa8];

  var BG = new THREE.BoxGeometry(1, 1, 1);
  function mat(c, o) {
    o = o || {};
    return new THREE.MeshLambertMaterial({
      color: c, flatShading: true,
      emissive: o.emissive || 0x000000,
      emissiveIntensity: o.ei == null ? 1 : o.ei
    });
  }
  function part(w, h, d, c, x, y, z, o) {
    var m = new THREE.Mesh(BG, mat(c, o));
    m.scale.set(w, h, d);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function limb(px, py, pz) {
    var g = new THREE.Group();
    g.position.set(px, py, pz);
    return g;
  }

  /* ==================== PLAYER ==================== */

  function makePlayer() {
    var root_ = new THREE.Group();          // world transform (position + facing)
    var body = new THREE.Group();           // bob / lean / twist
    root_.add(body);

    var skin = 0xe8b384, shirt = 0xff3b6b, pants = 0x2c3550;

    // legs
    var hipL = limb(-0.19, 0.82, 0), hipR = limb(0.19, 0.82, 0);
    hipL.add(part(0.3, 0.86, 0.3, pants, 0, -0.43, 0));
    hipR.add(part(0.3, 0.86, 0.3, pants, 0, -0.43, 0));
    hipL.add(part(0.34, 0.16, 0.46, 0x2b2118, 0, -0.9, 0.06));
    hipR.add(part(0.34, 0.16, 0.46, 0x2b2118, 0, -0.9, 0.06));
    body.add(hipL); body.add(hipR);

    // torso + head
    var torso = new THREE.Group();
    torso.position.y = 0.82;
    torso.add(part(0.74, 0.8, 0.44, shirt, 0, 0.4, 0));
    torso.add(part(0.78, 0.16, 0.48, 0xffffff, 0, 0.08, 0));   // belt hem
    body.add(torso);

    var head = new THREE.Group();
    head.position.y = 0.92;
    head.add(part(0.5, 0.5, 0.48, skin, 0, 0.25, 0));
    head.add(part(0.54, 0.16, 0.52, 0x2b2118, 0, 0.46, 0));    // hair
    head.add(part(0.1, 0.1, 0.04, 0x1a1a20, -0.12, 0.28, 0.25));
    head.add(part(0.1, 0.1, 0.04, 0x1a1a20, 0.12, 0.28, 0.25));
    head.add(part(0.2, 0.05, 0.04, 0x8a3b3b, 0, 0.13, 0.25));  // mouth
    torso.add(head);

    // left arm (the normal one)
    var shL = limb(-0.48, 0.62, 0);
    shL.add(part(0.22, 0.62, 0.22, shirt, 0, -0.31, 0));
    shL.add(part(0.24, 0.26, 0.24, skin, 0, -0.72, 0));
    torso.add(shL);

    // RIGHT ARM — the instrument
    var shR = limb(0.48, 0.62, 0);
    var upper = part(0.3, 0.6, 0.3, shirt, 0, -0.3, 0);
    shR.add(upper);
    var fore = part(0.4, 0.5, 0.4, skin, 0, -0.78, 0);
    shR.add(fore);

    var fistGrp = new THREE.Group();
    fistGrp.position.y = -1.3;
    var FIST = 1.05;
    var fistMat = mat(skin, { emissive: 0xff3b6b, ei: 0 });
    var fist = new THREE.Mesh(BG, fistMat);
    fist.scale.set(FIST, FIST * 0.92, FIST);
    fist.castShadow = true;
    fistGrp.add(fist);
    // knuckles
    for (var k = 0; k < 4; k++) {
      var kn = new THREE.Mesh(BG, fistMat);
      kn.scale.set(FIST * 0.2, FIST * 0.2, FIST * 0.2);
      kn.position.set(-FIST * 0.3 + k * (FIST * 0.2), FIST * 0.3, FIST * 0.5);
      kn.castShadow = true;
      fistGrp.add(kn);
    }
    var thumb = new THREE.Mesh(BG, fistMat);
    thumb.scale.set(FIST * 0.26, FIST * 0.4, FIST * 0.3);
    thumb.position.set(-FIST * 0.55, 0, FIST * 0.18);
    fistGrp.add(thumb);
    // glove band
    var band = part(FIST * 1.08, FIST * 0.16, FIST * 1.08, 0xffd23f, 0, FIST * 0.52, 0);
    fistGrp.add(band);

    // charge aura
    var aura = new THREE.Mesh(
      new THREE.IcosahedronGeometry(FIST * 1.1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffd23f, transparent: true, opacity: 0, wireframe: true
      })
    );
    fistGrp.add(aura);

    shR.add(fistGrp);
    torso.add(shR);

    var self = {
      obj: root_, body: body, torso: torso, head: head,
      hipL: hipL, hipR: hipR, shL: shL, shR: shR,
      fistGrp: fistGrp, fist: fist, aura: aura, fistMat: fistMat,
      FIST: FIST, phase: 0, height: 1.9
    };

    var _v = new THREE.Vector3();
    self.getFistWorld = function () {
      fistGrp.updateWorldMatrix(true, false);
      return _v.setFromMatrixPosition(fistGrp.matrixWorld).clone();
    };

    self.update = function (dt, st) {
      var sp = st.speed || 0;
      var moving = sp > 0.3;
      self.phase += dt * (moving ? 4.2 + sp * 1.15 : 2.2);
      var ph = self.phase;

      // legs
      var swing = moving ? Math.min(1, sp / 7) : 0;
      var legA = Math.sin(ph) * (0.15 + swing * 0.95);
      hipL.rotation.x = legA;
      hipR.rotation.x = -legA;
      var lift = moving ? Math.max(0, Math.sin(ph * 2)) * swing * 0.1 : 0;

      // body bob + lean
      var bob = moving ? Math.abs(Math.sin(ph)) * (0.03 + swing * 0.1) : Math.sin(ph) * 0.014;
      body.position.y = bob + lift + (st.airY || 0);
      body.rotation.z = moving ? Math.sin(ph) * 0.045 : 0;
      torso.rotation.x = damp(torso.rotation.x, moving ? -0.06 - swing * 0.16 : 0.02, dt, 8);
      head.rotation.x = damp(head.rotation.x, (st.lookPitch || 0) * 0.35, dt, 9);

      // left arm counter-swings
      shL.rotation.x = -legA * 0.85;
      shL.rotation.z = damp(shL.rotation.z, moving ? -0.14 : -0.08, dt, 7);

      // ---- right arm state machine ----
      var chg = st.charge || 0;
      var swingPh = st.swingPhase;
      var tw = 0;

      if (swingPh != null && swingPh >= 0) {
        // 0 -> 1 : whip through the arc
        var e = swingPh;
        if (e < 0.18) {                      // last-moment coil
          var a1 = e / 0.18;
          shR.rotation.x = -2.5 - a1 * 0.5;
          shR.rotation.z = -0.5 - a1 * 0.3;
          tw = 0.7 + a1 * 0.35;
        } else {                             // SWING
          var a2 = (e - 0.18) / 0.82;
          var ease = a2 < 0.5 ? 4 * a2 * a2 * a2 : 1 - Math.pow(-2 * a2 + 2, 2) / 2;
          shR.rotation.x = -3.0 + ease * 4.6;
          shR.rotation.z = -0.8 + ease * 1.5;
          shR.rotation.y = ease * 0.5;
          tw = 1.05 - ease * 2.1;
        }
        var big = 1 + (st.lastPower || 0.5) * 0.5;
        fistGrp.scale.setScalar(big);
        aura.material.opacity = Math.max(0, 0.5 - swingPh);
        fistMat.emissiveIntensity = Math.max(0, 0.8 - swingPh * 1.6);
      } else if (st.charging) {
        var c = chg;
        shR.rotation.x = damp(shR.rotation.x, -0.4 - c * 2.2, dt, 12);
        shR.rotation.z = damp(shR.rotation.z, 0.2 - c * 0.9, dt, 12);
        shR.rotation.y = damp(shR.rotation.y, -c * 0.35, dt, 12);
        tw = c * 0.85;
        var pulse = 1 + Math.sin(st.time * (14 + c * 26)) * 0.05 * c;
        fistGrp.scale.setScalar((1 + c * 0.85) * pulse);
        aura.material.opacity = c * 0.55 * (0.6 + Math.sin(st.time * 20) * 0.4);
        aura.rotation.y += dt * (2 + c * 9);
        aura.rotation.x += dt * (1.4 + c * 5);
        fistMat.emissiveIntensity = c * 0.9;
        fistMat.emissive.setHex(c > 0.98 ? 0xffffff : c > 0.6 ? 0xff3b6b : 0xffd23f);
      } else if (st.taunt) {
        shR.rotation.x = damp(shR.rotation.x, -2.9, dt, 10);
        shR.rotation.z = damp(shR.rotation.z, 0.35, dt, 10);
        fistGrp.rotation.y += dt * 9;
        fistGrp.scale.setScalar(damp(fistGrp.scale.x, 1.15, dt, 8));
        aura.material.opacity = damp(aura.material.opacity, 0.25, dt, 8);
        fistMat.emissiveIntensity = damp(fistMat.emissiveIntensity, 0.3, dt, 8);
      } else {
        // idle: heavy arm sags, fist flexes
        shR.rotation.x = damp(shR.rotation.x, -legA * 0.5 + Math.sin(ph * 0.8) * 0.05, dt, 7);
        shR.rotation.z = damp(shR.rotation.z, 0.26 + Math.sin(ph * 0.6) * 0.03, dt, 7);
        shR.rotation.y = damp(shR.rotation.y, 0, dt, 7);
        fistGrp.rotation.y = damp(fistGrp.rotation.y, 0, dt, 6);
        var flex = 1 + Math.sin(st.time * 1.7) * 0.03;
        fistGrp.scale.setScalar(damp(fistGrp.scale.x, flex, dt, 7));
        aura.material.opacity = damp(aura.material.opacity, 0, dt, 9);
        fistMat.emissiveIntensity = damp(fistMat.emissiveIntensity, 0, dt, 9);
      }

      body.rotation.y = damp(body.rotation.y, tw, dt, swingPh >= 0 ? 26 : 10);
    };

    return self;
  }

  /* ==================== PEDESTRIAN ==================== */

  var KINDS = ['walker', 'suit', 'skater', 'tourist', 'jogger', 'kid'];

  function makeNPC(kind) {
    kind = kind || pick(KINDS);
    var root_ = new THREE.Group();
    var body = new THREE.Group();
    root_.add(body);

    var skin = pick(SKIN), hair = pick(HAIR);
    var shirt = kind === 'suit' ? pick([0x2c2a38, 0x3a4a6b, 0x4b4756])
              : kind === 'jogger' ? pick([0x5ef38c, 0xffd23f, 0xff8a1f])
              : pick(SHIRT);
    var pants = kind === 'suit' ? 0x2c2a38 : kind === 'jogger' ? 0x2c2a38 : pick(PANTS);
    var scale = kind === 'kid' ? 0.66 : rnd(0.93, 1.07);

    var hipL = limb(-0.15, 0.7, 0), hipR = limb(0.15, 0.7, 0);
    hipL.add(part(0.24, 0.72, 0.24, pants, 0, -0.36, 0));
    hipR.add(part(0.24, 0.72, 0.24, pants, 0, -0.36, 0));
    hipL.add(part(0.26, 0.14, 0.38, 0x2b2118, 0, -0.76, 0.05));
    hipR.add(part(0.26, 0.14, 0.38, 0x2b2118, 0, -0.76, 0.05));
    body.add(hipL); body.add(hipR);

    var torso = new THREE.Group();
    torso.position.y = 0.7;
    torso.add(part(0.6, 0.7, 0.36, shirt, 0, 0.35, 0));
    if (kind === 'suit') {
      torso.add(part(0.1, 0.4, 0.04, 0xd8264f, 0, 0.4, 0.19));   // tie
      torso.add(part(0.62, 0.12, 0.38, 0xf0e6d2, 0, 0.62, 0));   // collar
    }
    body.add(torso);

    var head = new THREE.Group();
    head.position.y = 0.78;
    head.add(part(0.42, 0.42, 0.4, skin, 0, 0.21, 0));
    head.add(part(0.08, 0.08, 0.04, 0x1a1a20, -0.1, 0.24, 0.21));
    head.add(part(0.08, 0.08, 0.04, 0x1a1a20, 0.1, 0.24, 0.21));
    var hatRoll = Math.random();
    if (kind === 'tourist' || hatRoll < 0.22) {
      head.add(part(0.5, 0.12, 0.5, pick(SHIRT), 0, 0.44, 0));   // cap crown
      head.add(part(0.3, 0.07, 0.28, 0x1a1a20, 0, 0.4, 0.28));   // brim
    } else {
      head.add(part(0.46, 0.14, 0.44, hair, 0, 0.4, 0));
      if (hatRoll > 0.8) head.add(part(0.16, 0.2, 0.1, hair, 0, 0.1, -0.22)); // ponytail
    }
    torso.add(head);

    var shL = limb(-0.38, 0.55, 0), shR = limb(0.38, 0.55, 0);
    shL.add(part(0.18, 0.54, 0.18, shirt, 0, -0.27, 0));
    shL.add(part(0.19, 0.19, 0.19, skin, 0, -0.62, 0));
    shR.add(part(0.18, 0.54, 0.18, shirt, 0, -0.27, 0));
    shR.add(part(0.19, 0.19, 0.19, skin, 0, -0.62, 0));
    torso.add(shL); torso.add(shR);

    // props by kind
    var extra = null;
    if (kind === 'suit') {
      extra = part(0.34, 0.28, 0.1, 0x6b4a35, 0, -0.78, 0.02);
      shR.add(extra);
    } else if (kind === 'tourist') {
      extra = part(0.22, 0.16, 0.1, 0x1a1a20, 0, 0.36, 0.22);
      torso.add(extra);
    } else if (kind === 'skater') {
      extra = new THREE.Group();
      extra.add(part(0.9, 0.07, 0.3, pick([0xff3b6b, 0x3fd0ff, 0x5ef38c]), 0, 0, 0));
      [-0.3, 0.3].forEach(function (wx) {
        [-0.12, 0.12].forEach(function (wz) {
          extra.add(part(0.1, 0.1, 0.1, 0xffd23f, wx, -0.08, wz));
        });
      });
      extra.position.set(0, 0.09, 0);
      root_.add(extra);
    }

    var self = {
      obj: root_, body: body, torso: torso, head: head, kind: kind,
      hipL: hipL, hipR: hipR, shL: shL, shR: shR, extra: extra,
      phase: rnd(0, 6.28), scale: scale, height: 1.7 * scale,
      colors: [shirt, pants, skin, hair]
    };
    root_.scale.setScalar(scale);

    self.update = function (dt, st) {
      var mode = st.mode, sp = st.speed || 0;
      self.phase += dt * (mode === 'flee' ? 13 : mode === 'walk' ? 6.5 + sp : 2.4);
      var ph = self.phase;

      if (mode === 'fly') {
        // full flail
        hipL.rotation.x = Math.sin(ph * 2.6) * 1.5;
        hipR.rotation.x = Math.cos(ph * 2.9) * 1.5;
        hipL.rotation.z = Math.sin(ph * 1.7) * 0.5;
        hipR.rotation.z = -Math.sin(ph * 1.9) * 0.5;
        shL.rotation.x = Math.sin(ph * 3.4) * 2.6 - 1.2;
        shR.rotation.x = Math.cos(ph * 3.1) * 2.6 - 1.2;
        shL.rotation.z = -1.2 - Math.sin(ph * 2.2) * 0.7;
        shR.rotation.z = 1.2 + Math.sin(ph * 2.4) * 0.7;
        head.rotation.z = Math.sin(ph * 2) * 0.4;
        head.rotation.x = -0.3;
        torso.rotation.x = Math.sin(ph * 1.3) * 0.3;
        body.position.y = 0;
        return;
      }
      if (mode === 'down') {
        // faceplanted
        body.position.y = damp(body.position.y, -0.55, dt, 6);
        hipL.rotation.x = damp(hipL.rotation.x, 0.3, dt, 5);
        hipR.rotation.x = damp(hipR.rotation.x, -0.2, dt, 5);
        shL.rotation.x = damp(shL.rotation.x, -2.4, dt, 5);
        shR.rotation.x = damp(shR.rotation.x, -2.1, dt, 5);
        shL.rotation.z = damp(shL.rotation.z, -1.4, dt, 5);
        shR.rotation.z = damp(shR.rotation.z, 1.4, dt, 5);
        torso.rotation.x = damp(torso.rotation.x, 0.2, dt, 5);
        return;
      }

      var moving = sp > 0.25;
      var amp = mode === 'flee' ? 1.25 : Math.min(1, sp / 4);
      var legA = moving ? Math.sin(ph) * (0.2 + amp * 0.85) : Math.sin(ph * 0.5) * 0.03;

      if (kind === 'skater' && moving) {
        hipL.rotation.x = -0.15; hipR.rotation.x = 0.2;
        body.rotation.z = damp(body.rotation.z, -0.1, dt, 5);
        body.position.y = 0.1;
        if (self.extra) self.extra.rotation.y = 0;
      } else {
        hipL.rotation.x = legA; hipR.rotation.x = -legA;
        body.position.y = moving ? Math.abs(Math.sin(ph)) * (0.02 + amp * 0.09) : 0;
        body.rotation.z = moving ? Math.sin(ph) * 0.04 : 0;
      }
      hipL.rotation.z = damp(hipL.rotation.z, 0, dt, 6);
      hipR.rotation.z = damp(hipR.rotation.z, 0, dt, 6);

      if (mode === 'flee') {
        // arms straight up, panic
        shL.rotation.x = damp(shL.rotation.x, -2.9 + Math.sin(ph * 1.6) * 0.3, dt, 14);
        shR.rotation.x = damp(shR.rotation.x, -2.9 + Math.cos(ph * 1.6) * 0.3, dt, 14);
        shL.rotation.z = damp(shL.rotation.z, -0.4, dt, 12);
        shR.rotation.z = damp(shR.rotation.z, 0.4, dt, 12);
        head.rotation.z = Math.sin(ph * 1.3) * 0.22;
        torso.rotation.x = damp(torso.rotation.x, -0.12, dt, 8);
      } else {
        var armA = kind === 'skater' && moving ? Math.sin(ph * 0.5) * 0.3 : -legA * 0.9;
        shL.rotation.x = damp(shL.rotation.x, armA, dt, 12);
        shR.rotation.x = damp(shR.rotation.x, kind === 'suit' ? -0.35 : -armA, dt, 12);
        shL.rotation.z = damp(shL.rotation.z, -0.1, dt, 8);
        shR.rotation.z = damp(shR.rotation.z, 0.1, dt, 8);
        head.rotation.z = damp(head.rotation.z, 0, dt, 6);
        head.rotation.y = mode === 'idle' ? Math.sin(st.time * 0.7 + self.phase) * 0.5 : 0;
        torso.rotation.x = damp(torso.rotation.x, moving ? -0.07 : 0, dt, 8);
      }
      head.rotation.x = damp(head.rotation.x, 0, dt, 6);
    };

    return self;
  }

  /* ==================== DOG ==================== */

  function makeDog() {
    var root_ = new THREE.Group();
    var body = new THREE.Group();
    root_.add(body);
    var col = pick([0xd8b46a, 0x8a6b3a, 0x4a3323, 0x2b2118, 0xf0e6d2, 0x9a9aa8]);

    body.add(part(0.7, 0.34, 0.34, col, 0, 0.44, 0));
    var head = new THREE.Group();
    head.position.set(0.42, 0.56, 0);
    head.add(part(0.3, 0.28, 0.28, col, 0, 0, 0));
    head.add(part(0.2, 0.14, 0.16, col, 0.2, -0.06, 0));           // snout
    head.add(part(0.05, 0.05, 0.04, 0x1a1a20, 0.29, -0.03, 0));    // nose
    head.add(part(0.09, 0.16, 0.05, col, -0.02, 0.18, 0.1));       // ears
    head.add(part(0.09, 0.16, 0.05, col, -0.02, 0.18, -0.1));
    body.add(head);
    var tail = limb(-0.36, 0.52, 0);
    tail.add(part(0.26, 0.09, 0.09, col, -0.13, 0.05, 0));
    body.add(tail);

    var legs = [];
    [[0.24, 0.13], [0.24, -0.13], [-0.24, 0.13], [-0.24, -0.13]].forEach(function (p) {
      var l = limb(p[0], 0.3, p[1]);
      l.add(part(0.11, 0.32, 0.11, col, 0, -0.16, 0));
      body.add(l); legs.push(l);
    });

    var self = { obj: root_, body: body, head: head, tail: tail, legs: legs,
                 phase: rnd(0, 6.28), height: 0.7, colors: [col, 0x1a1a20] };

    self.update = function (dt, st) {
      var sp = st.speed || 0, mode = st.mode;
      self.phase += dt * (mode === 'fly' ? 16 : 7 + sp * 2);
      var ph = self.phase;
      if (mode === 'fly') {
        legs.forEach(function (l, i) { l.rotation.x = Math.sin(ph * 2 + i * 1.6) * 1.8; });
        tail.rotation.z = Math.sin(ph * 3) * 0.9;
        head.rotation.z = Math.sin(ph * 2.2) * 0.5;
        return;
      }
      var moving = sp > 0.2;
      legs.forEach(function (l, i) {
        l.rotation.x = moving ? Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.5 : 0)) * 0.7 : 0;
      });
      body.position.y = moving ? Math.abs(Math.sin(ph * 2)) * 0.03 : 0;
      tail.rotation.z = Math.sin(st.time * (mode === 'idle' ? 7 : 11)) * (moving ? 0.5 : 0.7);
      tail.rotation.x = -0.5;
      head.rotation.z = damp(head.rotation.z, 0, dt, 6);
      head.rotation.y = mode === 'idle' ? Math.sin(st.time * 1.4) * 0.6 : 0;
    };
    return self;
  }

  /* ==================== PIGEON ==================== */

  function makePigeon() {
    var root_ = new THREE.Group();
    var body = new THREE.Group();
    root_.add(body);
    var col = pick([0x8d8798, 0x6f7fa8, 0xa9a2b5, 0x5c6b93]);
    body.add(part(0.26, 0.2, 0.18, col, 0, 0.16, 0));
    var head = part(0.13, 0.13, 0.12, col, 0.15, 0.28, 0);
    body.add(head);
    body.add(part(0.06, 0.04, 0.04, 0xffb020, 0.23, 0.27, 0));  // beak
    body.add(part(0.16, 0.05, 0.1, 0x4b4756, -0.16, 0.16, 0));  // tail
    var wL = limb(0, 0.2, 0.08), wR = limb(0, 0.2, -0.08);
    wL.add(part(0.2, 0.04, 0.14, col, 0, 0, 0.07));
    wR.add(part(0.2, 0.04, 0.14, col, 0, 0, -0.07));
    body.add(wL); body.add(wR);
    body.add(part(0.03, 0.1, 0.03, 0xffb020, 0.04, 0.03, 0.05));
    body.add(part(0.03, 0.1, 0.03, 0xffb020, 0.04, 0.03, -0.05));

    var self = { obj: root_, body: body, wL: wL, wR: wR, phase: rnd(0, 6.28),
                 height: 0.3, colors: [col, 0xffb020, 0xf0e6d2] };
    self.update = function (dt, st) {
      self.phase += dt * (st.mode === 'fly' ? 34 : st.mode === 'walk' ? 10 : 3);
      var f = Math.sin(self.phase);
      if (st.mode === 'fly') {
        wL.rotation.z = f * 1.5; wR.rotation.z = -f * 1.5;
        body.position.y = 0;
      } else {
        wL.rotation.z = damp(wL.rotation.z, 0.1, dt, 8);
        wR.rotation.z = damp(wR.rotation.z, -0.1, dt, 8);
        head.position.x = 0.15 + (st.mode === 'walk' ? f * 0.03 : 0);
        body.rotation.y = st.mode === 'idle' ? Math.sin(st.time * 1.1 + self.phase) * 0.5 : 0;
      }
    };
    return self;
  }

  root.SY = root.SY || {};
  root.SY.actors = {
    player: makePlayer, npc: makeNPC, dog: makeDog, pigeon: makePigeon,
    KINDS: KINDS, SKIN: SKIN, SHIRT: SHIRT
  };
})(window);
