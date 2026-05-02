/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff7ff',
          100: '#daedff',
          200: '#bcdfff',
          300: '#8ccbff',
          400: '#56adff',
          500: '#2e8fff',
          600: '#1672f0',
          700: '#125bd0',
          800: '#1349a0',
          900: '#142f66',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        card: '0 4px 12px rgba(16,24,40,0.06)',
      },
    },
  },
  plugins: [],
};
