/* STREET YEET — game.js
   Renderer, physics, AI, camera, and the one mechanic that matters. */
(function (root) {
  'use strict';
  var THREE = root.THREE, SY = root.SY, A = SY.audio;

  var CFG = {
    grav: 30, drag: 0.010,
    restitution: 0.44, friction: 0.70,
    walk: 6.4, run: 12.0, accel: 46, decel: 15, jump: 9.6,
    chargeTime: 1.25,
    swingDur: 0.44, hitPhase: 0.44,
    reach: 5.2, cone: 0.6,
    camDist: 8.6, camHigh: 3.3,
    restMin: 0.55
  };

  var CALLOUTS = [
    [18, 'PATHETIC'], [40, 'NOT BAD'], [80, 'BIG YEET'], [140, 'MASSIVE YEET'],
    [240, 'ABSOLUTELY OBLITERATED'], [400, 'TO THE MOON'], [700, 'LOW EARTH ORBIT'],
    [1e9, 'GOODBYE FOREVER']
  ];

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function irnd(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function damp(c, t, dt, r) { return c + (t - c) * Math.min(1, dt * r); }

  var el = {};
  ['hud', 'scoreVal', 'bestVal', 'lastVal', 'meter', 'meterFill', 'combo', 'comboX',
   'callout', 'toasts', 'fist', 'title', 'lines', 'loading', 'app'
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  /* ================= renderer / scene ================= */

  var renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
  el.app.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9fb8d6, 150, 460);

  var camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 3000);
  camera.position.set(0, 6, 20);

  // sky dome from a canvas gradient
  (function sky() {
    var c = document.createElement('canvas');
    c.width = 8; c.height = 256;
    var g = c.getContext('2d'), lg = g.createLinearGradient(0, 0, 0, 256);
    lg.addColorStop(0.00, '#2f4f9e');
    lg.addColorStop(0.42, '#6f9ad8');
    lg.addColorStop(0.72, '#a8c4e4');
    lg.addColorStop(1.00, '#e8d3b4');
    g.fillStyle = lg; g.fillRect(0, 0, 8, 256);
    var tex = new THREE.CanvasTexture(c);
    var dome = new THREE.Mesh(
      new THREE.SphereGeometry(1200, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    scene.add(dome);

    var cm = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, fog: false });
    var cg = new THREE.BoxGeometry(1, 1, 1);
    for (var i = 0; i < 15; i++) {
      var cl = new THREE.Group(), n = irnd(4, 7);
      for (var j = 0; j < n; j++) {
        var b = new THREE.Mesh(cg, cm);
        b.position.set(rnd(-16, 16), rnd(-3, 3), rnd(-11, 11));
        b.scale.set(rnd(9, 20), rnd(5, 9), rnd(8, 15));
        cl.add(b);
      }
      var ang = rnd(0, Math.PI * 2), rad = rnd(150, 460);
      cl.position.set(Math.cos(ang) * rad, rnd(78, 128), Math.sin(ang) * rad);
      scene.add(cl);
    }
  })();

  scene.add(new THREE.HemisphereLight(0xbcd4f2, 0x4a4256, 0.92));
  var sun = new THREE.DirectionalLight(0xfff2d0, 1.05);
  sun.position.set(48, 74, 34);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  var sc = sun.shadow.camera;
  sc.near = 1; sc.far = 250; sc.left = -68; sc.right = 68; sc.top = 68; sc.bottom = -68;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0007;
  scene.add(sun);
  scene.add(sun.target);

  /* ================= world ================= */

  var world = SY.city.build(scene);
  var fx = SY.fx.create(scene, camera);
  var player = SY.actors.player();
  scene.add(player.obj);

  var pst = {
    speed: 0, airY: 0, lookPitch: 0, charge: 0, charging: false,
    swingPhase: -1, lastPower: 0, taunt: false, time: 0
  };
  var pos = new THREE.Vector3(0, 0, world.BLOCK - 6);
  var vel = new THREE.Vector3();
  var pFacing = 0, pAirVel = 0, pGrounded = true, stepAcc = 0, tauntT = 0;

  /* Every yeetable thing — props and living things alike — is a "body". */
  var bodies = [];

  function addBody(o) {
    var g = world.groundY(o.mesh.position.x, o.mesh.position.z);
    var b = {
      mesh: o.mesh, kind: o.kind, mass: o.mass, radius: o.radius, height: o.height,
      label: o.label, points: o.points, colors: o.colors,
      actor: o.actor || null, alive: !!o.actor,
      home: o.mesh.position.clone(), homeRot: o.mesh.rotation.clone(),
      baseOff: o.mesh.position.y - g,       // pivot height above its ground
      state: 'rest',                         // rest | fly | settle | down
      v: new THREE.Vector3(), av: new THREE.Vector3(),
      launch: new THREE.Vector3(), dist: 0, scored: false,
      whistle: null, hero: false, trailT: 0, restT: 0,
      ai: o.actor ? { mode: 'idle', t: rnd(0, 3), tgt: null, speed: 0, panic: 0, snd: rnd(4, 16) } : null
    };
    bodies.push(b);
    return b;
  }

  world.props.forEach(function (p) { addBody(p); });

  function spawnActor(make, opt) {
    var a = make();
    var p = world.randomWalkable();
    a.obj.position.set(p.x, world.groundY(p.x, p.z), p.z);
    a.obj.rotation.y = rnd(0, Math.PI * 2);
    scene.add(a.obj);
    var b = addBody({
      mesh: a.obj, kind: opt.kind, mass: opt.mass, radius: opt.radius,
      height: a.height, label: opt.label, points: opt.points,
      colors: a.colors, actor: a
    });
    b.species = opt.species;
    return b;
  }

  var PEEP = ['a pedestrian', 'some guy', 'a commuter', 'an innocent bystander',
              'that one person', 'a local', 'somebody’s coworker'];
  for (var i = 0; i < 22; i++) {
    spawnActor(function () { return SY.actors.npc(); }, {
      kind: 'flesh', mass: 1.7, radius: 0.5, label: pick(PEEP), points: 1000, species: 'npc'
    });
  }
  for (var i2 = 0; i2 < 4; i2++) {
    spawnActor(SY.actors.dog, {
      kind: 'flesh', mass: 1.1, radius: 0.45, label: 'a good dog', points: 1500, species: 'dog'
    });
  }
  for (var i3 = 0; i3 < 10; i3++) {
    spawnActor(SY.actors.pigeon, {
      kind: 'flesh', mass: 0.3, radius: 0.35, label: 'a pigeon', points: 2000, species: 'pigeon'
    });
  }

  /* ================= state ================= */

  var G = {
    started: false, paused: false, score: 0, best: 0, last: 0,
    combo: 0, comboT: 0, time: 0, timeScale: 1, slowT: 0,
    meterShow: 0, calloutT: 0
  };
  try { G.best = parseFloat(localStorage.getItem('streetyeet.best')) || 0; } catch (e) {}

  var yaw = Math.PI, pitch = -0.13, camPos = new THREE.Vector3(0, 6, 26);
  var camLook = new THREE.Vector3();
  var keys = {}, chargeSnd = null, heroBody = null;

  /* ---- HUD ---- */
  function setScore(n) { G.score = n; el.scoreVal.textContent = Math.round(n).toLocaleString(); }
  function fmt(d) { return d >= 1000 ? (d / 1000).toFixed(2) + ' km' : Math.round(d) + ' m'; }

  function toast(html) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    el.toasts.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3200);
    while (el.toasts.children.length > 5) el.toasts.removeChild(el.toasts.firstChild);
  }

  function callout(txt) {
    el.callout.textContent = txt;
    el.callout.classList.remove('go');
    void el.callout.offsetWidth;   // restart the animation
    el.callout.classList.add('go');
    G.calloutT = 0.55;
  }

  function bumpCombo() {
    G.combo++;
    G.comboT = 3.2;
    if (G.combo >= 2) {
      el.comboX.textContent = 'x' + G.combo;
      el.combo.classList.add('on');
      A.combo(G.combo);
    }
  }

  function slowmo(dur) {
    if (G.slowT > dur) return;
    G.slowT = dur;
    el.lines.classList.add('on');
    A.slowmoIn();
  }

  /* ================= input ================= */

  function start() {
    if (G.started) return;
    G.started = true;
    A.init(); A.resume(); A.ambience(true);
    el.title.classList.add('hidden');
    el.hud.classList.remove('hidden');
    renderer.domElement.requestPointerLock();
  }

  function setPaused(p) {
    G.paused = p;
    if (p) {
      if (chargeSnd) { chargeSnd.stop(); chargeSnd = null; }
      pst.charging = false; pst.charge = 0;
      document.exitPointerLock();
      el.title.innerHTML = '<div><h1>PAUSED</h1>' +
        '<div class="sub">the street will wait</div>' +
        '<div class="keys">score keeps counting. the block does not forgive.</div>' +
        '<div class="go">&#9654; click to resume</div></div>';
      el.title.classList.remove('hidden');
    } else {
      el.title.classList.add('hidden');
      renderer.domElement.requestPointerLock();
    }
  }

  el.title.addEventListener('click', function () {
    if (!G.started) start();
    else if (G.paused) setPaused(false);
  });

  document.addEventListener('pointerlockchange', function () {
    if (G.started && !G.paused && document.pointerLockElement !== renderer.domElement) setPaused(true);
  });

  document.addEventListener('mousemove', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    yaw -= e.movementX * 0.0024;
    pitch = clamp(pitch - e.movementY * 0.0021, -0.85, 0.62);
  });

  document.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || !G.started || G.paused) return;
    if (document.pointerLockElement !== renderer.domElement) return;
    if (pst.swingPhase >= 0) return;
    pst.charging = true;
    pst.charge = 0;
    if (!chargeSnd) chargeSnd = A.charge();
  });

  document.addEventListener('mouseup', function (e) {
    if (e.button !== 0 || !pst.charging) return;
    releaseSwing();
  });

  addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (k === ' ') e.preventDefault();
    if (!G.started) return;
    if (k === 'escape') { setPaused(!G.paused); return; }
    if (G.paused) return;
    if (k === 'm') {
      var m = A.setMuted(!A.isMuted());
      toast(m ? '<b>muted</b>' : '<b>unmuted</b>');
    }
    if (k === 'r') restock();
    if (k === 'f' && tauntT <= 0 && pst.swingPhase < 0) {
      tauntT = 0.9; pst.taunt = true; A.taunt();
      scare(pos, 16, 1.6);
    }
    if (k === ' ' && pGrounded) {
      pAirVel = CFG.jump; pGrounded = false; A.hop();
    }
  });
  addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

  addEventListener('resize', function () {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  addEventListener('blur', function () { if (G.started && !G.paused) setPaused(true); });

  /* ================= the yeet ================= */

  function aimDir() {
    var d = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
    // pitch > 0 means looking up, so lift grows with it
    var lift = clamp(0.55 + pitch * 0.8, 0.06, 1.4);
    d.y = lift;
    return d.normalize();
  }

  function releaseSwing() {
    pst.charging = false;
    pst.lastPower = pst.charge;
    pst.swingPhase = 0;
    if (chargeSnd) { chargeSnd.stop(); chargeSnd = null; }
    A.whoosh(pst.charge);
    swungThisSwing = false;
  }

  var swungThisSwing = false;

  function doSwing() {
    var power = pst.lastPower;
    var origin = player.getFistWorld();
    var dir = aimDir();
    var flat = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    var reach = CFG.reach + power * 2.2;
    var hits = [];

    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.state === 'fly') continue;
      var bp = b.mesh.position;
      var dx = bp.x - pos.x, dz = bp.z - pos.z;
      var horiz = Math.sqrt(dx * dx + dz * dz);
      if (horiz > reach + b.radius) continue;
      var dy = (bp.y + b.height * 0.5) - (pos.y + 1.1);
      if (dy > 3.4 || dy < -2.6) continue;
      if (horiz > 0.001) {
        var dot = (dx / horiz) * flat.x + (dz / horiz) * flat.z;
        if (dot < CFG.cone) continue;
      }
      hits.push(b);
    }

    A.impact(power, hits.length ? hits[0].kind : 'stone');
    fx.addShake(0.14 + power * 0.42, 0.3 + power * 0.3);

    if (!hits.length) {
      fx.puff(origin, { count: 4, size: 1.1, speed: 2.2, opacity: 0.4 });
      return;
    }

    fx.comicBurst(origin.clone().add(new THREE.Vector3(0, 0.8, 0)),
      power > 0.85 ? pick(['BOOM', 'KRAK', 'YEET']) : null);
    fx.shockwave(origin, { to: 10 + power * 16, life: 0.5 });
    fx.flash(0.2 + power * 0.5, 200 + power * 200);
    if (power > 0.72) slowmo(0.34 + power * 0.4);

    for (var h = 0; h < hits.length; h++) launch(hits[h], dir, power, h === 0, origin);
    scare(pos, 22 + power * 20, 2.4);
  }

  function launch(b, dir, power, primary, origin) {
    // absurd by design: light things go to the horizon, cars still take flight
    var speed = (52 + power * 118) / Math.pow(Math.max(b.mass, 0.25), 0.34);
    speed *= rnd(0.94, 1.08);

    b.state = 'fly';
    b.scored = false;
    b.dist = 0;
    b.restT = 0;
    b.launch.copy(b.mesh.position);
    b.v.copy(dir).multiplyScalar(speed);
    b.v.x += rnd(-2, 2); b.v.z += rnd(-2, 2);
    b.av.set(rnd(-9, 9), rnd(-9, 9), rnd(-9, 9)).multiplyScalar(0.4 + power);

    if (b.actor) {
      b.alive = true;
      if (b.ai) b.ai.mode = 'fly';
      if (b.species === 'npc') A.scream();
      else if (b.species === 'dog') A.bark();
      else if (b.species === 'pigeon') A.coo();
    }
    if (b.label === 'car') A.alarm();

    fx.shards(b.mesh.position.clone().add(new THREE.Vector3(0, b.height * 0.4, 0)), {
      count: primary ? 16 : 9, colors: b.colors, speed: 8 + power * 8, scale: 1.1
    });
    fx.puff(b.mesh.position, { count: 4, size: 1.5, speed: 3 });

    if (primary) {
      A.yeetVoice(power);
      if (heroBody && heroBody.whistle) { heroBody.whistle.stop(); heroBody.whistle = null; }
      heroBody = b;
      b.hero = true;
      var airtime = clamp(b.v.y / CFG.grav * 2, 0.4, 3.8);
      b.whistle = A.whistle(airtime, power);
    }
  }

  // panic nearby pedestrians
  function scare(at, radius, dur) {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (!b.ai || b.state !== 'rest') continue;
      var dx = b.mesh.position.x - at.x, dz = b.mesh.position.z - at.z;
      if (dx * dx + dz * dz > radius * radius) continue;
      b.ai.mode = 'flee';
      b.ai.panic = Math.max(b.ai.panic, dur);
      b.ai.tgt = null;
    }
  }

  /* ---- flying-body integration ---- */

  function stepBody(b, dt) {
    var m = b.mesh, p = m.position;

    b.v.y -= CFG.grav * dt;
    var k = Math.pow(1 - CFG.drag, dt * 60);
    b.v.multiplyScalar(k);
    p.addScaledVector(b.v, dt);

    m.rotation.x += b.av.x * dt;
    m.rotation.y += b.av.y * dt;
    m.rotation.z += b.av.z * dt;

    if (b.actor && b.actor.update) b.actor.update(dt, { mode: 'fly', speed: 0, time: G.time });

    // vapour trail on the headline act
    if (b.hero) {
      b.trailT -= dt;
      if (b.trailT <= 0 && b.v.lengthSq() > 900) {
        b.trailT = 0.045;
        fx.trail(p, 0xffffff);
      }
    }

    // bounce off buildings
    var cols = world.colliders;
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i], r = b.radius;
      if (p.y > c.h + r || p.y < -2) continue;
      if (p.x < c.minx - r || p.x > c.maxx + r) continue;
      if (p.z < c.minz - r || p.z > c.maxz + r) continue;

      var pxA = (c.maxx + r) - p.x, pxB = p.x - (c.minx - r);
      var pzA = (c.maxz + r) - p.z, pzB = p.z - (c.minz - r);
      var py = (c.h + r) - p.y;
      var mn = Math.min(pxA, pxB, pzA, pzB, py);

      var sp = b.v.length();
      if (mn === py) { p.y = c.h + r; b.v.y = Math.abs(b.v.y) * CFG.restitution; }
      else if (mn === pxA) { p.x = c.maxx + r; b.v.x = Math.abs(b.v.x) * CFG.restitution; }
      else if (mn === pxB) { p.x = c.minx - r; b.v.x = -Math.abs(b.v.x) * CFG.restitution; }
      else if (mn === pzA) { p.z = c.maxz + r; b.v.z = Math.abs(b.v.z) * CFG.restitution; }
      else { p.z = c.minz - r; b.v.z = -Math.abs(b.v.z) * CFG.restitution; }

      if (sp > 8) {
        A.impact(clamp(sp / 90, 0.15, 0.9), b.kind);
        fx.shards(p.clone(), { count: 8, colors: b.colors, speed: sp * 0.3 });
        fx.puff(p.clone(), { count: 3, size: 1.6, speed: 2 });
        if (sp > 46) {
          fx.comicBurst(p.clone(), pick(['BONK', 'KRAK', 'WHAM']));
          fx.addShake(0.16, 0.22);
        }
      }
      b.av.multiplyScalar(0.7);
      break;
    }

    // ground
    var gy = world.groundY(p.x, p.z) + b.baseOff;
    if (p.y <= gy) {
      p.y = gy;
      var impactSpd = Math.abs(b.v.y);
      var trav = Math.sqrt((p.x - b.launch.x) * (p.x - b.launch.x) +
                           (p.z - b.launch.z) * (p.z - b.launch.z));
      if (!b.scored) landed(b, trav, impactSpd);

      b.v.y = -b.v.y * CFG.restitution;
      b.v.x *= CFG.friction; b.v.z *= CFG.friction;
      b.av.multiplyScalar(0.55);

      if (impactSpd > 4) {
        A.bounce(clamp(impactSpd / 40, 0.1, 1), b.kind);
        fx.puff(p.clone(), { count: 3, size: 1.3, speed: 2.4 });
      }
      if (b.v.y < CFG.restMin && b.v.lengthSq() < 4) settle(b, trav);
      else {
        // safety net: a body scraping along forever still has to stop eventually
        b.restT += dt;
        if (b.restT > 6) settle(b, trav);
      }
    }

    // fell off the world (shouldn't, but never trust a launch this dumb)
    if (p.y < -60) settle(b, b.dist);
  }

  function landed(b, dist, spd) {
    b.scored = true;
    b.dist = dist;
    var p = b.mesh.position;

    if (b.whistle) { b.whistle.stop(); b.whistle = null; }

    var mult = G.combo >= 2 ? 1 + (G.combo - 1) * 0.35 : 1;
    var gained = (b.points * (0.35 + dist / 55)) * mult;
    setScore(G.score + gained);

    G.last = dist;
    el.lastVal.textContent = 'last: ' + fmt(dist);

    A.land(dist, b.kind);
    A.impact(clamp(spd / 70, 0.2, 1), b.kind);

    fx.crater(p, clamp(3 + dist / 60, 3, 9));
    fx.shards(p.clone(), { count: 14, colors: b.colors, speed: 9 + spd * 0.2 });
    fx.puff(p.clone(), { count: 7, size: 2.2, speed: 3.4, opacity: 0.55 });
    fx.shockwave(p.clone().setY(p.y + 0.2), { to: 8 + dist / 22, life: 0.6 });
    fx.floatText(p.clone().add(new THREE.Vector3(0, 2.6, 0)), fmt(dist), { size: 2.6 });

    var seen = camera.position.distanceTo(p);
    if (seen < 130) fx.addShake(clamp(0.5 - seen / 300, 0.05, 0.4), 0.3);

    bumpCombo();

    var record = dist > G.best;
    if (record) {
      G.best = dist;
      el.bestVal.textContent = fmt(dist);
      try { localStorage.setItem('streetyeet.best', String(dist)); } catch (e) {}
      A.record();
      callout('NEW RECORD');
      toast('<b>' + fmt(dist) + '</b> &mdash; new personal best');
    }

    if (!record && G.calloutT <= 0) {
      for (var i = 0; i < CALLOUTS.length; i++) {
        if (dist < CALLOUTS[i][0]) { callout(CALLOUTS[i][1]); break; }
      }
    }
    toast('yeeted <b>' + b.label + '</b> ' + fmt(dist));
    if (dist > 300) A.ding();

    if (b.actor && b.ai) b.ai.mode = 'down';
    if (b.hero) { b.hero = false; heroBody = null; }
  }

  function settle(b, dist) {
    b.state = b.actor ? 'down' : 'rest';
    b.v.set(0, 0, 0); b.av.set(0, 0, 0);
    if (b.whistle) { b.whistle.stop(); b.whistle = null; }
    if (b.hero) { b.hero = false; heroBody = null; }

    // credit any extra ground travelled after the first touchdown
    var total = Math.sqrt(
      (b.mesh.position.x - b.launch.x) * (b.mesh.position.x - b.launch.x) +
      (b.mesh.position.z - b.launch.z) * (b.mesh.position.z - b.launch.z));
    if (b.scored && total > b.dist + 15) {
      setScore(G.score + (total - b.dist) * 6);
      toast('&hellip;and rolled another <b>' + fmt(total - b.dist) + '</b>');
      if (total > G.best) {
        G.best = total;
        el.bestVal.textContent = fmt(total);
        try { localStorage.setItem('streetyeet.best', String(total)); } catch (e) {}
      }
      b.dist = total;
      el.lastVal.textContent = 'last: ' + fmt(total);
    }

    if (b.actor && b.ai) {
      b.ai.mode = 'down';
      b.ai.t = rnd(2.5, 6);       // lie there a while, then get up
    } else {
      // props keep whatever silly rotation they landed in
      b.mesh.rotation.z = clamp(b.mesh.rotation.z, -1.5, 1.5);
    }
  }

  /* ---- chain reactions ---- */
  function chains(dt) {
    for (var i = 0; i < bodies.length; i++) {
      var f = bodies[i];
      if (f.state !== 'fly') continue;
      var sp = f.v.length();
      if (sp < 14) continue;
      for (var j = 0; j < bodies.length; j++) {
        var t = bodies[j];
        if (t === f || t.state === 'fly') continue;
        var dx = t.mesh.position.x - f.mesh.position.x;
        var dz = t.mesh.position.z - f.mesh.position.z;
        var rr = f.radius + t.radius + 0.5;
        if (dx * dx + dz * dz > rr * rr) continue;
        var dy = t.mesh.position.y - f.mesh.position.y;
        if (dy > t.height + 0.6 || dy < -f.height - 0.6) continue;

        var dir = f.v.clone().normalize();
        dir.y = Math.max(dir.y, 0.45);
        var pw = clamp(sp / 130, 0.2, 1) * Math.pow(f.mass / Math.max(t.mass, 0.3), 0.3);
        launch(t, dir.normalize(), clamp(pw, 0.15, 1), false, t.mesh.position);
        f.v.multiplyScalar(0.72);

        A.impact(clamp(pw, 0.2, 0.95), t.kind);
        fx.comicBurst(t.mesh.position.clone().add(new THREE.Vector3(0, t.height * 0.6, 0)));
        fx.addShake(0.12, 0.2);
        bumpCombo();
        if (G.combo >= 3) fx.floatText(
          t.mesh.position.clone().add(new THREE.Vector3(0, t.height + 1.6, 0)),
          'CHAIN x' + G.combo, { size: 1.8, grad: ['#fff', '#ff3b6b'], glow: 'rgba(255,59,107,.9)' });
        break;
      }
    }
  }

  /* ================= actor AI ================= */

  function updateActor(b, dt) {
    var ai = b.ai, a = b.actor, p = b.mesh.position;

    if (b.state === 'down') {
      ai.t -= dt;
      if (ai.t <= 0) {
        // dust yourself off, resume your day, deeply confused
        b.state = 'rest';
        ai.mode = 'idle'; ai.t = rnd(0.5, 2); ai.tgt = null; ai.speed = 0;
        b.mesh.rotation.set(0, b.mesh.rotation.y, 0);
        p.y = world.groundY(p.x, p.z) + b.baseOff;
        fx.puff(p.clone(), { count: 3, size: 1.1, speed: 1.6, opacity: 0.4 });
      }
      a.update(dt, { mode: 'down', speed: 0, time: G.time });
      return;
    }

    if (ai.panic > 0) ai.panic -= dt;
    else if (ai.mode === 'flee') { ai.mode = 'idle'; ai.t = rnd(0.3, 1.2); ai.tgt = null; }

    // the fist is charging nearby — leave
    if (pst.charging && pst.charge > 0.25) {
      var ddx = p.x - pos.x, ddz = p.z - pos.z;
      if (ddx * ddx + ddz * ddz < 156) { ai.mode = 'flee'; ai.panic = Math.max(ai.panic, 0.7); }
    }

    ai.t -= dt;
    if (ai.mode !== 'flee' && ai.t <= 0) {
      if (ai.mode === 'walk') { ai.mode = 'idle'; ai.t = rnd(1.2, 4); ai.tgt = null; }
      else { ai.mode = 'walk'; ai.t = rnd(4, 11); ai.tgt = world.randomWalkable(); }
    }

    if (ai.mode === 'flee' && !ai.tgt) {
      // run directly away from the maniac
      var away = new THREE.Vector3(p.x - pos.x, 0, p.z - pos.z);
      if (away.lengthSq() < 0.01) away.set(1, 0, 0);
      away.normalize().multiplyScalar(30);
      var tx = clamp(p.x + away.x, -world.OUTER + 3, world.OUTER - 3);
      var tz = clamp(p.z + away.z, -world.OUTER + 3, world.OUTER - 3);
      ai.tgt = new THREE.Vector3(tx, 0, tz);
    }

    var want = ai.mode === 'flee' ? (b.species === 'pigeon' ? 9 : 8.5)
             : ai.mode === 'walk' ? (b.species === 'pigeon' ? 1.5 : b.species === 'dog' ? 3.4 : 2.4)
             : 0;

    if (ai.tgt && want > 0) {
      var dx2 = ai.tgt.x - p.x, dz2 = ai.tgt.z - p.z;
      var d2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);
      if (d2 < 1.2) {
        ai.tgt = null;
        if (ai.mode !== 'flee') { ai.mode = 'idle'; ai.t = rnd(1, 3.5); }
      } else {
        var nx = dx2 / d2, nz = dz2 / d2;
        var stepX = p.x + nx * want * dt, stepZ = p.z + nz * want * dt;
        if (world.isWalkable(stepX, stepZ)) {
          p.x = stepX; p.z = stepZ;
          ai.speed = want;
        } else {
          ai.tgt = null; ai.speed = 0;    // blocked, pick somewhere else
          if (ai.mode !== 'flee') ai.t = 0;
        }
        var tgtRot = Math.atan2(nx, nz);
        var cur = b.mesh.rotation.y;
        var diff = Math.atan2(Math.sin(tgtRot - cur), Math.cos(tgtRot - cur));
        b.mesh.rotation.y = cur + diff * Math.min(1, dt * (ai.mode === 'flee' ? 12 : 6));
      }
    } else {
      ai.speed = damp(ai.speed, 0, dt, 8);
    }

    p.y = world.groundY(p.x, p.z) + b.baseOff;

    // idle noises
    ai.snd -= dt;
    if (ai.snd <= 0) {
      ai.snd = rnd(7, 22);
      var near = camera.position.distanceTo(p) < 40;
      if (near && b.species === 'dog') A.bark();
      else if (near && b.species === 'pigeon') A.coo();
    }

    a.update(dt, {
      mode: ai.mode === 'flee' ? 'flee' : ai.speed > 0.3 ? 'walk' : 'idle',
      speed: ai.speed, time: G.time
    });
  }

  /* ================= player ================= */

  function movePlayer(dt) {
    var ix = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
    var iz = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);
    var want = new THREE.Vector3();

    if (ix || iz) {
      // camera-relative
      var fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      var right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      want.addScaledVector(fwd, -iz).addScaledVector(right, ix).normalize();
    }

    var top = keys['shift'] ? CFG.run : CFG.walk;
    if (pst.charging) top *= 0.42;            // the fist is heavy
    if (pst.swingPhase >= 0) top *= 0.3;

    if (want.lengthSq() > 0) {
      vel.x = damp(vel.x, want.x * top, dt, CFG.accel / 6);
      vel.z = damp(vel.z, want.z * top, dt, CFG.accel / 6);
    } else {
      vel.x = damp(vel.x, 0, dt, CFG.decel);
      vel.z = damp(vel.z, 0, dt, CFG.decel);
    }

    pos.x += vel.x * dt;
    pos.z += vel.z * dt;

    // keep inside the world
    var lim = world.OUTER - 1.2;
    pos.x = clamp(pos.x, -lim, lim);
    pos.z = clamp(pos.z, -lim, lim);

    // push out of buildings (circle vs AABB)
    var R = 0.62, cols = world.colliders;
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      if (pos.x < c.minx - R || pos.x > c.maxx + R) continue;
      if (pos.z < c.minz - R || pos.z > c.maxz + R) continue;
      var pxA = (c.maxx + R) - pos.x, pxB = pos.x - (c.minx - R);
      var pzA = (c.maxz + R) - pos.z, pzB = pos.z - (c.minz - R);
      var mn = Math.min(pxA, pxB, pzA, pzB);
      if (mn === pxA) { pos.x = c.maxx + R; vel.x = 0; }
      else if (mn === pxB) { pos.x = c.minx - R; vel.x = 0; }
      else if (mn === pzA) { pos.z = c.maxz + R; vel.z = 0; }
      else { pos.z = c.minz - R; vel.z = 0; }
    }

    // vertical: curb steps + hopping
    var gy = world.groundY(pos.x, pos.z);
    if (!pGrounded) {
      pAirVel -= CFG.grav * dt;
      pos.y += pAirVel * dt;
      if (pos.y <= gy) {
        pos.y = gy; pAirVel = 0; pGrounded = true;
        A.landPlayer();
        fx.puff(pos.clone(), { count: 3, size: 1, speed: 1.8, opacity: 0.35 });
      }
    } else {
      pos.y = damp(pos.y, gy, dt, 16);
    }

    var sp = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
    pst.speed = sp;

    // footsteps in time with the stride
    if (pGrounded && sp > 0.6) {
      stepAcc += sp * dt;
      if (stepAcc > 2.1) { stepAcc = 0; A.step(sp > CFG.walk + 1); }
    } else stepAcc = 0;

    // facing: toward movement, but square up to the camera when winding up
    var tgtFace = pFacing;
    if (pst.charging || pst.swingPhase >= 0) tgtFace = yaw + Math.PI;
    else if (sp > 0.4) tgtFace = Math.atan2(vel.x, vel.z);
    var df = Math.atan2(Math.sin(tgtFace - pFacing), Math.cos(tgtFace - pFacing));
    pFacing += df * Math.min(1, dt * (pst.charging ? 16 : 11));

    player.obj.position.copy(pos);
    player.obj.rotation.y = pFacing;
  }

  function updateCamera(dt) {
    var look = new THREE.Vector3(pos.x, pos.y + CFG.camHigh, pos.z);
    camLook.lerp(look, Math.min(1, dt * 14));

    var dist = CFG.camDist + pst.charge * 1.5;
    var dir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      -Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    );

    // don't let the camera sit inside a wall
    var cols = world.colliders;
    for (var s = 1; s <= 8; s++) {
      var t = dist * (s / 8);
      var tx = camLook.x + dir.x * t, ty = camLook.y + dir.y * t, tz = camLook.z + dir.z * t;
      var blocked = ty < 0.4;
      for (var i = 0; !blocked && i < cols.length; i++) {
        var c = cols[i];
        if (ty < c.h + 0.4 && tx > c.minx - 0.4 && tx < c.maxx + 0.4 &&
            tz > c.minz - 0.4 && tz < c.maxz + 0.4) blocked = true;
      }
      if (blocked) { dist = Math.max(2.4, dist * ((s - 1) / 8)); break; }
    }

    var want = camLook.clone().addScaledVector(dir, dist);
    camPos.lerp(want, Math.min(1, dt * 12));
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    var sh = fx.shakeOffset();
    if (sh) camera.position.add(sh);

    sun.position.set(pos.x + 48, 74, pos.z + 34);
    sun.target.position.set(pos.x, 0, pos.z);
    sun.target.updateMatrixWorld();
  }

  function restock() {
    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      b.state = 'rest';
      b.v.set(0, 0, 0); b.av.set(0, 0, 0);
      b.scored = false; b.dist = 0;
      if (b.whistle) { b.whistle.stop(); b.whistle = null; }
      b.hero = false;
      if (b.actor) {
        var p = world.randomWalkable();
        b.mesh.position.set(p.x, world.groundY(p.x, p.z) + b.baseOff, p.z);
        b.mesh.rotation.set(0, rnd(0, 6.28), 0);
        b.ai.mode = 'idle'; b.ai.t = rnd(0.2, 2.5); b.ai.tgt = null;
        b.ai.speed = 0; b.ai.panic = 0;
      } else {
        b.mesh.position.copy(b.home);
        b.mesh.rotation.copy(b.homeRot);
      }
    }
    heroBody = null;
    A.ding();
    toast('<b>street restocked</b> &mdash; go again');
  }

  /* ================= loop ================= */

  var prev = performance.now();

  function frame(nowMs) {
    requestAnimationFrame(frame);
    var real = Math.min((nowMs - prev) / 1000, 0.05);
    prev = nowMs;

    if (!G.started || G.paused) {
      // idle beauty shot orbiting the block behind the title / pause card
      G.time += real;
      if (!G.started) {
        var a0 = G.time * 0.12;
        camera.position.set(Math.sin(a0) * 46, 17 + Math.sin(a0 * 0.7) * 4, Math.cos(a0) * 46);
        camera.lookAt(0, 6, 0);
      }
      player.update(real, pst);
      for (var q = 0; q < bodies.length; q++) {
        if (bodies[q].ai && bodies[q].state === 'rest') updateActor(bodies[q], real);
      }
      fx.update(real);
      renderer.render(scene, camera);
      return;
    }

    // slow-mo
    if (G.slowT > 0) {
      G.slowT -= real;
      if (G.slowT <= 0) { G.slowT = 0; el.lines.classList.remove('on'); }
    }
    G.timeScale = damp(G.timeScale, G.slowT > 0 ? 0.32 : 1, real, 9);
    var dt = real * G.timeScale;

    G.time += dt;
    pst.time = G.time;
    if (G.calloutT > 0) G.calloutT -= real;

    // ---- charge / swing ----
    if (pst.charging) {
      var before = pst.charge;
      pst.charge = Math.min(1, pst.charge + real / CFG.chargeTime);
      if (chargeSnd) chargeSnd.set(pst.charge);
      if (before < 1 && pst.charge >= 1) { A.chargeFull(); fx.flash(0.14, 160); }
    }
    if (pst.swingPhase >= 0) {
      pst.swingPhase += real / CFG.swingDur;
      if (!swungThisSwing && pst.swingPhase >= CFG.hitPhase) {
        swungThisSwing = true;
        doSwing();
      }
      if (pst.swingPhase >= 1) { pst.swingPhase = -1; pst.charge = 0; }
    }

    if (tauntT > 0) {
      tauntT -= real;
      if (tauntT <= 0) pst.taunt = false;
    }

    // ---- world ----
    movePlayer(dt);
    pst.lookPitch = pitch;
    player.update(dt, pst);

    for (var i = 0; i < bodies.length; i++) {
      var b = bodies[i];
      if (b.state === 'fly') stepBody(b, dt);
      else if (b.ai) updateActor(b, dt);
    }
    chains(dt);

    // combo decay
    if (G.comboT > 0) {
      G.comboT -= real;
      if (G.comboT <= 0) { G.combo = 0; el.combo.classList.remove('on'); }
    }

    // ---- hud ----
    var show = pst.charging ? pst.charge : damp(G.meterShow, 0, real, 7);
    G.meterShow = show;
    el.meterFill.style.width = (show * 100).toFixed(1) + '%';
    if (show > 0.985) el.meter.classList.add('max'); else el.meter.classList.remove('max');
    if (pst.charging && pst.charge > 0.3) el.fist.classList.add('hot');
    else el.fist.classList.remove('hot');

    fx.update(dt);
    updateCamera(real);
    renderer.render(scene, camera);
  }

  /* ================= boot ================= */

  setScore(0);
  el.bestVal.textContent = fmt(G.best);
  el.loading.classList.add('hidden');
  requestAnimationFrame(frame);

  setTimeout(function () {
    toast('punch <b>anything</b>. everything counts.');
  }, 400);

})(window);
