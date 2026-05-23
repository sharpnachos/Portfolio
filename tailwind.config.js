/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 18px 45px rgba(16, 185, 129, 0.22)'
      }
    },
  },
  plugins: [],
}

