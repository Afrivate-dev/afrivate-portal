/**
 * AfriVate design tokens.
 * Mirrored to CSS variables in src/styles/index.css and
 * Tailwind theme in tailwind.config.js. Reference these
 * only when you need a raw value in JS (e.g. inline chart colors).
 */
export const tokens = {
  colors: {
    brand: '#8D4087',
    brandHover: '#7A3575',
    lavender: '#F0E7F6',
    siteDark: '#1A0B18',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#1D45CF',
    growthGreen: '#317D34',
    innovationBlue: '#1D45CF',
    energyYellow: '#EFDA0E',
    actionOrange: '#ED620A',
    alertRed: '#EB1111',
  },
  fonts: {
    heading: "'Poppins', sans-serif",
    body: "'Roboto', sans-serif",
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  shadow: {
    card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    elevated: '0 10px 30px -10px rgba(0,0,0,0.25)',
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
  },
} as const

export type Tokens = typeof tokens
