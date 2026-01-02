import gsap from 'gsap';
import {
    LEVEL_ANIMATION_DURATIONS,
    LEVEL_OFFSET_Y
} from './constants';

interface LevelElements {
    oldLevel: HTMLDivElement;
    oldLevelText: HTMLSpanElement;
    newLevel: HTMLDivElement;
    newLevelText: HTMLSpanElement;
    avatar: HTMLImageElement;
    container: HTMLDivElement;
}

function calculateLevelPosition(avatar: HTMLElement, container: HTMLElement) {
    const avatarRect = avatar.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    return {
        x: avatarRect.left - containerRect.left + avatarRect.width / 2,
        y: avatarRect.top - containerRect.top + LEVEL_OFFSET_Y
    };
}

export function useLevelAnimation() {
    function createTimeline(
        oldLevel: HTMLDivElement,
        newLevel: HTMLDivElement,
        avatar: HTMLImageElement,
        oldLevelValue: number,
        newLevelValue: number,
        onComplete?: () => void
    ) {
        const timeline = gsap.timeline({
            onComplete
        });

        timeline.to(oldLevel, {
            opacity: 1,
            duration: LEVEL_ANIMATION_DURATIONS.OLD_APPEAR,
            ease: 'bounce.out'
        })
        .to({}, { duration: 0.5 })
        .to(oldLevel, {
            x: -100,
            opacity: 0,
            duration: LEVEL_ANIMATION_DURATIONS.TRANSITION,
            ease: 'power2.in'
        })
        .to(newLevel, {
            x: 0,
            opacity: 1,
            duration: LEVEL_ANIMATION_DURATIONS.TRANSITION,
            ease: 'power2.out'
        }, '<')
        .to({}, { duration: LEVEL_ANIMATION_DURATIONS.NEW_VISIBLE })
        .to(newLevel, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in'
        })
        .to(avatar, {
            opacity: 0,
            duration: 0.3,
            ease: 'power2.in'
        }, '<')

        return timeline;
    }

    function playAnimation(
        elements: LevelElements,
        oldLevelValue: number,
        newLevelValue: number,
        onComplete?: () => void
    ) {
        const { oldLevel, newLevel, avatar, container } = elements;
        const position = calculateLevelPosition(avatar, container);

        const oldLevelRect = oldLevel.getBoundingClientRect();
        const oldLevelWidth = oldLevelRect.width || 50;

        const newLevelRect = newLevel.getBoundingClientRect();
        const newLevelWidth = newLevelRect.width || 50;

        gsap.set(oldLevel, {
            left: position.x - oldLevelWidth / 2,
            top: position.y,
            x: 0,
            y: '-50%',
            opacity: 0,
            scale: 1
        });

        gsap.set(newLevel, {
            left: position.x - newLevelWidth / 2,
            top: position.y,
            x: 100,
            y: '-50%',
            opacity: 0,
            scale: 1
        });

        return createTimeline(oldLevel, newLevel, avatar, oldLevelValue, newLevelValue, onComplete);
    }

    return {
        playAnimation
    };
}
