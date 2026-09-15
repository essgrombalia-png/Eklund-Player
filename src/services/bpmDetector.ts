/**
 * Automated Web Audio API Beats Per Minute (BPM) Detector
 * Uses energy onset detection and peak interval histogram analysis to accurately determine track tempo.
 */

export class BPMDetector {
  /**
   * Fast BPM detection from an AudioBuffer
   */
  public detectFromAudioBuffer(audioBuffer: AudioBuffer): number {
    try {
      // 1. Get raw mono channel data
      const rawData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      // 2. Sample up to 60 seconds (or center slice of track for optimal rhythmic representation)
      const maxSamples = Math.min(rawData.length, sampleRate * 60);
      const startOffset = rawData.length > sampleRate * 120 ? Math.floor(sampleRate * 15) : 0;
      const pcm = rawData.subarray(startOffset, startOffset + maxSamples);

      // 3. Low-pass filter approximation (focusing on bass/kick drum energy 60Hz - 180Hz)
      const rc = 1.0 / (2 * Math.PI * 150);
      const dt = 1.0 / sampleRate;
      const alpha = dt / (rc + dt);

      const filtered = new Float32Array(pcm.length);
      let lastVal = 0;
      for (let i = 0; i < pcm.length; i++) {
        lastVal = lastVal + alpha * (Math.abs(pcm[i]) - lastVal);
        filtered[i] = lastVal;
      }

      // 4. Downsample into 10ms energy windows (100 samples per second)
      const windowSize = Math.floor(sampleRate * 0.01);
      const energyCount = Math.floor(filtered.length / windowSize);
      if (energyCount < 100) return 120; // Fallback if audio too short

      const energyArray = new Float32Array(energyCount);
      for (let i = 0; i < energyCount; i++) {
        let sum = 0;
        const offset = i * windowSize;
        for (let j = 0; j < windowSize; j++) {
          sum += filtered[offset + j];
        }
        energyArray[i] = sum / windowSize;
      }

      // 5. Calculate energy flux / onset peak detection
      const peaks: number[] = [];
      const thresholdMult = 1.35;

      // Calculate local moving average
      const avgWindow = 20; // 200ms
      for (let i = avgWindow; i < energyArray.length - avgWindow; i++) {
        let localSum = 0;
        for (let j = -avgWindow; j <= avgWindow; j++) {
          localSum += energyArray[i + j];
        }
        const localAvg = (localSum / (avgWindow * 2 + 1)) * thresholdMult;

        if (
          energyArray[i] > localAvg &&
          energyArray[i] > energyArray[i - 1] &&
          energyArray[i] > energyArray[i + 1]
        ) {
          // Peak detected at window i (time in seconds = i * 0.01)
          peaks.push(i * 0.01);
        }
      }

      if (peaks.length < 10) return 120;

      // 6. Measure intervals between peaks and collect candidate BPMs
      const bpmHistogram: Record<number, number> = {};

      for (let i = 0; i < peaks.length; i++) {
        for (let j = 1; j <= 8; j++) {
          if (i + j >= peaks.length) break;
          const interval = peaks[i + j] - peaks[i];
          if (interval <= 0) continue;

          // Convert interval (seconds) to BPM for 1, 2, 4, 8 beats
          let candidateBPM = (60 / interval) * j;

          // Normalize candidate BPM into standard DJ range: 65 BPM - 185 BPM
          while (candidateBPM < 65) candidateBPM *= 2;
          while (candidateBPM > 185) candidateBPM /= 2;

          const roundedBPM = Math.round(candidateBPM);
          if (roundedBPM >= 65 && roundedBPM <= 185) {
            bpmHistogram[roundedBPM] = (bpmHistogram[roundedBPM] || 0) + (9 - j);
          }
        }
      }

      // 7. Find dominant peak in histogram
      let bestBPM = 120;
      let maxScore = 0;

      Object.entries(bpmHistogram).forEach(([bpmStr, score]) => {
        const bpm = parseInt(bpmStr, 10);
        // Include adjacent smoothing (+/- 1 BPM)
        const smoothedScore =
          score +
          (bpmHistogram[bpm - 1] || 0) * 0.5 +
          (bpmHistogram[bpm + 1] || 0) * 0.5;

        if (smoothedScore > maxScore) {
          maxScore = smoothedScore;
          bestBPM = bpm;
        }
      });

      return bestBPM;
    } catch (err) {
      console.warn('BPM detection error:', err);
      return 120;
    }
  }

  /**
   * Asynchronously detect BPM from a File or Blob
   */
  public async detectFromFile(file: Blob | File): Promise<number> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return 120;

      const tempCtx = new AudioContextClass();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      const bpm = this.detectFromAudioBuffer(audioBuffer);
      try {
        await tempCtx.close();
      } catch {}
      return bpm;
    } catch (err) {
      console.warn('Error detecting BPM from file:', err);
      return 120;
    }
  }

  /**
   * Asynchronously detect BPM from an audio URL
   */
  public async detectFromUrl(url: string): Promise<number> {
    try {
      const res = await fetch(url);
      if (!res.ok) return 120;
      const arrayBuffer = await res.arrayBuffer();

      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return 120;

      const tempCtx = new AudioContextClass();
      const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
      const bpm = this.detectFromAudioBuffer(audioBuffer);
      try {
        await tempCtx.close();
      } catch {}
      return bpm;
    } catch (err) {
      console.warn('Error detecting BPM from URL:', err);
      return 120;
    }
  }
}

export const bpmDetector = new BPMDetector();
