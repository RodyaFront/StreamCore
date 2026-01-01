import { ref } from 'vue';
import type { DamagePopup } from '../types';

export function useDamagePopups() {
    const popups = ref<DamagePopup[]>([]);

    function addDamagePopup(x: number, y: number, damage: number): void {
        const id = `damage-${Date.now()}-${Math.random()}`;
        popups.value.push({
            id,
            x,
            y,
            damage,
        });

        setTimeout(() => {
            const index = popups.value.findIndex(p => p.id === id);
            if (index !== -1) {
                popups.value.splice(index, 1);
            }
        }, 2000);
    }

    return {
        popups,
        addDamagePopup,
    };
}
