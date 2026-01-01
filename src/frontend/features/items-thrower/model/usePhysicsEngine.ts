import { onBeforeUnmount } from 'vue';
import Matter from 'matter-js';
import { PHYSICS_CONFIG, ITEM_CONFIG, SOUND_CONFIG } from '../config';
import { useSoundManager } from '../lib/useSoundManager';
import type { HitboxModel } from '../types';

function updateCanvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
    const rect = canvas.getBoundingClientRect();
    let width = Math.floor(rect.width);
    let height = Math.floor(rect.height);

    if (width === 0 || height === 0) {
        width = window.innerWidth;
        height = window.innerHeight;
        console.warn('[usePhysicsEngine] Canvas rect is zero, using window size:', { width, height });
    }

    canvas.width = width;
    canvas.height = height;

    return { width, height };
}

export function usePhysicsEngine(canvas: HTMLCanvasElement, hitbox: HitboxModel) {
    const size = updateCanvasSize(canvas);
    const soundManager = useSoundManager();

    console.log('[usePhysicsEngine] Initializing:', {
        canvasSize: { width: size.width, height: size.height },
        devicePixelRatio: window.devicePixelRatio,
        hitbox,
    });

    const engine = Matter.Engine.create();
    engine.gravity.y = PHYSICS_CONFIG.GRAVITY_Y;

    const render = Matter.Render.create({
        canvas,
        engine,
        options: {
            width: size.width,
            height: size.height,
            background: 'transparent',
            wireframes: false,
            showVelocity: false,
            showAngleIndicator: false,
        },
    });

    const vertices = hitbox.vertices.map(v => ({ x: v.x, y: v.y }));
    const hitboxBody = Matter.Bodies.fromVertices(
        hitbox.center.x,
        hitbox.center.y,
        [vertices],
        {
            isStatic: true,
            render: {
                fillStyle: '#ff0000',
                strokeStyle: '#ff0000',
                lineWidth: 2,
            },
            label: 'hitbox',
        }
    );

    Matter.World.add(engine.world, hitboxBody);
    console.log('[usePhysicsEngine] Hitbox body created:', {
        position: hitboxBody.position,
        verticesCount: vertices.length,
        bodyId: hitboxBody.id,
    });

    Matter.Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;

        for (const pair of pairs) {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;

            const isHitboxA = bodyA.label === 'hitbox';
            const isHitboxB = bodyB.label === 'hitbox';
            const isItemA = bodyA.label === 'item';
            const isItemB = bodyB.label === 'item';

            if ((isHitboxA && isItemB) || (isHitboxB && isItemA)) {
                const itemBody = isItemA ? bodyA : bodyB;

                if (!(itemBody as any)._hitPlayed) {
                    (itemBody as any)._hitPlayed = true;
                    soundManager.play(SOUND_CONFIG.COLLISION, SOUND_CONFIG.VOLUME);
                    console.log('[usePhysicsEngine] Collision detected:', {
                        itemId: itemBody.id,
                        itemPosition: { x: itemBody.position.x, y: itemBody.position.y },
                        collisionPoint: pair.collision?.supports?.[0] || null,
                    });
                }
            }
        }
    });

    const runner = Matter.Runner.create();

    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    console.log('[usePhysicsEngine] Engine started');

    function spawnItem(): void {
        const centerX = hitbox.center.x;
        const randomOffset = (Math.random() - 0.5) * ITEM_CONFIG.SPAWN_RANDOM_RANGE;
        const spawnX = centerX + randomOffset;
        const spawnY = ITEM_CONFIG.SPAWN_Y;

        const body = Matter.Bodies.circle(spawnX, spawnY, ITEM_CONFIG.RADIUS, {
            render: {
                fillStyle: '#ff0000',
                strokeStyle: '#000000',
                lineWidth: 2,
            },
            label: 'item',
        });

        Matter.World.add(engine.world, body);

        console.log('[usePhysicsEngine] Item spawned:', {
            position: { x: spawnX, y: spawnY },
            radius: ITEM_CONFIG.RADIUS,
            bodyId: body.id,
        });
    }

    function handleResize(): void {
        const newSize = updateCanvasSize(canvas);
        render.options.width = newSize.width;
        render.options.height = newSize.height;
        console.log('[usePhysicsEngine] Resized:', {
            width: newSize.width,
            height: newSize.height,
        });
    }

    window.addEventListener('resize', handleResize);

    function destroy(): void {
        window.removeEventListener('resize', handleResize);
        Matter.Render.stop(render);
        Matter.Runner.stop(runner);
        console.log('[usePhysicsEngine] Destroyed');
    }

    onBeforeUnmount(() => {
        destroy();
    });

    return {
        destroy,
        spawnItem,
        engine,
    };
}
