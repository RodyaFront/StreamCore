import { ref } from 'vue';
import type { ExperienceElixirEvent } from '../types.ts';

export function useRewardQueue() {
    const queue = ref<ExperienceElixirEvent[]>([]);
    const isProcessing = ref(false);
    const activeCount = ref(0);

    function add(reward: ExperienceElixirEvent): void {
        queue.value.push(reward);
    }

    function getNext(): ExperienceElixirEvent | null {
        return queue.value.shift() || null;
    }

    function isEmpty(): boolean {
        return queue.value.length === 0;
    }

    function startProcessing(): void {
        isProcessing.value = true;
        activeCount.value++;
    }

    function stopProcessing(): void {
        activeCount.value--;
        if (activeCount.value <= 0) {
            activeCount.value = 0;
            isProcessing.value = false;
        }
    }

    return {
        queue,
        isProcessing,
        activeCount,
        add,
        getNext,
        isEmpty,
        startProcessing,
        stopProcessing
    };
}
