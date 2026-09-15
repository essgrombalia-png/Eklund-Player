import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="windows-offline-badge"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-neutral-900/95 border border-amber-500/40 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
      <span>
        <strong>Offline Mode</strong> — Running locally from Windows cache.
      </span>
    </div>
  );
};
