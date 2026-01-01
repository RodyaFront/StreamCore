import { onBeforeUnmount } from 'vue';
import Matter from 'matter-js';
import { PHYSICS_CONFIG, ITEM_CONFIG, ITEMS, SOUND_CONFIG } from '../config';
import { useSoundManager } from '../lib/useSoundManager';
import type { HitboxModel, ItemDescriptor } from '../types';

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

export function usePhysicsEngine(
    canvas: HTMLCanvasElement,
    hitbox: HitboxModel,
    getRandomSpawnPoint: () => { position: { x: number; y: number } }
) {
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

    const verticesRelative = hitbox.vertices.map(v => ({
        x: v.x - hitbox.center.x,
        y: v.y - hitbox.center.y,
    }));
    let hitboxBody = Matter.Bodies.fromVertices(
        hitbox.center.x,
        hitbox.center.y,
        [verticesRelative],
        {
            isStatic: true,
            render: {
                visible: false,
            },
            label: 'hitbox',
        }
    );

    Matter.World.add(engine.world, hitboxBody);
    console.log('[usePhysicsEngine] Hitbox body created:', {
        position: hitboxBody.position,
        verticesCount: verticesRelative.length,
        bodyId: hitboxBody.id,
    });

    function updateHitboxPosition(newCenter: { x: number; y: number }, newVertices: { x: number; y: number }[]): void {
        const newVerticesRelative = newVertices.map(v => ({
            x: v.x - newCenter.x,
            y: v.y - newCenter.y,
        }));

        Matter.World.remove(engine.world, hitboxBody);

        const newHitboxBody = Matter.Bodies.fromVertices(
            newCenter.x,
            newCenter.y,
            [newVerticesRelative],
            {
                isStatic: true,
                render: {
                    visible: false,
                },
                label: 'hitbox',
            }
        );

        Matter.World.add(engine.world, newHitboxBody);

        hitboxBody = newHitboxBody;

        console.log('[usePhysicsEngine] Hitbox position updated:', {
            newCenter,
            verticesCount: newVertices.length,
        });
    }

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
                const itemSound = (itemBody as any)._itemSound as string | undefined;

                if (!(itemBody as any)._hitPlayed) {
                    (itemBody as any)._hitPlayed = true;
                    if (itemSound) {
                        soundManager.play(itemSound, SOUND_CONFIG.VOLUME);
                    }
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

    function spawnItem(item?: ItemDescriptor): void {
        const selectedItem = item || ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const spawnPoint = getRandomSpawnPoint();
        const randomOffset = (Math.random() - 0.5) * ITEM_CONFIG.SPAWN_RANDOM_RANGE;
        const spawnX = spawnPoint.position.x + randomOffset;
        const spawnY = spawnPoint.position.y;

        const radiusVariation = (Math.random() - 0.5) * ITEM_CONFIG.RADIUS_VARIATION;
        const radius = ITEM_CONFIG.RADIUS * (1 + radiusVariation);
        const scale = radius / ITEM_CONFIG.RADIUS;

        const angularVelocity = ITEM_CONFIG.ANGULAR_VELOCITY_MIN +
            Math.random() * (ITEM_CONFIG.ANGULAR_VELOCITY_MAX - ITEM_CONFIG.ANGULAR_VELOCITY_MIN);

        const velocityX = ITEM_CONFIG.INITIAL_VELOCITY_X_MIN +
            Math.random() * (ITEM_CONFIG.INITIAL_VELOCITY_X_MAX - ITEM_CONFIG.INITIAL_VELOCITY_X_MIN);
        const velocityY = ITEM_CONFIG.INITIAL_VELOCITY_Y_MIN +
            Math.random() * (ITEM_CONFIG.INITIAL_VELOCITY_Y_MAX - ITEM_CONFIG.INITIAL_VELOCITY_Y_MIN);

        const body = Matter.Bodies.circle(spawnX, spawnY, radius, {
            restitution: ITEM_CONFIG.RESTITUTION,
            render: {
                sprite: {
                    texture: selectedItem.img,
                    xScale: scale,
                    yScale: scale,
                },
            },
            label: 'item',
        });

        Matter.Body.setAngularVelocity(body, angularVelocity);
        Matter.Body.setVelocity(body, { x: velocityX, y: velocityY });

        (body as any)._itemSound = selectedItem.sound;

        Matter.World.add(engine.world, body);

        console.log('[usePhysicsEngine] Item spawned:', {
            position: { x: spawnX, y: spawnY },
            radius,
            velocity: { x: velocityX, y: velocityY },
            angularVelocity,
            bodyId: body.id,
            item: selectedItem,
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
        updateHitboxPosition,
        engine,
    };
}
