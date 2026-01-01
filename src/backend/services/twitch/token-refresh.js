import { logger } from '../../core/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');

// Мьютекс для предотвращения параллельных обновлений
let refreshInProgress = false;
let refreshPromise = null;

// Rate limiting: минимальная задержка между обновлениями (5 минут)
const MIN_REFRESH_INTERVAL = 5 * 60 * 1000;
let lastRefreshAttempt = 0;
let lastSuccessfulRefresh = 0; // Время последнего успешного обновления

// Защита от бесконечных попыток с невалидным refresh token
let invalidTokenAttempts = 0;
const MAX_INVALID_TOKEN_ATTEMPTS = 3;
let lastInvalidTokenTime = 0;
const INVALID_TOKEN_RESET_INTERVAL = 30 * 60 * 1000; // 30 минут

// Метрики обновлений
const refreshMetrics = {
    totalAttempts: 0,
    successfulRefreshes: 0,
    failedRefreshes: 0,
    lastRefreshTime: null,
    lastError: null
};

/**
 * Получить метрики обновлений токенов
 */
export function getRefreshMetrics() {
    return { ...refreshMetrics };
}

/**
 * Валидация структуры ответа API
 * @param {any} data - данные ответа
 * @returns {boolean} - true если структура валидна
 */
function validateApiResponse(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }

    if (data.success === true) {
        // API может возвращать токены в разных форматах:
        // - access_token/refresh_token (стандартный Twitch API)
        // - token/refresh (twitchtokengenerator.com API)
        const hasStandardFormat = (
            typeof data.access_token === 'string' &&
            data.access_token.length > 0 &&
            typeof data.refresh_token === 'string' &&
            data.refresh_token.length > 0
        );

        const hasCustomFormat = (
            typeof data.token === 'string' &&
            data.token.length > 0 &&
            typeof data.refresh === 'string' &&
            data.refresh.length > 0
        );

        return hasStandardFormat || hasCustomFormat;
    }

    // Ошибка должна содержать message
    if (data.success === false) {
        return typeof data.message === 'string';
    }

    return false;
}

/**
 * Валидация формата токена
 * @param {string} token - токен для проверки
 * @returns {boolean} - true если токен валиден
 */
function validateTokenFormat(token) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    // Twitch токены обычно длиной 30+ символов и содержат буквы, цифры и подчеркивания
    return token.length >= 20 && /^[a-zA-Z0-9_\-]+$/.test(token);
}

