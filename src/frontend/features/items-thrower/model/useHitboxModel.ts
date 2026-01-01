import { ref, computed } from 'vue';
import { useHitboxStorage } from '../lib/useHitboxStorage';
import { HITBOX_CONFIG } from '../config';
import type { HitboxModel } from '../types';

export function useHitboxModel() {
    const storage = useHitboxStorage();
    const loadedHitbox = storage.loadHitbox();
    const defaultHitbox = storage.getDefaultHitbox();
    const hitbox = ref<HitboxModel>(loadedHitbox || { ...defaultHitbox, hp: defaultHitbox.hp ?? HITBOX_CONFIG.DEFAULT_HP });

    const center = computed(() => hitbox.value.center);
    const vertices = computed(() => hitbox.value.vertices);
    const hp = computed(() => hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP);

    function updateHitbox(newHitbox: HitboxModel): void {
        hitbox.value = { ...newHitbox, hp: newHitbox.hp ?? hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP };
        storage.saveHitbox(hitbox.value);
        console.log('[useHitboxModel] Hitbox updated:', hitbox.value);
    }

    function applyDamage(damage: number): void {
        const currentHp = hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP;
        const newHp = Math.max(0, Math.min(100, currentHp - damage));
        hitbox.value = { ...hitbox.value, hp: newHp };
        storage.saveHitbox(hitbox.value);
        console.log('[useHitboxModel] Damage applied:', { damage, oldHp: currentHp, newHp });
    }

    function resetHitbox(): void {
        const defaultHitbox = storage.getDefaultHitbox();
        updateHitbox({ ...defaultHitbox, hp: HITBOX_CONFIG.DEFAULT_HP });
    }

    function restoreFullHp(): void {
        hitbox.value = { ...hitbox.value, hp: HITBOX_CONFIG.DEFAULT_HP };
        storage.saveHitbox(hitbox.value);
        console.log('[useHitboxModel] Full HP restored:', hitbox.value.hp);
    }

    return {
        hitbox: computed(() => hitbox.value),
        center,
        vertices,
        hp,
        updateHitbox,
        applyDamage,
        resetHitbox,
        restoreFullHp,
    };
}
