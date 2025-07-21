import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (!online && isOnline) {
        // Just went offline
        setShowIndicator(true);
        addToast({
          type: 'warning',
          title: 'Modo sin conexión',
          message: 'Los datos se sincronizarán cuando vuelvas a estar en línea',
          duration: 6000
        });
      } else if (online && !isOnline) {
        // Just came back online
        setShowIndicator(false);
        addToast({
          type: 'success',
          title: 'Conexión restaurada',
          message: 'Sincronizando datos...',
          duration: 4000
        });
      }
    };

    // Set initial state
    setIsOnline(navigator.onLine);
    setShowIndicator(!navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [isOnline, addToast]);

  if (!showIndicator) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-yellow-900/90 border border-yellow-500 text-yellow-100 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm flex items-center gap-2">
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Sin conexión</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;