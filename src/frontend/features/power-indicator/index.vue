<template>
    <div class="inline-flex items-center gap-0.5">
        <span>Power: [</span>
        <span class="inline-flex items-center">
            <span>▮</span>
            <span>▮</span>
            <span>▮</span>
            <span class="transition-all duration-500">{{ isBlinking ? '▮' : '▯' }}</span>
            <span>▯</span>
        </span>
        <span>]</span>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isBlinking = ref(true);
let blinkInterval = null;

onMounted(() => {
    blinkInterval = setInterval(() => {
        isBlinking.value = !isBlinking.value;
    }, 500);
});

onBeforeUnmount(() => {
    if (blinkInterval) {
        clearInterval(blinkInterval);
    }
});
</script>

<style scoped>
/* Анимация уже реализована через CSS transition и opacity */
</style>

