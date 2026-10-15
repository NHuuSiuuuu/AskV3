/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        gemini: {
          bg: '#f8fafd',
          surface: '#ffffff',
          sidebar: '#f0f4f9',
          border: '#e1e7f0',
          hover: '#e5ecf5',
          active: '#d9e2ec',
          text: '#1f2937',
          muted: '#4b5563',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      lineHeight: {
        relaxed: '1.75',
      }
    },
  },
  plugins: [],
}
