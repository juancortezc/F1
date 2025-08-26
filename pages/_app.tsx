
import type { AppProps } from 'next/app';
import { SWRConfig } from 'swr';
import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';
import OfflineIndicator from '../components/OfflineIndicator';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import { swrConfig } from '../lib/fetcher';
import { TournamentProvider } from '../contexts/TournamentContext';

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('F1 Night: SW registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('F1 Night: SW registration failed:', error);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, orientation=any" />
        <meta name="screen-orientation" content="any" />
        <meta http-equiv="ScreenOrientation" content="autoRotate:unlocked" />
        <meta name="theme-color" content="#FF1801" />
        <meta name="description" content="Professional F1 racing session tracker and championship manager" />
        
        {/* PWA meta tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="F1 Night" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Icons for different devices */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" href="/favicon.ico?v=2" />
        
        {/* iOS splash screens */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />
        
        {/* Note: F1 logo loads naturally, preload removed to avoid unused preload warning */}
      </Head>
      
      <ErrorBoundary>
        <ToastProvider>
          <SWRConfig value={swrConfig}>
            <TournamentProvider>
              <Component {...pageProps} />
              <OfflineIndicator />
              <PWAInstallPrompt />
            </TournamentProvider>
          </SWRConfig>
        </ToastProvider>
      </ErrorBoundary>
    </>
  );
}

export default MyApp;
