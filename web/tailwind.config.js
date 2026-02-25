/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0d6efd',
          600: '#0b5ed7',
          700: '#0a58ca',
          800: '#084a9e',
          900: '#073078',
        },
      },
    },
  },
  plugins: [],
}
