
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy F1 colors (mantener compatibilidad)
        'f1-black': '#000000',
        'f1-surface': '#0a0a0a',
        'f1-surface-light': '#141414',
        'f1-border': '#262626',
        'f1-red': '#FF1801',
        'f1-green': '#10b981',
        'f1-yellow': '#fbbf24',
        
        // New F1 Professional Design System
        'f1-pro': {
          // Core Surfaces
          'carbon': '#0C0C0C',      // Deepest blacks for true luxury
          'chrome': '#1C1C1C',      // Premium surface backgrounds
          'titanium': '#2C2C2C',    // Elevated components
          'steel': '#3C3C3C',       // Interactive elements
          
          // Text & Content  
          'platinum': '#F8FAFC',    // Primary text - high contrast
          'silver': '#CBD5E1',      // Secondary text - good contrast
          'aluminum': '#94A3B8',    // Tertiary text - muted
          'graphite': '#64748B',    // Disabled/placeholder text
          
          // Accent Colors
          'crimson': '#FF1801',     // F1 Red - critical actions only
          'gold': '#F59E0B',        // Success/achievement states
          'emerald': '#10B981',     // Positive feedback
          'amber': '#FBBF24',       // Warning/attention
          'orange': '#F97316',      // Energy/speed indicators
          
          // Status Colors
          'success': '#10B981',
          'warning': '#F59E0B', 
          'error': '#EF4444',
          'info': '#3B82F6',
        }
      },
      
      // Professional Typography Scale
      fontSize: {
        // Responsive text sizes with clamp
        'f1-micro': ['clamp(0.688rem, 2.5vw, 0.75rem)', { lineHeight: '1.2', letterSpacing: '0.02em' }], // 11-12px
        'f1-tiny': ['clamp(0.813rem, 3vw, 0.875rem)', { lineHeight: '1.3', letterSpacing: '0.01em' }], // 13-14px  
        'f1-small': ['clamp(0.875rem, 3.5vw, 1rem)', { lineHeight: '1.4' }], // 14-16px
        'f1-base': ['clamp(1rem, 4vw, 1.125rem)', { lineHeight: '1.5' }], // 16-18px
        'f1-medium': ['clamp(1.125rem, 4.5vw, 1.25rem)', { lineHeight: '1.4' }], // 18-20px
        'f1-large': ['clamp(1.25rem, 5vw, 1.5rem)', { lineHeight: '1.3' }], // 20-24px
        'f1-xl': ['clamp(1.5rem, 6vw, 2rem)', { lineHeight: '1.2' }], // 24-32px
        'f1-2xl': ['clamp(1.875rem, 7vw, 2.5rem)', { lineHeight: '1.1' }], // 30-40px
        'f1-3xl': ['clamp(2.25rem, 8vw, 3rem)', { lineHeight: '1' }], // 36-48px
        'f1-hero': ['clamp(2.5rem, 10vw, 4rem)', { lineHeight: '0.9' }], // 40-64px
        
        // Legacy sizes (mantener compatibilidad)
        'f1-sm': 'var(--font-size-sm)',
        'f1-lg': 'var(--font-size-lg)',
      },
      
      // Professional Spacing Scale
      spacing: {
        'f1-xs': '0.25rem',    // 4px - micro spacing
        'f1-sm': '0.5rem',     // 8px - small spacing  
        'f1-md': '0.75rem',    // 12px - medium spacing
        'f1-lg': '1rem',       // 16px - large spacing
        'f1-xl': '1.5rem',     // 24px - extra large
        'f1-2xl': '2rem',      // 32px - section spacing
        'f1-3xl': '3rem',      // 48px - major sections
        'f1-4xl': '4rem',      // 64px - page sections
        'f1-touch': '2.75rem', // 44px - minimum touch target
        'f1-tap': '3rem',      // 48px - comfortable touch target
      },
      // Professional Animation System
      animation: {
        // Legacy animations (mantener compatibilidad)
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
        
        // New professional animations
        'f1-fade-in': 'f1FadeIn 0.3s ease-out',
        'f1-slide-in': 'f1SlideIn 0.4s ease-out',
        'f1-scale-in': 'f1ScaleIn 0.3s ease-out',
        'f1-pulse': 'f1Pulse 2s ease-in-out infinite',
        'f1-shimmer': 'f1Shimmer 2s linear infinite',
        'f1-bounce': 'f1Bounce 0.5s ease-out',
        'f1-shake': 'f1Shake 0.5s ease-in-out',
        'f1-spin-slow': 'spin 3s linear infinite',
      },
      
      keyframes: {
        // Legacy keyframes
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        
        // Professional F1 keyframes
        f1FadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        f1SlideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        f1ScaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        f1Pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        f1Shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        f1Bounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        f1Shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
      },
      
      // Professional shadows for luxury feel
      boxShadow: {
        'f1-subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'f1-soft': '0 2px 4px 0 rgba(0, 0, 0, 0.4)',  
        'f1-medium': '0 4px 8px 0 rgba(0, 0, 0, 0.5)',
        'f1-hard': '0 8px 16px 0 rgba(0, 0, 0, 0.6)',
        'f1-glow': '0 0 20px rgba(255, 24, 1, 0.3)', // F1 red glow
        'f1-gold': '0 0 20px rgba(245, 158, 11, 0.2)', // Gold glow
      },
      
      // Professional border radius
      borderRadius: {
        'f1-sm': '0.125rem',   // 2px - minimal radius
        'f1-md': '0.25rem',    // 4px - subtle radius  
        'f1-lg': '0.5rem',     // 8px - medium radius
        'f1-xl': '0.75rem',    // 12px - large radius
        'f1-2xl': '1rem',      // 16px - extra large radius
      },
    },
  },
  plugins: [],
}
