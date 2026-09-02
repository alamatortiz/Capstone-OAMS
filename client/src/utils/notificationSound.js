// Short two-tone "ping" for a newly-arrived notification while the site is
// open, synthesized via the Web Audio API -- no sound asset file needed.
// Reuses a single AudioContext across calls rather than creating a new one
// each time (browsers cap how many can exist, and audio contexts start in a
// "suspended" state until a user gesture unlocks them -- see the resume()
// call below).
let sharedCtx = null;

export function playNotificationPing() {
  try {
    if (!sharedCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return; // Web Audio unsupported -- skip silently, non-critical
      sharedCtx = new AudioCtx();
    }
    if (sharedCtx.state === "suspended") sharedCtx.resume().catch(() => {});

    const ctx = sharedCtx;
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = now + i * 0.09;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.start(start);
      osc.stop(start + 0.16);
    });
  } catch {
    // Autoplay-blocked or unsupported browser -- a missed ping isn't critical,
    // the notification itself is still delivered via the bell/list either way.
  }
}
