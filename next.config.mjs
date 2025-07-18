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
};

export default nextConfig;