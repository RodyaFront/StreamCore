<template>
    <div class="overlay-root">
        <canvas ref="canvasRef" />
        <HitboxVisualization
            v-if="canvasRef"
            :hitbox="hitboxModel.hitbox.value"
            :editor-mode="editorMode"
            :canvas-width="canvasSize.width"
            :canvas-height="canvasSize.height"
        />
        <button
            v-if="physicsEngine"
            class="test-spawn-button"
            @click="handleSpawnTest"
        >
            Spawn Item (Test)
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { usePhysicsEngine } from '../model/usePhysicsEngine';
import { useHitboxModel } from '../model/useHitboxModel';
import HitboxVisualization from './HitboxVisualization.vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const hitboxModel = useHitboxModel();
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

onMounted(async () => {
    await nextTick();

    if (!canvasRef.value) {
        console.error('[ItemsThrowerOverlay] Canvas ref is null');
        return;
    }

    console.log('[ItemsThrowerOverlay] Mounted, initializing physics engine');
    physicsEngine.value = usePhysicsEngine(canvasRef.value, hitboxModel.hitbox.value);
});
</script>

<style scoped>
.overlay-root {
    position: fixed;
    inset: 0;
    pointer-events: none;
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
</style>
