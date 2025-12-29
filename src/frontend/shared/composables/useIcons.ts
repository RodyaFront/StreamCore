/**
 * Composable для удобного использования иконок Lucide
 *
 * Пример использования:
 * ```vue
 * <script setup>
 * import { useIcons } from '@shared/composables/useIcons';
 * const { Star, Heart, User } = useIcons();
 * </script>
 *
 * <template>
 *   <Star :size="24" />
 * </template>
 * ```
 */

import * as LucideIcons from 'lucide-vue-next';

export function useIcons() {
    return LucideIcons;
}

/**
 * Получить конкретную иконку по имени
 * @param iconName - имя иконки (например, 'Star', 'Heart')
 * @returns компонент иконки или null
 */
export function getIcon(iconName: string) {
    return (LucideIcons as any)[iconName] || null;
}

