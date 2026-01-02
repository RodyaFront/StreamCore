<template>
    <div class="experience-elixir-page">
        <RewardAnimation
            v-for="reward in activeRewards"
            :key="reward.id"
            :reward="reward"
            @complete="removeReward(reward.id!)"
        />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSocketConnection } from '@shared/composables/useSocketConnection';
import { useRewardQueue } from './lib/useRewardQueue';
import RewardAnimation from './components/RewardAnimation.vue';
import type { ExperienceElixirEvent } from './types';

const { add, getNext, isEmpty, startProcessing, stopProcessing, activeCount } = useRewardQueue();
const activeRewards = ref<ExperienceElixirEvent[]>([]);
const MAX_CONCURRENT_ANIMATIONS = 1;

function generateRewardId(): string {
    return `reward-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function removeReward(rewardId: string) {
    const index = activeRewards.value.findIndex(r => r.id === rewardId);
    if (index !== -1) {
        activeRewards.value.splice(index, 1);
        stopProcessing();
    }
    setTimeout(() => {
        processNextReward();
    }, 1000);
}

function processNextReward() {
    while (activeCount.value < MAX_CONCURRENT_ANIMATIONS && !isEmpty()) {
        const reward = getNext();
        if (!reward) {
            break;
        }

        reward.id = generateRewardId();
        activeRewards.value.push(reward);
        startProcessing();
    }
}

useSocketConnection({
    onConnect: () => {
        console.log('[Experience Elixir] Подключено к Socket.IO');
    },
    onDisconnect: () => {
        console.log('[Experience Elixir] Отключено от Socket.IO');
    },
    onExperienceElixir: (data: ExperienceElixirEvent) => {
        console.log('[Experience Elixir] Получена награда эликсира опыта:', data);
        if (data.oldLevel !== null && data.newLevel !== null) {
            console.log(`[Experience Elixir] Уровень пользователя ${data.username}: ${data.oldLevel} → ${data.newLevel}`);
        }

        add(data);
        if (activeCount.value === 0) {
            processNextReward();
        }
    },
});
</script>

<style scoped>
.experience-elixir-page {
    position: fixed;
    inset: 0;
    pointer-events: none;
}

.experience-elixir-page > * {
    pointer-events: none;
}
</style>
