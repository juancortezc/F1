
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'f1-black': '#000000',
        'f1-surface': '#0a0a0a',
        'f1-surface-light': '#141414',
        'f1-border': '#262626',
        'f1-red': '#FF1801',
        'f1-green': '#10b981',
        'f1-yellow': '#fbbf24',
      },
      fontSize: {
        'f1-sm': 'var(--font-size-sm)',
        'f1-base': 'var(--font-size-base)',
        'f1-lg': 'var(--font-size-lg)',
        'f1-xl': 'var(--font-size-xl)',
        'f1-2xl': 'var(--font-size-2xl)',
        'f1-3xl': 'var(--font-size-3xl)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
