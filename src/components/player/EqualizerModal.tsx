import { useState } from 'react';
import { X, Sliders, Volume2, ShieldCheck, Sparkles, RotateCcw } from 'lucide-react';
import { EQSettings, AudioEnhancements, EQ_FREQUENCIES } from '../../types';
import { EQ_PRESETS, audioEngine } from '../../services/audioEngine';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eqSettings: EQSettings;
  onUpdateEQ: (settings: EQSettings) => void;
  enhancements: AudioEnhancements;
  onUpdateEnhancements: (enhancements: AudioEnhancements) => void;
  accentColor?: string;
}

export const EqualizerModal = ({
  isOpen,
  onClose,
  eqSettings,
  onUpdateEQ,
  enhancements,
  onUpdateEnhancements,
  accentColor = '#06b6d4',
}: EqualizerModalProps) => {
  const [activeTab, setActiveTab] = useState<'eq' | 'enhancements'>('eq');

  if (!isOpen) return null;

  const handleBandChange = (index: number, value: number) => {
    const newBands = [...eqSettings.bands];
    newBands[index] = value;
    const updated = {
      ...eqSettings,
      bands: newBands,
      preset: 'Custom',
    };
    onUpdateEQ(updated);
    audioEngine.applyEQ(updated);
  };

  const handlePresetSelect = (presetName: string) => {
    const presetBands = EQ_PRESETS[presetName] || EQ_PRESETS.Flat;
    const updated = {
      ...eqSettings,
      bands: [...presetBands],
      preset: presetName,
    };
    onUpdateEQ(updated);
    audioEngine.applyEQ(updated);
  };

  const handleReset = () => {
    const resetSettings: EQSettings = {
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      preamp: 0,
      bass: 0,
      treble: 0,
      balance: 0,
      loudness: false,
      preset: 'Flat',
    };
    onUpdateEQ(resetSettings);
    audioEngine.applyEQ(resetSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">Audio Master Processor</h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Web Audio API Active
                </span>
                <span>•</span>
                <span>Hardware Accelerated 10-Band EQ</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-2.5 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1.5 transition"
              title="Reset EQ to Flat"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-neutral-800/80 bg-neutral-900/50">
          <button
            onClick={() => setActiveTab('eq')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              activeTab === 'eq'
                ? 'text-cyan-400 border-cyan-400'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            10-Band Equalizer
          </button>
          <button
            onClick={() => setActiveTab('enhancements')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'enhancements'
                ? 'text-cyan-400 border-cyan-400'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Audio Enhancements
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'eq' ? (
            <>
              {/* Presets Bar */}
              <div>
                <label className="text-xs uppercase font-mono tracking-wider text-neutral-400 block mb-2">
                  Select Preset
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(EQ_PRESETS).map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handlePresetSelect(preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        eqSettings.preset === preset
                          ? 'bg-cyan-500 text-neutral-950 font-bold shadow-md shadow-cyan-500/20'
                          : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* 10-Band Vertical Sliders */}
              <div className="bg-neutral-950/60 p-5 rounded-2xl border border-neutral-800/60">
                <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono mb-4 px-2">
                  <span>+12 dB</span>
                  <span>0 dB (FLAT)</span>
                  <span>-12 dB</span>
                </div>

                <div className="grid grid-cols-10 gap-2 items-center h-48 py-2">
                  {EQ_FREQUENCIES.map((band, idx) => {
                    const val = eqSettings.bands[idx] ?? 0;
                    return (
                      <div key={band.frequency} className="flex flex-col items-center h-full justify-between">
                        <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                          {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
                        </span>

                        {/* Custom Vertical Slider */}
                        <div className="relative flex-1 flex items-center justify-center my-1 w-full">
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={val}
                            onChange={(e) => handleBandChange(idx, parseFloat(e.target.value))}
                            className="h-32 w-1.5 accent-cyan-400 -rotate-90 origin-center cursor-pointer"
                          />
                        </div>

                        <span className="text-[10px] font-mono text-neutral-400 truncate max-w-full text-center">
                          {band.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auxiliary Controls: Preamp, Bass, Treble, Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {/* Preamp */}
                <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800">
                  <div className="flex justify-between text-xs text-neutral-300 mb-1.5 font-medium">
                    <span>Preamp Gain</span>
                    <span className="font-mono text-cyan-400">{eqSettings.preamp.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={eqSettings.preamp}
                    onChange={(e) => {
                      const updated = { ...eqSettings, preamp: parseFloat(e.target.value) };
                      onUpdateEQ(updated);
                      audioEngine.applyEQ(updated);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Quick Bass */}
                <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800">
                  <div className="flex justify-between text-xs text-neutral-300 mb-1.5 font-medium">
                    <span>Sub-Bass Lift</span>
                    <span className="font-mono text-cyan-400">{eqSettings.bass.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-6"
                    max="8"
                    step="0.5"
                    value={eqSettings.bass}
                    onChange={(e) => {
                      const updated = { ...eqSettings, bass: parseFloat(e.target.value) };
                      onUpdateEQ(updated);
                      audioEngine.applyEQ(updated);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Quick Treble */}
                <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800">
                  <div className="flex justify-between text-xs text-neutral-300 mb-1.5 font-medium">
                    <span>Treble Sparkle</span>
                    <span className="font-mono text-cyan-400">{eqSettings.treble.toFixed(1)} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-6"
                    max="8"
                    step="0.5"
                    value={eqSettings.treble}
                    onChange={(e) => {
                      const updated = { ...eqSettings, treble: parseFloat(e.target.value) };
                      onUpdateEQ(updated);
                      audioEngine.applyEQ(updated);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Stereo Balance */}
                <div className="bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-800">
                  <div className="flex justify-between text-xs text-neutral-300 mb-1.5 font-medium">
                    <span>Stereo Balance</span>
                    <span className="font-mono text-cyan-400">
                      {eqSettings.balance === 0 ? 'Center' : eqSettings.balance < 0 ? `L ${Math.abs(Math.round(eqSettings.balance * 100))}%` : `R ${Math.round(eqSettings.balance * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={eqSettings.balance}
                    onChange={(e) => {
                      const updated = { ...eqSettings, balance: parseFloat(e.target.value) };
                      onUpdateEQ(updated);
                      audioEngine.applyEQ(updated);
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Audio Enhancements Tab */
            <div className="space-y-4">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">True Hardware DSP Pipeline</p>
                  <p className="text-cyan-400/80 mt-0.5">
                    Filters are executed in real-time via Web Audio API nodes directly in your browser's audio engine.
                  </p>
                </div>
              </div>

              {/* Enhancements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Dynamic Bass Boost */}
                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-white">Dynamic Bass Boost</div>
                    <div className="text-xs text-neutral-400">Low-frequency shelf resonance at 100Hz</div>
                    <span className="inline-block mt-1 text-[10px] text-emerald-400 font-mono">● Supported (Web Audio)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enhancements.bassBoost}
                    onChange={(e) => {
                      const updated = { ...enhancements, bassBoost: e.target.checked };
                      onUpdateEnhancements(updated);
                      audioEngine.applyEnhancements(updated);
                    }}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>

                {/* Dynamics Compressor / Loudness */}
                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-white">Loudness Compression</div>
                    <div className="text-xs text-neutral-400">Auto-gain leveling & peak clipping protection</div>
                    <span className="inline-block mt-1 text-emerald-400 text-[10px] font-mono">● Supported (DynamicsCompressorNode)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enhancements.compressor}
                    onChange={(e) => {
                      const updated = { ...enhancements, compressor: e.target.checked, loudnessNorm: e.target.checked };
                      onUpdateEnhancements(updated);
                      audioEngine.applyEnhancements(updated);
                    }}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>

                {/* Crossfade */}
                <div className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-semibold text-white">Smart Crossfade</span>
                    <span className="text-xs font-mono text-cyan-400">{enhancements.crossfade}s</span>
                  </div>
                  <p className="text-xs text-neutral-400 mb-2">Smoothly blend between queued tracks</p>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="1"
                    value={enhancements.crossfade}
                    onChange={(e) => {
                      const updated = { ...enhancements, crossfade: parseInt(e.target.value) };
                      onUpdateEnhancements(updated);
                    }}
                    className="w-full"
                  />
                  <span className="inline-block mt-1 text-[10px] text-emerald-400 font-mono">● Supported (Audio Engine)</span>
                </div>

                {/* Gapless Playback */}
                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-white">Gapless Playback</div>
                    <div className="text-xs text-neutral-400">Zero silence between live & concept albums</div>
                    <span className="inline-block mt-1 text-emerald-400 text-[10px] font-mono">● Supported (HTML5 Audio Preload)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enhancements.gapless}
                    onChange={(e) => {
                      const updated = { ...enhancements, gapless: e.target.checked };
                      onUpdateEnhancements(updated);
                    }}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>

                {/* Spatial Audio (Virtual Surround) */}
                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-white">Spatial Audio 3D Mode</div>
                    <div className="text-xs text-neutral-400">Expanded soundstage binaural convolution</div>
                    <span className="inline-block mt-1 text-amber-400 text-[10px] font-mono">◐ Experimental (Browser HRTF)</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enhancements.spatialPlaceholder}
                    onChange={(e) => {
                      const updated = { ...enhancements, spatialPlaceholder: e.target.checked };
                      onUpdateEnhancements(updated);
                    }}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>

                {/* Mono Downmix */}
                <label className="flex items-center justify-between p-4 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition cursor-pointer">
                  <div>
                    <div className="text-sm font-semibold text-white">Mono Downmix</div>
                    <div className="text-xs text-neutral-400">Sum left and right channels for single-speaker output</div>
                    <span className="inline-block mt-1 text-emerald-400 text-[10px] font-mono">● Supported</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enhancements.mono}
                    onChange={(e) => {
                      const updated = { ...enhancements, mono: e.target.checked };
                      onUpdateEnhancements(updated);
                    }}
                    className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/60 flex justify-between items-center">
          <span className="text-xs text-neutral-500">Preset: {eqSettings.preset}</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 text-neutral-950 font-bold text-sm hover:bg-cyan-400 transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
