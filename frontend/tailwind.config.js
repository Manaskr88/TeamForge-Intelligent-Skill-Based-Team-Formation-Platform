/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary = Slate Blue 800 (#1e3a8a is blue-800, but user wants slate-blue feel)
        // Using a rich slate-blue: #2d4a7a family
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#3b5998',   // main brand — slate blue
          600: '#2d4a7a',   // darker
          700: '#1e3a6e',   // slate-blue-700
          800: '#1e293b',   // slate-800 — the requested color
          900: '#0f172a',
        },
        brand: '#1e293b',   // quick alias for slate-800
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'pulse-slow':  'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient':    'gradient 8s ease infinite',
        'fade-in':     'fadeIn 0.5s ease-in-out',
        'slide-up':    'slideUp 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      backgroundSize: { '300%': '300%' },
      boxShadow: {
        'glass':      '0 8px 32px 0 rgba(30, 41, 59, 0.15)',
        'card':       '0 4px 24px rgba(0,0,0,0.06)',
        'card-hover': '0 8px 40px rgba(30, 41, 59, 0.18)',
      },
    },
  },
  plugins: [],
}
