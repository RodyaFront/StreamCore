import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  plugins: {
    '@tailwindcss/postcss': {
      base: resolve(__dirname, 'tailwind.config.js'),
    },
    autoprefixer: {},
  },
}

