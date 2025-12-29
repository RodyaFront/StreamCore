export const EXP_LOGGER_CONSTANTS = {
    LOG_TIMEOUT: 4000,
    MAX_LOGS: 50,
    MASK_TRANSPARENT_START: '0%',
    MASK_TRANSPARENT_END: '15%',
    MASK_OPAQUE_END: '50%'
} as const;

export const SOURCE_TEXT_MAP = {
    'message': 'за сообщение',
    'word_of_day': 'за слово дня',
    'achievement': 'за достижение',
    'quest': 'за квест',
    'streak': 'за стрик',
    'reward': 'за награду',
    'first_message': 'за первое сообщение',
    'unknown': 'за активность'
} as const;

export const SOURCE_CLASSES_MAP = {
    'message': 'text-blue-400 bg-blue-400/30',
    'word_of_day': 'text-purple-400 bg-purple-400/30',
    'achievement': 'text-yellow-400 bg-yellow-400/30',
    'quest': 'text-green-400 bg-green-400/30',
    'streak': 'text-red-400 bg-red-400/30',
    'reward': 'text-amber-400 bg-amber-400/30',
    'first_message': 'text-emerald-400 bg-emerald-400/30',
    'unknown': 'text-gray-400 bg-gray-400/30'
} as const;

export const UI_TEXT = {
    LEVEL_UP: 'повысил свой уровень до',
    RECEIVED: 'получил',
    EXP: 'опыта'
} as const;

export const SOCKET_RETRY_CONFIG = {
    MAX_RETRIES: 5,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 30000,
    BACKOFF_MULTIPLIER: 2
} as const;

