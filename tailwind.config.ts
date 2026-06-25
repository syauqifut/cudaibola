import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0D0D0D',
        'pitch-white': '#F5F1E8',
        surface: '#FFFDF8',
        'pitch-green': '#39FF6A',
        'card-yellow': '#FFD400',
        'card-red': '#FF3B30',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px',
      },
      boxShadow: {
        brutal: '5px 5px 0 #0D0D0D',
        'brutal-sm': '3px 3px 0 #0D0D0D',
      },
    },
  },
  plugins: [],
};

export default config;