/**
 * Retry с exponential backoff
 * @param {Function} fn - функция для выполнения
 * @param {number} maxRetries - максимальное количество попыток
 * @param {number} initialDelay - начальная задержка в мс
 * @returns {Promise<any>} - результат выполнения функции
 */
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt < maxRetries - 1) {
                const delay = initialDelay * Math.pow(2, attempt);
                logger.warning(`[TOKEN] Попытка ${attempt + 1}/${maxRetries} не удалась, повтор через ${delay}мс...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Обновить токен через API twitchtokengenerator.com
 * @param {string} refreshToken - refresh token для обновления
 * @returns {Promise<{accessToken: string, refreshToken: string}|null>} - новые токены или null при ошибке
 */
async function refreshTokenViaAPI(refreshToken) {
    if (!validateTokenFormat(refreshToken)) {
        logger.error('[TOKEN] Некорректный формат refresh token');
        return null;
    }

    const url = `https://twitchtokengenerator.com/api/refresh/${refreshToken}`;
    logger.info('[TOKEN] Попытка обновления токена через API...');

    try {
        const response = await retryWithBackoff(async () => {
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'StreamCore/1.0.0'
                },
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });

            if (!res.ok) {
                const errorText = await res.text().catch(() => 'Unknown error');
                throw new Error(`HTTP ${res.status}: ${errorText}`);
            }

            return res;
        }, 3, 1000);

        const data = await response.json();

        if (!validateApiResponse(data)) {
            logger.error('[TOKEN] Некорректная структура ответа API', JSON.stringify(data));
            return null;
        }

        if (!data.success) {
            const errorMessage = data.message || 'Unknown error';
            logger.error('[TOKEN] API вернул ошибку', errorMessage);
            refreshMetrics.lastError = errorMessage;

            // Если refresh token невалидный, это не проблема rate limiting
            // Возвращаем специальный флаг для пропуска rate limit при следующей попытке
            if (errorMessage.includes('Invalid refresh token') || errorMessage.includes('invalid refresh token')) {
                const now = Date.now();
                // Сбрасываем счетчик если прошло много времени
                if (now - lastInvalidTokenTime > INVALID_TOKEN_RESET_INTERVAL) {
                    invalidTokenAttempts = 0;
                }
                invalidTokenAttempts++;
                lastInvalidTokenTime = now;

                if (invalidTokenAttempts >= MAX_INVALID_TOKEN_ATTEMPTS) {
                    logger.error('[TOKEN] Превышено максимальное количество попыток с невалидным refresh token',
                        `Попыток: ${invalidTokenAttempts}. Проверьте REFRESH_TOKEN в .env`);
                }

                return { error: 'INVALID_REFRESH_TOKEN', message: errorMessage };
            }

            return null;
        }

        // Нормализуем формат ответа (API может возвращать token/refresh или access_token/refresh_token)
        const accessToken = data.access_token || data.token;
        const refreshToken = data.refresh_token || data.refresh;

        // Валидация полученных токенов
        if (!validateTokenFormat(accessToken)) {
            logger.error('[TOKEN] Некорректный формат access token');
            return null;
        }

        if (!validateTokenFormat(refreshToken)) {
            logger.error('[TOKEN] Некорректный формат refresh token');
            return null;
        }

        logger.success('[TOKEN] Токен успешно обновлен через API');
        return {
            accessToken,
            refreshToken
        };
    } catch (error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            logger.error('[TOKEN] Таймаут при обновлении токена', 'API не ответил за 10 секунд');
        } else if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
            logger.error('[TOKEN] API недоступен', 'проверьте интернет-соединение');
        } else {
            logger.error('[TOKEN] Ошибка при обновлении токена', error.message);
        }
        refreshMetrics.lastError = error.message;
        return null;
    }
}

/**
 * Парсинг .env файла с сохранением комментариев и форматирования
 * @param {string} content - содержимое .env файла
 * @returns {Array<{key: string, value: string, line: string, index: number}>} - массив записей
 */
