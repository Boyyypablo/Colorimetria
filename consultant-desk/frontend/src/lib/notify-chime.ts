/** Três notas senoidais curtas — aviso suave, sem arquivo de áudio. */
let audio: AudioContext | null = null;
let lastPlayed = 0;

function context(): AudioContext | null {
  const AC =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!audio) audio = new AC();
  return audio;
}

export function unlockNotifyChime(): void {
  const ctx = context();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function playSoftChime(): void {
  const nowMs = Date.now();
  if (nowMs - lastPlayed < 1600) return;
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
  lastPlayed = nowMs;

  const start = ctx.currentTime + 0.02;
  const notes = [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const at = start + i * 0.11;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.04, at + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.66);
  });
}
