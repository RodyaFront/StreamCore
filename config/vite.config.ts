import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
import { fileURLToPath as f2p } from 'url';
import { dirname, resolve } from 'path';

const __filename = f2p(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss({
            base: resolve(__dirname, 'tailwind.config.js'),
        }),
    ],
    css: {
        postcss: resolve(__dirname, 'postcss.config.js'),
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../src/frontend', import.meta.url)),
            '@shared': fileURLToPath(new URL('../src/frontend/shared', import.meta.url)),
            '@features': fileURLToPath(new URL('../src/frontend/features', import.meta.url))
        }
    },
    root: 'src/frontend',
    server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: {
            overlay: true
        },
        watch: {
            usePolling: false
        },
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    },
    build: {
        outDir: '../../dist',
        assetsDir: 'assets',
        emptyOutDir: true
    }
});

