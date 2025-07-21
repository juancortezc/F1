
import type { AppProps } from 'next/app';
import { SWRConfig } from 'swr';
import '../styles/globals.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SWRConfig
          value={{
            fetcher: (resource, init) => fetch(resource, init).then(res => res.json()),
            onError: (error) => {
              console.error('SWR Error:', error);
            }
          }}
        >
          <Component {...pageProps} />
        </SWRConfig>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
