/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // AfriVate brand palette
        brand: {
          DEFAULT: '#8D4087',
          50: '#fdf5fd',
          100: '#F0E7F6',
          200: '#e0c7e3',
          300: '#c99fd1',
          400: '#b070b8',
          500: '#8D4087',
          600: '#7A3575',
          700: '#652b60',
          800: '#4f1f4c',
          900: '#3c1639',
        },
        // Dark theme base — deep AfriVate purple
        ink: {
          950: '#0f0510',
          900: '#1A0B18',
          800: '#260F22',
          700: '#341529',
          600: '#461D3A',
          500: '#5e274e',
        },
        // Semantic tokens — resolve to CSS variables so they switch with theme
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#2563eb',
      },
      fontFamily: {
        sans: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        elevated: '0 10px 30px -10px rgba(0, 0, 0, 0.25)',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'ava-breathe': {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.08)' },
        },
        'ava-glow': {
          '0%, 100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '0.95', transform: 'scale(1.18)' },
        },
        'ava-orbit': {
          '0%': { transform: 'rotate(0deg) scale(1)', opacity: '0.55' },
          '50%': { transform: 'rotate(180deg) scale(1.05)', opacity: '0.9' },
          '100%': { transform: 'rotate(360deg) scale(1)', opacity: '0.55' },
        },
        'ava-fab-pulse': {
          '0%, 100%': { boxShadow: '0 8px 24px -6px rgba(141, 64, 135, 0.55)' },
          '50%': { boxShadow: '0 10px 32px -4px rgba(141, 64, 135, 0.8)' },
        },
        'ava-panel-in': {
          '0%': { opacity: '0', transform: 'translateY(28px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ava-panel-out': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
        },
        'ava-backdrop-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ava-backdrop-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'ava-msg-in': {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'ava-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        'ava-chip-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.35s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'page-enter': 'page-enter 0.35s ease-out',
        'slide-in-right': 'slide-in-right 0.28s ease-out',
        'ava-breathe': 'ava-breathe 3.2s ease-in-out infinite',
        'ava-glow': 'ava-glow 1.4s ease-in-out infinite',
        'ava-orbit': 'ava-orbit 2.8s linear infinite',
        'ava-fab-pulse': 'ava-fab-pulse 2.4s ease-in-out infinite',
        'ava-panel-in': 'ava-panel-in 0.32s cubic-bezier(0.34, 1.2, 0.64, 1)',
        'ava-panel-out': 'ava-panel-out 0.24s ease-in forwards',
        'ava-backdrop-in': 'ava-backdrop-in 0.25s ease-out',
        'ava-backdrop-out': 'ava-backdrop-out 0.22s ease-in forwards',
        'ava-msg-in': 'ava-msg-in 0.28s ease-out',
        'ava-dot': 'ava-dot 1.05s ease-in-out infinite',
        'ava-chip-in': 'ava-chip-in 0.35s ease-out both',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
