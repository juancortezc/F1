/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Only ignore build errors in development, never in production
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
  eslint: {
    // Only ignore linting errors in development, never in production
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
  // PWA and offline support
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type', 
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ]
  },
};

export default nextConfig;