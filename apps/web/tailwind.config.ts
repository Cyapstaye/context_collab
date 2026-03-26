import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f8f8f6',
        panel: '#ffffff',
        border: '#e5e5e5',
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
