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
            v-if="hpSystemEnabled"
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
        <div
            v-if="hpSystemEnabled"
            v-show="hpBarState.isVisible.value"
            ref="hpBarContainerRef"
            class="hp-bar-container"
            :style="{
                left: `${hitboxScreenPosition.x}px`,
                top: `${hitboxScreenPosition.y - 60}px`,
            }"
        >
            <div class="hp-bar-wrapper">
                <div
                    ref="hpBarFillRef"
                    class="hp-bar-fill"
                    :style="{ width: `${hpBarState.initialHp.value}%` }"
                />
            </div>
        </div>
        <button
            v-if="editorMode"
            class="toggle-hp-system-button"
            @click="toggleHpSystem"
        >
            {{ hpSystemEnabled ? 'Disable' : 'Enable' }} HP System
        </button>
        <button
            v-if="physicsEngine && editorMode"
            class="toggle-editor-button"
            @click="toggleEditorMode"
        >
            Hide Editor
        </button>
        <button
            v-if="editorMode"
            class="restore-hp-button"
            @click="handleRestoreHp"
        >
            Restore Full HP
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { gsap } from 'gsap';
import { usePhysicsEngine } from '../model/usePhysicsEngine';
import { useHitboxModel } from '../model/useHitboxModel';
import { useSpawnPointsModel } from '../model/useSpawnPointsModel';
import { useDamagePopups } from '../lib/useDamagePopups';
import HitboxVisualization from './HitboxVisualization.vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const hitboxModel = useHitboxModel();
const spawnPointsModel = useSpawnPointsModel();
const damagePopups = useDamagePopups();
const EDITOR_MODE_STORAGE_KEY = 'items-thrower-editor-mode';
const storedEditorMode = localStorage.getItem(EDITOR_MODE_STORAGE_KEY);
const editorMode = ref<boolean>(storedEditorMode !== null ? storedEditorMode === 'true' : true);
const physicsEngine = ref<ReturnType<typeof usePhysicsEngine> | null>(null);

let activeWavesCount = 0;

const hpBarContainerRef = ref<HTMLElement | null>(null);
const hpBarFillRef = ref<HTMLElement | null>(null);

const HP_SYSTEM_STORAGE_KEY = 'items-thrower-hp-system-enabled';
const storedHpSystem = localStorage.getItem(HP_SYSTEM_STORAGE_KEY);
const hpSystemEnabled = ref<boolean>(storedHpSystem !== null ? storedHpSystem === 'true' : true);

const hpBarState = {
    isVisible: ref(false),
    initialHp: ref(0),
    animationTimeline: null as gsap.core.Timeline | null,
    debounceTimer: null as ReturnType<typeof setTimeout> | null,
    finalHp: 0,
};

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

const hitboxScreenPosition = computed(() => {
    if (!canvasRef.value) {
        return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    const rect = canvasRef.value.getBoundingClientRect();
    const center = hitboxModel.center.value;
    const vertices = hitboxModel.vertices.value;

    let minY = center.y;
    if (vertices.length > 0) {
        minY = Math.min(...vertices.map(v => v.y));
    }

    return {
        x: rect.left + center.x,
        y: rect.top + minY - 40,
    };
});

watch(hitboxModel.hp, (newHp, oldHp) => {
    if (oldHp !== undefined && newHp < oldHp && hpSystemEnabled.value) {
        if (hpBarState.debounceTimer === null) {
            hpBarState.initialHp.value = oldHp;
        }
        hpBarState.finalHp = newHp;
        triggerHpBarAnimationDebounced();
    }
});

function toggleHpSystem(): void {
    hpSystemEnabled.value = !hpSystemEnabled.value;
    localStorage.setItem(HP_SYSTEM_STORAGE_KEY, String(hpSystemEnabled.value));

    if (!hpSystemEnabled.value) {
        hpBarState.isVisible.value = false;
        if (hpBarState.animationTimeline) {
            hpBarState.animationTimeline.kill();
            hpBarState.animationTimeline = null;
        }
    }
}

function triggerHpBarAnimationDebounced(): void {
    if (hpBarState.debounceTimer) {
        clearTimeout(hpBarState.debounceTimer);
    }

    hpBarState.debounceTimer = setTimeout(() => {
        triggerHpBarAnimation(hpBarState.initialHp.value, hpBarState.finalHp);
        hpBarState.debounceTimer = null;
        hpBarState.initialHp.value = 0;
        hpBarState.finalHp = 0;
    }, 100);
}

async function triggerHpBarAnimation(initialHp: number, finalHp: number): Promise<void> {
    if (hpBarState.animationTimeline) {
        hpBarState.animationTimeline.kill();
    }

    hpBarState.isVisible.value = true;

    await nextTick();

    if (!hpBarFillRef.value || !hpBarContainerRef.value) {
        hpBarState.isVisible.value = false;
        return;
    }

    hpBarState.animationTimeline = gsap.timeline();

    hpBarState.animationTimeline
        .set(hpBarContainerRef.value, { opacity: 0, x: 0 })
        .set(hpBarFillRef.value, { width: `${initialHp}%` })
        .to(hpBarContainerRef.value, {
            opacity: 1,
            duration: 0.3,
            ease: 'power2.out',
        })
        .to(hpBarFillRef.value, {
            width: `${finalHp}%`,
            duration: 0.5,
            ease: 'power2.out',
        }, '-=0.2')
        .to(hpBarContainerRef.value, {
            x: -4,
            duration: 0.05,
            repeat: 10,
            yoyo: true,
            ease: 'power1.inOut',
        }, '-=0.5')
        .to(hpBarContainerRef.value, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                hpBarState.isVisible.value = false;
                hpBarState.animationTimeline = null;
            },
        }, '+=0.4')
        .set(hpBarContainerRef.value, { x: 0 });
}


