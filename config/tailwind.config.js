/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./*.{vue,js,ts,jsx,tsx}",
    "./**/*.vue"
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'Courier', 'monospace'],
      },
    },
  },
  plugins: [],
}

