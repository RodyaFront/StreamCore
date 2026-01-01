<template>
    <svg
        v-if="editorMode"
        ref="svgRef"
        class="hitbox-svg"
        :class="{ 'dragging': isDragging }"
        :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        xmlns="http://www.w3.org/2000/svg"
    >
        <polygon
            :points="polygonPoints"
            fill="rgba(255, 0, 0, 0.3)"
            stroke="#ff0000"
            stroke-width="2"
            class="hitbox-polygon"
        />
        <circle
            :cx="center.x"
            :cy="center.y"
            r="8"
            fill="#df8686"
            class="hitbox-center"
            :class="{ 'dragging': isDragging }"
        />
        <circle
            v-for="(vertex, index) in vertices"
            :key="index"
            :cx="vertex.x"
            :cy="vertex.y"
            r="6"
            fill="#00ff00"
            class="hitbox-vertex"
            :class="{ 'dragging': draggingVertexIndex === index }"
            @mousedown.stop="handleVertexMouseDown($event, index)"
        />
    </svg>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HitboxModel, Point } from '../types';

interface Props {
    hitbox: HitboxModel;
    editorMode: boolean;
    canvasWidth: number;
    canvasHeight: number;
    onHitboxMove?: (newCenter: Point) => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    hitboxMove: [newCenter: Point];
    hitboxVertexMove: [vertexIndex: number, newPosition: Point];
}>();

const center = computed(() => props.hitbox.center);
const vertices = computed(() => props.hitbox.vertices);
const svgRef = ref<SVGSVGElement | null>(null);
const isDragging = ref(false);
const draggingVertexIndex = ref<number | null>(null);
let dragStart: Point | null = null;
let hitboxStartCenter: Point | null = null;
let vertexStartPosition: Point | null = null;

function getSVGPoint(event: MouseEvent): Point {
    const svg = svgRef.value;
    if (!svg) {
        return { x: 0, y: 0 };
    }

    const rect = svg.getBoundingClientRect();
    const viewBox = svg.viewBox.baseVal;

    if (!viewBox) {
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    }

    const x = ((event.clientX - rect.left) / rect.width) * viewBox.width;
    const y = ((event.clientY - rect.top) / rect.height) * viewBox.height;

    return { x, y };
}

function handleMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (draggingVertexIndex.value !== null) return;

    const point = getSVGPoint(event);
    const centerPoint = center.value;
    const distance = Math.sqrt(
        Math.pow(point.x - centerPoint.x, 2) + Math.pow(point.y - centerPoint.y, 2)
    );

    if (distance <= 20) {
        isDragging.value = true;
        dragStart = point;
        hitboxStartCenter = { ...centerPoint };
        event.preventDefault();
    }
}

function handleVertexMouseDown(event: MouseEvent, vertexIndex: number): void {
    if (event.button !== 0) return;

    const point = getSVGPoint(event);
    draggingVertexIndex.value = vertexIndex;
    dragStart = point;
    vertexStartPosition = { ...vertices.value[vertexIndex] };
    event.preventDefault();
    event.stopPropagation();
}

function handleMouseMove(event: MouseEvent): void {
    const currentPoint = getSVGPoint(event);

    if (draggingVertexIndex.value !== null && dragStart && vertexStartPosition) {
        const deltaX = currentPoint.x - dragStart.x;
        const deltaY = currentPoint.y - dragStart.y;

        const newPosition: Point = {
            x: vertexStartPosition.x + deltaX,
            y: vertexStartPosition.y + deltaY,
        };

        emit('hitboxVertexMove', draggingVertexIndex.value, newPosition);
        return;
    }

    if (!isDragging.value || !dragStart || !hitboxStartCenter) return;

    const deltaX = currentPoint.x - dragStart.x;
    const deltaY = currentPoint.y - dragStart.y;

    const newCenter: Point = {
        x: hitboxStartCenter.x + deltaX,
        y: hitboxStartCenter.y + deltaY,
    };

    emit('hitboxMove', newCenter);
}

function handleMouseUp(): void {
    if (draggingVertexIndex.value !== null) {
        draggingVertexIndex.value = null;
        dragStart = null;
        vertexStartPosition = null;
    }
    if (isDragging.value) {
        isDragging.value = false;
        dragStart = null;
        hitboxStartCenter = null;
    }
}

function handleMouseLeave(): void {
    if (draggingVertexIndex.value !== null) {
        draggingVertexIndex.value = null;
        dragStart = null;
        vertexStartPosition = null;
    }
    if (isDragging.value) {
        isDragging.value = false;
        dragStart = null;
        hitboxStartCenter = null;
    }
}

const polygonPoints = computed(() => {
    return props.hitbox.vertices.map(v => `${v.x},${v.y}`).join(' ');
});
</script>

<style scoped>
.hitbox-svg {
    position: absolute;
    inset: 0;
    pointer-events: auto;
    z-index: 2;
    cursor: default;
}

.hitbox-svg.dragging {
    cursor: grabbing;
}

.hitbox-polygon {
    pointer-events: none;
}

.hitbox-center {
    cursor: grab;
    pointer-events: auto;
}

.hitbox-center.dragging {
    cursor: grabbing;
}

.hitbox-vertex {
    cursor: grab;
    pointer-events: auto;
}

.hitbox-vertex.dragging {
    cursor: grabbing;
}
</style>
