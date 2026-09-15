import { EQ_FREQUENCIES, EQSettings, AudioEnhancements } from '../types';

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [4.5, 3.0, 1.5, 0, -1.5, -1.0, 1.0, 2.5, 4.0, 4.5],
  Pop: [-1.0, 1.0, 3.0, 4.0, 3.5, 1.5, -0.5, -1.0, 2.0, 3.0],
  Jazz: [3.0, 2.0, 1.0, 1.5, -1.5, -1.5, 0, 1.5, 3.0, 3.5],
  Classical: [4.0, 3.0, 2.5, 2.0, -1.0, -1.0, 0, 2.0, 3.0, 3.5],
  'Hip-Hop': [5.5, 4.5, 2.0, 1.0, -1.0, -1.0, 1.5, -1.0, 2.5, 3.5],
  Electronic: [5.0, 4.0, 1.5, 0, -2.0, 1.5, 1.0, 2.0, 4.5, 4.5],
  'Bass Boost': [6.0, 5.0, 4.0, 2.5, 1.0, 0, 0, 0, 0, 0],
  Vocal: [-2.0, -1.5, -1.0, 1.5, 4.0, 4.5, 3.5, 1.5, -1.0, -2.0],
  Custom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private preampNode: GainNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private isConnectedToElement = false;
  private currentElement: HTMLMediaElement | null = null;

  // --- Pioneer DJM-750MK2 DJ Mixer Nodes ---
  private djLowFilter: BiquadFilterNode | null = null;
  private djMidFilter: BiquadFilterNode | null = null;
  private djHighFilter: BiquadFilterNode | null = null;
  private djColorFilter: BiquadFilterNode | null = null;
  private djChannelGain: GainNode | null = null;
  private djMasterGain: GainNode | null = null;
  private djDelayNode: DelayNode | null = null;
  private djDelayFeedback: GainNode | null = null;
  private djDelayWetGain: GainNode | null = null;
  private djDelayDryGain: GainNode | null = null;
  private djNoiseSource: AudioBufferSourceNode | null = null;
  private djNoiseGain: GainNode | null = null;
  private activeBeatFxName = 'ECHO';
  private isBeatFxOn = false;
  private peakLevelL = 0;
  private peakLevelR = 0;

  // Vinyl Crackle Noise Generator
  private vinylCrackleBuffer: AudioBuffer | null = null;
  private vinylCrackleSource: AudioBufferSourceNode | null = null;
  private vinylCrackleGain: GainNode | null = null;
  private isVinylCrackleEnabled = false;
  private vinylCrackleVolume = 0.18;

  public isSupported = true;

  constructor() {
    // Check Web Audio API support
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) {
      this.isSupported = false;
    }
  }

  private initContext() {
    if (this.ctx) return;
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return;

    this.ctx = new AudioCtxClass();

    // Create Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    // Create Preamp Gain
    this.preampNode = this.ctx.createGain();

    // Create 10-band EQ filters
    this.eqFilters = EQ_FREQUENCIES.map((band, i) => {
      const filter = this.ctx!.createBiquadFilter();
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = band.frequency;
      filter.gain.value = 0;
      return filter;
    });

    // Dedicated Bass Boost filter
    this.bassFilter = this.ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 100;
    this.bassFilter.gain.value = 0;

    // Dedicated Treble filter
    this.trebleFilter = this.ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 8000;
    this.trebleFilter.gain.value = 0;

    // Stereo Panner (if supported)
    if (this.ctx.createStereoPanner) {
      this.pannerNode = this.ctx.createStereoPanner();
    }

    // Dynamics Compressor for Loudness Normalization
    this.compressorNode = this.ctx.createDynamicsCompressor();
    this.compressorNode.threshold.value = -24;
    this.compressorNode.knee.value = 30;
    this.compressorNode.ratio.value = 12;
    this.compressorNode.attack.value = 0.003;
    this.compressorNode.release.value = 0.25;

    // --- Pioneer DJM-750MK2 Hardware Audio DSP Chain ---
    // 1. DJ 3-band Isolator/EQ filters
    this.djLowFilter = this.ctx.createBiquadFilter();
    this.djLowFilter.type = 'lowshelf';
    this.djLowFilter.frequency.value = 200;
    this.djLowFilter.gain.value = 0;

    this.djMidFilter = this.ctx.createBiquadFilter();
    this.djMidFilter.type = 'peaking';
    this.djMidFilter.frequency.value = 1000;
    this.djMidFilter.Q.value = 1.0;
    this.djMidFilter.gain.value = 0;

    this.djHighFilter = this.ctx.createBiquadFilter();
    this.djHighFilter.type = 'highshelf';
    this.djHighFilter.frequency.value = 5000;
    this.djHighFilter.gain.value = 0;

    // 2. Sound Color FX Filter (Dual LPF/HPF)
    this.djColorFilter = this.ctx.createBiquadFilter();
    this.djColorFilter.type = 'allpass';
    this.djColorFilter.frequency.value = 1000;
    this.djColorFilter.Q.value = 1.2;

    // 3. Channel Fader Gain
    this.djChannelGain = this.ctx.createGain();
    this.djChannelGain.gain.value = 1.0;

    // 4. Beat FX Delay Loop
    this.djDelayNode = this.ctx.createDelay(4.0);
    this.djDelayNode.delayTime.value = 0.35; // default ~120bpm quarter note

    this.djDelayFeedback = this.ctx.createGain();
    this.djDelayFeedback.gain.value = 0.45;

    this.djDelayNode.connect(this.djDelayFeedback);
    this.djDelayFeedback.connect(this.djDelayNode);

    this.djDelayWetGain = this.ctx.createGain();
    this.djDelayWetGain.gain.value = 0;

    this.djDelayDryGain = this.ctx.createGain();
    this.djDelayDryGain.gain.value = 1.0;

    // 5. DJ Master Output Level
    this.djMasterGain = this.ctx.createGain();
    this.djMasterGain.gain.value = 1.0;

    // Connect Preamp -> DJ 3-Band EQ -> DJ Color FX -> DJ Channel Fader
    let lastNode: AudioNode = this.preampNode;
    lastNode.connect(this.djLowFilter);
    this.djLowFilter.connect(this.djMidFilter);
    this.djMidFilter.connect(this.djHighFilter);
    this.djHighFilter.connect(this.djColorFilter);
    this.djColorFilter.connect(this.djChannelGain);
    lastNode = this.djChannelGain;

    // Route to 10-band audiophile filters
    for (const filter of this.eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }

    lastNode.connect(this.bassFilter);
    lastNode = this.bassFilter;

    lastNode.connect(this.trebleFilter);
    lastNode = this.trebleFilter;

    if (this.pannerNode) {
      lastNode.connect(this.pannerNode);
      lastNode = this.pannerNode;
    }

    lastNode.connect(this.compressorNode);
    lastNode = this.compressorNode;

    // Beat FX Send / Return Insert
    lastNode.connect(this.djDelayDryGain);
    lastNode.connect(this.djDelayNode);
    this.djDelayNode.connect(this.djDelayWetGain);

    this.djDelayDryGain.connect(this.djMasterGain);
    this.djDelayWetGain.connect(this.djMasterGain);

    this.djMasterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public attachMediaElement(element: HTMLMediaElement): boolean {
    try {
      this.initContext();
      if (!this.ctx || !this.preampNode) return false;

      if (this.currentElement === element && this.isConnectedToElement) {
        return true;
      }

      // Resume context if suspended
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      if (this.currentElement !== element) {
        this.currentElement = element;
        // createMediaElementSource can only be called once per element
        try {
          this.sourceNode = this.ctx.createMediaElementSource(element);
          this.sourceNode.connect(this.preampNode);
          this.isConnectedToElement = true;
        } catch (e) {
          // If already connected or cross-origin restrictions, handle gracefully
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`Media element source already created or restricted: ${msg}`);
        }
      }
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Web Audio attachment warning: ${msg}`);
      return false;
    }
  }

  public get isInitialized(): boolean {
    return this.isConnectedToElement && this.ctx !== null;
  }

  public init(element: HTMLMediaElement): boolean {
    return this.attachMediaElement(element);
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public applyEQ(settings: EQSettings) {
    if (!this.ctx) return;

    if (this.preampNode) {
      // Convert dB to linear gain: 10^(dB / 20)
      const gainLinear = Math.pow(10, settings.preamp / 20);
      this.preampNode.gain.setValueAtTime(gainLinear, this.ctx.currentTime);
    }

    // Apply bands
    this.eqFilters.forEach((filter, index) => {
      const db = settings.bands[index] ?? 0;
      filter.gain.setValueAtTime(db, this.ctx!.currentTime);
    });

    // Apply quick bass and treble
    if (this.bassFilter) {
      this.bassFilter.gain.setValueAtTime(settings.bass, this.ctx.currentTime);
    }
    if (this.trebleFilter) {
      this.trebleFilter.gain.setValueAtTime(settings.treble, this.ctx.currentTime);
    }

    // Apply balance
    if (this.pannerNode) {
      this.pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, settings.balance)), this.ctx.currentTime);
    }
  }

  public applyEnhancements(enhancements: AudioEnhancements) {
    if (!this.ctx) return;

    if (this.bassFilter && enhancements.bassBoost) {
      this.bassFilter.gain.setValueAtTime(6.0, this.ctx.currentTime);
    }

    if (this.compressorNode) {
      if (enhancements.compressor || enhancements.loudnessNorm) {
        this.compressorNode.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressorNode.ratio.setValueAtTime(8, this.ctx.currentTime);
      } else {
        // Transparent compressor pass-through
        this.compressorNode.threshold.setValueAtTime(0, this.ctx.currentTime);
        this.compressorNode.ratio.setValueAtTime(1, this.ctx.currentTime);
      }
    }
  }

  public getFrequencyData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  public getTimeDomainData(array: Uint8Array): void {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  // Real-time audio levels calculation (RMS, frequency energy, and peak hold) for VU Meters
  public getRealtimeAudioLevels(): { left: number; right: number; peakL: number; peakR: number } {
    if (!this.analyser) {
      return { left: 0, right: 0, peakL: 0, peakR: 0 };
    }

    const bufferLength = this.analyser.fftSize;
    const timeData = new Uint8Array(bufferLength);
    this.analyser.getByteTimeDomainData(timeData);

    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqData);

    // Calculate RMS from time domain data
    let sumSquaresL = 0;
    let sumSquaresR = 0;
    const half = Math.floor(timeData.length / 2);

    for (let i = 0; i < half; i++) {
      const valL = (timeData[i] - 128) / 128;
      sumSquaresL += valL * valL;
      const valR = (timeData[i + half] - 128) / 128;
      sumSquaresR += valR * valR;
    }

    const rmsL = Math.sqrt(sumSquaresL / Math.max(1, half));
    const rmsR = Math.sqrt(sumSquaresR / Math.max(1, half));

    // Also get frequency energy
    let lowEnergy = 0;
    let highEnergy = 0;
    const freqBins = freqData.length;
    const splitIndex = Math.floor(freqBins * 0.35);
    for (let i = 0; i < splitIndex; i++) {
      lowEnergy += freqData[i];
    }
    for (let i = splitIndex; i < freqBins; i++) {
      highEnergy += freqData[i];
    }
    const avgLow = lowEnergy / (Math.max(1, splitIndex) * 255);
    const avgHigh = highEnergy / (Math.max(1, freqBins - splitIndex) * 255);

    // Combine for expressive stereo response (Left leans low-mid, Right leans mid-high)
    const leftLevel = Math.min(1, Math.max(0, rmsL * 2.4 + avgLow * 0.4));
    const rightLevel = Math.min(1, Math.max(0, rmsR * 2.4 + avgHigh * 0.4));

    // Fast attack, smooth decay peak hold
    this.peakLevelL = Math.max(leftLevel, this.peakLevelL * 0.94);
    this.peakLevelR = Math.max(rightLevel, this.peakLevelR * 0.94);

    return {
      left: leftLevel,
      right: rightLevel,
      peakL: this.peakLevelL,
      peakR: this.peakLevelR,
    };
  }

  public updateEQ(settings: EQSettings): void {
    this.applyEQ(settings);
  }

  public updateEnhancements(enhancements: AudioEnhancements): void {
    this.applyEnhancements(enhancements);
  }

  // ========================================================
  // PIONEER DJM-750MK2 HARDWARE DSP CONTROL METHODS
  // ========================================================

  public setDJ3BandEQ(lowDb: number, midDb: number, highDb: number, isIso: boolean = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const computeGain = (db: number) => {
      if (isIso && db <= -25) {
        return -80; // Full Isolator Frequency Band Kill
      }
      return Math.max(-80, Math.min(6, db));
    };

    if (this.djLowFilter) {
      this.djLowFilter.gain.setTargetAtTime(computeGain(lowDb), now, 0.015);
    }
    if (this.djMidFilter) {
      this.djMidFilter.gain.setTargetAtTime(computeGain(midDb), now, 0.015);
    }
    if (this.djHighFilter) {
      this.djHighFilter.gain.setTargetAtTime(computeGain(highDb), now, 0.015);
    }
  }

  public setDJColorFilter(
    effectType: 'FILTER' | 'NOISE' | 'SWEEP' | 'DUB ECHO',
    position: number, // -1.0 (LOW) to +1.0 (HI), 0 is center
    parameter: number = 0.5 // 0 to 1 resonance
  ) {
    if (!this.ctx || !this.djColorFilter) return;
    const now = this.ctx.currentTime;

    const clampedPos = Math.max(-1, Math.min(1, position));

    if (Math.abs(clampedPos) < 0.03) {
      // Center detent: flat bypass
      this.djColorFilter.type = 'allpass';
      this.djColorFilter.frequency.setTargetAtTime(1000, now, 0.02);
      this.djColorFilter.Q.setTargetAtTime(1.0, now, 0.02);
      return;
    }

    if (effectType === 'FILTER' || effectType === 'DUB ECHO' || effectType === 'SWEEP') {
      if (clampedPos < 0) {
        // Turning left: Low-Pass Filter (sweep from 20kHz down to 100Hz)
        this.djColorFilter.type = 'lowpass';
        const factor = Math.abs(clampedPos); // 0 -> 1
        const minFreq = 120;
        const maxFreq = 18000;
        const freq = maxFreq * Math.pow(minFreq / maxFreq, factor);
        this.djColorFilter.frequency.setTargetAtTime(Math.max(80, freq), now, 0.02);
        this.djColorFilter.Q.setTargetAtTime(1.2 + parameter * 4.5, now, 0.02);
      } else {
        // Turning right: High-Pass Filter (sweep from 20Hz up to 7000Hz)
        this.djColorFilter.type = 'highpass';
        const factor = clampedPos; // 0 -> 1
        const minFreq = 25;
        const maxFreq = 7500;
        const freq = minFreq * Math.pow(maxFreq / minFreq, factor);
        this.djColorFilter.frequency.setTargetAtTime(Math.min(12000, freq), now, 0.02);
        this.djColorFilter.Q.setTargetAtTime(1.2 + parameter * 4.5, now, 0.02);
      }
    } else if (effectType === 'NOISE') {
      // Noise filter sweep
      this.djColorFilter.type = clampedPos < 0 ? 'bandpass' : 'highpass';
      const freq = clampedPos < 0 ? 800 * (1 - Math.abs(clampedPos) * 0.7) : 1000 + clampedPos * 4000;
      this.djColorFilter.frequency.setTargetAtTime(freq, now, 0.02);
      this.djColorFilter.Q.setTargetAtTime(2.0 + parameter * 5.0, now, 0.02);
    }
  }

  public setDJChannelFader(levelLinear: number) {
    if (!this.ctx || !this.djChannelGain) return;
    const now = this.ctx.currentTime;
    // DJ audio taper curve
    const linear = Math.max(0, Math.min(1, levelLinear));
    const gain = Math.pow(linear, 1.8);
    this.djChannelGain.gain.setTargetAtTime(gain, now, 0.015);
  }

  public setDJMasterLevel(levelLinear: number) {
    if (!this.ctx || !this.djMasterGain) return;
    const now = this.ctx.currentTime;
    const linear = Math.max(0, Math.min(1.2, levelLinear));
    this.djMasterGain.gain.setTargetAtTime(linear, now, 0.015);
  }

  public setDJBeatFX(
    fxName: string,
    enabled: boolean,
    timeMs: number = 350,
    depth: number = 0.5 // 0.0 to 1.0
  ) {
    if (!this.ctx || !this.djDelayWetGain || !this.djDelayDryGain || !this.djDelayNode || !this.djDelayFeedback) return;
    const now = this.ctx.currentTime;
    this.activeBeatFxName = fxName;
    this.isBeatFxOn = enabled;

    if (!enabled || depth <= 0.01) {
      this.djDelayWetGain.gain.setTargetAtTime(0, now, 0.04);
      this.djDelayDryGain.gain.setTargetAtTime(1.0, now, 0.04);
      return;
    }

    const wet = Math.max(0, Math.min(1.0, depth * 0.85));
    const dry = Math.max(0.2, 1.0 - depth * 0.35);

    this.djDelayWetGain.gain.setTargetAtTime(wet, now, 0.04);
    this.djDelayDryGain.gain.setTargetAtTime(dry, now, 0.04);

    const delaySec = Math.max(0.04, Math.min(2.5, timeMs / 1000));
    this.djDelayNode.delayTime.setTargetAtTime(delaySec, now, 0.04);

    if (fxName === 'ECHO' || fxName === 'DELAY' || fxName === 'PING PONG') {
      this.djDelayFeedback.gain.setTargetAtTime(Math.min(0.75, 0.3 + depth * 0.45), now, 0.04);
    } else if (fxName === 'REVERB' || fxName === 'SPIRAL') {
      this.djDelayFeedback.gain.setTargetAtTime(0.65, now, 0.04);
    } else if (fxName === 'FLANGER') {
      this.djDelayNode.delayTime.setTargetAtTime(0.008 + 0.005 * Math.sin(now * 3), now, 0.02);
      this.djDelayFeedback.gain.setTargetAtTime(0.7, now, 0.04);
    } else {
      this.djDelayFeedback.gain.setTargetAtTime(0.4, now, 0.04);
    }
  }

  public getAudioPeakMeters(): {
    chLeft: number;
    chRight: number;
    masterLeft: number;
    masterRight: number;
    isClip: boolean;
    low: number;
    mid: number;
    hi: number;
  } {
    if (!this.analyser) {
      return { chLeft: 0, chRight: 0, masterLeft: 0, masterRight: 0, isClip: false, low: 0, mid: 0, hi: 0 };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    this.analyser.getByteTimeDomainData(timeData);
    this.analyser.getByteFrequencyData(freqData);

    let sum = 0;
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = (timeData[i] - 128) / 128;
      const abs = Math.abs(val);
      if (abs > peak) peak = abs;
      sum += val * val;
    }

    const rms = Math.sqrt(sum / bufferLength);

    // Compute frequency bands
    let lowSum = 0, lowCount = 0;
    let midSum = 0, midCount = 0;
    let hiSum = 0, hiCount = 0;

    const lowMaxBin = Math.max(1, Math.floor(bufferLength * 0.08));
    const midMaxBin = Math.max(lowMaxBin + 1, Math.floor(bufferLength * 0.45));

    for (let i = 0; i < bufferLength; i++) {
      const fVal = freqData[i] / 255;
      if (i < lowMaxBin) {
        lowSum += fVal;
        lowCount++;
      } else if (i < midMaxBin) {
        midSum += fVal;
        midCount++;
      } else {
        hiSum += fVal;
        hiCount++;
      }
    }

    const low = lowCount > 0 ? lowSum / lowCount : 0;
    const mid = midCount > 0 ? midSum / midCount : 0;
    const hi = hiCount > 0 ? hiSum / hiCount : 0;

    // Combined peak weighted by energy
    const dynamicEnergy = Math.max(rms * 2.8, (low * 0.5 + mid * 0.35 + hi * 0.15) * 1.1);
    const meterVal = Math.min(1.0, dynamicEnergy);

    // Stereo spread variance with subtle dynamic phase
    const now = Date.now();
    const lMod = 1.0 + Math.sin(now * 0.006) * 0.06 + (low * 0.04);
    const rMod = 1.0 - Math.sin(now * 0.006) * 0.06 + (mid * 0.04);

    return {
      chLeft: Math.min(1.0, meterVal * lMod),
      chRight: Math.min(1.0, meterVal * rMod),
      masterLeft: Math.min(1.0, meterVal * lMod),
      masterRight: Math.min(1.0, meterVal * rMod),
      isClip: peak > 0.96 || meterVal > 0.98,
      low,
      mid,
      hi,
    };
  }

  public getRawFrequencyData(binCount: number = 32): number[] {
    if (!this.analyser) {
      return new Array(binCount).fill(0);
    }
    const fullBuffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(fullBuffer);

    const step = Math.max(1, Math.floor(fullBuffer.length / binCount));
    const result: number[] = [];
    for (let i = 0; i < binCount; i++) {
      const idx = Math.min(fullBuffer.length - 1, i * step);
      result.push(fullBuffer[idx] / 255);
    }
    return result;
  }

  // --- Vinyl Crackle Generator Methods ---

  private createVinylCrackleBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const duration = 6; // 6 second loop
    const numSamples = sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, numSamples, sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    let lastOutL = 0;
    let lastOutR = 0;

    for (let i = 0; i < numSamples; i++) {
      // 1. Continuous surface noise (warm low-passed groove hiss)
      const whiteL = (Math.random() * 2 - 1) * 0.012;
      const whiteR = (Math.random() * 2 - 1) * 0.012;

      // Filter to simulate record groove friction
      lastOutL = lastOutL * 0.82 + whiteL * 0.18;
      lastOutR = lastOutR * 0.82 + whiteR * 0.18;

      // 2. Micro-surface crackles (frequent tiny clicks)
      let crackleL = 0;
      let crackleR = 0;
      if (Math.random() < 0.0025) {
        const pop = (Math.random() * 0.08 + 0.015) * (Math.random() < 0.5 ? 1 : -1);
        crackleL = pop;
        crackleR = pop * (Math.random() * 0.6 + 0.4);
      }

      // 3. Occasional distinct dust pop / needle tick
      let popL = 0;
      let popR = 0;
      if (Math.random() < 0.00012) {
        const amp = (Math.random() * 0.22 + 0.08) * (Math.random() < 0.5 ? 1 : -1);
        popL = amp;
        popR = amp * (Math.random() * 0.5 + 0.5);
      }

      // 4. Subtle 33 1/3 RPM rotation mod (1.8 second cycle)
      const sec = i / sampleRate;
      const rotationPeriod = 60 / 33.333; // ~1.8s
      const rotationPhase = (sec % rotationPeriod) / rotationPeriod;
      const cyclicMod = 1 + 0.12 * Math.sin(rotationPhase * Math.PI * 2);

      left[i] = (lastOutL + crackleL + popL) * cyclicMod;
      right[i] = (lastOutR + crackleR + popR) * cyclicMod;
    }

    return buffer;
  }

  public setVinylCrackle(enabled: boolean, volume: number = 0.18) {
    this.isVinylCrackleEnabled = enabled;
    this.vinylCrackleVolume = volume;
    this.updateVinylCrackleState();
  }

  public setVinylCrackleVolume(volume: number) {
    this.vinylCrackleVolume = Math.max(0, Math.min(1, volume));
    if (this.vinylCrackleGain && this.ctx) {
      this.vinylCrackleGain.gain.setValueAtTime(this.vinylCrackleVolume, this.ctx.currentTime);
    }
  }

  public getVinylCrackleEnabled(): boolean {
    return this.isVinylCrackleEnabled;
  }

  public updateVinylCrackleState(isPlayingOverride?: boolean) {
    if (!this.ctx) return;

    const isMediaPlaying = isPlayingOverride !== undefined
      ? isPlayingOverride
      : (this.currentElement ? !this.currentElement.paused : false);

    const shouldPlay = this.isVinylCrackleEnabled && isMediaPlaying;

    if (shouldPlay) {
      this.startVinylCrackle();
    } else {
      this.stopVinylCrackle();
    }
  }

  private startVinylCrackle() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.vinylCrackleBuffer) {
      this.vinylCrackleBuffer = this.createVinylCrackleBuffer();
    }

    if (!this.vinylCrackleGain) {
      this.vinylCrackleGain = this.ctx.createGain();
      this.vinylCrackleGain.gain.value = 0;
      if (this.analyser) {
        this.vinylCrackleGain.connect(this.analyser);
      } else {
        this.vinylCrackleGain.connect(this.ctx.destination);
      }
    }

    if (!this.vinylCrackleSource && this.vinylCrackleBuffer) {
      this.vinylCrackleSource = this.ctx.createBufferSource();
      this.vinylCrackleSource.buffer = this.vinylCrackleBuffer;
      this.vinylCrackleSource.loop = true;
      this.vinylCrackleSource.connect(this.vinylCrackleGain);
      this.vinylCrackleSource.start(0);
    }

    // Smooth gain ramp-up over 0.2 seconds
    const now = this.ctx.currentTime;
    this.vinylCrackleGain.gain.cancelScheduledValues(now);
    this.vinylCrackleGain.gain.setValueAtTime(this.vinylCrackleGain.gain.value, now);
    this.vinylCrackleGain.gain.linearRampToValueAtTime(this.vinylCrackleVolume, now + 0.2);
  }

  private stopVinylCrackle() {
    if (!this.ctx || !this.vinylCrackleGain) return;

    const now = this.ctx.currentTime;
    this.vinylCrackleGain.gain.cancelScheduledValues(now);
    this.vinylCrackleGain.gain.setValueAtTime(this.vinylCrackleGain.gain.value, now);
    this.vinylCrackleGain.gain.linearRampToValueAtTime(0, now + 0.2);

    setTimeout(() => {
      if (this.vinylCrackleSource && (!this.isVinylCrackleEnabled || (this.currentElement && this.currentElement.paused))) {
        try {
          this.vinylCrackleSource.stop();
          this.vinylCrackleSource.disconnect();
        } catch (e) {}
        this.vinylCrackleSource = null;
      }
    }, 250);
  }
}

export const audioEngine = new AudioEngine();
