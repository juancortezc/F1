
import type { AppProps } from 'next/app';
import { SWRConfig } from 'swr';
import Head from 'next/head';
import { useEffect } from 'react';
import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';
import OfflineIndicator from '../components/OfflineIndicator';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

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
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#FF1801" />
        <meta name="description" content="Professional F1 racing session tracker and championship manager" />
        
        {/* PWA meta tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="F1 Night" />
        
        {/* Icons */}
        <link rel="icon" href="https://storage.googleapis.com/poker-enfermos/f1-logo.png" />
        <link rel="apple-touch-icon" href="https://storage.googleapis.com/poker-enfermos/f1-logo.png" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="https://storage.googleapis.com/poker-enfermos/f1-logo.png" as="image" />
      </Head>
      
      <ErrorBoundary>
        <ToastProvider>
          <SWRConfig
            value={{
              fetcher: (resource, init) => fetch(resource, init).then(res => res.json()),
              onError: (error) => {
                console.error('SWR Error:', error);
              },
              // Add offline support to SWR
              revalidateOnFocus: false,
              revalidateOnReconnect: true,
              shouldRetryOnError: (error) => {
                // Don't retry on offline errors
                return error.status !== 503;
              }
            }}
          >
            <Component {...pageProps} />
            <OfflineIndicator />
            <PWAInstallPrompt />
          </SWRConfig>
        </ToastProvider>
      </ErrorBoundary>
    </>
  );
}

export default MyApp;
