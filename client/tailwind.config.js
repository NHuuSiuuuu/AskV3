/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F2A4D',
          primary: '#0F2A4D',
          secondary: '#1E3A6B',
          dark: '#0A1D36',
          light: '#25477D',
          50: '#F0F4F9',
          100: '#E1E9F3',
          200: '#C3D4E7',
          600: '#1E3A6B',
          700: '#0F2A4D',
          800: '#0B203B',
          900: '#071526',
        },
        gold: {
          DEFAULT: '#D4AF7C',
          accent: '#D4AF7C',
          light: '#EAD7BC',
          dark: '#B8925E',
          50: '#FAF6F0',
          100: '#F5ECE0',
          200: '#EAD7BC',
          500: '#D4AF7C',
          600: '#B8925E',
        },
        brand: {
          50: '#F0F4F9',
          100: '#E1E9F3',
          200: '#C3D4E7',
          300: '#9AB7D5',
          400: '#527EA8',
          500: '#1E3A6B',
          600: '#0F2A4D',
          700: '#0B203B',
          800: '#08172B',
          900: '#050E1B',
        },
        gemini: {
          bg: '#F6F8FB',
          surface: '#ffffff',
          sidebar: '#F0F4F9',
          border: '#CBD5E1',
          hover: '#E2EAF3',
          active: '#D4E0EE',
          text: '#0F2A4D',
          muted: '#64748B',
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
