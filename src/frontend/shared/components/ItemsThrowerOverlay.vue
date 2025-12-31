<template>
    <div class="overlay-root">
        <canvas ref="canvasRef" />

        <!-- HITBOX EDITOR -->
        <svg v-if="editorMode" class="hitbox-svg" :style="svgStyle" :viewBox="svgViewBox"
            @mousedown.left.prevent="onSvgLeftDown" @contextmenu.prevent>
            <polygon :points="svgPoints" fill="rgba(255,0,0,0.15)" stroke="red" stroke-dasharray="6" />

            <circle v-for="(p, i) in hitbox.vertices" :key="i" :cx="p.x" :cy="p.y" r="6" class="vertex"
                @mousedown.left.stop="onVertexLeftDown(i)" @mousedown.right.stop="onVertexRightDown(i)" />
        </svg>
    </div>

    <button v-if="editorMode" class="fixed px-4 py-4 bg-red-500 text-white rounded-md cursor-pointer z-100"
        @click="hideHitbox">
        Hide hitbox
    </button>
    <button v-if="editorMode" @click="resetHitbox" class="fixed left-32 px-4 py-4 bg-red-500 text-white rounded-md cursor-pointer z-100">
        Reset hitbox
    </button>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import Matter from 'matter-js';
import CatImage from '@shared/assets/images/cat.png';
import HitSqueek from '@shared/assets/sounds/hit/squeek.mp3';
import ClassicHitImpactSound from '@shared/assets/sounds/hit/classicPunchImpactSound.mp3';
import RedShoeImage from '@shared/assets/images/redShoe.png';

/* =========================================================
   TYPES / CONSTANTS
========================================================= */

type ItemDescriptor = {
    img: string;
    sound: string;
};

const ITEMS: ItemDescriptor[] = [
    {
        img: CatImage,
        sound: HitSqueek
    },
    {
        img: RedShoeImage,
        sound: ClassicHitImpactSound
    },
];

type Point = { x: number; y: number };

const STORAGE_KEY = 'items-thrower-hitbox-v1';
const MIN_VERTICES = 4;
const SVG_PADDING = 80;

const DEFAULT_VERTICES: Point[] = [
  { x: -120, y: -180 }, // top-left
  { x:   0, y: -220 },  // top
  { x: 120, y: -180 },  // top-right
  { x: 180, y:   0 },   // right
  { x: 120, y: 180 },   // bottom-right
  { x:   0, y: 220 },   // bottom
  { x: -120, y: 180 },  // bottom-left
  { x: -180, y:   0 }   // left
];

function getRandomItem(): ItemDescriptor {
    const index = Math.floor(Math.random() * ITEMS.length);
    return ITEMS[index];
}


function createSoundManager() {
    const cache = new Map<string, HTMLAudioElement>();

    function play(soundSrc: string, volume = 0.3) {
        let audio = cache.get(soundSrc);

        if (!audio) {
            audio = new Audio(soundSrc);
            audio.preload = 'auto';
            cache.set(soundSrc, audio);
        }

        audio.volume = volume;
        audio.currentTime = 0;
        audio.play().catch(() => { });
    }

    return {
        play
    };
}


const soundManager = createSoundManager();


/* =========================================================
   HITBOX MODEL
========================================================= */

function createHitboxModel() {
    const state = reactive({
        center: { x: 960, y: 540 },
        vertices: structuredClone(DEFAULT_VERTICES) as Point[]
    });

    function isValidVertices(verts: Point[]) {
        return (
            verts.length >= MIN_VERTICES &&
            verts.every(
                p =>
                    Number.isFinite(p.x) &&
                    Number.isFinite(p.y)
            )
        );
    }

    function commit(next: Point[]) {
        if (!isValidVertices(next)) return;
        state.vertices = next;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    function move(delta: Point) {
        state.center.x += delta.x;
        state.center.y += delta.y;
    }

    function moveVertex(index: number, delta: Point) {
        const next = state.vertices.map((v, i) =>
            i === index ? { x: v.x + delta.x, y: v.y + delta.y } : v
        );
        commit(next);
    }

    function addVertex(index: number, point: Point) {
        const next = [...state.vertices];
        next.splice(index + 1, 0, point);
        commit(next);
    }

    function removeVertex(index: number) {
        if (state.vertices.length <= MIN_VERTICES) return;
        commit(state.vertices.filter((_, i) => i !== index));
    }

    function reset() {
        commit(structuredClone(DEFAULT_VERTICES));
    }

    function restore() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw);
            if (isValidVertices(parsed)) {
                state.vertices = parsed;
            }
        } catch {
            reset();
        }
    }

    return {
        get center() {
            return state.center;
        },
        get vertices() {
            return state.vertices;
        },
        move,
        moveVertex,
        addVertex,
        removeVertex,
        reset,
        restore
    };
}

/* =========================================================
   SVG COORDINATE FIX (CORE PART)
========================================================= */

/**
 * SVG должен быть центрирован вокруг (0,0)
 * viewBox считается от геометрии + padding
 */

function computeSvgHalfSize(vertices: Point[]) {
    let max = 0;

    for (const v of vertices) {
        max = Math.max(
            max,
            Math.abs(v.x),
            Math.abs(v.y)
        );
    }

    return max + SVG_PADDING;
}

/* =========================================================
   PHYSICS (Matter.js)
========================================================= */

let engine: Matter.Engine;
let runner: Matter.Runner;
let render: Matter.Render;
let hitboxBody: Matter.Body;

