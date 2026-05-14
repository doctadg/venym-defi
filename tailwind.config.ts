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
          DEFAULT: '#050505',
          panel: '#121212',
          input: '#0a0a0a',
          card: '#121212',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.1)',
          light: 'rgba(255,255,255,0.05)',
        },
        brand: {
          green: '#56C0A6',
          red: '#FF6468',
          textGray: '#8E8E8E',
          textLight: '#e4e4e7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
