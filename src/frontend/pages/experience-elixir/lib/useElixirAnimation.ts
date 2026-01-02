import gsap from 'gsap';
import {
    ANIMATION_DURATIONS,
    ELIXIR_START_OFFSET_Y,
    ELIXIR_END_OFFSET_Y
} from './constants';

interface AnimationElements {
    container: HTMLDivElement;
    avatar: HTMLImageElement;
    elixir: HTMLImageElement;
}

function calculatePositions(container: HTMLElement, avatar: HTMLElement, elixir: HTMLElement) {
    const containerRect = container.getBoundingClientRect();
    const avatarRect = avatar.getBoundingClientRect();
    const elixirRect = elixir.getBoundingClientRect();

    const avatarCenterX = avatarRect.left - containerRect.left + avatarRect.width / 2;
    const avatarCenterY = avatarRect.top - containerRect.top + avatarRect.height / 2;

    const elixirStartX = containerRect.width / 2;
    const elixirStartY = containerRect.height / 2 + ELIXIR_START_OFFSET_Y;
    const elixirEndX = avatarCenterX;
    const elixirEndY = avatarCenterY + ELIXIR_END_OFFSET_Y;

    return {
        start: {
            left: elixirStartX - elixirRect.width / 2,
            top: elixirStartY - elixirRect.height / 2
        },
        end: {
            left: elixirEndX - elixirRect.width / 2,
            top: elixirEndY - elixirRect.height / 2
        }
    };
}

export function useElixirAnimation() {
    function initializeElements(avatar: HTMLImageElement, elixir: HTMLImageElement, positions: ReturnType<typeof calculatePositions>) {
        gsap.set(elixir, {
            left: positions.start.left,
            top: positions.start.top,
            opacity: 0,
            scale: 0.5,
            rotation: 0,
            transformOrigin: 'center center',
            force3D: true
        });

        gsap.set(avatar, { opacity: 0 });
    }

    function createTimeline(
        avatar: HTMLImageElement,
        elixir: HTMLImageElement,
        positions: ReturnType<typeof calculatePositions>,
        onElixirComplete: () => void,
        onAvatarComplete: () => void,
        onRotationStart?: () => void,
        onRotationEnd?: () => void
    ) {
        const timeline = gsap.timeline();

        timeline
            .to(avatar, {
                opacity: 1,
                duration: ANIMATION_DURATIONS.AVATAR_FADE_IN,
                ease: 'power2.out'
            })
            .to(elixir, {
                opacity: 1,
                scale: 1,
                duration: ANIMATION_DURATIONS.ELIXIR_APPEAR,
                ease: 'bounce.out'
            })
            .to(elixir, {
                left: positions.end.left,
                top: positions.end.top,
                duration: ANIMATION_DURATIONS.ELIXIR_MOVE,
                ease: 'power2.inOut'
            });

        if (onRotationStart) {
            timeline.call(onRotationStart, [], '<0');
        }

        timeline
            .to(elixir, {
                rotation: -120,
                duration: ANIMATION_DURATIONS.ELIXIR_ROTATION,
                ease: 'power2.inOut',
                onComplete: () => {
                    if (onRotationEnd) {
                        onRotationEnd();
                    }
                }
            });

        timeline
            .to(elixir, {
                rotation: 0,
                opacity: 0,
                scale: 0,
                duration: 0.1,
                ease: 'bounce.out',
                onComplete: onElixirComplete
            })
            .to(avatar, {
                opacity: 0,
                duration: ANIMATION_DURATIONS.AVATAR_FADE_OUT,
                ease: 'power2.in',
                delay: ANIMATION_DURATIONS.AVATAR_FADE_OUT_DELAY,
                onComplete: onAvatarComplete
            });

        return timeline;
    }

    function playAnimation(
        elements: AnimationElements,
        onElixirComplete: () => void,
        onAvatarComplete: () => void,
        onRotationStart?: () => void,
        onRotationEnd?: () => void
    ) {
        const { container, avatar, elixir } = elements;
        const positions = calculatePositions(container, avatar, elixir);

        initializeElements(avatar, elixir, positions);
        return createTimeline(avatar, elixir, positions, onElixirComplete, onAvatarComplete, onRotationStart, onRotationEnd);
    }

    return {
        playAnimation
    };
}
