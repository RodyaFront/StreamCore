import { HITBOX_CONFIG } from '../config';
import type { HitboxModel } from '../types';

export function useHitboxStorage() {
    function saveHitbox(hitbox: HitboxModel): void {
        try {
            localStorage.setItem(HITBOX_CONFIG.STORAGE_KEY, JSON.stringify(hitbox));
            console.log('[useHitboxStorage] Hitbox saved:', hitbox);
        } catch (error) {
            console.error('[useHitboxStorage] Failed to save hitbox:', error);
        }
    }

    function loadHitbox(): HitboxModel | null {
        try {
            const stored = localStorage.getItem(HITBOX_CONFIG.STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const hitbox = JSON.parse(stored) as HitboxModel;

            if (!hitbox.center || !hitbox.vertices || !Array.isArray(hitbox.vertices)) {
                console.warn('[useHitboxStorage] Invalid hitbox data, returning null');
                return null;
            }

            console.log('[useHitboxStorage] Hitbox loaded:', hitbox);
            return hitbox;
        } catch (error) {
            console.error('[useHitboxStorage] Failed to load hitbox:', error);
            return null;
        }
    }

    function getDefaultHitbox(): HitboxModel {
        return {
            center: { ...HITBOX_CONFIG.DEFAULT_CENTER },
            vertices: HITBOX_CONFIG.DEFAULT_VERTICES.map(v => ({ ...v })),
        };
    }

    return {
        saveHitbox,
        loadHitbox,
        getDefaultHitbox,
    };
}
