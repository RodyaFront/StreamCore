/**
 * Цветовые чекпоинты для уровней пользователей
 * Плавный градиент от серого к золотому
 */

export interface LevelColorCheckpoint {
    minLevel: number;
    maxLevel: number;
    color: string;
}

export const LEVEL_COLOR_CHECKPOINTS: LevelColorCheckpoint[] = [
    { minLevel: 1, maxLevel: 10, color: '#6b7280' }, // Серый
    { minLevel: 11, maxLevel: 20, color: '#3b82f6' }, // Синий
    { minLevel: 21, maxLevel: 30, color: '#06b6d4' }, // Голубой
    { minLevel: 31, maxLevel: 40, color: '#10b981' }, // Зелёный
    { minLevel: 41, maxLevel: 50, color: '#eab308' }, // Жёлтый
    { minLevel: 51, maxLevel: 60, color: '#f97316' }, // Оранжевый
    { minLevel: 61, maxLevel: 70, color: '#ef4444' }, // Красный
    { minLevel: 71, maxLevel: 80, color: '#a855f7' }, // Фиолетовый
    { minLevel: 81, maxLevel: 90, color: '#ec4899' }, // Розовый
    { minLevel: 91, maxLevel: Infinity, color: '#fbbf24' } // Золотой
] as const;

/**
 * Получает цвет для уровня пользователя
 * @param level - Уровень пользователя
 * @returns Hex цвет в формате #rrggbb
 */
export function getLevelColor(level: number | null | undefined): string {
    if (!level || level < 1) {
        return LEVEL_COLOR_CHECKPOINTS[0].color; // Серый по умолчанию
    }

    const checkpoint = LEVEL_COLOR_CHECKPOINTS.find(
        (cp) => level >= cp.minLevel && level <= cp.maxLevel
    );

    return checkpoint?.color || LEVEL_COLOR_CHECKPOINTS[LEVEL_COLOR_CHECKPOINTS.length - 1].color;
}

/**
 * Получает название категории уровня
 * @param level - Уровень пользователя
 * @returns Название категории
 */
export function getLevelCategory(level: number | null | undefined): string {
    if (!level || level < 1) {
        return 'Новичок';
    }

    if (level >= 1 && level <= 10) return 'Новичок';
    if (level >= 11 && level <= 20) return 'Ученик';
    if (level >= 21 && level <= 30) return 'Опытный';
    if (level >= 31 && level <= 40) return 'Мастер';
    if (level >= 41 && level <= 50) return 'Эксперт';
    if (level >= 51 && level <= 60) return 'Ветеран';
    if (level >= 61 && level <= 70) return 'Легенда';
    if (level >= 71 && level <= 80) return 'Мифический';
    if (level >= 81 && level <= 90) return 'Трансцендентный';
    return 'Божественный';
}

