<template>
    <svg
        v-if="editorMode"
        class="hitbox-svg"
        :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
    >
        <polygon
            :points="polygonPoints"
            fill="rgba(255, 0, 0, 0.3)"
            stroke="#ff0000"
            stroke-width="2"
        />
        <circle
            :cx="center.x"
            :cy="center.y"
            r="5"
            fill="#ff0000"
        />
    </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HitboxModel } from '../types';

interface Props {
    hitbox: HitboxModel;
    editorMode: boolean;
    canvasWidth: number;
    canvasHeight: number;
}

const props = defineProps<Props>();

const center = computed(() => props.hitbox.center);

const polygonPoints = computed(() => {
    return props.hitbox.vertices.map(v => `${v.x},${v.y}`).join(' ');
});
</script>

<style scoped>
.hitbox-svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2;
}
</style>
