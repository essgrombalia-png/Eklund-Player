import React, { useState } from 'react';
import { Download, Monitor, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { WindowsInstallModal } from './WindowsInstallModal';

interface WindowsInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const WindowsInstallButton: React.FC<WindowsInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, install, isWindows } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (isInstalled) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`px-2 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer hover:bg-emerald-500/25 ${className}`}
          title="Eklund SL-1200 is installed as a Windows desktop media player. Click to view media controls & settings."
        >
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline text-[11px] font-mono">Windows 11 App</span>
        </button>
        <WindowsInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <button
        id="windows-install-trigger-btn"
        onClick={handleClick}
        className={`px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-transparent hover:from-amber-500/30 hover:to-yellow-500/20 border border-amber-500/40 text-amber-300 hover:text-amber-100 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-sm group min-h-[36px] ${className}`}
        title="Install Eklund SL-1200 as a standalone Windows 11 Media Player with taskbar controls & offline audio"
      >
        <Monitor className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-[11px] sm:text-xs">
          {variant === 'full' ? 'Install on Windows 11' : (
            <>
              <span className="hidden md:inline">Install on Windows 11</span>
              <span className="md:hidden">Install</span>
            </>
          )}
        </span>
        <Download className="w-3 h-3 text-amber-400/80 group-hover:translate-y-0.5 transition-transform hidden sm:inline" />
      </button>

      <WindowsInstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
