/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7c5cfc', light: '#9d82fd', dark: '#6340fa' },
        surface: { DEFAULT: '#14141e', card: '#1c1c28', elevated: '#242434' },
        'app-border': '#2a2a3a',
        water: '#3b82f6',
        activity: '#10b981',
        reading: '#8b5cf6',
        english: '#f59e0b',
        weight: '#ec4899',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
