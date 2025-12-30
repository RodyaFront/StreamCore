import tls from 'tls';
import { EventEmitter } from 'events';
import { logMessage } from '../chat/logger.js';
import { logger } from '../../core/logger.js';
import { eventBus } from '../../core/index.js';
import { refreshAndSaveToken } from './token-refresh.js';

let twitchClient = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

// Флаг для предотвращения повторных попыток обновления токена при ошибке аутентификации
let tokenRefreshInProgress = false;

class TwitchIRCClient extends EventEmitter {
    constructor(username, oauthToken, channel, io) {
        super();
        this.username = username.toLowerCase();
        this.oauthToken = oauthToken.startsWith('oauth:') ? oauthToken : `oauth:${oauthToken}`;
        this.channel = channel.startsWith('#') ? channel : `#${channel}`;
        this.io = io;
        this.connected = false;
        this.buffer = '';
    }

    connect() {
        return new Promise((resolve, reject) => {
            const socket = tls.connect({
                host: 'irc.chat.twitch.tv',
                port: 6697,
                rejectUnauthorized: false
            }, () => {
                this.connected = true;
                reconnectAttempts = 0;

                if (process.env.DEBUG_TWITCH_IRC === 'true') {
                    logger.info('TCP соединение установлено', 'отправка аутентификации');
                }
                socket.write(`PASS ${this.oauthToken}\r\n`);
                socket.write(`NICK ${this.username}\r\n`);
            });

            socket.setEncoding('utf8');
            // Twitch требует ответ на PING каждые 5 минут, но ставим таймаут больше
            socket.setTimeout(0); // Отключаем таймаут, полагаемся на PING/PONG

            let resolved = false;

            socket.on('data', (data) => {
                this.buffer += data;
                const lines = this.buffer.split('\r\n');
                this.buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        this.handleMessage(line, () => {
                            if (!resolved) {
                                resolved = true;
                                resolve();
                            }
                        });
                    }
                }
            });

            socket.on('error', (err) => {
                this.connected = false;
                logger.error('Ошибка сокета Twitch IRC', `${err.code}: ${err.message}`);
                this.emit('error', err);
                if (!this.reconnecting && !resolved) {
                    resolved = true;
                    reject(err);
                }
            });

            socket.on('close', () => {
                this.connected = false;
                this.attemptReconnect();
            });

            socket.on('timeout', () => {
                logger.warning('Таймаут соединения', 'переподключение...');
                socket.destroy();
                this.connected = false;
                if (!resolved) {
                    resolved = true;
                    reject(new Error('Connection timeout'));
                }
            });

            this.socket = socket;
            this.emit('connecting');
        });
    }

    handleMessage(line, onJoin) {
        if (line.startsWith('PING')) {
            const pong = line.replace('PING', 'PONG');
            if (this.socket && !this.socket.destroyed) {
                this.socket.write(`${pong}\r\n`);
            }
            return;
        }

        if (line.includes('001') || line.includes('Welcome')) {
            this.socket.write(`JOIN ${this.channel}\r\n`);
            this.emit('connected');
            return;
        }

        if (line.includes(`JOIN ${this.channel}`)) {
            if (line.includes(this.username) || line.includes(`:${this.username}!`)) {
                logger.success('Подключен к каналу', this.channel);
                this.emit('join', this.channel);
                this.emit('irc:connected', this.channel);
                if (onJoin) {
                    onJoin();
                }
                return;
            }
        }

        if (line.includes('366') && line.includes(this.channel)) {
            this.emit('join', this.channel);
            this.emit('irc:connected', this.channel);
            if (onJoin) {
                onJoin();
            }
            return;
        }

        const privmsgMatch = line.match(/^:([^!]+)![^@]+@[^\.]+\.tmi\.twitch\.tv PRIVMSG #([^:]+) :(.+)$/);
        if (privmsgMatch) {
            const [, username, channel, message] = privmsgMatch;
            const msg = message.trim().toLowerCase();
            const isCommand = msg.startsWith('!');

            logMessage(username, username, message, channel, isCommand);

            if (msg === '!тест') {
                if (this.io) {
                    this.io.emit('twitchCommand', {
                        command: 'test',
                        username: username,
                        message: message,
                        channel: `#${channel}`
                    });
                }
            }

            if (msg.startsWith('!совет ') || message.trim().startsWith('!совет ')) {
                const adviceMatch = message.trim().match(/^!совет\s+(.+)$/i);

                if (adviceMatch && adviceMatch[1]) {
                    const adviceText = adviceMatch[1].trim();

                    if (adviceText.length > 0) {
                        if (this.io) {
                            this.io.emit('twitchCommand', {
                                command: 'advice',
                                username: username,
                                message: adviceText,
                                channel: `#${channel}`
                            });
                        }
                    }
                }
            }

            this.emit('message', channel, { username, 'display-name': username }, message, false);

            // Эмитим событие для обработчика чата
            eventBus.emit('twitch:irc:message', {
                username,
                displayName: username,
                message,
                channel,
                isCommand
            });

            return;
        }

        if (line.includes('Login authentication failed') || line.includes('Invalid NICK')) {
            logger.error('Ошибка аутентификации Twitch IRC', line);
            this.connected = false;
            this.socket.destroy();

            // Защита от повторных попыток обновления
            if (tokenRefreshInProgress) {
                logger.warning('[TOKEN] Обновление токена уже выполняется, пропускаем повторную попытку');
                const error = new Error('Authentication failed');
                this.emit('error', error);
                return;
            }

            // Пытаемся обновить токен и переподключиться
            // Используем force=true при ошибке аутентификации, чтобы обойти rate limiting
            const refreshToken = process.env.REFRESH_TOKEN;
            if (refreshToken) {
                tokenRefreshInProgress = true;
                logger.info('[TOKEN] Попытка автоматического обновления токена...');

                refreshAndSaveToken(refreshToken, true).then((refreshed) => {
                    tokenRefreshInProgress = false;

                    if (refreshed) {
                        logger.success('[TOKEN] Токен обновлен, переподключение...');
                        // Обновляем токен в клиенте
                        const newToken = process.env.ACCESS_TOKEN;
                        if (newToken) {
                            this.oauthToken = newToken.startsWith('oauth:') ? newToken : `oauth:${newToken}`;
                            // Переподключаемся с новым токеном через небольшую задержку
                            setTimeout(() => {
                                this.connect().catch((err) => {
                                    logger.error('[TOKEN] Ошибка при переподключении с новым токеном', err.message);
                                    const error = new Error('Authentication failed');
                                    this.emit('error', error);
                                });
                            }, 1000);
                            return;
                        }
                    }
                    // Если обновление не удалось, отправляем ошибку
                    logger.error('[TOKEN] Не удалось обновить токен');
                    const error = new Error('Authentication failed');
                    this.emit('error', error);
                }).catch((err) => {
                    tokenRefreshInProgress = false;
                    logger.error('[TOKEN] Ошибка при обновлении токена', err.message);
                    const error = new Error('Authentication failed');
                    this.emit('error', error);
                });
            } else {
                logger.error('[TOKEN] REFRESH_TOKEN не найден', 'не могу обновить токен автоматически');
                const error = new Error('Authentication failed');
                this.emit('error', error);
            }
            return;
        }

        if (line.includes('NOTICE') && (line.includes('authentication failed') || line.includes('Improperly formatted auth'))) {
            logger.error('Ошибка формата токена', line);
            this.emit('error', new Error('Invalid token format'));
            this.socket.destroy();
            return;
        }
    }

    attemptReconnect() {
        if (this.reconnecting) return;

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            logger.error('Достигнуто максимальное количество попыток переподключения', `${MAX_RECONNECT_ATTEMPTS}`);
            this.emit('error', new Error('Max reconnection attempts reached'));
            return;
        }

        this.reconnecting = true;
        reconnectAttempts++;

        reconnectTimeout = setTimeout(() => {
            this.reconnecting = false;
            logger.warning(`Попытка переподключения ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
            this.connect().catch((err) => {
                logger.error('Ошибка при переподключении', err.message);
            });
        }, RECONNECT_DELAY);
    }

    sendMessage(message) {
        if (!this.connected || !this.socket || this.socket.destroyed) {
            logger.warning('[IRC] Не удалось отправить сообщение', 'IRC клиент не подключен');
            return false;
        }

        try {
            const command = `PRIVMSG ${this.channel} :${message}\r\n`;
            this.socket.write(command);
            return true;
        } catch (error) {
            logger.error('[IRC] Ошибка при отправке сообщения', error.message);
            return false;
        }
    }

    disconnect() {
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }

        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }

        this.connected = false;
        this.reconnecting = false;
    }
}

async function validateToken(token) {
    try {
        // Токен уже должен быть без префикса 'oauth:'
        const cleanToken = token.replace(/^oauth:/i, '');
        const response = await fetch('https://id.twitch.tv/oauth2/validate', {
            headers: {
                'Authorization': `OAuth ${cleanToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return { valid: true, data };
        } else if (response.status === 401) {
            // Токен истек - пытаемся обновить
            logger.warning('Токен истек (401)', 'попытка автоматического обновления...');
            const refreshToken = process.env.REFRESH_TOKEN;

            if (refreshToken) {
                // При ошибке 401 используем force=true для обновления токена
                const refreshed = await refreshAndSaveToken(refreshToken, true);
                if (refreshed) {
                    // Обновляем токен в process.env
                    const newToken = process.env.ACCESS_TOKEN;
                    if (newToken) {
                        logger.success('Токен обновлен', 'повторная валидация...');
                        // Повторно валидируем новый токен
                        const newCleanToken = newToken.replace(/^oauth:/i, '');
                        const retryResponse = await fetch('https://id.twitch.tv/oauth2/validate', {
                            headers: {
                                'Authorization': `OAuth ${newCleanToken}`
                            }
                        });

                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json();
                            return { valid: true, data: retryData, refreshed: true };
                        }
                    }
                } else {
                    logger.error('Не удалось обновить токен', 'проверьте REFRESH_TOKEN в .env');
                }
            } else {
                logger.error('REFRESH_TOKEN не найден', 'не могу обновить токен автоматически');
            }

            return { valid: false, error: 'Token expired and refresh failed' };
        } else {
            const errorText = await response.text().catch(() => 'Unknown error');
            logger.warning('Ошибка валидации токена', `HTTP ${response.status}: ${errorText}`);
            return { valid: false, error: errorText };
        }
    } catch (error) {
        logger.warning('Ошибка при валидации токена', error.message);
        return { valid: false, error: error.message };
    }
}

export async function initTwitch(io) {
    const username = process.env.TWITCH_ACCOUNT;
    let oauthToken = process.env.ACCESS_TOKEN;
    const channel = process.env.TWITCH_ACCOUNT;

    if (!username || !oauthToken || !channel) {
        logger.error('Не найдены переменные окружения', 'TWITCH_ACCOUNT или ACCESS_TOKEN');
        return;
    }

    const tokenWithoutPrefix = oauthToken.replace('oauth:', '');
    const validationResult = await validateToken(tokenWithoutPrefix);

    // Если токен был обновлен, используем новый токен
    if (validationResult?.refreshed) {
        oauthToken = process.env.ACCESS_TOKEN;
        logger.info('Используется обновленный токен для подключения');
    }

    if (!validationResult || !validationResult.valid) {
        logger.warning('Не удалось валидировать токен через API', 'попробую подключиться напрямую');
    } else {
        const tokenData = validationResult.data;
        const requiredScopes = ['chat:read', 'chat:edit'];
        const hasRequiredScopes = requiredScopes.every(scope => tokenData.scopes?.includes(scope));
        if (!hasRequiredScopes) {
            logger.warning('Токен не имеет всех необходимых прав', `Требуются: ${requiredScopes.join(', ')}, попробую подключиться`);
        }
    }

    // Обновляем токен из process.env на случай, если он был обновлен
    oauthToken = process.env.ACCESS_TOKEN || oauthToken;

    if (!oauthToken.startsWith('oauth:')) {
        oauthToken = `oauth:${oauthToken}`;
    }

    const ircUsername = username.toLowerCase();
    const channelName = channel.startsWith('#') ? channel : `#${channel}`;

    const client = new TwitchIRCClient(ircUsername, oauthToken, channelName, io);

    client.on('irc:connected', (channel) => {
        eventBus.emit('twitch:irc:connected', { channel });
    });

    client.on('error', (err) => {
        logger.error('Ошибка Twitch IRC клиента', err.message);
        eventBus.emit('twitch:irc:error', { error: err.message });
    });

    try {
        await client.connect();
        twitchClient = client;
    } catch (err) {
        logger.error('Ошибка при подключении к Twitch IRC', err.message);
        logger.warning('IRC подключение не установлено', 'проверьте токен и права доступа');
        twitchClient = client;
    }
}

export function disconnectTwitch() {
    if (twitchClient) {
        twitchClient.disconnect();
        twitchClient = null;
    }
}

export function sendChatMessage(message) {
    if (twitchClient && twitchClient.connected) {
        return twitchClient.sendMessage(message);
    }
    logger.warning('[IRC] Не удалось отправить сообщение в чат', 'IRC клиент не подключен');
    return false;
}

