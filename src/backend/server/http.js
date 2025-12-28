import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { setupChatRoutes } from '../api/routes/chat.js';
import { setupDebugRoutes } from '../api/routes/debug.js';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createHttpServer() {
    return http.createServer((req, res) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;
        const searchParams = url.searchParams;

        if (pathname.startsWith('/api/chat')) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');

            try {
                const handled = setupChatRoutes(req, res, pathname, searchParams);
                if (!handled) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Endpoint not found' }));
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        if (pathname.startsWith('/api/debug')) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(200);
                res.end();
                return;
            }

            try {
                const handled = setupDebugRoutes(req, res, pathname, searchParams);
                if (!handled) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Endpoint not found' }));
                }
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
            return;
        }

        if (pathname === '/view-stats' || pathname === '/view-stats.html') {
            const statsPath = path.join(__dirname, '../../../..', 'view-stats.html');
            fs.readFile(statsPath, (error, content) => {
                if (error) {
                    res.writeHead(404);
                    res.end('File not found');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                }
            });
            return;
        }

        let filePath = '.' + req.url;

        if (filePath === './' || filePath === './index.html') {
            filePath = './dist/index.html';
        } else if (filePath.startsWith('./dist')) {
            filePath = filePath;
        } else if (filePath.startsWith('./assets') || filePath.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|mp3|woff|woff2|ttf|eot)$/)) {
            filePath = './dist' + req.url;
        } else {
            filePath = './dist/index.html';
        }

        const extname = String(path.extname(filePath)).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.mjs': 'text/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.jpg': 'image/jpg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.mp3': 'audio/mpeg',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
        };

        const contentType = mimeTypes[extname] || 'application/octet-stream';

        fs.readFile(filePath, (error, content) => {
            if (error) {
                if (error.code === 'ENOENT') {
                    res.writeHead(404);
                    res.end('File not found');
                } else {
                    res.writeHead(500);
                    res.end('Server error: ' + error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });
}

