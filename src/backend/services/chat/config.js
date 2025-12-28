/**
 * Конфигурация системы уровней и опыта
 * Значения можно переопределить через переменные окружения в .env файле
 */

// Задержка перед очисткой очереди пользователя (в миллисекундах)
// По умолчанию: 5 минут (300000 мс)
// Можно переопределить через QUEUE_CLEANUP_DELAY_MS в .env
const envDelay = Number(process.env.QUEUE_CLEANUP_DELAY_MS);
const DEFAULT_DELAY = 5 * 60 * 1000; // 5 минут
export const QUEUE_CLEANUP_DELAY = (
    envDelay &&
    Number.isFinite(envDelay) &&
    envDelay > 0
) ? envDelay : DEFAULT_DELAY;

// Максимальное безопасное значение опыта (для предотвращения переполнения)
// SQLite INTEGER поддерживает значения до 2^63 - 1
export const MAX_SAFE_EXP = Number.MAX_SAFE_INTEGER;

