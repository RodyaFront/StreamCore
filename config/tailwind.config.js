import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(__dirname, '../src/frontend/index.html'),
    resolve(__dirname, '../src/frontend/**/*.{vue,js,ts,jsx,tsx}'),
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

