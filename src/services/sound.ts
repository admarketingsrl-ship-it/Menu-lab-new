/**
 * Web Audio API synthesizer for restaurant notifications.
 * Generates crisp, realistic bell chimes and bill alerts without needing external audio files.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Check localStorage for saved mute state
    try {
      const saved = localStorage.getItem('menulab_sound_muted');
      if (saved === 'true') {
        this.isMuted = true;
      }
    } catch {
      this.isMuted = false;
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Unlock AudioContext on first user interaction (click, keypress, touch)
   */
  public unlockAudio() {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('menulab_sound_muted', muted ? 'true' : 'false');
    } catch {}
  }

  /**
   * Plays a classic, resonant brass restaurant service bell chime (Waiter Call).
   * Dual-harmonic frequency: fundamental 880Hz (A5) with rich 1760Hz and 2640Hz harmonics.
   */
  public playWaiterCallSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Bell 1: Fundamental A5 (880 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(875, now + 1.2);

      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      // Bell 2: Harmonic (1760 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now);

      gain2.gain.setValueAtTime(0.2, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      // Bell 3: Second strike 250ms later (Ding-Ding chime!)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1174.66, now + 0.22); // D6
      osc3.frequency.exponentialRampToValueAtTime(1170, now + 1.4);

      gain3.gain.setValueAtTime(0.001, now);
      gain3.gain.setValueAtTime(0.4, now + 0.22);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now + 0.22);

      osc1.stop(now + 1.3);
      osc2.stop(now + 0.9);
      osc3.stop(now + 1.6);
    } catch (e) {
      console.warn('Could not play waiter call sound:', e);
    }
  }

  /**
   * Plays a distinct, bright 3-tone cash register / bill chime (Bill Request).
   * Rapid ascending arpeggio: 659.25Hz (E5) -> 880Hz (A5) -> 1318.5Hz (E6)
   */
  public playBillRequestSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 659.25, time: 0.0, dur: 0.4 }, // E5
        { freq: 880.0, time: 0.15, dur: 0.4 },  // A5
        { freq: 1318.51, time: 0.30, dur: 0.9 } // E6
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.setValueAtTime(0.35, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur + 0.05);
      });
    } catch (e) {
      console.warn('Could not play bill request sound:', e);
    }
  }

  /**
   * Generic short test ding
   */
  public playTestSound() {
    this.playWaiterCallSound();
  }
}

export const soundService = new SoundService();
