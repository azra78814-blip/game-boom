/* STREET YEET — audio.js
   Every sound is synthesized live in WebAudio. No files, no loading. */
(function (root) {
  'use strict';

  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, master = null, revBus = null, muted = false, noiseBuf = null;
  var ambNodes = [];

  function now() { return ctx.currentTime; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------- graph ---------- */
  function init() {
    if (ctx) return ctx;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0.85;

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 26;
    comp.ratio.value = 7;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;

    master.connect(comp);
    comp.connect(ctx.destination);

    // cheap "street canyon" reverb from a noise impulse
    var conv = ctx.createConvolver();
    conv.buffer = impulse(1.5, 2.4);
    revBus = ctx.createGain();
    revBus.gain.value = 0.3;
    revBus.connect(conv);
    conv.connect(master);

    noiseBuf = makeNoise(2);
    return ctx;
  }

  function impulse(sec, decay) {
    var n = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < n; i++) {
        var t = i / n;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
      }
    }
    return buf;
  }

  function makeNoise(sec) {
    var n = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---------- primitives ---------- */
  function env(gain, t, peak, atk, dec, hold) {
    hold = hold || 0;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + atk);
    if (hold) gain.gain.setValueAtTime(Math.max(peak, 0.0002), t + atk + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + atk + hold + dec);
  }

  function tone(o) {
    if (!ctx || muted) return null;
    var t = (o.at || now()) + 0;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 != null) {
      if (o.f1 > 0) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.sweep || o.dec || 0.2));
      else osc.frequency.linearRampToValueAtTime(1, t + (o.sweep || 0.2));
    }
    if (o.detune) osc.detune.value = o.detune;
    env(g, t, o.gain == null ? 0.3 : o.gain, o.atk || 0.004, o.dec || 0.2, o.hold);
    var last = g;
    if (o.filter) {
      var bp = ctx.createBiquadFilter();
      bp.type = o.filter;
      bp.frequency.value = o.fc || 900;
      bp.Q.value = o.q || 1;
      g.connect(bp); last = bp;
    }
    osc.connect(g);
    last.connect(master);
    if (o.rev) { var rg = ctx.createGain(); rg.gain.value = o.rev; last.connect(rg); rg.connect(revBus); }
    osc.start(t);
    osc.stop(t + (o.atk || 0.004) + (o.hold || 0) + (o.dec || 0.2) + 0.06);
    return osc;
  }

  function noise(o) {
    if (!ctx || muted) return null;
    var t = (o.at || now());
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.value = o.rate || 1;
    var f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.fc || 800, t);
    if (o.fc1) f.frequency.exponentialRampToValueAtTime(o.fc1, t + (o.sweep || o.dec || 0.2));
    f.Q.value = o.q == null ? 0.8 : o.q;
    var g = ctx.createGain();
    env(g, t, o.gain == null ? 0.3 : o.gain, o.atk || 0.005, o.dec || 0.2, o.hold);
    src.connect(f); f.connect(g); g.connect(master);
    if (o.rev) { var rg = ctx.createGain(); rg.gain.value = o.rev; g.connect(rg); rg.connect(revBus); }
    src.start(t, Math.random() * 1.2);
    src.stop(t + (o.atk || 0.005) + (o.hold || 0) + (o.dec || 0.2) + 0.05);
    return src;
  }

  /* ---------- the fun stuff ---------- */

  // Cartoon "YEEEET!" — sawtooth through a sweeping formant filter.
  function yeetVoice(power) {
    if (!ctx || muted) return;
    var t = now(), p = clamp(power || 0.6, 0, 1);
    var dur = 0.4 + p * 0.42;
    var base = 210 + p * 130 + rnd(-14, 14);

    var osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * 0.72, t);
    osc.frequency.linearRampToValueAtTime(base * 1.5, t + dur * 0.2);   // "yee"
    osc.frequency.linearRampToValueAtTime(base * 1.28, t + dur * 0.78); // hold
    osc.frequency.linearRampToValueAtTime(base * 0.62, t + dur);        // "t" drop

    // two formants ≈ a vowel
    var f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass'; f1.Q.value = 5;
    f1.frequency.setValueAtTime(520, t);
    f1.frequency.linearRampToValueAtTime(340, t + dur * 0.25); // ee
    f1.frequency.linearRampToValueAtTime(430, t + dur);

    var f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.Q.value = 7;
    f2.frequency.setValueAtTime(1750, t);
    f2.frequency.linearRampToValueAtTime(2450, t + dur * 0.25);
    f2.frequency.linearRampToValueAtTime(1900, t + dur);

    var vib = ctx.createOscillator(), vibg = ctx.createGain();
    vib.frequency.value = 11 + p * 7; vibg.gain.value = 7 + p * 9;
    vib.connect(vibg); vibg.connect(osc.frequency);

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34 + p * 0.16, t + 0.03);
    g.gain.setValueAtTime(0.34 + p * 0.16, t + dur * 0.82);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);

    osc.connect(f1); f1.connect(f2); f2.connect(g); g.connect(master);
    var rg = ctx.createGain(); rg.gain.value = 0.5; g.connect(rg); rg.connect(revBus);

    osc.start(t); vib.start(t);
    osc.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);

    // consonant burst on the T
    noise({ at: t + dur - 0.02, filter: 'highpass', fc: 3600, gain: 0.2, atk: 0.002, dec: 0.07 });
  }

  function whoosh(power) {
    var p = clamp(power || 0.5, 0, 1), t = now();
    noise({ at: t, filter: 'bandpass', fc: 260, fc1: 2400 + p * 2600, q: 0.7,
            gain: 0.16 + p * 0.3, atk: 0.05, dec: 0.16, sweep: 0.17, rev: 0.25 });
    tone({ at: t, type: 'sine', f0: 90, f1: 40, gain: 0.16 + p * 0.2, atk: 0.03, dec: 0.2 });
  }

  function impact(power, kind) {
    if (!ctx || muted) return;
    var p = clamp(power || 0.5, 0, 1), t = now();

    // shared body: deep punch
    tone({ at: t, type: 'sine', f0: 150 + p * 60, f1: 34, gain: 0.44 + p * 0.3,
           atk: 0.002, dec: 0.24 + p * 0.2, rev: 0.4 });
    noise({ at: t, filter: 'lowpass', fc: 1100, q: 0.6, gain: 0.3 + p * 0.24,
            atk: 0.001, dec: 0.1, rev: 0.3 });

    switch (kind) {
      case 'metal':
        [1, 1.51, 2.13, 2.78, 3.9].forEach(function (m, i) {
          tone({ at: t + i * 0.004, type: 'triangle', f0: 380 * m + rnd(-9, 9),
                 gain: (0.2 + p * 0.16) / (1 + i * 0.7), atk: 0.001,
                 dec: 0.7 + 0.5 * p, rev: 0.6 });
        });
        noise({ at: t, filter: 'highpass', fc: 4200, gain: 0.2, atk: 0.001, dec: 0.2 });
        break;
      case 'glass':
        for (var i = 0; i < 13; i++) {
          tone({ at: t + rnd(0, 0.14), type: 'triangle', f0: rnd(2100, 6800),
                 gain: rnd(0.05, 0.15), atk: 0.001, dec: rnd(0.08, 0.3), rev: 0.5 });
        }
        noise({ at: t, filter: 'highpass', fc: 3000, gain: 0.26, atk: 0.002, dec: 0.34 });
        break;
      case 'wood':
        tone({ at: t, type: 'square', f0: 240, f1: 90, gain: 0.24, atk: 0.001, dec: 0.13 });
        noise({ at: t, filter: 'bandpass', fc: 1500, q: 2, gain: 0.28, atk: 0.001, dec: 0.16 });
        break;
      case 'flesh':
        // squishy slap + indignant squeak
        noise({ at: t, filter: 'bandpass', fc: 420, q: 1.1, gain: 0.34 + p * 0.2,
                atk: 0.001, dec: 0.13 });
        tone({ at: t + 0.05, type: 'sawtooth', f0: rnd(430, 700), f1: rnd(160, 300),
               gain: 0.19, atk: 0.01, dec: 0.24, filter: 'bandpass', fc: 1300, q: 4, rev: 0.4 });
        break;
      case 'plastic':
        tone({ at: t, type: 'square', f0: 520, f1: 180, gain: 0.2, atk: 0.001, dec: 0.1 });
        noise({ at: t, filter: 'bandpass', fc: 2400, q: 1.4, gain: 0.2, atk: 0.001, dec: 0.09 });
        break;
      default: // stone / generic
        noise({ at: t, filter: 'bandpass', fc: 700, q: 0.9, gain: 0.3, atk: 0.001, dec: 0.2 });
    }

    if (p > 0.8) { // MEGA — add a sub drop + riser tail
      tone({ at: t, type: 'sine', f0: 70, f1: 22, gain: 0.5, atk: 0.004, dec: 0.9, rev: 0.6 });
      noise({ at: t + 0.02, filter: 'lowpass', fc: 380, gain: 0.3, atk: 0.02, dec: 0.7, rev: 0.5 });
    }
  }

  // cartoon falling whistle while something is airborne a long time
  function whistle(dur, power) {
    if (!ctx || muted) return null;
    var t = now(), d = clamp(dur || 1.2, 0.3, 4);
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500 + (power || 0.5) * 900, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.08);
    g.gain.setValueAtTime(0.11, t + d * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    var trm = ctx.createOscillator(), trg = ctx.createGain();
    trm.frequency.value = 6; trg.gain.value = 90;
    trm.connect(trg); trg.connect(osc.frequency);
    osc.connect(g); g.connect(master);
    var rg = ctx.createGain(); rg.gain.value = 0.4; g.connect(rg); rg.connect(revBus);
    osc.start(t); trm.start(t);
    osc.stop(t + d + 0.05); trm.stop(t + d + 0.05);
    return { stop: function () { try { osc.stop(now() + 0.05); trm.stop(now() + 0.05); } catch (e) {} } };
  }

  // far-away landing: muffled boom, quieter with distance
  function land(dist, kind) {
    if (!ctx || muted) return;
    var far = clamp((dist || 20) / 320, 0, 1), t = now();
    var g = 0.42 * (1 - far * 0.7);
    tone({ at: t, type: 'sine', f0: 110 - far * 45, f1: 26, gain: g, atk: 0.004,
           dec: 0.4 + far * 0.7, rev: 0.4 + far * 0.5 });
    noise({ at: t, filter: 'lowpass', fc: 900 - far * 650, gain: g * 0.8, atk: 0.002,
            dec: 0.24 + far * 0.5, rev: 0.3 + far * 0.6 });
    if (kind === 'metal') tone({ at: t + 0.01, type: 'triangle', f0: 300, gain: 0.1 * (1 - far),
                                 atk: 0.001, dec: 0.6, rev: 0.6 });
    if (far > 0.55) { // horizon echo
      noise({ at: t + 0.28, filter: 'lowpass', fc: 260, gain: 0.1, atk: 0.05, dec: 0.9, rev: 0.9 });
    }
  }

  function bounce(power, kind) {
    var p = clamp(power || 0.4, 0, 1);
    tone({ type: 'sine', f0: 300 + p * 260, f1: 90, gain: 0.13 + p * 0.14,
           atk: 0.002, dec: 0.14, rev: 0.25 });
    if (kind === 'metal') tone({ type: 'triangle', f0: 900, gain: 0.07, atk: 0.001, dec: 0.35, rev: 0.5 });
  }

  // rising charge hum, returns handle
  function charge() {
    if (!ctx || muted) return { set: function () {}, stop: function () {} };
    var t = now();
    var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.value = 62; o2.frequency.value = 93; o2.detune.value = 12;
    lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.1);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
    o1.start(t); o2.start(t);
    var dead = false;
    return {
      set: function (p) {
        if (dead) return;
        var tt = now();
        o1.frequency.setTargetAtTime(62 + p * 250, tt, 0.05);
        o2.frequency.setTargetAtTime(93 + p * 380, tt, 0.05);
        lp.frequency.setTargetAtTime(420 + p * 2600, tt, 0.05);
        g.gain.setTargetAtTime(0.07 + p * 0.16, tt, 0.05);
      },
      stop: function () {
        if (dead) return; dead = true;
        var tt = now();
        g.gain.cancelScheduledValues(tt);
        g.gain.setTargetAtTime(0.0001, tt, 0.03);
        try { o1.stop(tt + 0.2); o2.stop(tt + 0.2); } catch (e) {}
      }
    };
  }

  function chargeFull() {
    tone({ type: 'square', f0: 1180, gain: 0.1, atk: 0.002, dec: 0.1, hold: 0.03 });
    tone({ at: now() + 0.09, type: 'square', f0: 1760, gain: 0.1, atk: 0.002, dec: 0.14 });
  }

  function combo(n) {
    var t = now(), steps = clamp(n, 2, 8);
    for (var i = 0; i < 3; i++) {
      tone({ at: t + i * 0.055, type: 'triangle',
             f0: 520 * Math.pow(2, (steps - 2) / 12) * Math.pow(1.26, i),
             gain: 0.17, atk: 0.002, dec: 0.16, rev: 0.4 });
    }
  }

  function record() { // new best
    var t = now(), f = [523, 659, 784, 1047, 1319];
    f.forEach(function (fr, i) {
      tone({ at: t + i * 0.075, type: 'triangle', f0: fr, gain: 0.16, atk: 0.003,
             dec: 0.4, rev: 0.6 });
      tone({ at: t + i * 0.075, type: 'sine', f0: fr * 2, gain: 0.07, atk: 0.003, dec: 0.3 });
    });
  }

  function ding() {
    tone({ type: 'triangle', f0: 1320, gain: 0.13, atk: 0.002, dec: 0.32, rev: 0.5 });
    tone({ type: 'sine', f0: 1980, gain: 0.06, atk: 0.002, dec: 0.22 });
  }

  function step(run) {
    noise({ filter: 'bandpass', fc: run ? 260 : 190, q: 1.4,
            gain: run ? 0.11 : 0.06, atk: 0.001, dec: 0.06 });
  }

  function hop() {
    tone({ type: 'sine', f0: 240, f1: 620, gain: 0.14, atk: 0.006, dec: 0.14, sweep: 0.13 });
  }

  function landPlayer() {
    noise({ filter: 'lowpass', fc: 400, gain: 0.16, atk: 0.001, dec: 0.11 });
    tone({ type: 'sine', f0: 120, f1: 55, gain: 0.16, atk: 0.002, dec: 0.14 });
  }

  function taunt() {
    if (!ctx || muted) return;
    var t = now(), base = rnd(300, 380);
    [0, 0.13, 0.3].forEach(function (d, i) {
      tone({ at: t + d, type: 'sawtooth', f0: base * (1 + i * 0.22),
             f1: base * (1 + i * 0.22) * 0.7, gain: 0.16, atk: 0.01, dec: 0.16,
             filter: 'bandpass', fc: 1200, q: 4, rev: 0.4 });
    });
  }

  function alarm() { // car alarm after you clobber a car
    if (!ctx || muted) return;
    var t = now();
    for (var i = 0; i < 6; i++) {
      tone({ at: t + i * 0.19, type: 'square', f0: i % 2 ? 780 : 990, gain: 0.075,
             atk: 0.004, dec: 0.1, hold: 0.05, rev: 0.5 });
    }
  }

  function coo() {
    if (!ctx || muted) return;
    var t = now();
    for (var i = 0; i < 3; i++)
      tone({ at: t + i * 0.13, type: 'sine', f0: rnd(420, 560), f1: rnd(300, 380),
             gain: 0.05, atk: 0.02, dec: 0.12, rev: 0.4 });
    noise({ at: t + 0.4, filter: 'bandpass', fc: 900, q: 1, gain: 0.07, atk: 0.02,
            dec: 0.3, rev: 0.4 }); // wings
  }

  function bark() {
    var t = now();
    tone({ at: t, type: 'sawtooth', f0: 380, f1: 170, gain: 0.16, atk: 0.004, dec: 0.14,
           filter: 'bandpass', fc: 900, q: 3, rev: 0.4 });
    tone({ at: t + 0.17, type: 'sawtooth', f0: 340, f1: 150, gain: 0.12, atk: 0.004,
           dec: 0.12, filter: 'bandpass', fc: 850, q: 3, rev: 0.4 });
  }

  function scream() { // NPC yelling as they leave the atmosphere
    if (!ctx || muted) return;
    var t = now(), d = rnd(0.7, 1.1);
    var osc = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(rnd(560, 760), t);
    osc.frequency.linearRampToValueAtTime(rnd(300, 420), t + d);
    bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 3.5;
    var vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 16; vg.gain.value = 34;
    vib.connect(vg); vg.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(bp); bp.connect(g); g.connect(master);
    var rg = ctx.createGain(); rg.gain.value = 0.6; g.connect(rg); rg.connect(revBus);
    osc.start(t); vib.start(t); osc.stop(t + d + 0.05); vib.stop(t + d + 0.05);
  }

  function slowmoIn() {
    tone({ type: 'sine', f0: 420, f1: 90, gain: 0.15, atk: 0.01, dec: 0.5, sweep: 0.4, rev: 0.6 });
  }

  /* ---------- ambience: wind + distant traffic ---------- */
  function ambience(on) {
    if (!ctx) return;
    if (!on) {
      ambNodes.forEach(function (n) { try { n.stop(); } catch (e) {} });
      ambNodes = []; return;
    }
    if (ambNodes.length) return;
    var t = now();
    // wind
    var w = ctx.createBufferSource(); w.buffer = noiseBuf; w.loop = true;
    var wf = ctx.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 420;
    var wg = ctx.createGain(); wg.gain.value = 0.035;
    var lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.12; lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(wg.gain);
    w.connect(wf); wf.connect(wg); wg.connect(master);
    w.start(t); lfo.start(t);
    // distant traffic rumble
    var r = ctx.createBufferSource(); r.buffer = noiseBuf; r.loop = true;
    r.playbackRate.value = 0.3;
    var rf = ctx.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 160;
    var rg2 = ctx.createGain(); rg2.gain.value = 0.05;
    r.connect(rf); rf.connect(rg2); rg2.connect(master);
    r.start(t);
    ambNodes = [w, lfo, r];
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.85, now(), 0.05);
    return muted;
  }
  function isMuted() { return muted; }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  root.SY = root.SY || {};
  root.SY.audio = {
    init: init, resume: resume, setMuted: setMuted, isMuted: isMuted,
    whoosh: whoosh, impact: impact, yeetVoice: yeetVoice, whistle: whistle,
    land: land, bounce: bounce, charge: charge, chargeFull: chargeFull,
    combo: combo, record: record, ding: ding, step: step, hop: hop,
    landPlayer: landPlayer, taunt: taunt, alarm: alarm, coo: coo, bark: bark,
    scream: scream, slowmoIn: slowmoIn, ambience: ambience
  };
})(window);
