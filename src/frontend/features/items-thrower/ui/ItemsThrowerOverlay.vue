<template>
    <div class="overlay-root">
        <canvas ref="canvasRef" />
        <HitboxVisualization
            v-if="canvasRef"
            :hitbox="hitboxModel.hitbox.value"
            :editor-mode="editorMode"
            :canvas-width="canvasSize.width"
            :canvas-height="canvasSize.height"
            :spawn-points="spawnPointsModel.spawnPoints.value"
            @hitbox-move="handleHitboxMove"
            @hitbox-vertex-move="handleHitboxVertexMove"
            @hitbox-add-vertex="handleHitboxAddVertex"
            @hitbox-remove-vertex="handleHitboxRemoveVertex"
            @spawn-point-move="handleSpawnPointMove"
            @spawn-point-add="handleSpawnPointAdd"
            @spawn-point-remove="handleSpawnPointRemove"
        />
        <div
            v-for="popup in damagePopups.popups.value"
            :key="popup.id"
            class="damage-popup"
            :class="{ 'damage-heal': popup.damage < 0 }"
            :style="{
                left: `${popup.x}px`,
                top: `${popup.y}px`,
            }"
        >
            {{ popup.damage > 0 ? '-' : '+' }}{{ Math.abs(popup.damage) }}
        </div>
        <button
            v-if="physicsEngine && editorMode"
            class="test-spawn-button"
            @click="handleSpawnTest"
        >
            Spawn Item (Test)
        </button>
        <button
            v-if="physicsEngine && editorMode"
            class="toggle-editor-button"
            @click="toggleEditorMode"
        >
            Hide Editor
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { usePhysicsEngine } from '../model/usePhysicsEngine';
import { useHitboxModel } from '../model/useHitboxModel';
import { useSpawnPointsModel } from '../model/useSpawnPointsModel';
import { useDamagePopups } from '../lib/useDamagePopups';
import HitboxVisualization from './HitboxVisualization.vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const hitboxModel = useHitboxModel();
const spawnPointsModel = useSpawnPointsModel();
const damagePopups = useDamagePopups();
const editorMode = ref(true);
const physicsEngine = ref<ReturnType<typeof usePhysicsEngine> | null>(null);

const canvasSize = computed(() => {
    if (!canvasRef.value) {
        return { width: 0, height: 0 };
    }
    const rect = canvasRef.value.getBoundingClientRect();
    return {
        width: rect.width || window.innerWidth,
        height: rect.height || window.innerHeight,
    };
});

function handleSpawnTest(): void {
    if (physicsEngine.value) {
        physicsEngine.value.spawnItem();
    }
}

function toggleEditorMode(): void {
    editorMode.value = !editorMode.value;
}

function handleHitboxMove(newCenter: { x: number; y: number }): void {
    const currentHitbox = hitboxModel.hitbox.value;
    const deltaX = newCenter.x - currentHitbox.center.x;
    const deltaY = newCenter.y - currentHitbox.center.y;

    const newVertices = currentHitbox.vertices.map(v => ({
        x: v.x + deltaX,
        y: v.y + deltaY,
    }));

    hitboxModel.updateHitbox({
        center: newCenter,
        vertices: newVertices,
        hp: currentHitbox.hp,
    });

    if (physicsEngine.value) {
        physicsEngine.value.updateHitboxPosition(newCenter, newVertices);
    }
}

function handleHitboxVertexMove(vertexIndex: number, newPosition: { x: number; y: number }): void {
    const currentHitbox = hitboxModel.hitbox.value;
    const newVertices = [...currentHitbox.vertices];
    newVertices[vertexIndex] = newPosition;

    const newCenter = calculateCenter(newVertices);

    hitboxModel.updateHitbox({
        center: newCenter,
        vertices: newVertices,
        hp: currentHitbox.hp,
    });

    if (physicsEngine.value) {
        physicsEngine.value.updateHitboxPosition(newCenter, newVertices);
    }
}

