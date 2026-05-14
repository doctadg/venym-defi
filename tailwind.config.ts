import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0A0E17',
          panel: '#14192F',
          input: '#0A0E17',
          card: '#14192F',
        },
        border: {
          DEFAULT: 'rgba(30, 64, 198, 0.3)',
          light: 'rgba(30, 64, 198, 0.1)',
        },
        brand: {
          gold: '#1e40c6',
          goldDim: 'rgba(30, 64, 198, 0.1)',
          green: '#56C0A6',
          red: '#FF6468',
          textGray: '#8E8E8E',
          textLight: '#BBBBBB',
        },
      },
      fontFamily: {
        geist: ['var(--font-geist)', 'sans-serif'],
        satoshi: ['var(--font-satoshi)', 'sans-serif'],
        replica: ['var(--font-replica)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
