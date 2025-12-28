<template>
    <div class="circular-progress" :class="positionClass">
        <svg class="circular-progress__svg" :width="size" :height="size">
            <circle
                class="circular-progress__circle-bg"
                :cx="center"
                :cy="center"
                :r="radius"
                fill="none"
                :stroke="bgColor"
                :stroke-width="strokeWidth"
            />
            <circle
                class="circular-progress__circle"
                :cx="center"
                :cy="center"
                :r="radius"
                fill="none"
                :stroke="color"
                :stroke-width="strokeWidth"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="strokeDashoffset"
                :transform="`rotate(-90 ${center} ${center})`"
            />
        </svg>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    progress?: number;
    size?: number;
    radius?: number;
    strokeWidth?: number;
    color?: string;
    bgColor?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'absolute';
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
}

const props = withDefaults(defineProps<Props>(), {
    progress: 0,
    size: 28,
    radius: 10,
    strokeWidth: 2,
    color: '#E4F265',
    bgColor: 'rgba(228, 242, 101, 0.2)',
    position: 'absolute',
    top: '4px',
    right: '4px',
    bottom: undefined,
    left: undefined
});

const center = computed(() => props.size / 2);
const circumference = computed(() => 2 * Math.PI * props.radius);

const strokeDashoffset = computed(() => {
    const progressValue = Math.max(0, Math.min(100, props.progress));
    return circumference.value - (progressValue / 100) * circumference.value;
});

const positionClass = computed(() => {
    if (props.position !== 'absolute') {
        return `circular-progress--${props.position}`;
    }
    return '';
});
</script>

<style scoped>
.circular-progress {
    position: absolute;
    z-index: 20;
    pointer-events: none;
}

.circular-progress__svg {
    transform: rotate(-90deg);
    filter: drop-shadow(0 0 4px rgba(228, 242, 101, 0.5));
}

.circular-progress__circle {
    transition: stroke-dashoffset 0.1s linear;
    stroke-linecap: round;
}

.circular-progress__circle-bg {
    opacity: 0.3;
}
</style>

