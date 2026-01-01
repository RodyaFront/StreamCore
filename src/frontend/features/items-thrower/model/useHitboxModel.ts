import { ref, computed } from 'vue';
import { useHitboxStorage } from '../lib/useHitboxStorage';
import type { HitboxModel } from '../types';

export function useHitboxModel() {
    const storage = useHitboxStorage();
    const hitbox = ref<HitboxModel>(storage.loadHitbox() || storage.getDefaultHitbox());

    const center = computed(() => hitbox.value.center);
    const vertices = computed(() => hitbox.value.vertices);

    function updateHitbox(newHitbox: HitboxModel): void {
        hitbox.value = newHitbox;
        storage.saveHitbox(newHitbox);
        console.log('[useHitboxModel] Hitbox updated:', newHitbox);
    }

    function resetHitbox(): void {
        const defaultHitbox = storage.getDefaultHitbox();
        updateHitbox(defaultHitbox);
    }

    return {
        hitbox: computed(() => hitbox.value),
        center,
        vertices,
        updateHitbox,
        resetHitbox,
    };
}