function initPhysics(
    canvas: HTMLCanvasElement,
    hitbox: ReturnType<typeof createHitboxModel>
) {
    engine = Matter.Engine.create();
    engine.gravity.y = 1.2;

    render = Matter.Render.create({
        canvas,
        engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            background: 'transparent',
            wireframes: false
        }
    });

    runner = Matter.Runner.create();

    hitboxBody = Matter.Bodies.fromVertices(
        hitbox.center.x,
        hitbox.center.y,
        hitbox.vertices.map(v => ({
            x: hitbox.center.x + v.x,
            y: hitbox.center.y + v.y
        })),
        { isStatic: true, render: { visible: false } }
    );

    Matter.World.add(engine.world, hitboxBody);
    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    Matter.Events.on(engine, 'collisionStart', event => {
        for (const pair of event.pairs) {
            const { bodyA, bodyB } = pair;

            const item =
                bodyA.label === 'item' ? bodyA :
                    bodyB.label === 'item' ? bodyB :
                        null;

            const hitbox =
                bodyA === hitboxBody || bodyB === hitboxBody;

            if (!item || !hitbox) continue;

            // 🔒 защита от повторного звука
            if ((item as any)._hitPlayed) continue;
            (item as any)._hitPlayed = true;

            const itemData = (item as any).plugin?.item;
            if (!itemData) continue;

            soundManager.play(itemData.sound);
        }
    });

}

function syncHitboxPhysics(hitbox: ReturnType<typeof createHitboxModel>) {
    Matter.Body.setPosition(hitboxBody, hitbox.center);
    Matter.Body.setVertices(
        hitboxBody,
        hitbox.vertices.map(v => ({
            x: hitbox.center.x + v.x,
            y: hitbox.center.y + v.y
        }))
    );
}

/* =========================================================
   ITEM SPAWNER
========================================================= */

function spawnItem(
    hitbox: ReturnType<typeof createHitboxModel>,
    power = 1
) {
    const item = getRandomItem();

    const spawnX =
        hitbox.center.x + (Math.random() - 0.5) * 200;
    const spawnY = -60;

    const radius = 18;

    const body = Matter.Bodies.circle(
        spawnX,
        spawnY,
        radius,
        {
            restitution: 0.4,
            friction: 0.1,
            render: {
                sprite: {
                    texture: item.img,
                    xScale: (radius * 2) / 64,
                    yScale: (radius * 2) / 64
                }
            }
        }
    );

    body.label = 'item';

    // 🔗 связываем предмет с телом
    body.plugin = {
        item
    };

    Matter.Body.setVelocity(body, {
        x: 0,
        y: 6 + power
    });

    Matter.Body.applyForce(body, body.position, {
        x: 0,
        y: 0.015 * power
    });

    Matter.World.add(engine.world, body);

    setTimeout(() => {
        Matter.World.remove(engine.world, body);
    }, 6000);
}



/* =========================================================
   VUE ORCHESTRATION
========================================================= */

const canvasRef = ref<HTMLCanvasElement | null>(null);
const editorMode = ref(true);
const hitbox = createHitboxModel();


function hideHitbox() {
    console.log('hideHitbox');
    editorMode.value = false;
}

function resetHitbox() {
    localStorage.removeItem(STORAGE_KEY);
}


/* SVG computed */

const svgHalfSize = computed(() =>
    computeSvgHalfSize(hitbox.vertices)
);

const svgViewBox = computed(() => {
    const s = svgHalfSize.value;
    return `${-s} ${-s} ${s * 2} ${s * 2}`;
});

const svgStyle = computed(() => ({
    left: `${hitbox.center.x}px`,
    top: `${hitbox.center.y}px`,
    width: `${svgHalfSize.value * 2}px`,
    height: `${svgHalfSize.value * 2}px`,
    transform: 'translate(-50%, -50%)'
}));

const svgPoints = computed(() =>
    hitbox.vertices.map(p => `${p.x},${p.y}`).join(' ')
);

/* =========================================================
   EDITOR INTERACTION
========================================================= */

let lastMouse: Point | null = null;
let draggingVertex: number | null = null;

function onVertexLeftDown(index: number) {
    draggingVertex = index;
    lastMouse = null;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function onVertexRightDown(index: number) {
    hitbox.removeVertex(index);
    syncHitboxPhysics(hitbox);
}

function onSvgLeftDown() {
    draggingVertex = null;
    lastMouse = null;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
    if (!lastMouse) {
        lastMouse = { x: e.clientX, y: e.clientY };
        return;
    }

    const delta = {
        x: e.clientX - lastMouse.x,
        y: e.clientY - lastMouse.y
    };

    if (draggingVertex !== null) {
        hitbox.moveVertex(draggingVertex, delta);
    } else {
        hitbox.move(delta);
    }

    syncHitboxPhysics(hitbox);
    lastMouse = { x: e.clientX, y: e.clientY };
}

function onMouseUp() {
    lastMouse = null;
    draggingVertex = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
}

/* =========================================================
   EXPOSE API
========================================================= */

function throwItem(data: {
    username: string;
    rewardTitle: string;
    rewardCost: number;
}) {
    // rewardCost влияет на "тяжесть" / эффект
    const power = Math.max(1, data.rewardCost / 1000);
    spawnItem(hitbox, power);
}



defineExpose({ throwItem });

/* =========================================================
   LIFECYCLE
========================================================= */

onMounted(() => {
    hitbox.restore();
    initPhysics(canvasRef.value!, hitbox);
});

onBeforeUnmount(() => {
    Matter.Render.stop(render);
    Matter.Runner.stop(runner);
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
}

.hitbox-svg {
    position: absolute;
    pointer-events: all;
}

.vertex {
    fill: red;
    cursor: pointer;
}

.reset-button {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 10;
}
</style>
