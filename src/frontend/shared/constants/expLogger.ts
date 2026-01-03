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
    'finishing_blow': 'за добитие',
    'unknown': 'за активность'
} as const;

export const SOURCE_CLASSES_MAP = {
    'message': 'text-blue-100 bg-blue-800/30',
    'word_of_day': 'text-purple-100 bg-purple-800/30',
    'achievement': 'text-yellow-100 bg-yellow-800/30',
    'quest': 'text-green-100 bg-green-800/30',
    'streak': 'text-red-100 bg-red-800/30',
    'reward': 'text-amber-100 bg-amber-800/30',
    'first_message': 'text-emerald-100 bg-emerald-800/30',
    'finishing_blow': 'text-orange-100 bg-orange-800/30',
    'unknown': 'text-gray-100 bg-gray-800/30'
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