function handleSpawnTest(): void {
    if (physicsEngine.value) {
        physicsEngine.value.spawnItem();
    }
}

function spawnItemFromReward(rewardData: { username: string; rewardTitle: string; rewardCost: number }): void {
    if (physicsEngine.value) {
        physicsEngine.value.spawnItem(undefined, rewardData.username);
    }
}

function spawnWaveOfItems(rewardData: { username: string; rewardTitle: string; rewardCost: number }, count: number): void {
    if (!physicsEngine.value) {
        return;
    }

    activeWavesCount++;
    const waveDuration = count * 50;
    console.log('[ItemsThrowerOverlay] Wave started, active waves:', activeWavesCount, 'duration:', waveDuration);

    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            if (physicsEngine.value) {
                physicsEngine.value.spawnItem(undefined, rewardData.username);
            }
        }, i * 50);
    }

    setTimeout(() => {
        activeWavesCount = Math.max(0, activeWavesCount - 1);
        console.log('[ItemsThrowerOverlay] Wave finished, active waves:', activeWavesCount);
    }, waveDuration);
}

function hasActiveWaves(): boolean {
    return activeWavesCount > 0;
}

defineExpose({
    spawnItemFromReward,
    spawnWaveOfItems,
    hasActiveWaves,
});

function toggleEditorMode(): void {
    editorMode.value = !editorMode.value;
    localStorage.setItem(EDITOR_MODE_STORAGE_KEY, String(editorMode.value));
}

function handleRestoreHp(): void {
    hitboxModel.restoreFullHp();
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

    toggleEditorMode();

    if (!canvasRef.value) {
        console.error('[ItemsThrowerOverlay] Canvas ref is null');
        return;
    }

    console.log('[ItemsThrowerOverlay] Mounted, initializing physics engine');
    physicsEngine.value = usePhysicsEngine(
        canvasRef.value,
        hitboxModel.hitbox.value,
        () => spawnPointsModel.getRandomSpawnPoint(),
        (damage: number, username?: string) => hitboxModel.applyDamage(damage, username),
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

.restore-hp-button {
    position: absolute;
    top: 110px;
    left: 20px;
    z-index: 10;
    padding: 10px 20px;
    background: #4ecdc4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    font-size: 14px;
}

.restore-hp-button:hover {
    background: #3db8b0;
}

.toggle-hp-system-button {
    position: absolute;
    top: 150px;
    left: 20px;
    z-index: 10;
    padding: 10px 20px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    pointer-events: auto;
    font-size: 14px;
}

.toggle-hp-system-button:hover {
    background: #5a6268;
}

.hp-bar-container {
    position: fixed;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: none;
    min-width: 200px;
}

.hp-bar-wrapper {
    height: 20px;
    background: rgba(0, 0, 0, 0.6);
    overflow: hidden;
    position: relative;
}

.hp-bar-fill {
    height: 100%;
    width: 0%;
    background: rgb(231, 71, 71);
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
