/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Roboto', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      colors: {
        'dashboard': {
          'blue': '#1976d2',
          'green': '#2e7d32',
          'red': '#d32f2f',
        }
      }
    },
  },
  plugins: [],
};