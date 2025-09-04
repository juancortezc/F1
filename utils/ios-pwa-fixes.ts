// iOS PWA-specific fixes and enhancements

export function applyIOSFixes() {
  if (typeof window === 'undefined') return;

  // Detect if running as PWA on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS) {
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Prevent pinch zoom
    document.addEventListener('touchmove', (event) => {
      if ((event as any).scale !== 1) {
        event.preventDefault();
      }
    }, { passive: false });

    // Lock orientation to portrait
    if ('orientation' in window.screen && 'lock' in window.screen.orientation) {
      window.screen.orientation.lock('portrait').catch(() => {
        // Orientation lock not supported or failed
        console.log('Orientation lock not supported');
      });
    }

    if (isPWA) {
      // Don't use fixed positioning on body for iOS PWA
      // This causes more problems than it solves
      document.documentElement.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
      
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.webkitOverflowScrolling = 'touch';
      document.body.style.position = 'relative';

      // Fix viewport height for iOS PWA
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Also set a CSS variable for the actual viewport height
        document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
      };

      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', () => {
        // Force portrait orientation
        if (window.orientation && Math.abs(window.orientation) === 90) {
          document.body.style.display = 'none';
          alert('Por favor, gira tu dispositivo a modo vertical');
        } else {
          document.body.style.display = 'block';
          setViewportHeight();
        }
      });
      
      // Prevent overscroll on the entire document
      document.addEventListener('touchmove', function(e) {
        if (e.touches.length > 1) {
          e.preventDefault(); // Prevent pinch zoom
        }
      }, { passive: false });
    }
  }
}

// Utility to check if app can be installed
export function checkPWAInstallability() {
  if (typeof window === 'undefined') return false;
  
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return false;
  }
  
  // iOS-specific check
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  if (isIOS) {
    // On iOS, we can't programmatically install, but we can show instructions
    return 'ios-instructions';
  }
  
  // Check for beforeinstallprompt event (Android/Desktop Chrome)
  return 'beforeinstallprompt' in window;
}