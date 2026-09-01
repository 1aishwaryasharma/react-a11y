/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './screens/**/*.tsx'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#7c8ea3', 500: '#7c8ea3', 900: '#0b1d33' },
      },
    },
  },
};
