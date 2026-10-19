/**
 * AudioManager
 * Menghasilkan sintetis efek suara (SFX) untuk swap, match, cascade, menang, dan kalah.
 */
const AudioManager = {
  context: null,
  enabled: true,
  interacted: false,

  unlock() {
    this.interacted = true;
  },

  play(kind) {
    if (!this.enabled || !this.interacted) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.context ||= new AC();
      if (this.context.state === "suspended") this.context.resume();

      const notes = {
        swap: [360],
        match: [520, 680],
        cascade: [650, 850],
        won: [520, 660, 790, 1050],
        lost: [350, 290, 220]
      }[kind] || [];

      notes.forEach((frequency, i) => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const at = this.context.currentTime + i * 0.075;

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.11, at + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);

        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.17);
      });
    } catch (_) {}
  }
};