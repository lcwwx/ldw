/* ============================================================
   三小时 · 程序化音频
   全部音效由 Web Audio 实时合成，不加载任何音频文件。
   ============================================================ */
const AUDIO = (function () {
  let ctx = null, master = null, droneGain = null, filter = null;
  let oscs = [], lfo = null, lfoGain = null;
  let noiseBuf = null, noiseSrc = null, noiseGain = null, noiseFilter = null;
  let started = false;
  let volume = 0.55;
  let lastBlip = 0;

  const MOODS = {
    title:  { f: [65.41, 98.00, 130.81, 164.81], cut: 420, g: 0.55, lfo: 0.06 },
    dread:  { f: [55.00, 82.41, 110.00, 130.81], cut: 340, g: 0.60, lfo: 0.05 },
    warm:   { f: [73.42, 110.00, 146.83, 220.00], cut: 620, g: 0.55, lfo: 0.09 },
    silver: { f: [98.00, 146.83, 220.00, 293.66], cut: 1100, g: 0.50, lfo: 0.12 },
    fight:  { f: [82.41, 110.00, 164.81, 246.94], cut: 760, g: 0.62, lfo: 0.20 },
    ending: { f: [65.41, 98.00, 130.81, 196.00], cut: 520, g: 0.50, lfo: 0.04 }
  };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
    master = ctx.createGain();
    master.gain.value = volume * 0.6;
    master.connect(ctx.destination);

    /* --- 低频铺底 --- */
    droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 1.2;
    filter.connect(droneGain);
    droneGain.connect(master);

    [0, 1, 2, 3].forEach((i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = MOODS.title.f[i];
      o.detune.value = (i % 2 ? 6 : -6);
      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.32 : (i === 1 ? 0.22 : 0.14);
      o.connect(g); g.connect(filter);
      o.start();
      oscs.push(o);
    });

    /* --- 缓慢滤波摆动 --- */
    lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.06;
    lfoGain = ctx.createGain();
    lfoGain.gain.value = 120;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    /* --- 噪声底（风 / 人声感） --- */
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.55;
    noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;
    noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 500;
    noiseFilter.Q.value = 0.7;
    noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noiseSrc.start();

    droneGain.gain.setTargetAtTime(0.5, ctx.currentTime, 2.2);
    noiseGain.gain.setTargetAtTime(0.10, ctx.currentTime, 3.0);
    started = true;
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v / 100));
    if (master) master.gain.setTargetAtTime(volume * 0.6, ctx.currentTime, 0.15);
  }

  function mood(name) {
    if (!ctx) return;
    const m = MOODS[name] || MOODS.title;
    const t = ctx.currentTime;
    m.f.forEach((f, i) => {
      if (oscs[i]) oscs[i].frequency.setTargetAtTime(f, t, 1.4);
    });
    filter.frequency.setTargetAtTime(m.cut, t, 1.8);
    if (lfo) lfo.frequency.setTargetAtTime(m.lfo, t, 1.0);
    droneGain.gain.setTargetAtTime(m.g, t, 1.6);
    noiseGain.gain.setTargetAtTime(name === 'title' ? 0.06 : 0.12, t, 2.0);
    if (noiseFilter) noiseFilter.frequency.setTargetAtTime(name === 'fight' ? 900 : 460, t, 2.0);
  }

  /* ---------- 基础发声器 ---------- */
  function tone(freq, dur, type, gain, slideTo, delay) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, type, freq, q, gain, delay) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = freq || 800;
    f.Q.value = q == null ? 0.8 : q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + Math.min(0.03, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.1);
  }

  const SFX = {
    blip() {
      const now = performance.now();
      if (now - lastBlip < 38) return;
      lastBlip = now;
      tone(520 + Math.random() * 120, 0.045, 'sine', 0.035);
    },
    click() { tone(880, 0.05, 'triangle', 0.05); },
    tick() { tone(180, 0.09, 'square', 0.03, 120); },
    alert() { tone(880, 0.16, 'square', 0.05); tone(660, 0.22, 'square', 0.045, null, 0.20); },
    room() { noise(1.6, 'lowpass', 300, 0.6, 0.05); },
    wind() { noise(1.4, 'bandpass', 600, 0.5, 0.08); },
    crowd() { noise(1.1, 'bandpass', 950, 0.6, 0.07); },
    step() { tone(90, 0.12, 'sine', 0.06, 55); noise(0.1, 'lowpass', 350, 0.7, 0.04); },
    glass() { noise(0.32, 'highpass', 3600, 0.6, 0.09); noise(0.12, 'bandpass', 2200, 1.4, 0.06, 0.05); },
    crash() { noise(0.55, 'lowpass', 700, 0.6, 0.11); tone(70, 0.4, 'sine', 0.07, 40); },
    warm() { tone(523.25, 0.5, 'sine', 0.05); tone(784, 0.55, 'sine', 0.03, null, 0.04); },
    riser() {
      if (!ctx) return;
      const t0 = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, t0);
      o.frequency.exponentialRampToValueAtTime(900, t0 + 1.5);
      f.type = 'lowpass'; f.frequency.setValueAtTime(200, t0);
      f.frequency.exponentialRampToValueAtTime(4000, t0 + 1.5);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t0); o.stop(t0 + 1.9);
      noise(1.6, 'highpass', 1800, 0.5, 0.05);
    },
    choir() {
      [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
        tone(f, 2.4, 'sine', 0.03, null, i * 0.12);
        tone(f * 1.005, 2.2, 'sine', 0.018, null, i * 0.12 + 0.05);
      });
      noise(2.0, 'bandpass', 1200, 0.4, 0.03);
    },
    boom() {
      tone(62, 1.2, 'sine', 0.16, 28);
      noise(1.1, 'lowpass', 420, 0.7, 0.14);
    },
    chapter() {
      tone(110, 0.7, 'sine', 0.06, 82);
      tone(1320, 0.9, 'sine', 0.012, null, 0.06);
      noise(0.8, 'lowpass', 500, 0.6, 0.04);
    },
    ending() {
      [130.81, 196.00, 261.63, 392.00].forEach((f, i) => tone(f, 3.2, 'sine', 0.045, null, i * 0.18));
      noise(2.6, 'bandpass', 900, 0.4, 0.03);
    }
  };

  function sfx(name) {
    if (!ctx || !started) return;
    if (volume <= 0) return;
    const fn = SFX[name];
    if (fn) { try { fn(); } catch (e) { } }
  }

  return { init, setVolume, mood, sfx, get ready() { return !!ctx; } };
})();
