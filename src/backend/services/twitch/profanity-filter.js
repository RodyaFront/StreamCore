const RUSSIAN_PROFANITY_WORDS = [
    'блять', 'блядь', 'бля', 'ебан', 'ебал', 'ебать', 'ебат', 'ебану', 'ебну',
    'хуй', 'хуя', 'хуе', 'хуи', 'хуё', 'хуя', 'хуев', 'хуйня', 'хуйню',
    'пизд', 'пизда', 'пизде', 'пизду', 'пизды', 'пиздо', 'пиздя',
    'сука', 'суки', 'суке', 'суку', 'сукой', 'суко', 'сучар', 'сучий',
    'еблан', 'ебло', 'ебла', 'ебле', 'еблу',
    'мудак', 'мудаки', 'мудака', 'мудаку', 'мудаком',
    'гандон', 'гондон', 'гандона', 'гондона',
    'пидор', 'пидорас', 'пидора', 'пидору', 'пидором',
    'долбоеб', 'долбоёб', 'долбоеба', 'долбоёба',
    'залупа', 'залупы', 'залупе', 'залупу',
    'мразь', 'мрази', 'мрази', 'мразью',
    'ублюдок', 'ублюдка', 'ублюдку', 'ублюдком',
    'шлюха', 'шлюхи', 'шлюхе', 'шлюху', 'шлюхой',
    'блядина', 'блядины', 'блядине', 'блядину', 'блядиной',

    // Националистические и военные высказывания
    'zov', 'зов', 'за наших', 'занаших', 'заzа', 'слава россии', 'славарф',
    'слава рф', 'герои', 'наши', 'наши парни', 'нашибойцы', 'спецоперация',
    'спецоп', 'сво', 'свo', 'денацификация', 'денациф', 'освобождение',
    'освобожден', 'вов', 'великая отечественная', 'победа', '9 мая',
    'день победы', 'георгиевская лента', 'георгиевка'
];

function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/[ё]/g, 'е')
        .replace(/[ъь]/g, '')
        .replace(/[^а-яa-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractWords(text) {
    const normalized = normalizeText(text);
    return normalized.split(/\s+/).filter(word => word.length > 2);
}

export function containsProfanity(text) {
    if (!text || typeof text !== 'string') {
        return false;
    }

    const words = extractWords(text);
    const normalizedText = normalizeText(text);

    // Проверка на одиночный символ "z" или "Z" (военный символ)
    if (/^z$/i.test(text.trim()) || normalizedText === 'z') {
        return true;
    }

    for (const profanityWord of RUSSIAN_PROFANITY_WORDS) {
        const normalizedProfanity = normalizeText(profanityWord);

        // Для фраз с пробелами проверяем вхождение в нормализованный текст
        if (normalizedProfanity.includes(' ')) {
            if (normalizedText.includes(normalizedProfanity)) {
                return true;
            }
        } else {
            // Для отдельных слов проверяем вхождение в текст и в отдельные слова
            if (normalizedText.includes(normalizedProfanity)) {
                return true;
            }

            for (const word of words) {
                if (word.includes(normalizedProfanity) || normalizedProfanity.includes(word)) {
                    return true;
                }
            }
        }
    }

    return false;
}

