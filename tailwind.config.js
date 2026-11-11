/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f8f4ef',
          100: '#f1eae2',
          200: '#e2d8cd',
          300: '#c4b5a8',
          400: '#9c8b80',
          500: '#7a6a60',
          600: '#5a4c44',
          700: '#3d332d',
          800: '#2a231f',
          900: '#1c1714',
          950: '#14100e',
        },
        wine: {
          50: '#fbf1f3',
          100: '#f6dee3',
          200: '#edbcc6',
          300: '#de8fa0',
          400: '#cb5f79',
          500: '#b23a57',
          600: '#962a46',
          700: '#7b2239',
          800: '#631c2f',
          900: '#4a1523',
          950: '#2e0d15',
        },
        gold: {
          50: '#fbf8ee',
          100: '#f6edd4',
          200: '#eedca6',
          300: '#e3c574',
          400: '#d6ac48',
          500: '#c6952e',
          600: '#a87a22',
          700: '#855e1e',
          800: '#6b4b1e',
          900: '#593f1d',
        },
        sage: {
          50: '#f1f7f3',
          100: '#dcecdf',
          200: '#bcd9c3',
          300: '#90be9c',
          400: '#619e72',
          500: '#418254',
          600: '#2f6841',
          700: '#275336',
          800: '#21422d',
          900: '#1c3726',
        },
        cream: '#faf7f2',
        porcelain: '#fffdfa',
      },
      fontFamily: {
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,23,20,0.04), 0 8px 24px -12px rgba(28,23,20,0.12)',
        lift: '0 2px 6px rgba(28,23,20,0.06), 0 18px 40px -18px rgba(28,23,20,0.28)',
        glow: '0 0 0 1px rgba(198,149,46,0.25), 0 12px 32px -12px rgba(198,149,46,0.35)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(198,149,46,0.45)' },
          '70%': { boxShadow: '0 0 0 12px rgba(198,149,46,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(198,149,46,0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'fade-up': 'fade-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 2.4s ease-out infinite',
      },
      backgroundImage: {
        'grain':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.28'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};
