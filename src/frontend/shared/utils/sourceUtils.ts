import type { ExpSource } from '@shared/types';
import { SOURCE_TEXT_MAP, SOURCE_CLASSES_MAP } from '@shared/constants/expLogger';

export const getSourceText = (source: ExpSource | string): string => {
    const key = source as ExpSource;
    return SOURCE_TEXT_MAP[key] || `за ${source}`;
};

export const getSourceClasses = (source: ExpSource | string): string => {
    const key = source as ExpSource;
    return SOURCE_CLASSES_MAP[key] || 'text-gray-400 bg-gray-400/30';
};

