import { logger } from '../../core/logger.js';

class EmoteService {
    constructor() {
        this.apiClient = null;
        this.broadcasterId = null;
        this.emotesMap = new Map();
        this.cacheTimeout = 30 * 60 * 1000;
        this.lastCacheUpdate = null;
    }

    /**
     * Инициализирует сервис с API клиентом и broadcaster ID
     * @param {Object} apiClient - Twitch API клиент
     * @param {string} broadcasterId - ID стримера
     */
    initialize(apiClient, broadcasterId) {
        this.apiClient = apiClient;
        this.broadcasterId = broadcasterId;
        this.loadEmotes();
    }

    /**
     * Загружает эмодзи из Twitch API
     */
    async loadEmotes() {
        if (!this.apiClient || !this.broadcasterId) {
            return;
        }

        try {
            const [globalEmotes, channelEmotes] = await Promise.all([
                this.apiClient.chat.getGlobalEmotes(),
                this.apiClient.chat.getChannelEmotes(this.broadcasterId)
            ]);

            this.processEmotes(globalEmotes, 'global');
            this.processEmotes(channelEmotes, 'channel');

            this.lastCacheUpdate = Date.now();
            logger.info(`[EMOTES] Загружено ${this.emotesMap.size} эмодзи`);
        } catch (error) {
            logger.error('[EMOTES] Ошибка при загрузке эмодзи:', error.message);
        }
    }

    /**
     * Обрабатывает массив эмодзи и добавляет их в Map
     * @param {Array} emotes - Массив эмодзи
     * @param {string} type - Тип эмодзи ('global' или 'channel')
     */
    processEmotes(emotes, type) {
        for (const emote of emotes) {
            if (!emote.name) {
                continue;
            }

            const url = this.getEmoteUrl(emote);
            if (url) {
                this.emotesMap.set(emote.name.toLowerCase(), {
                    id: emote.id,
                    name: emote.name,
                    url: url,
                    type: type === 'channel' ? (emote.emoteType || 'channel') : type
                });
            }
        }
    }

    /**
     * Получает URL эмодзи различными способами
     * @param {Object} emote - Объект эмодзи
     * @returns {string|null} URL эмодзи или null
     */
    getEmoteUrl(emote) {
        if (!emote || !emote.id) {
            return null;
        }

        const methods = [
            () => emote.getImageUrl?.(),
            () => emote.getImageUrl?.('1.0'),
            () => emote.getStaticImageUrl?.('static', '1.0'),
            () => emote.images?.url_1x || emote.images?.url_2x || emote.images?.url_4x
        ];

        for (const method of methods) {
            try {
                const url = method();
                if (url) return url;
            } catch (e) {
                continue;
            }
        }

        return `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/static/dark/1.0`;
    }

    /**
     * Обновляет кэш эмодзи если он устарел
     */
    async refreshIfNeeded() {
        if (!this.lastCacheUpdate || Date.now() - this.lastCacheUpdate > this.cacheTimeout) {
            await this.loadEmotes();
        }
    }

    /**
     * Экранирует HTML для безопасности
     * @param {string} text - Текст для экранирования
     * @returns {string} Экранированный текст
     */
    escapeHtml(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    /**
     * Подсвечивает упоминания (@username) в тексте
     * Работает с неэкранированным текстом
     * @param {string} text - Текст сообщения (не экранированный)
     * @returns {string} Текст с подсвеченными упоминаниями (HTML)
     */
    parseMentions(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        const mentionRegex = /@(\w+)/g;
        return text.replace(mentionRegex, (match, username) => {
            const escapedMatch = this.escapeHtml(match);
            return `<span class="mention">${escapedMatch}</span>`;
        });
    }

    /**
     * Форматирует ссылки в тексте
     * Работает с неэкранированным текстом
     * @param {string} text - Текст сообщения (не экранированный)
     * @returns {string} Текст с отформатированными ссылками (HTML)
     */
    formatLinks(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
        const MAX_LINK_LENGTH = 50;

        return text.replace(urlRegex, (url) => {
            const escapedUrl = this.escapeHtml(url);
            const displayUrl = url.length > MAX_LINK_LENGTH
                ? url.substring(0, MAX_LINK_LENGTH - 3) + '...'
                : url;
            const escapedDisplayUrl = this.escapeHtml(displayUrl);
            return `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="message-link">${escapedDisplayUrl}</a>`;
        });
    }

    /**
     * Парсит сообщение и заменяет коды эмодзи на HTML
     * Также обрабатывает упоминания и ссылки
     * @param {string} message - Текст сообщения
     * @returns {string} Сообщение с HTML для эмодзи, упоминаний и ссылок
     */
    parseMessage(message) {
        if (!message || typeof message !== 'string') {
            return message;
        }

        this.refreshIfNeeded().catch(() => {});

        const parts = [];
        const tokens = message.split(/(\s+)/);

        for (const token of tokens) {
            if (!token) continue;

            if (/^\s+$/.test(token)) {
                parts.push(token);
                continue;
            }

            const cleanWord = token.replace(/^[^\w]*|[^\w]*$/g, '').toLowerCase();
            const emote = cleanWord ? this.emotesMap.get(cleanWord) : null;

            if (emote && cleanWord.length > 0 && emote.url && emote.name) {
                const prefix = token.match(/^[^\w]*/)?.[0] || '';
                const suffix = token.match(/[^\w]*$/)?.[0] || '';
                parts.push(
                    `${this.escapeHtml(prefix)}` +
                    `<img src="${this.escapeHtml(emote.url)}" alt="${this.escapeHtml(emote.name)}" class="twitch-emote" />` +
                    `${this.escapeHtml(suffix)}`
                );
            } else {
                let processedToken = token;
                processedToken = this.parseMentions(processedToken);
                processedToken = this.formatLinks(processedToken);

                const placeholders = new Map();
                let placeholderIndex = 0;
                const placeholderPrefix = '__PLACEHOLDER_';
                const placeholderSuffix = '__';

                processedToken = processedToken.replace(/<[^>]+>/g, (match) => {
                    const placeholder = `${placeholderPrefix}${placeholderIndex}${placeholderSuffix}`;
                    placeholders.set(placeholder, match);
                    placeholderIndex++;
                    return placeholder;
                });

                processedToken = this.escapeHtml(processedToken);

                placeholders.forEach((html, placeholder) => {
                    processedToken = processedToken.replace(placeholder, html);
                });

                parts.push(processedToken);
            }
        }

        return parts.join('');
    }

    /**
     * Получает информацию об эмодзи по имени
     * @param {string} name - Имя эмодзи
     * @returns {Object|null} Информация об эмодзи или null
     */
    getEmote(name) {
        return this.emotesMap.get(name.toLowerCase()) || null;
    }

    /**
     * Проверяет, является ли слово эмодзи
     * @param {string} word - Слово для проверки
     * @returns {boolean} true если это эмодзи
     */
    isEmote(word) {
        return this.emotesMap.has(word.toLowerCase());
    }
}

let instance = null;

export function getEmoteService() {
    if (!instance) {
        instance = new EmoteService();
    }
    return instance;
}
