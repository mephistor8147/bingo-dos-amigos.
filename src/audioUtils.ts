export class AudioController {
  private ctx: AudioContext | null = null;
  private unlocking = false;

  public init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isUnlocked(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  public playPop() {
    if (!this.ctx) return;
    this.init();
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.1);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playCoin() {
    if (!this.ctx) return;
    this.init();
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + 0.1);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
    gain.gain.linearRampToValueAtTime(0, t + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.2);
  }

  public playCheer() {
    if (!this.ctx) return;
    this.init();
    
    // Simple noise burst for cheer
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 1.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.2);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(t);
  }

  public playMarkCard() {
    if (!this.ctx) return;
    this.init();
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.08);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.08);
  }

  public playChatMessage() {
    if (!this.ctx) return;
    this.init();
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, t);
    osc.frequency.setValueAtTime(800, t + 0.04);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.06);
    gain.gain.linearRampToValueAtTime(0, t + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.1);
  }

  public playWinnerFanfare() {
    if (!this.ctx) return;
    this.init();
    
    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    const durations = [0.12, 0.12, 0.12, 0.6];
    const delays = [0, 0.12, 0.24, 0.36];
    
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + delays[idx]);
      
      gain.gain.setValueAtTime(0, t + delays[idx]);
      gain.gain.linearRampToValueAtTime(0.25, t + delays[idx] + 0.03);
      gain.gain.linearRampToValueAtTime(0, t + delays[idx] + durations[idx]);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(t + delays[idx]);
      osc.stop(t + delays[idx] + durations[idx]);
    });
    
    this.playCheer();
  }

  private bgOscillator: OscillatorNode | null = null;
  private bgGain: GainNode | null = null;

  public speak(text: string, voiceGender: 'male' | 'female' = 'female') {
    try {
      if (!('speechSynthesis' in window)) return;
      
      // Stop any ongoing speech to avoid overlapping
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      
      const voices = window.speechSynthesis.getVoices() || [];
      // Try to pick a voice matching gender
      let selectedVoice = voices.find(v => v.lang && v.lang.includes('pt-BR'));
      
      if (voices.length > 0) {
        if (voiceGender === 'female') {
          const femaleVoice = voices.find(v => v.lang && v.lang.includes('pt') && v.name && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('maria')));
          if (femaleVoice) selectedVoice = femaleVoice;
        } else {
          const maleVoice = voices.find(v => v.lang && v.lang.includes('pt') && v.name && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('daniel')));
          if (maleVoice) selectedVoice = maleVoice;
        }
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis is modernly blocked or not supported in this frame:", e);
    }
  }

  public playBackgroundMusic(volume = 0.5) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    
    if (this.bgOscillator) {
      this.setBackgroundVolume(volume);
      return;
    }
    
    this.bgGain = this.ctx.createGain();
    this.bgGain.gain.value = volume * 0.05; // scaled down from full scale
    this.bgGain.connect(this.ctx.destination);
    
    this.bgOscillator = this.ctx.createOscillator();
    this.bgOscillator.type = 'triangle';
    this.bgOscillator.frequency.value = 220; // A3
    this.bgOscillator.connect(this.bgGain);
    
    this.bgOscillator.start();
    
    // Add some soft LFO to make it less annoying
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.5; // 0.5 Hz
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(this.bgOscillator.frequency);
    lfo.start();
  }

  public setBackgroundVolume(volume: number) {
    if (this.bgGain) {
      this.bgGain.gain.value = volume * 0.05;
    }
  }

  public stopBackgroundMusic() {
    if (this.bgOscillator) {
      try {
        this.bgOscillator.stop();
        this.bgOscillator.disconnect();
      } catch (e) {}
      this.bgOscillator = null;
    }
    if (this.bgGain) {
      this.bgGain.disconnect();
      this.bgGain = null;
    }
  }
}

export const audioController = new AudioController();