function calculateCenter(vertices: { x: number; y: number }[]): { x: number; y: number } {
    const sum = vertices.reduce(
        (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
        { x: 0, y: 0 }
    );
    return {
        x: sum.x / vertices.length,
        y: sum.y / vertices.length,
    };
}

function handleHitboxAddVertex(vertexIndex: number, newPosition: { x: number; y: number }): void {
    const currentHitbox = hitboxModel.hitbox.value;
    const newVertices = [...currentHitbox.vertices];
    newVertices.splice(vertexIndex, 0, newPosition);

    const newCenter = calculateCenter(newVertices);

    hitboxModel.updateHitbox({
        center: newCenter,
        vertices: newVertices,
        hp: currentHitbox.hp,
    });

    if (physicsEngine.value) {
        physicsEngine.value.updateHitboxPosition(newCenter, newVertices);
    }
}

function handleHitboxRemoveVertex(vertexIndex: number): void {
    const currentHitbox = hitboxModel.hitbox.value;
    if (currentHitbox.vertices.length <= 3) {
        console.warn('[ItemsThrowerOverlay] Cannot remove vertex: minimum 3 vertices required');
        return;
    }

    const newVertices = [...currentHitbox.vertices];
    newVertices.splice(vertexIndex, 1);

    const newCenter = calculateCenter(newVertices);

    hitboxModel.updateHitbox({
        center: newCenter,
        vertices: newVertices,
        hp: currentHitbox.hp,
    });

    if (physicsEngine.value) {
        physicsEngine.value.updateHitboxPosition(newCenter, newVertices);
    }
}

function handleSpawnPointMove(pointId: string, newPosition: { x: number; y: number }): void {
    spawnPointsModel.updateSpawnPoint(pointId, newPosition);
}

function handleSpawnPointAdd(position: { x: number; y: number }): void {
    spawnPointsModel.addSpawnPoint(position);
}

function handleSpawnPointRemove(pointId: string): void {
    spawnPointsModel.removeSpawnPoint(pointId);
}

onMounted(async () => {
    await nextTick();

    if (!canvasRef.value) {
        console.error('[ItemsThrowerOverlay] Canvas ref is null');
        return;
    }

    console.log('[ItemsThrowerOverlay] Mounted, initializing physics engine');
    physicsEngine.value = usePhysicsEngine(
        canvasRef.value,
        hitboxModel.hitbox.value,
        () => spawnPointsModel.getRandomSpawnPoint(),
        (damage: number) => hitboxModel.applyDamage(damage),
        (x: number, y: number, damage: number) => {
            if (canvasRef.value) {
                const rect = canvasRef.value.getBoundingClientRect();
                const screenX = rect.left + x;
                const screenY = rect.top + y;
                damagePopups.addDamagePopup(screenX, screenY, damage);
            }
        }
    );
});
</script>

<style scoped>
.overlay-root {
    position: fixed;
    inset: 0;
    pointer-events: none;
}

.overlay-root > * {
    pointer-events: auto;
}

canvas {
    position: absolute;
    inset: 0;
    display: block;
    z-index: 1;
    width: 100%;
    height: 100%;
}

.test-spawn-button {
    position: absolute;
    top: 20px;
    left: 20px;
    z-index: 10;
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    font-size: 14px;
}

.test-spawn-button:hover {
    background: #0056b3;
}

.toggle-editor-button {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 10;
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    font-size: 14px;
}

.toggle-editor-button:hover {
    background: #218838;
}

.damage-popup {
    position: absolute;
    pointer-events: none;
    z-index: 100;
    font-size: 24px;
    font-weight: bold;
    color: #ff0000;
    text-shadow: 2px 2px 14px 24px rgba(0, 0, 0, 0.2);
    transform: translate(-50%, -50%);
    animation: damageFloat 2s ease-out forwards;
    user-select: none;
}

.damage-popup.damage-heal {
    color: #00ff00;
}

@keyframes damageFloat {
    0% {
        opacity: 1;
        transform: translate(-50%, -50%) translateY(0);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -50%) translateY(-80px);
    }
}
</style>
