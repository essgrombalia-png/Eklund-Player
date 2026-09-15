import React, { useState } from 'react';
import {
  X,
  Download,
  Monitor,
  CheckCircle2,
  HardDrive,
  Sliders,
  Volume2,
  FileAudio,
  Radio,
  ExternalLink,
  Laptop,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface WindowsInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsInstallModal: React.FC<WindowsInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isWindows } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div
      id="windows-install-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="windows-install-modal"
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-neutral-900/95 via-neutral-950/98 to-black border border-amber-500/30 shadow-2xl p-4 sm:p-6 text-neutral-100 font-sans"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(245, 158, 11, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Windows 11 & Eklund SL-1200 Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-lg shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[10px] bg-neutral-950 flex items-center justify-center">
              <Monitor className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Install as Windows 11 Media Player
              </h2>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase font-bold">
                Windows 11 PWA
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Run Eklund SL-1200 as a standalone desktop audio player with native Windows controls
            </p>
          </div>
        </div>

        {/* Direct One-Click Install Button (When browser supports beforeinstallprompt) */}
        {isInstalled || installedSuccess ? (
          <div className="mb-5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>Eklund SL-1200 is installed!</strong> You can launch it directly from your Windows 11 Start Menu, Taskbar, or Desktop.
            </span>
          </div>
        ) : isInstallable ? (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                  Ready to Install on this Device
                </div>
                <div className="text-xs text-neutral-300 mt-0.5">
                  Click below to pin Eklund SL-1200 to Windows 11 Taskbar and Start Menu.
                </div>
              </div>
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-95 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{installing ? 'Opening Windows Setup...' : 'Install on Windows 11'}</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Windows 11 Media Player Features Grid */}
        <div className="mb-5">
          <h3 className="text-xs font-mono font-bold text-amber-300/90 uppercase tracking-wider mb-2.5">
            Windows 11 Native Integration Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-start gap-2.5">
              <Volume2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-neutral-200">Windows 11 Volume Flyout</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Full System Media Transport Controls: Control play, pause, seek, and see album art in Windows Action Center.
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-start gap-2.5">
              <Laptop className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-neutral-200">Hardware Media Keys</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Respond to your PC keyboard's Play, Pause, Next, and Previous media keys even when minimized.
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-start gap-2.5">
              <FileAudio className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-neutral-200">Local Audio Association</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Open MP3, WAV, FLAC, and M4A audio files directly on the turntable from Windows Explorer.
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex items-start gap-2.5">
              <HardDrive className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-neutral-200">100% Offline Standalone</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  Cached via Service Worker to run seamlessly with zero internet connection required.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Installation Instructions for Windows 11 */}
        <div className="p-3 sm:p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 mb-5">
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            <span>How to Install on Windows 11 (Microsoft Edge or Google Chrome)</span>
          </h4>

          <ol className="text-xs text-neutral-300 space-y-2 list-decimal list-inside">
            <li className="leading-relaxed">
              <strong>In Microsoft Edge (Default on Windows 11):</strong> Look at the right side of the address bar at the top of Edge. Click the <span className="text-amber-300 font-semibold font-mono">App available (Install)</span> icon, or click the <span className="text-neutral-100 font-mono">···</span> menu → <span className="text-neutral-100 font-mono">Apps</span> → <span className="text-amber-300 font-mono">Install this site as an app</span>.
            </li>
            <li className="leading-relaxed">
              <strong>In Google Chrome:</strong> Click the <span className="text-amber-300 font-semibold font-mono">Install icon</span> (monitor with down arrow) on the right side of the address bar, or click <span className="text-neutral-100 font-mono">⋮</span> menu → <span className="text-neutral-100 font-mono">Save and share</span> → <span className="text-amber-300 font-mono">Install Eklund SL-1200...</span>
            </li>
            <li className="leading-relaxed">
              <strong>Set as Default Media Player (Optional):</strong> In Windows 11 File Explorer, right-click any audio file (.mp3, .flac) → <span className="text-neutral-100 font-mono">Open with</span> → <span className="text-neutral-100 font-mono">Choose another app</span> → Select <span className="text-amber-300 font-mono">Eklund SL-1200</span> and check <span className="text-neutral-100 font-mono">Always use this app</span>.
            </li>
          </ol>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1">
            <span>Compatible with Windows 11 / Windows 10</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
