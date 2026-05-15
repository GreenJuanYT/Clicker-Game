/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  playClick() {
    if (!this.enabled) return;
    this.initCtx();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx!.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(this.ctx!.currentTime + 0.1);
  }

  playUpgrade() {
    if (!this.enabled) return;
    this.initCtx();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, this.ctx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx!.currentTime + 0.2);

    gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(this.ctx!.currentTime + 0.2);
  }

  playError() {
    if (!this.enabled) return;
    this.initCtx();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, this.ctx!.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx!.currentTime + 0.2);

    gain.gain.setValueAtTime(0.05, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(this.ctx!.currentTime + 0.2);
  }

  playCritSound() {
    if (!this.enabled) return;
    this.initCtx();
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(800, this.ctx!.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx!.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(this.ctx!.currentTime + 0.3);
  }
}

export const soundService = new SoundService();
