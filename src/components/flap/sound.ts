/*
 * Flap clatter, synthesised. Off until the visitor turns it on.
 * Each click is a few milliseconds of decaying noise over a low knock.
 */

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let clicks: AudioBuffer[] = [];
let on = false;
let lastAt = 0;

function build(c: AudioContext) {
  const bufs: AudioBuffer[] = [];
  for (let v = 0; v < 6; v++) {
    const len = Math.floor(c.sampleRate * 0.022);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    const knock = 140 + v * 22;
    const decay = c.sampleRate * (0.0018 + v * 0.0003);
    for (let i = 0; i < len; i++) {
      const t = i / c.sampleRate;
      const noise = (Math.random() * 2 - 1) * Math.exp(-i / decay);
      const body = Math.sin(2 * Math.PI * knock * t) * Math.exp(-t / 0.005) * 0.55;
      d[i] = (noise * 0.7 + body) * 0.9;
    }
    bufs.push(b);
  }
  return bufs;
}

export function setSound(enabled: boolean) {
  on = enabled;
  if (!enabled || typeof window === "undefined") return;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = 0.22;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 90;
    out.connect(hp).connect(ctx.destination);
    clicks = build(ctx);
  }
  void ctx.resume();
}

export function soundOn() {
  return on;
}

export function clack() {
  if (!on || !ctx || !out) return;
  const now = ctx.currentTime;
  if (now - lastAt < 0.014) return;
  lastAt = now;
  const src = ctx.createBufferSource();
  src.buffer = clicks[(Math.random() * clicks.length) | 0];
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const g = ctx.createGain();
  g.gain.value = 0.5 + Math.random() * 0.5;
  src.connect(g).connect(out);
  src.start(now);
}
