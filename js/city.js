/* STREET YEET — city.js
   Procedural low-poly city block. Returns geometry + a list of yeetable props. */
(function (root) {
  'use strict';
  var THREE = root.THREE;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  var PAL = {
    asphalt: 0x2e2b38, asphalt2: 0x343040, curb: 0x8d8798, walk: 0xa9a2b5,
    walk2: 0x9c94aa, line: 0xf0e6c8, grass: 0x5fa05e,
    brick: [0xb5654f, 0xc07a5c, 0x8f5748, 0xa6604e],
    stucco: [0xd9c7a8, 0xc8b494, 0xe0d3ba, 0xbfa98a],
    cool: [0x6f7fa8, 0x8695ba, 0x5c6b93, 0x9aa6c4],
    warm: [0xd98f5b, 0xe0a86e, 0xc47a4c],
    roof: 0x4a4655, trim: 0x39364a
  };

  function mat(color, opts) {
    opts = opts || {};
    return new THREE.MeshLambertMaterial({
      color: color, flatShading: true,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.ei == null ? 1 : opts.ei,
      transparent: !!opts.transparent, opacity: opts.opacity == null ? 1 : opts.opacity,
      side: opts.side || THREE.FrontSide
    });
  }

  var _boxGeo = new THREE.BoxGeometry(1, 1, 1);
  function box(w, h, d, color, opts) {
    var m = new THREE.Mesh(_boxGeo, mat(color, opts));
    m.scale.set(w, h, d);
    m.castShadow = opts && opts.noShadow ? false : true;
    m.receiveShadow = true;
    return m;
  }
  function cyl(rt, rb, h, seg, color, opts) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 8), mat(color, opts));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function sphere(r, color, opts) {
    var m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(color, opts));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  function cone(r, h, seg, color) {
    var m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 6), mat(color));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  /* ---------- window texture ---------- */
  var winTexCache = [];
  function windowTexture(variant) {
    if (winTexCache[variant]) return winTexCache[variant];
    var W = 128, H = 128;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = '#00000000'; g.clearRect(0, 0, W, H);
    var cols = [3, 4, 5][variant % 3], rows = [4, 5, 6][variant % 3];
    var pw = W / cols, ph = H / rows;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var lit = Math.random();
        var col = lit > 0.72 ? '#ffe9a8' : lit > 0.5 ? '#8ea6c8' : '#3b3f57';
        g.fillStyle = col;
        g.fillRect(x * pw + pw * 0.22, y * ph + ph * 0.2, pw * 0.56, ph * 0.44);
        g.fillStyle = 'rgba(0,0,0,.35)';
        g.fillRect(x * pw + pw * 0.22, y * ph + ph * 0.2 + ph * 0.2, pw * 0.56, 2);
      }
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    winTexCache[variant] = t;
    return t;
  }

  /* ---------- layout constants ---------- */
  var BLOCK = 28;      // block platform half-extent
  var CORE = 17;       // inner building cluster half-extent
  var STREET = 44;     // outer edge of road
  var OUTER = 50;      // outer sidewalk edge / perimeter wall start
  var CURB = 0.32;

  function buildCity(scene) {
    var props = [];      // yeetable things
    var colliders = [];  // {min:{x,z}, max:{x,z}, h}
    var footprints = []; // for walkability

    function addCollider(cx, cz, w, d, h) {
      colliders.push({
        minx: cx - w / 2, maxx: cx + w / 2,
        minz: cz - d / 2, maxz: cz + d / 2, h: h,
        cx: cx, cz: cz
      });
      footprints.push({ minx: cx - w / 2, maxx: cx + w / 2, minz: cz - d / 2, maxz: cz + d / 2 });
    }

    /* --- ground --- */
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      mat(PAL.asphalt)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // road ring (slightly different tone so streets read)
    var road = new THREE.Mesh(new THREE.PlaneGeometry(OUTER * 2, OUTER * 2), mat(PAL.asphalt2));
    road.rotation.x = -Math.PI / 2; road.position.y = 0.01;
    road.receiveShadow = true;
    scene.add(road);

    /* --- block platform (raised sidewalk) --- */
    var plat = box(BLOCK * 2, CURB, BLOCK * 2, PAL.walk, { noShadow: true });
    plat.position.set(0, CURB / 2, 0);
    scene.add(plat);
    // curb edge trim
    [[0, BLOCK], [0, -BLOCK], [BLOCK, 0], [-BLOCK, 0]].forEach(function (p, i) {
      var horiz = i < 2;
      var c = box(horiz ? BLOCK * 2 + 0.6 : 0.6, CURB + 0.06, horiz ? 0.6 : BLOCK * 2 + 0.6, PAL.curb);
      c.position.set(p[0], (CURB + 0.06) / 2, p[1]);
      scene.add(c);
    });

    // outer sidewalk ring
    for (var s = 0; s < 4; s++) {
      var horiz2 = s < 2;
      var len = OUTER * 2, wid = OUTER - STREET;
      var sw = box(horiz2 ? len : wid, CURB, horiz2 ? wid : len, PAL.walk2, { noShadow: true });
      var off = STREET + wid / 2;
      sw.position.set(horiz2 ? 0 : (s === 2 ? off : -off), CURB / 2, horiz2 ? (s === 0 ? off : -off) : 0);
      scene.add(sw);
    }

    /* --- road markings --- */
    var lineMat = mat(PAL.line);
    var mid = (BLOCK + STREET) / 2;
    for (var axis = 0; axis < 2; axis++) {
      for (var sign = -1; sign <= 1; sign += 2) {
        for (var t2 = -STREET + 3; t2 < STREET; t2 += 7) {
          var dash = new THREE.Mesh(new THREE.PlaneGeometry(axis ? 0.34 : 3.4, axis ? 3.4 : 0.34), lineMat);
          dash.rotation.x = -Math.PI / 2;
          dash.position.y = 0.02;
          if (axis) dash.position.set(sign * mid, 0.02, t2);
          else dash.position.set(t2, 0.02, sign * mid);
          scene.add(dash);
        }
      }
    }
    // crosswalks at the four corners of the block
    for (var cw = 0; cw < 4; cw++) {
      var h3 = cw < 2;
      for (var st = 0; st < 7; st++) {
        var stripe = new THREE.Mesh(new THREE.PlaneGeometry(h3 ? 1.0 : 14, h3 ? 14 : 1.0), lineMat);
        stripe.rotation.x = -Math.PI / 2;
        var a2 = -9 + st * 3;
        var b2 = (BLOCK + STREET) / 2 * (cw % 2 ? -1 : 1);
        if (h3) stripe.position.set(a2, 0.022, b2);
        else stripe.position.set(b2, 0.022, a2);
        scene.add(stripe);
      }
    }

    /* --- central buildings (the block core) --- */
    var coreSpecs = [
      { x: -9, z: -9, w: 15, d: 15, h: 22, pal: PAL.brick },
      { x: 9, z: -10, w: 13, d: 12, h: 30, pal: PAL.cool },
      { x: 11, z: 9, w: 12, d: 14, h: 17, pal: PAL.stucco },
      { x: -10, z: 10, w: 14, d: 13, h: 26, pal: PAL.warm },
      { x: 0, z: 0, w: 8, d: 8, h: 36, pal: PAL.cool }
    ];
    coreSpecs.forEach(function (b, i) { makeBuilding(b, i); });

    function makeBuilding(b, i) {
      var color = pick(b.pal);
      var body = box(b.w, b.h, b.d, color);
      body.position.set(b.x, CURB + b.h / 2, b.z);
      scene.add(body);
      addCollider(b.x, b.z, b.w, b.d, CURB + b.h);

      // window band overlay on 4 faces
      var wt = windowTexture(i % 3);
      var wmat = new THREE.MeshBasicMaterial({
        map: wt, transparent: true, opacity: 0.95, depthWrite: false
      });
      var faces = [
        [0, 0, b.d / 2 + 0.02, 0, b.w],
        [0, 0, -b.d / 2 - 0.02, Math.PI, b.w],
        [b.w / 2 + 0.02, 0, 0, Math.PI / 2, b.d],
        [-b.w / 2 - 0.02, 0, 0, -Math.PI / 2, b.d]
      ];
      faces.forEach(function (f) {
        var wh = b.h - 3;
        var g2 = new THREE.PlaneGeometry(f[4] - 1.4, wh);
        var pm = new THREE.Mesh(g2, wmat.clone());
        pm.material.map = wt.clone();
        pm.material.map.needsUpdate = true;
        pm.material.map.repeat.set(Math.max(1, Math.round((f[4] - 1.4) / 4)), Math.max(1, Math.round(wh / 4)));
        pm.position.set(b.x + f[0], CURB + b.h / 2, b.z + f[2]);
        pm.rotation.y = f[3];
        scene.add(pm);
      });

      // roof cap + rooftop clutter
      var cap = box(b.w + 0.7, 0.7, b.d + 0.7, PAL.roof);
      cap.position.set(b.x, CURB + b.h + 0.35, b.z);
      scene.add(cap);
      for (var k = 0; k < irnd(1, 3); k++) {
        var hv = box(rnd(1.4, 3), rnd(1, 2.4), rnd(1.4, 3), PAL.trim);
        hv.position.set(b.x + rnd(-b.w / 3, b.w / 3), CURB + b.h + 1.4, b.z + rnd(-b.d / 3, b.d / 3));
        scene.add(hv);
      }
      // awning / door on one face
      var aw = box(Math.min(6, b.w * 0.5), 0.4, 2.4, pick([0xff3b6b, 0x3fd0ff, 0x5ef38c, 0xffd23f]));
      var side2 = i % 4;
      var sx = side2 === 2 ? b.w / 2 + 1.2 : side2 === 3 ? -b.w / 2 - 1.2 : 0;
      var sz = side2 === 0 ? b.d / 2 + 1.2 : side2 === 1 ? -b.d / 2 - 1.2 : 0;
      aw.position.set(b.x + sx, CURB + 3.4, b.z + sz);
      if (side2 > 1) aw.rotation.y = Math.PI / 2;
      scene.add(aw);
    }

    /* --- perimeter wall of buildings --- */
    for (var side = 0; side < 4; side++) {
      var pos = -OUTER + 6;
      while (pos < OUTER - 4) {
        var w2 = rnd(9, 17), h2 = rnd(26, 62), d2 = rnd(12, 20);
        var along = pos + w2 / 2;
        var away = OUTER + d2 / 2;
        var cx2, cz2, rot = 0;
        if (side === 0) { cx2 = along; cz2 = away; }
        else if (side === 1) { cx2 = along; cz2 = -away; }
        else if (side === 2) { cx2 = away; cz2 = along; rot = Math.PI / 2; }
        else { cx2 = -away; cz2 = along; rot = Math.PI / 2; }

        var pb = box(rot ? d2 : w2, h2, rot ? w2 : d2, pick([].concat(PAL.brick, PAL.cool, PAL.stucco)));
        pb.position.set(cx2, h2 / 2, cz2);
        scene.add(pb);
        addCollider(cx2, cz2, rot ? d2 : w2, rot ? w2 : d2, h2);

        var wt2 = windowTexture(irnd(0, 2));
        var faceW = rot ? w2 : w2; // face toward the street
        var pmm = new THREE.Mesh(
          new THREE.PlaneGeometry(faceW - 1.6, h2 - 4),
          new THREE.MeshBasicMaterial({ map: wt2.clone(), transparent: true, depthWrite: false, opacity: .95 })
        );
        pmm.material.map.repeat.set(Math.max(1, Math.round((faceW - 1.6) / 4)), Math.max(1, Math.round((h2 - 4) / 4.5)));
        pmm.material.map.needsUpdate = true;
        var inward = OUTER + 0.03;
        if (side === 0) pmm.position.set(cx2, h2 / 2, inward);
        else if (side === 1) { pmm.position.set(cx2, h2 / 2, -inward); pmm.rotation.y = Math.PI; }
        else if (side === 2) { pmm.position.set(inward, h2 / 2, cz2); pmm.rotation.y = Math.PI / 2; }
        else { pmm.position.set(-inward, h2 / 2, cz2); pmm.rotation.y = -Math.PI / 2; }
        scene.add(pmm);

        var cap2 = box((rot ? d2 : w2) + 0.6, 0.6, (rot ? w2 : d2) + 0.6, PAL.roof);
        cap2.position.set(cx2, h2 + 0.3, cz2);
        scene.add(cap2);

        pos += w2 + rnd(0.4, 2.2);
      }
    }

    /* --- distant skyline for scale (no collision) --- */
    var farMat = [mat(0x3b3752), mat(0x443f5e), mat(0x332f47)];
    for (var f2 = 0; f2 < 90; f2++) {
      var ang = rnd(0, Math.PI * 2), rad = rnd(110, 330);
      var fh = rnd(20, 130);
      var fb = new THREE.Mesh(_boxGeo, pick(farMat));
      fb.scale.set(rnd(10, 26), fh, rnd(10, 26));
      fb.position.set(Math.cos(ang) * rad, fh / 2, Math.sin(ang) * rad);
      fb.castShadow = false; fb.receiveShadow = false;
      scene.add(fb);
    }

    /* ---------- yeetable props ---------- */

    function reg(obj, o) {
      obj.castShadow = true;
      props.push({
        mesh: obj, kind: o.kind || 'stone', mass: o.mass || 1,
        radius: o.radius || 0.6, height: o.height || 1.2,
        label: o.label || 'thing', points: o.points || 100,
        home: obj.position.clone(),
        homeRot: obj.rotation.clone(),
        colors: o.colors || [0xffffff, 0xcccccc]
      });
      scene.add(obj);
      return obj;
    }

    function grp(x, y, z) {
      var g3 = new THREE.Group();
      g3.position.set(x, y, z);
      return g3;
    }

    /* hydrant */
    function hydrant(x, z) {
      var g3 = grp(x, CURB, z);
      var b3 = cyl(0.26, 0.3, 0.8, 8, 0xff3b6b); b3.position.y = 0.4; g3.add(b3);
      var cap3 = sphere(0.27, 0xff3b6b); cap3.position.y = 0.86; cap3.scale.y = 0.7; g3.add(cap3);
      var a3 = cyl(0.1, 0.1, 0.7, 6, 0xd8264f); a3.rotation.z = Math.PI / 2; a3.position.y = 0.55; g3.add(a3);
      var base3 = cyl(0.36, 0.4, 0.12, 8, 0x8f1c38); base3.position.y = 0.06; g3.add(base3);
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'metal', mass: 2.6, radius: 0.45, height: 1, label: 'fire hydrant', points: 250, colors: [0xff3b6b, 0xd8264f, 0xcccccc] });
    }

    /* trash can */
    function trashcan(x, z) {
      var g3 = grp(x, CURB, z);
      var b4 = cyl(0.42, 0.36, 1.0, 8, 0x5a7a5e); b4.position.y = 0.5; g3.add(b4);
      var lid = cyl(0.46, 0.44, 0.12, 8, 0x44604a); lid.position.y = 1.05; g3.add(lid);
      var knob = sphere(0.09, 0x2f4436); knob.position.y = 1.16; g3.add(knob);
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'plastic', mass: 1.2, radius: 0.5, height: 1.2, label: 'trash can', points: 150, colors: [0x5a7a5e, 0x44604a, 0x8a7f5a] });
    }

    /* bench */
    function bench(x, z, rot) {
      var g3 = grp(x, CURB, z);
      var seat = box(2.6, 0.14, 0.7, 0x9a6b41); seat.position.y = 0.62; g3.add(seat);
      var back = box(2.6, 0.6, 0.13, 0x9a6b41); back.position.set(0, 0.95, -0.3); g3.add(back);
      [-1.1, 1.1].forEach(function (lx) {
        var leg = box(0.16, 0.6, 0.6, 0x4b4756); leg.position.set(lx, 0.3, 0); g3.add(leg);
      });
      g3.rotation.y = rot || 0;
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'wood', mass: 3.2, radius: 1.3, height: 1.1, label: 'park bench', points: 300, colors: [0x9a6b41, 0x4b4756] });
    }

    /* lamppost */
    function lamppost(x, z) {
      var g3 = grp(x, CURB, z);
      var pole = cyl(0.11, 0.14, 5.0, 6, 0x3d3a4c); pole.position.y = 2.5; g3.add(pole);
      var arm = cyl(0.09, 0.09, 1.0, 6, 0x3d3a4c); arm.rotation.z = Math.PI / 2;
      arm.position.set(0.5, 4.95, 0); g3.add(arm);
      var head = box(0.7, 0.26, 0.4, 0x2c2a38); head.position.set(0.95, 4.8, 0); g3.add(head);
      var bulb = box(0.5, 0.1, 0.3, 0xffe9a8, { emissive: 0xffd070, ei: 0.9 });
      bulb.position.set(0.95, 4.66, 0); g3.add(bulb);
      var base4 = cyl(0.3, 0.34, 0.3, 8, 0x2c2a38); base4.position.y = 0.15; g3.add(base4);
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'metal', mass: 4.5, radius: 0.5, height: 5.2, label: 'lamppost', points: 400, colors: [0x3d3a4c, 0xffe9a8] });
    }

    /* traffic cone */
    function conep(x, z) {
      var g3 = grp(x, 0, z);
      var c4 = cone(0.28, 0.72, 6, 0xff7a1f); c4.position.y = 0.4; g3.add(c4);
      var b5 = box(0.62, 0.07, 0.62, 0xff7a1f); b5.position.y = 0.04; g3.add(b5);
      var stripe2 = cyl(0.19, 0.22, 0.11, 6, 0xf5f0e6); stripe2.position.y = 0.42; g3.add(stripe2);
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'plastic', mass: 0.35, radius: 0.34, height: 0.8, label: 'traffic cone', points: 80, colors: [0xff7a1f, 0xf5f0e6] });
    }

    /* mailbox */
    function mailbox(x, z) {
      var g3 = grp(x, CURB, z);
      var b6 = box(0.9, 1.0, 0.7, 0x3f6fd8); b6.position.y = 0.85; g3.add(b6);
      var top = cyl(0.35, 0.35, 0.9, 8, 0x3f6fd8); top.rotation.z = Math.PI / 2;
      top.rotation.x = Math.PI / 2; top.position.y = 1.35; top.scale.z = 0.78; g3.add(top);
      [-0.28, 0.28].forEach(function (lx) {
        var leg2 = box(0.1, 0.35, 0.1, 0x2b2b38); leg2.position.set(lx, 0.18, 0); g3.add(leg2);
      });
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'metal', mass: 2.2, radius: 0.55, height: 1.6, label: 'mailbox', points: 220, colors: [0x3f6fd8, 0x2b2b38] });
    }

    /* stop sign */
    function stopsign(x, z) {
      var g3 = grp(x, CURB, z);
      var pole2 = cyl(0.06, 0.07, 2.6, 6, 0x8d8798); pole2.position.y = 1.3; g3.add(pole2);
      var plate = cyl(0.55, 0.55, 0.07, 8, 0xd8264f); plate.rotation.x = Math.PI / 2;
      plate.position.y = 2.45; g3.add(plate);
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'metal', mass: 1.6, radius: 0.5, height: 2.8, label: 'stop sign', points: 200, colors: [0xd8264f, 0x8d8798] });
    }

    /* potted tree */
    function tree(x, z) {
      var g3 = grp(x, CURB, z);
      var pot = cyl(0.62, 0.5, 0.6, 8, 0xa4674a); pot.position.y = 0.3; g3.add(pot);
      var trunk = cyl(0.14, 0.18, 2.0, 6, 0x6b4a35); trunk.position.y = 1.5; g3.add(trunk);
      for (var i2 = 0; i2 < 3; i2++) {
        var leaf = sphere(rnd(0.75, 1.05), pick([0x5fa05e, 0x4f8c50, 0x6cb265]));
        leaf.position.set(rnd(-.4, .4), 2.5 + i2 * 0.5, rnd(-.4, .4));
        g3.add(leaf);
      }
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'wood', mass: 3.8, radius: 0.9, height: 3.6, label: 'potted tree', points: 350, colors: [0x5fa05e, 0x6b4a35, 0xa4674a] });
    }

    /* dumpster */
    function dumpster(x, z, rot) {
      var g3 = grp(x, 0, z);
      var b7 = box(2.6, 1.3, 1.5, 0x3f7a5c); b7.position.y = 0.75; g3.add(b7);
      var lid2 = box(2.7, 0.14, 1.6, 0x2f5f47); lid2.position.y = 1.46; g3.add(lid2);
      [[-1.1, .65], [1.1, .65], [-1.1, -.65], [1.1, -.65]].forEach(function (p2) {
        var wh2 = cyl(0.16, 0.16, 0.12, 6, 0x22212c);
        wh2.rotation.x = Math.PI / 2; wh2.position.set(p2[0], 0.16, p2[1]); g3.add(wh2);
      });
      g3.rotation.y = rot || 0;
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'metal', mass: 8, radius: 1.5, height: 1.6, label: 'dumpster', points: 600, colors: [0x3f7a5c, 0x2f5f47] });
    }

    /* porta potty — comedy gold */
    function porta(x, z, rot) {
      var g3 = grp(x, 0, z);
      var b8 = box(1.3, 2.3, 1.3, 0x3fb0c8); b8.position.y = 1.15; g3.add(b8);
      var door = box(0.9, 1.8, 0.06, 0x2f8ea3); door.position.set(0, 1.1, 0.68); g3.add(door);
      var roof2 = box(1.45, 0.14, 1.45, 0xf0f4f5); roof2.position.y = 2.35; g3.add(roof2);
      var vent = box(0.5, 0.12, 0.06, 0x1f6b7d); vent.position.set(0, 1.85, 0.71); g3.add(vent);
      g3.rotation.y = rot || 0;
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'plastic', mass: 3.4, radius: 0.95, height: 2.4, label: 'porta potty', points: 900, colors: [0x3fb0c8, 0x2f8ea3, 0x8a6b3a] });
    }

    /* hot dog cart */
    function cart(x, z, rot) {
      var g3 = grp(x, 0, z);
      var body2 = box(1.7, 0.9, 1.1, 0xf0e6d2); body2.position.y = 0.85; g3.add(body2);
      var lid3 = box(1.75, 0.12, 1.15, 0xd8264f); lid3.position.y = 1.36; g3.add(lid3);
      var umb = cyl(0.05, 0.05, 1.7, 6, 0x8d8798); umb.position.y = 2.1; g3.add(umb);
      var top2 = cone(1.2, 0.5, 8, 0xffd23f); top2.position.y = 2.95; g3.add(top2);
      [[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.55], [0.7, -0.55]].forEach(function (p3) {
        var w3 = cyl(0.28, 0.28, 0.1, 8, 0x22212c);
        w3.rotation.x = Math.PI / 2; w3.position.set(p3[0], 0.3, p3[1]); g3.add(w3);
      });
      g3.rotation.y = rot || 0;
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'metal', mass: 4.2, radius: 1.1, height: 3.2, label: 'hot dog cart', points: 800, colors: [0xffd23f, 0xd8264f, 0xf0e6d2] });
    }

    /* newspaper box */
    function newsbox(x, z) {
      var g3 = grp(x, CURB, z);
      var b9 = box(0.7, 1.1, 0.5, pick([0xff8a1f, 0x5ef38c, 0x3fd0ff]));
      b9.position.y = 0.75; g3.add(b9);
      var win2 = box(0.5, 0.4, 0.06, 0x2a2a38); win2.position.set(0, 1.0, 0.27); g3.add(win2);
      var leg3 = box(0.12, 0.4, 0.12, 0x2b2b38); leg3.position.y = 0.2; g3.add(leg3);
      g3.traverse(function (n) { n.castShadow = true; });
      return reg(g3, { kind: 'metal', mass: 1.4, radius: 0.45, height: 1.3, label: 'news box', points: 180, colors: [0xff8a1f, 0x2a2a38] });
    }

    /* crate stack */
    function crate(x, z) {
      var g3 = grp(x, 0, z);
      var n2 = irnd(1, 3);
      for (var i3 = 0; i3 < n2; i3++) {
        var c5 = box(0.8, 0.8, 0.8, pick([0xb08050, 0xc09a63, 0x9a6b41]));
        c5.position.set(rnd(-.12, .12), 0.4 + i3 * 0.82, rnd(-.12, .12));
        c5.rotation.y = rnd(-.3, .3);
        g3.add(c5);
      }
      g3.traverse(function (n3) { n3.castShadow = true; });
      return reg(g3, { kind: 'wood', mass: 1.1 * n2, radius: 0.6, height: 0.8 * n2, label: 'crates', points: 120 * n2, colors: [0xb08050, 0x9a6b41] });
    }

    /* phone booth (glass!) */
    function booth(x, z, rot) {
      var g3 = grp(x, CURB, z);
      var frame = box(1.1, 2.4, 1.1, 0xd8264f); frame.position.y = 1.2; g3.add(frame);
      var glass = box(0.92, 1.7, 0.92, 0xbfe6f2, { transparent: true, opacity: 0.42 });
      glass.position.y = 1.35; g3.add(glass);
      var roof3 = box(1.25, 0.18, 1.25, 0xb01f3f); roof3.position.y = 2.48; g3.add(roof3);
      g3.rotation.y = rot || 0;
      g3.traverse(function (n4) { n4.castShadow = true; });
      return reg(g3, { kind: 'glass', mass: 4.6, radius: 0.85, height: 2.6, label: 'phone booth', points: 950, colors: [0xd8264f, 0xbfe6f2, 0xffffff] });
    }

    /* parked car */
    var CARCOL = [0xd8264f, 0x3f6fd8, 0xffd23f, 0x5ef38c, 0xf0e6d2, 0x8d5fd8, 0xff8a1f];
    function car(x, z, rot) {
      var g3 = grp(x, 0, z);
      var col = pick(CARCOL);
      var lower = box(4.2, 0.75, 1.9, col); lower.position.y = 0.72; g3.add(lower);
      var cabin = box(2.4, 0.72, 1.75, col); cabin.position.set(-0.2, 1.42, 0); g3.add(cabin);
      var wind = box(2.2, 0.5, 1.8, 0x2b3a4a, { transparent: true, opacity: 0.75 });
      wind.position.set(-0.2, 1.48, 0); g3.add(wind);
      var hood = box(1.1, 0.3, 1.85, col); hood.position.set(1.6, 1.0, 0); g3.add(hood);
      [[1.9, .5], [1.9, -.5]].forEach(function (p4) {
        var lamp = box(0.14, 0.24, 0.4, 0xfff3c4, { emissive: 0xffe08a, ei: .6 });
        lamp.position.set(p4[0], 0.85, p4[1]); g3.add(lamp);
      });
      var tl = box(0.12, 0.2, 0.36, 0xd8264f, { emissive: 0x8a0f26, ei: .5 });
      tl.position.set(-2.05, 0.9, 0.55); g3.add(tl);
      var tl2 = tl.clone(); tl2.position.z = -0.55; g3.add(tl2);
      [[1.35, .98], [1.35, -.98], [-1.35, .98], [-1.35, -.98]].forEach(function (p5) {
        var w4 = cyl(0.42, 0.42, 0.3, 8, 0x1c1b24);
        w4.rotation.x = Math.PI / 2; w4.position.set(p5[0], 0.42, p5[1]); g3.add(w4);
        var hub = cyl(0.2, 0.2, 0.32, 6, 0xa9a2b5);
        hub.rotation.x = Math.PI / 2; hub.position.set(p5[0], 0.42, p5[1]); g3.add(hub);
      });
      g3.rotation.y = rot || 0;
      g3.traverse(function (n5) { n5.castShadow = true; });
      return reg(g3, {
        kind: 'metal', mass: 22, radius: 2.1, height: 1.9, label: 'car',
        points: 2500, colors: [col, 0x1c1b24, 0x2b3a4a, 0xa9a2b5]
      });
    }

    /* bus stop shelter */
    function busstop(x, z, rot) {
      var g3 = grp(x, CURB, z);
      var back2 = box(4.0, 2.2, 0.12, 0xbfe6f2, { transparent: true, opacity: .5 });
      back2.position.set(0, 1.3, -0.6); g3.add(back2);
      var roof4 = box(4.4, 0.16, 1.5, 0xd8264f); roof4.position.y = 2.45; g3.add(roof4);
      [-1.9, 1.9].forEach(function (px) {
        var p6 = box(0.16, 2.5, 0.16, 0x3d3a4c); p6.position.set(px, 1.25, -0.6); g3.add(p6);
      });
      var seat2 = box(3.4, 0.12, 0.5, 0x9a6b41); seat2.position.set(0, 0.7, -0.3); g3.add(seat2);
      g3.rotation.y = rot || 0;
      g3.traverse(function (n6) { n6.castShadow = true; });
      return reg(g3, { kind: 'glass', mass: 6.5, radius: 2.0, height: 2.6, label: 'bus shelter', points: 1100, colors: [0xd8264f, 0xbfe6f2, 0x3d3a4c] });
    }

    /* ---------- place props ---------- */

    // inner sidewalk ring (on the block, between CORE and BLOCK)
    var innerRing = [];
    for (var ring = 0; ring < 4; ring++) {
      for (var tp = -24; tp <= 24; tp += 3.4) {
        var off2 = rnd(BLOCK - 8.5, BLOCK - 1.6);
        var px2, pz2;
        if (ring === 0) { px2 = tp; pz2 = off2; }
        else if (ring === 1) { px2 = tp; pz2 = -off2; }
        else if (ring === 2) { px2 = off2; pz2 = tp; }
        else { px2 = -off2; pz2 = tp; }
        innerRing.push([px2, pz2, ring]);
      }
    }

    var makers = [
      { f: hydrant, w: 8 }, { f: trashcan, w: 10 }, { f: conep, w: 9 },
      { f: newsbox, w: 5 }, { f: mailbox, w: 5 }, { f: crate, w: 6 },
      { f: tree, w: 9 }, { f: stopsign, w: 3 }
    ];
    var wsum = makers.reduce(function (a, m2) { return a + m2.w; }, 0);
    function weighted() {
      var r2 = Math.random() * wsum;
      for (var i4 = 0; i4 < makers.length; i4++) { r2 -= makers[i4].w; if (r2 <= 0) return makers[i4].f; }
      return makers[0].f;
    }

    innerRing.forEach(function (p7, i5) {
      if (Math.random() < 0.42) return;
      var faceRot = p7[2] === 0 ? Math.PI : p7[2] === 1 ? 0 : p7[2] === 2 ? -Math.PI / 2 : Math.PI / 2;
      if (i5 % 9 === 3) { bench(p7[0], p7[1], faceRot); return; }
      if (i5 % 13 === 5) { lamppost(p7[0], p7[1]); return; }
      weighted()(p7[0], p7[1]);
    });

    // set-pieces on the block corners
    porta(-24, -24, rnd(0, 6.28));
    porta(23, 25, rnd(0, 6.28));
    cart(24, -22, -Math.PI / 2);
    booth(-23, 22, Math.PI / 4);
    booth(25, 3, -Math.PI / 2);
    busstop(-2, 26, 0);
    busstop(2, -26, Math.PI);
    dumpster(-25, 6, Math.PI / 2);
    dumpster(26, -8, -Math.PI / 2);

    // outer sidewalk props
    for (var o2 = 0; o2 < 4; o2++) {
      for (var tq = -44; tq <= 44; tq += 6.5) {
        if (Math.random() < 0.55) continue;
        var offo = rnd(STREET + 1.4, OUTER - 1.4);
        var ox, oz;
        if (o2 === 0) { ox = tq; oz = offo; }
        else if (o2 === 1) { ox = tq; oz = -offo; }
        else if (o2 === 2) { ox = offo; oz = tq; }
        else { ox = -offo; oz = tq; }
        (Math.random() < 0.22 ? lamppost : weighted())(ox, oz);
      }
    }

    // parked cars along both curbs
    var lane = BLOCK + 3.2, lane2 = STREET - 3.2;
    for (var cz3 = -22; cz3 <= 22; cz3 += 7.2) {
      if (Math.random() < 0.28) continue;
      car(lane, cz3, Math.PI / 2 + rnd(-.04, .04));
      if (Math.random() < 0.7) car(-lane, cz3 + 3, -Math.PI / 2 + rnd(-.04, .04));
      if (Math.random() < 0.45) car(lane2, cz3 + 1.5, -Math.PI / 2);
    }
    for (var cx4 = -22; cx4 <= 22; cx4 += 7.2) {
      if (Math.random() < 0.3) continue;
      car(cx4, lane, rnd(-.04, .04));
      if (Math.random() < 0.7) car(cx4 + 3, -lane, Math.PI + rnd(-.04, .04));
      if (Math.random() < 0.4) car(cx4 - 2, -lane2, rnd(-.04, .04));
    }

    /* ---------- helpers exposed to game ---------- */

    function insideFootprint(x, z, pad) {
      pad = pad || 0;
      for (var i6 = 0; i6 < footprints.length; i6++) {
        var f3 = footprints[i6];
        if (x > f3.minx - pad && x < f3.maxx + pad && z > f3.minz - pad && z < f3.maxz + pad) return true;
      }
      return false;
    }

    function isWalkable(x, z) {
      if (Math.abs(x) > OUTER - 1 || Math.abs(z) > OUTER - 1) return false;
      return !insideFootprint(x, z, 0.5);
    }

    function randomWalkable() {
      for (var i7 = 0; i7 < 200; i7++) {
        var onBlock = Math.random() < 0.55;
        var x2, z2;
        if (onBlock) {
          var edge = irnd(0, 3), a3 = rnd(-25, 25), b3 = rnd(CORE + 1.5, BLOCK - 1.5);
          if (edge === 0) { x2 = a3; z2 = b3; }
          else if (edge === 1) { x2 = a3; z2 = -b3; }
          else if (edge === 2) { x2 = b3; z2 = a3; }
          else { x2 = -b3; z2 = a3; }
        } else {
          var e2 = irnd(0, 3), c6 = rnd(-42, 42), d3 = rnd(BLOCK + 2, OUTER - 2);
          if (e2 === 0) { x2 = c6; z2 = d3; }
          else if (e2 === 1) { x2 = c6; z2 = -d3; }
          else if (e2 === 2) { x2 = d3; z2 = c6; }
          else { x2 = -d3; z2 = c6; }
        }
        if (isWalkable(x2, z2)) return new THREE.Vector3(x2, 0, z2);
      }
      return new THREE.Vector3(0, 0, BLOCK - 4);
    }

    // ground height: block platform is raised
    function groundY(x, z) {
      var onPlat = Math.abs(x) <= BLOCK && Math.abs(z) <= BLOCK;
      var onOuter = (Math.abs(x) > STREET && Math.abs(x) <= OUTER) ||
                    (Math.abs(z) > STREET && Math.abs(z) <= OUTER);
      return (onPlat || onOuter) ? CURB : 0;
    }

    return {
      props: props, colliders: colliders,
      isWalkable: isWalkable, randomWalkable: randomWalkable,
      groundY: groundY, insideFootprint: insideFootprint,
      BLOCK: BLOCK, CORE: CORE, STREET: STREET, OUTER: OUTER, CURB: CURB,
      PAL: PAL, mat: mat, box: box, cyl: cyl, sphere: sphere, cone: cone,
      makeCar: car
    };
  }

  root.SY = root.SY || {};
  root.SY.city = { build: buildCity, PAL: PAL };
})(window);
