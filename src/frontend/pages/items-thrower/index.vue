<template>
    <div class="items-thrower-page">
        <ItemsThrowerOverlay ref="overlayRef" />
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ItemsThrowerOverlay from '@features/items-thrower/ui/ItemsThrowerOverlay.vue';
import { useSocketConnection } from '@shared/composables/useSocketConnection';

const overlayRef = ref<InstanceType<typeof ItemsThrowerOverlay> | null>(null);

useSocketConnection({
    onConnect: () => {
        console.log('[Items Thrower] Подключено к Socket.IO');
    },
    onDisconnect: () => {
        console.log('[Items Thrower] Отключено от Socket.IO');
    },
    onItemThrow: (data) => {
        console.log('[Items Thrower] Получен запрос на бросание предмета:', data);
        if (overlayRef.value) {
            const count = data.count || 1;
            if (count === 1) {
                overlayRef.value.spawnItemFromReward(data);
            } else {
                overlayRef.value.spawnWaveOfItems(data, count);
            }
        }
    },
});
</script>

<style scoped>
.items-thrower-page {
    position: fixed;
    inset: 0;
}
</style>
