<template>
    <div class="hitbox-container">
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
            @contextmenu="handleContextMenu"
            xmlns="http://www.w3.org/2000/svg"
        >
        <polygon
            :points="polygonPoints"
            fill="rgba(255, 0, 0, 0.3)"
            stroke="#ff0000"
            stroke-width="2"
            class="hitbox-polygon"
            @mousedown="handlePolygonMouseDown"
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
            @contextmenu.prevent="handleVertexRightClick($event, index)"
        />
        <circle
            v-for="spawnPoint in spawnPoints"
            :key="spawnPoint.id"
            :cx="spawnPoint.position.x"
            :cy="spawnPoint.position.y"
            r="8"
            fill="#0066ff"
            class="spawn-point"
            :class="{ 'dragging': draggingSpawnPointId === spawnPoint.id }"
            @mousedown.stop="handleSpawnPointMouseDown($event, spawnPoint.id)"
            @contextmenu.prevent="handleSpawnPointRightClick($event, spawnPoint.id)"
        />
    </svg>
    <div
        v-if="contextMenuVisible && editorMode"
        class="context-menu"
        :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }"
        @click.stop
    >
        <button
            class="context-menu-item"
            @click="handleAddSpawnPointFromMenu"
        >
            Добавить место спауна пропа
        </button>
    </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { HitboxModel, Point } from '../types';

interface Props {
    hitbox: HitboxModel;
    editorMode: boolean;
    canvasWidth: number;
    canvasHeight: number;
    spawnPoints: Array<{ id: string; position: Point }>;
    onHitboxMove?: (newCenter: Point) => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
    hitboxMove: [newCenter: Point];
    hitboxVertexMove: [vertexIndex: number, newPosition: Point];
    hitboxAddVertex: [vertexIndex: number, newPosition: Point];
    hitboxRemoveVertex: [vertexIndex: number];
    spawnPointMove: [pointId: string, newPosition: Point];
    spawnPointAdd: [position: Point];
    spawnPointRemove: [pointId: string];
}>();

const center = computed(() => props.hitbox.center);
const vertices = computed(() => props.hitbox.vertices);
const spawnPoints = computed(() => props.spawnPoints);
const svgRef = ref<SVGSVGElement | null>(null);
const isDragging = ref(false);
const draggingVertexIndex = ref<number | null>(null);
const draggingSpawnPointId = ref<string | null>(null);
const contextMenuVisible = ref(false);
const contextMenuPosition = ref<Point>({ x: 0, y: 0 });
const contextMenuClickPoint = ref<Point | null>(null);
let dragStart: Point | null = null;
let hitboxStartCenter: Point | null = null;
let vertexStartPosition: Point | null = null;
let spawnPointStartPosition: Point | null = null;

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

function findClosestSegment(point: Point, vertices: Point[]): { segmentIndex: number; closestPoint: Point } | null {
    let minDistance = Infinity;
    let closestSegmentIndex = -1;
    let closestPoint: Point | null = null;

    for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        const segmentPoint = getClosestPointOnSegment(point, v1, v2);
        const distance = Math.sqrt(
            Math.pow(point.x - segmentPoint.x, 2) + Math.pow(point.y - segmentPoint.y, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestSegmentIndex = i;
            closestPoint = segmentPoint;
        }
    }

    if (closestSegmentIndex === -1 || !closestPoint) {
        return null;
    }

    const threshold = 15;
    if (minDistance > threshold) {
        return null;
    }

    return {
        segmentIndex: closestSegmentIndex,
        closestPoint,
    };
}

function getClosestPointOnSegment(point: Point, segmentStart: Point, segmentEnd: Point): Point {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return segmentStart;
    }

    const t = Math.max(0, Math.min(1, ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared));

    return {
        x: segmentStart.x + t * dx,
        y: segmentStart.y + t * dy,
    };
}

function handlePolygonMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (isDragging.value || draggingVertexIndex.value !== null || draggingSpawnPointId.value !== null) return;

    const point = getSVGPoint(event);

    const centerPoint = center.value;
    const centerDistance = Math.sqrt(
        Math.pow(point.x - centerPoint.x, 2) + Math.pow(point.y - centerPoint.y, 2)
    );

    if (centerDistance <= 20) {
        return;
    }

    const verticesList = vertices.value;
    for (let i = 0; i < verticesList.length; i++) {
        const vertex = verticesList[i];
        const distance = Math.sqrt(
            Math.pow(point.x - vertex.x, 2) + Math.pow(point.y - vertex.y, 2)
        );
        if (distance <= 15) {
            return;
        }
    }

    const spawnPointsList = spawnPoints.value;
    for (const spawnPoint of spawnPointsList) {
        const distance = Math.sqrt(
            Math.pow(point.x - spawnPoint.position.x, 2) + Math.pow(point.y - spawnPoint.position.y, 2)
        );
        if (distance <= 15) {
            return;
        }
    }

    const closestSegment = findClosestSegment(point, verticesList);
    if (closestSegment) {
        const newVertexIndex = closestSegment.segmentIndex + 1;
        emit('hitboxAddVertex', newVertexIndex, closestSegment.closestPoint);
        event.preventDefault();
        event.stopPropagation();
    } else {
        emit('spawnPointAdd', point);
        event.preventDefault();
        event.stopPropagation();
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

function handleVertexRightClick(event: MouseEvent, vertexIndex: number): void {
    const verticesList = vertices.value;
    if (verticesList.length <= 3) {
        return;
    }

    emit('hitboxRemoveVertex', vertexIndex);
    event.preventDefault();
    event.stopPropagation();
}

function handleMouseMove(event: MouseEvent): void {
    const currentPoint = getSVGPoint(event);

    if (draggingSpawnPointId.value !== null && dragStart && spawnPointStartPosition) {
        const deltaX = currentPoint.x - dragStart.x;
        const deltaY = currentPoint.y - dragStart.y;

        const newPosition: Point = {
            x: spawnPointStartPosition.x + deltaX,
            y: spawnPointStartPosition.y + deltaY,
        };

        emit('spawnPointMove', draggingSpawnPointId.value, newPosition);
        return;
    }

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

function handleSpawnPointMouseDown(event: MouseEvent, pointId: string): void {
    if (event.button !== 0) return;

    const point = getSVGPoint(event);
    draggingSpawnPointId.value = pointId;
    dragStart = point;
    const spawnPoint = spawnPoints.value.find(p => p.id === pointId);
    spawnPointStartPosition = spawnPoint ? { ...spawnPoint.position } : null;
    event.preventDefault();
    event.stopPropagation();
}

function handleSpawnPointRightClick(event: MouseEvent, pointId: string): void {
    const pointsList = spawnPoints.value;
    if (pointsList.length <= 1) {
        return;
    }

    emit('spawnPointRemove', pointId);
    event.preventDefault();
    event.stopPropagation();
}

function handleMouseUp(): void {
    if (draggingSpawnPointId.value !== null) {
        draggingSpawnPointId.value = null;
        dragStart = null;
        spawnPointStartPosition = null;
    }
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
    if (draggingSpawnPointId.value !== null) {
        draggingSpawnPointId.value = null;
        dragStart = null;
        spawnPointStartPosition = null;
    }
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

function handleContextMenu(event: MouseEvent): void {
    if (isDragging.value || draggingVertexIndex.value !== null || draggingSpawnPointId.value !== null) {
        return;
    }

    const point = getSVGPoint(event);
    const centerPoint = center.value;
    const centerDistance = Math.sqrt(
        Math.pow(point.x - centerPoint.x, 2) + Math.pow(point.y - centerPoint.y, 2)
    );

    if (centerDistance <= 20) {
        return;
    }

    const verticesList = vertices.value;
    for (let i = 0; i < verticesList.length; i++) {
        const vertex = verticesList[i];
        const distance = Math.sqrt(
            Math.pow(point.x - vertex.x, 2) + Math.pow(point.y - vertex.y, 2)
        );
        if (distance <= 15) {
            return;
        }
    }

    const spawnPointsList = spawnPoints.value;
    for (const spawnPoint of spawnPointsList) {
        const distance = Math.sqrt(
            Math.pow(point.x - spawnPoint.position.x, 2) + Math.pow(point.y - spawnPoint.position.y, 2)
        );
        if (distance <= 15) {
            return;
        }
    }

    const svg = svgRef.value;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    contextMenuPosition.value = {
        x: event.clientX,
        y: event.clientY,
    };
    contextMenuClickPoint.value = point;
    contextMenuVisible.value = true;
    event.preventDefault();
}

function handleAddSpawnPointFromMenu(): void {
    if (contextMenuClickPoint.value) {
        emit('spawnPointAdd', contextMenuClickPoint.value);
        contextMenuVisible.value = false;
        contextMenuClickPoint.value = null;
    }
}

function handleClickOutside(event: MouseEvent): void {
    if (!contextMenuVisible.value) return;

    const target = event.target as HTMLElement;
    if (target.closest('.context-menu')) {
        return;
    }

    contextMenuVisible.value = false;
    contextMenuClickPoint.value = null;
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

const polygonPoints = computed(() => {
    return props.hitbox.vertices.map(v => `${v.x},${v.y}`).join(' ');
});
</script>

<style scoped>
.hitbox-container {
    position: relative;
    width: 100%;
    height: 100%;
}

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
    pointer-events: auto;
    cursor: crosshair;
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

.spawn-point {
    cursor: grab;
    pointer-events: auto;
}

.spawn-point.dragging {
    cursor: grabbing;
}

.context-menu {
    position: fixed;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    min-width: 200px;
    pointer-events: auto;
}

.context-menu-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #333;
}

.context-menu-item:hover {
    background: #f0f0f0;
}
</style>
