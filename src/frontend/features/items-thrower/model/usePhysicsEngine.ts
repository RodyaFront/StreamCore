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

const imageSizeCache = new Map<string, { width: number; height: number }>();

function getImageSize(imgSrc: string): Promise<{ width: number; height: number }> {
    if (imageSizeCache.has(imgSrc)) {
        return Promise.resolve(imageSizeCache.get(imgSrc)!);
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const size = { width: img.naturalWidth, height: img.naturalHeight };
            imageSizeCache.set(imgSrc, size);
            resolve(size);
        };
        img.onerror = () => {
            const defaultSize = { width: ITEM_CONFIG.MAX_SIZE, height: ITEM_CONFIG.MAX_SIZE };
            imageSizeCache.set(imgSrc, defaultSize);
            resolve(defaultSize);
        };
        img.src = imgSrc;
    });
}

export function usePhysicsEngine(
    canvas: HTMLCanvasElement,
    hitbox: HitboxModel,
    getRandomSpawnPoint: () => { position: { x: number; y: number } },
    applyDamage: (damage: number) => void,
    onDamagePopup?: (x: number, y: number, damage: number) => void
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
                const itemDamage = (itemBody as any)._itemDamage as number | undefined;

                if (!(itemBody as any)._hitPlayed) {
                    (itemBody as any)._hitPlayed = true;
                    if (itemSound) {
                        soundManager.play(itemSound, SOUND_CONFIG.VOLUME);
                    }
                    if (itemDamage !== undefined) {
                        applyDamage(itemDamage);

                        const collisionPoint = pair.collision?.supports?.[0];
                        const popupX = collisionPoint?.x ?? itemBody.position.x;
                        const popupY = collisionPoint?.y ?? itemBody.position.y;

                        if (onDamagePopup) {
                            onDamagePopup(popupX, popupY, itemDamage);
                        }
                    }
                    console.log('[usePhysicsEngine] Collision detected:', {
                        itemId: itemBody.id,
                        itemPosition: { x: itemBody.position.x, y: itemBody.position.y },
                        damage: itemDamage,
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

    async function spawnItem(item?: ItemDescriptor): Promise<void> {
        const selectedItem = item || ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const spawnPoint = getRandomSpawnPoint();
        const randomOffset = (Math.random() - 0.5) * ITEM_CONFIG.SPAWN_RANDOM_RANGE;
        const spawnX = spawnPoint.position.x + randomOffset;
        const spawnY = spawnPoint.position.y;

        const radiusVariation = (Math.random() - 0.5) * ITEM_CONFIG.RADIUS_VARIATION;
        let radius = ITEM_CONFIG.RADIUS * (1 + radiusVariation);

        const maxRadius = ITEM_CONFIG.MAX_SIZE / 2;
        if (radius > maxRadius) {
            radius = maxRadius;
        }

        const imageSize = await getImageSize(selectedItem.img);
        const maxImageDimension = Math.max(imageSize.width, imageSize.height);
        const spriteScale = ITEM_CONFIG.MAX_SIZE / maxImageDimension;

        const angularVelocity = ITEM_CONFIG.ANGULAR_VELOCITY_MIN +
            Math.random() * (ITEM_CONFIG.ANGULAR_VELOCITY_MAX - ITEM_CONFIG.ANGULAR_VELOCITY_MIN);

        const dx = hitbox.center.x - spawnX;
        const dy = hitbox.center.y - spawnY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const directionX = dx / distance;
        const directionY = dy / distance;

        const speedVariation = (Math.random() - 0.5) * ITEM_CONFIG.INITIAL_SPEED_VARIATION;
        const speed = ITEM_CONFIG.INITIAL_SPEED + speedVariation;

        const body = Matter.Bodies.circle(spawnX, spawnY, radius, {
            restitution: ITEM_CONFIG.RESTITUTION,
            render: {
                sprite: {
                    texture: selectedItem.img,
                    xScale: spriteScale,
                    yScale: spriteScale,
                },
            },
            label: 'item',
        });

        Matter.Body.setAngularVelocity(body, angularVelocity);
        Matter.Body.setVelocity(body, {
            x: directionX * speed,
            y: directionY * speed,
        });

        (body as any)._itemSound = selectedItem.sound;
        (body as any)._itemDamage = selectedItem.damage;

        Matter.World.add(engine.world, body);

        console.log('[usePhysicsEngine] Item spawned:', {
            position: { x: spawnX, y: spawnY },
            radius,
            direction: { x: directionX, y: directionY },
            speed,
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
