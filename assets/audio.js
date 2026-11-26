/* ==========================================================================
   《山海汴京圖》Procedural Web Audio Synthesizer — Song Guqin + River Wind + Kun Call
   Zero Audio Files · Pentatonic Guqin Harmonics (宮商角徵羽) + Dynamics Compressor
   ========================================================================== */

window.ShanHaiAudio = (function () {
  "use strict";
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, musBus = null, ambBus = null, windGain = null;
  let timer = null, playing = false, step = 0;

  function hz(note) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(note);
    const st = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
    return 440 * Math.pow(2, (st + (+m[3] + 1) * 12 - 69) / 12);
  }

  function ensure() {
    if (!AC) return false;
    if (!ctx) {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 3.5;
      master = ctx.createGain(); master.gain.value = 0.9;
      musBus = ctx.createGain(); musBus.gain.value = 0.60;
      ambBus = ctx.createGain(); ambBus.gain.value = 0.55;

      // Mountain valley stereo feedback delay reverb
      const dly = ctx.createDelay(0.8); dly.delayTime.value = 0.36;
      const fb = ctx.createGain(); fb.gain.value = 0.34;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500;
      dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(master);

      musBus.connect(master); musBus.connect(dly);
      ambBus.connect(master);
      master.connect(comp); comp.connect(ctx.destination);

      // Gentle river breeze noise
      const nBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const ch = nBuf.getChannelData(0);
      let b0 = 0, b1 = 0;
      for (let i = 0; i < ch.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.996 * b0 + w * 0.03; b1 = 0.98 * b1 + w * 0.04;
        ch[i] = (b0 + b1) * 0.6;
      }
      const src = ctx.createBufferSource(); src.buffer = nBuf; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 420; bp.Q.value = 0.7;
      windGain = ctx.createGain(); windGain.gain.value = 0.0001;
      src.connect(bp); bp.connect(windGain); windGain.connect(ambBus);
      src.start();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return true;
  }

  // Guqin plucked string with gentle pitch slide (古琴散音／滑音)
  function guqin(note, at, dur, vol, slideFrom) {
    const f = hz(note);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(2200, at); lp.frequency.exponentialRampToValueAtTime(340, at + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    lp.connect(g); g.connect(musBus);

    const o1 = ctx.createOscillator(); o1.type = "triangle";
    if (slideFrom) {
      o1.frequency.setValueAtTime(hz(slideFrom), at);
      o1.frequency.exponentialRampToValueAtTime(f, at + 0.16);
    } else {
      o1.frequency.value = f;
    }
    const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = f * 2;
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    o1.start(at); o1.stop(at + dur + 0.08);
    o2.start(at); o2.stop(at + dur + 0.08);
  }

  // Guqin bell-like harmonic (泛音 — strictly integer overtones 1x, 2x)
  function harmonic(note, at, dur, vol) {
    const f = hz(note);
    [1, 2].forEach((m, i) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.linearRampToValueAtTime(vol / (i + 1), at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      g.connect(musBus);
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * m;
      o.connect(g); o.start(at); o.stop(at + dur + 0.06);
    });
  }

  // Deep resonant ethereal whale-like Kun hum over clouds
  function kunResonance(at) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.08, at + 1.1);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 3.4);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
    lp.connect(g); g.connect(ambBus);
    const o = ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(98, at);
    o.frequency.exponentialRampToValueAtTime(73.4, at + 3.2);
    o.connect(lp); o.start(at); o.stop(at + 3.5);
  }

  // Serene Song-Dynasty D-Pentatonic Guqin Phrase (D-E-G-A-B, downbeats locked to D/G/A/Bm)
  const SCORE = [
    { bass: "D2", m: "A3", h: "D5", sl: "G3" },
    { bass: null, m: "E4", h: null, sl: null },
    { bass: "A2", m: "D4", h: "A5", sl: null },
    { bass: null, m: null, h: "E5", sl: null },
    { bass: "G2", m: "B3", h: "G5", sl: "A3" },
    { bass: null, m: "D4", h: null, sl: null },
    { bass: "A2", m: "E4", h: "A5", sl: "D4" },
    { bass: null, m: "A3", h: "D5", sl: null, kun: true }
  ];

  function toggle(force) {
    const next = typeof force === "boolean" ? force : !playing;
    playing = next;
    if (timer) { clearInterval(timer); timer = null; }
    if (!playing) {
      if (ctx && windGain) windGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.35);
      return false;
    }
    if (!ensure()) { playing = false; return false; }
    windGain.gain.setTargetAtTime(0.11, ctx.currentTime, 0.6);
    const tick = () => {
      if (!playing || document.hidden) return;
      const bar = SCORE[step % SCORE.length];
      const t = ctx.currentTime + 0.06;
      if (bar.bass) guqin(bar.bass, t, 3.6, 0.16, null);
      if (bar.m) guqin(bar.m, t + 0.22, 2.4, 0.11, bar.sl);
      if (bar.h) harmonic(bar.h, t + 0.55, 2.2, 0.055);
      if (bar.kun) kunResonance(t + 0.3);
      step++;
    };
    tick();
    timer = setInterval(tick, 1350);
    return true;
  }

  function playEnterChime() {
    if (!ensure()) return;
    const t = ctx.currentTime + 0.02;
    guqin("D3", t, 2.6, 0.15, null);
    harmonic("A4", t + 0.12, 2.0, 0.065);
    harmonic("D5", t + 0.28, 2.4, 0.065);
  }

  return { toggle, playEnterChime, isPlaying: () => playing };
})();
