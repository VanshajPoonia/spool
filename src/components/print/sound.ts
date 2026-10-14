/*
 * The strip printer, synthesised. Off until the visitor turns it on.
 * Each character is a few milliseconds of bright noise over a small tick.
 */

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let ticks: AudioBuffer[] = [];
let on = false;
let lastAt = 0;

function build(c: AudioContext) {
  const bufs: AudioBuffer[] = [];
  for (let v = 0; v < 6; v++) {
    const len = Math.floor(c.sampleRate * 0.012);
    const b = c.createBuffer(1, len, c.sampleRate);
    const d = b.getChannelData(0);
    const pitch = 1900 + v * 140;
    const decay = c.sampleRate * (0.0009 + v * 0.00015);
    for (let i = 0; i < len; i++) {
      const t = i / c.sampleRate;
      const noise = (Math.random() * 2 - 1) * Math.exp(-i / decay);
      const body = Math.sin(2 * Math.PI * pitch * t) * Math.exp(-t / 0.0022) * 0.35;
      d[i] = (noise * 0.6 + body) * 0.8;
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
    out.gain.value = 0.16;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 600;
    out.connect(hp).connect(ctx.destination);
    ticks = build(ctx);
  }
  void ctx.resume();
}

export function soundOn() {
  return on;
}

export function tick() {
  if (!on || !ctx || !out) return;
  const now = ctx.currentTime;
  if (now - lastAt < 0.03) return;
  lastAt = now;
  const src = ctx.createBufferSource();
  src.buffer = ticks[(Math.random() * ticks.length) | 0];
  src.playbackRate.value = 0.85 + Math.random() * 0.3;
  const g = ctx.createGain();
  g.gain.value = 0.45 + Math.random() * 0.4;
  src.connect(g).connect(out);
  src.start(now);
}
