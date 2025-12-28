import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../src/frontend', import.meta.url))
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

