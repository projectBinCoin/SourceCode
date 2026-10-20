/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: { DEFAULT: 'var(--color-card)', foreground: 'var(--color-foreground)' },
        muted: { DEFAULT: 'var(--color-muted)', foreground: 'var(--color-muted-foreground)' },
        border: 'var(--color-border)',
        primary: { DEFAULT: 'var(--color-primary)', foreground: 'var(--color-primary-foreground)' },
        secondary: { DEFAULT: 'var(--color-secondary)', foreground: 'var(--color-secondary-foreground)' },
        accent: 'var(--color-accent)',
        destructive: 'var(--color-destructive)',
        sapphire: {
          300: '#A0CDEB',
          500: '#0099FF',
          600: '#0066C5',
          700: '#0055A4',
          800: '#003B73',
          900: '#0B1D3A',
          950: '#050A10',
        },
      },
    },
  },
  plugins: [],
};
