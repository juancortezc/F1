import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    const handleAppInstalled = () => {
      console.log('F1 Night: App was installed');
      setShowInstallButton(false);
      setDeferredPrompt(null);
      addToast({
        type: 'success',
        title: '¡App instalada!',
        message: 'F1 Night ahora está disponible desde tu pantalla de inicio'
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [addToast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('F1 Night: User accepted the install prompt');
    } else {
      console.log('F1 Night: User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
    // Don't show again for this session (only on client side)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  // Don't show if already dismissed this session (only on client side)
  if (typeof window !== 'undefined' && sessionStorage.getItem('pwa-install-dismissed') === 'true') {
    return null;
  }

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <img 
            src="https://storage.googleapis.com/poker-enfermos/f1-logo.png" 
            alt="F1 Logo" 
            className="w-8 h-6 object-contain flex-shrink-0 mt-1"
          />
          <div className="flex-1">
            <h3 className="font-semibold text-slate-100 text-sm">Instalar F1 Night</h3>
            <p className="text-slate-400 text-xs mt-1">
              Agrega la app a tu pantalla de inicio para acceso rápido y uso sin conexión
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="bg-[#FF1801] text-white text-xs font-medium py-2 px-3 rounded hover:bg-[#E61601] transition-colors"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="text-slate-400 text-xs font-medium py-2 px-3 rounded hover:text-slate-300 transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;