function parseEnvFile(content) {
    const lines = content.split(/\r?\n/);
    const entries = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Пропускаем пустые строки и комментарии
        if (!line || line.startsWith('#')) {
            entries.push({ key: null, value: null, line: lines[i], index: i, isComment: true });
            continue;
        }

        // Парсим KEY=VALUE или KEY = VALUE
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (match) {
            const [, key, value] = match;
            // Убираем кавычки если есть
            const cleanValue = value.replace(/^["']|["']$/g, '');
            entries.push({ key, value: cleanValue, line: lines[i], index: i, isComment: false });
        } else {
            // Сохраняем строку как есть, если не распарсилась
            entries.push({ key: null, value: null, line: lines[i], index: i, isComment: false });
        }
    }

    return entries;
}

/**
 * Обновить переменные окружения в .env файле с сохранением форматирования
 * @param {string} accessToken - новый access token
 * @param {string} refreshToken - новый refresh token
 * @returns {Promise<boolean>} - true если успешно обновлено
 */
async function updateEnvFile(accessToken, refreshToken) {
    try {
        if (!fs.existsSync(ENV_FILE)) {
            logger.warning('[TOKEN] Файл .env не найден', 'не могу обновить токены в файле');
            return false;
        }

        // Создаем резервную копию
        const backupFile = `${ENV_FILE}.backup.${Date.now()}`;
        try {
            fs.copyFileSync(ENV_FILE, backupFile);
            // Удаляем старые backup файлы (оставляем только последние 5)
            const backupFiles = fs.readdirSync(path.dirname(ENV_FILE))
                .filter(f => f.startsWith('.env.backup.'))
                .map(f => ({
                    name: f,
                    path: path.join(path.dirname(ENV_FILE), f),
                    time: fs.statSync(path.join(path.dirname(ENV_FILE), f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);

            if (backupFiles.length > 5) {
                backupFiles.slice(5).forEach(f => {
                    try {
                        fs.unlinkSync(f.path);
                    } catch (e) {
                        // Игнорируем ошибки удаления старых backup
                    }
                });
            }
        } catch (backupError) {
            logger.warning('[TOKEN] Не удалось создать резервную копию', backupError.message);
        }

        const envContent = fs.readFileSync(ENV_FILE, 'utf8');
        const entries = parseEnvFile(envContent);
        let updated = false;

        // Обновляем существующие записи или добавляем новые
        let accessTokenFound = false;
        let refreshTokenFound = false;

        for (const entry of entries) {
            if (entry.key === 'ACCESS_TOKEN') {
                entry.value = accessToken;
                entry.line = `ACCESS_TOKEN=${accessToken}`;
                updated = true;
                accessTokenFound = true;
            } else if (entry.key === 'REFRESH_TOKEN') {
                entry.value = refreshToken;
                entry.line = `REFRESH_TOKEN=${refreshToken}`;
                updated = true;
                refreshTokenFound = true;
            }
        }

        // Добавляем недостающие токены в конец файла
        if (!accessTokenFound) {
            entries.push({
                key: 'ACCESS_TOKEN',
                value: accessToken,
                line: `ACCESS_TOKEN=${accessToken}`,
                index: entries.length,
                isComment: false
            });
            updated = true;
        }

        if (!refreshTokenFound) {
            entries.push({
                key: 'REFRESH_TOKEN',
                value: refreshToken,
                line: `REFRESH_TOKEN=${refreshToken}`,
                index: entries.length,
                isComment: false
            });
            updated = true;
        }

        if (updated) {
            const newContent = entries.map(e => e.line).join('\n');
            fs.writeFileSync(ENV_FILE, newContent, 'utf8');
            logger.success('[TOKEN] Токены обновлены в .env файле');
            return true;
        }

        return false;
    } catch (error) {
        logger.error('[TOKEN] Ошибка при обновлении .env файла', error.message);
        return false;
    }
}

/**
 * Обновить токены в process.env
 * @param {string} accessToken - новый access token
 * @param {string} refreshToken - новый refresh token
 */
function updateProcessEnv(accessToken, refreshToken) {
    process.env.ACCESS_TOKEN = accessToken;
    process.env.REFRESH_TOKEN = refreshToken;
    logger.info('[TOKEN] Токены обновлены в process.env');
}

/**
 * Полный цикл обновления токена: получение через API и сохранение
 * @param {string} refreshToken - текущий refresh token
 * @param {boolean} force - принудительное обновление (игнорировать rate limiting)
 * @returns {Promise<boolean>} - true если токен успешно обновлен
 */
export async function refreshAndSaveToken(refreshToken, force = false) {
    // Проверка защиты от невалидного refresh token
    const now = Date.now();
    if (invalidTokenAttempts >= MAX_INVALID_TOKEN_ATTEMPTS) {
        // Проверяем, не истек ли период блокировки
        if (now - lastInvalidTokenTime < INVALID_TOKEN_RESET_INTERVAL) {
            const waitTime = Math.ceil((INVALID_TOKEN_RESET_INTERVAL - (now - lastInvalidTokenTime)) / 1000 / 60);
            logger.warning(`[TOKEN] Refresh token был признан невалидным ${MAX_INVALID_TOKEN_ATTEMPTS} раз`,
                `Повторная попытка возможна через ${waitTime} минут. Проверьте REFRESH_TOKEN в .env`);
            return false;
        } else {
            // Сбрасываем счетчик если прошло достаточно времени
            invalidTokenAttempts = 0;
            logger.info('[TOKEN] Сброс счетчика невалидных попыток', 'повторная попытка обновления токена');
        }
    }

    // Проверка rate limiting
    // Rate limiting применяется только к успешным обновлениям
    // При ошибке аутентификации или невалидном refresh token разрешаем повторные попытки
    if (!force) {
        // Проверяем rate limit только если было успешное обновление недавно
        if (lastSuccessfulRefresh > 0 && (now - lastSuccessfulRefresh) < MIN_REFRESH_INTERVAL) {
            const waitTime = Math.ceil((MIN_REFRESH_INTERVAL - (now - lastSuccessfulRefresh)) / 1000);
            logger.warning(`[TOKEN] Rate limit: обновление возможно через ${waitTime} секунд`);
            return false;
        }
    }

    // Проверка мьютекса
    if (refreshInProgress) {
        logger.info('[TOKEN] Обновление уже выполняется, ожидание...');
        try {
            await refreshPromise;
            return true; // Если предыдущее обновление успешно, возвращаем true
        } catch (error) {
            return false;
        }
    }

    // Устанавливаем мьютекс
    refreshInProgress = true;
    lastRefreshAttempt = now;
    refreshMetrics.totalAttempts++;

    refreshPromise = (async () => {
        try {
            const newTokens = await refreshTokenViaAPI(refreshToken);

            // Проверяем, не вернулась ли ошибка о невалидном refresh token
            if (newTokens && newTokens.error === 'INVALID_REFRESH_TOKEN') {
                refreshMetrics.failedRefreshes++;
                refreshMetrics.lastError = newTokens.message;

                if (invalidTokenAttempts >= MAX_INVALID_TOKEN_ATTEMPTS) {
                    logger.error('[TOKEN] Refresh token невалиден',
                        `Превышено максимальное количество попыток (${MAX_INVALID_TOKEN_ATTEMPTS}). Проверьте REFRESH_TOKEN в .env`);
                    // Блокируем дальнейшие попытки до сброса счетчика
                    return false;
                }

                logger.error('[TOKEN] Refresh token невалиден',
                    `Попытка ${invalidTokenAttempts}/${MAX_INVALID_TOKEN_ATTEMPTS}. Проверьте REFRESH_TOKEN в .env`);
                // Не обновляем lastRefreshAttempt для невалидного токена
                return false;
            }

            // Сбрасываем счетчик невалидных токенов при успешном обновлении
            if (newTokens && !newTokens.error) {
                invalidTokenAttempts = 0;
            }

            if (!newTokens) {
                refreshMetrics.failedRefreshes++;
                // Не обновляем lastRefreshAttempt при неудаче (кроме невалидного токена)
                return false;
            }

            updateProcessEnv(newTokens.accessToken, newTokens.refreshToken);
            const fileUpdated = await updateEnvFile(newTokens.accessToken, newTokens.refreshToken);

            if (fileUpdated) {
                refreshMetrics.successfulRefreshes++;
                refreshMetrics.lastRefreshTime = new Date().toISOString();
                refreshMetrics.lastError = null;
                // Обновляем время только при успешном обновлении
                lastSuccessfulRefresh = Date.now();
                lastRefreshAttempt = Date.now();
                return true;
            } else {
                refreshMetrics.failedRefreshes++;
                return false;
            }
        } catch (error) {
            refreshMetrics.failedRefreshes++;
            refreshMetrics.lastError = error.message;
            logger.error('[TOKEN] Критическая ошибка при обновлении токена', error.message);
            return false;
        } finally {
            refreshInProgress = false;
            refreshPromise = null;
        }
    })();

    return await refreshPromise;
}
