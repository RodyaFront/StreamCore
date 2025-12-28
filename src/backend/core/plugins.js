import { eventBus } from './events.js';
import { serviceManager } from './services.js';
import { logger } from './logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PluginManager {
    constructor() {
        this.plugins = new Map();
        this.loaded = false;
    }

    async loadPlugins() {
        if (this.loaded) {
            return;
        }

        const pluginsDir = path.join(__dirname, '../../../plugins');

        try {
            const entries = await readdir(pluginsDir, { withFileTypes: true });
            const pluginDirs = entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);

            for (const pluginName of pluginDirs) {
                try {
                    logger.spinner(`plugin-${pluginName}`, `Загрузка плагина "${pluginName}"...`);
                    await this.loadPlugin(pluginName);
                    logger.stopSpinner(`plugin-${pluginName}`, true, `Плагин "${pluginName}" загружен`);
                } catch (error) {
                    logger.stopSpinner(`plugin-${pluginName}`, false, `Ошибка загрузки плагина "${pluginName}"`);
                    logger.error(`Ошибка загрузки плагина "${pluginName}"`, error.message);
                }
            }

            this.loaded = true;
            eventBus.emit('plugins:loaded', { count: this.plugins.size });
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warning('Папка plugins не найдена', 'пропускаю загрузку плагинов');
            } else {
                logger.error('Ошибка при загрузке плагинов', error.message);
            }
        }
    }

    async loadPlugin(name) {
        const pluginPath = path.join(__dirname, '../../../plugins', name, 'index.js');

        try {
            const pluginModule = await import(`file://${pluginPath}`);
            const plugin = pluginModule.default || pluginModule;

            if (!plugin.name) {
                throw new Error('Plugin must export a default object with "name" property');
            }

            this.plugins.set(plugin.name, {
                name: plugin.name,
                version: plugin.version || '1.0.0',
                instance: plugin,
                initialized: false
            });

            eventBus.emit('plugin:loaded', { name: plugin.name, version: plugin.version });
        } catch (error) {
            if (error.code === 'ERR_MODULE_NOT_FOUND') {
                logger.warning(`Плагин "${name}" не найден`, 'пропускаю');
            } else {
                throw error;
            }
        }
    }

    async initializePlugin(name) {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            throw new Error(`Plugin "${name}" not found`);
        }

        if (plugin.initialized) {
            return;
        }

        if (typeof plugin.instance.init === 'function') {
            await plugin.instance.init({
                eventBus,
                serviceManager,
                getService: (name) => serviceManager.get(name)
            });
        }

        plugin.initialized = true;
        eventBus.emit('plugin:initialized', { name: plugin.name });
    }

    async initializeAll() {
        const initPromises = Array.from(this.plugins.values()).map(
            plugin => this.initializePlugin(plugin.name).catch(err => {
                logger.error(`Ошибка инициализации плагина "${plugin.name}"`, err.message);
            })
        );

        await Promise.all(initPromises);
        eventBus.emit('plugins:initialized', { count: this.plugins.size });
    }

    get(name) {
        return this.plugins.get(name)?.instance;
    }

    has(name) {
        return this.plugins.has(name);
    }

    list() {
        return Array.from(this.plugins.values()).map(p => ({
            name: p.name,
            version: p.version,
            initialized: p.initialized
        }));
    }
}

export const pluginManager = new PluginManager();

