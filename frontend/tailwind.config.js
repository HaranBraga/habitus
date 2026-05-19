/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#6366f1', light: '#a5b4fc', dark: '#4338ca' },
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
