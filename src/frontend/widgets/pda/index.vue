<template>
    <div class="pda-wrapper">
        <div
            :class="containerClasses"
            id="pdaContainer"
            :style="baseContainerStyle"
        >
            <div class="pda-tilt-wrapper" :style="tiltStyle">
                <img src="/assets/pda.png" alt="КПК" class="pda-image">
                <div class="pda-screen" :style="screenStyle">
                <div class="pda-screen__content">
                    <slot name="screen-content">
                        <div class="pda-screen__placeholder">
                            <p>Экран КПК</p>
                            <p>Настройте размеры через screenConfig</p>
                        </div>
                    </slot>
                </div>
                <div class="pda-screen__overlay"></div>
            </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, provide, watch } from 'vue';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../shared/config/socket';

const DEFAULT_SCREEN_CONFIG = {
    width: '77%',
    height: '77.5%',
    top: '49.7%',
    left: '47.7%',
    transform: 'translate(-50%, -50%)'
};

const isOpen = ref(false);
const socket = ref(null);
const screenConfig = reactive({ ...DEFAULT_SCREEN_CONFIG });
const openSound = ref(null);
const closeSound = ref(null);
const keyboardClickSounds = ref([]);
const tiltState = reactive({
    x: 0,
    y: 0,
    isAnimating: false
});
let tiltTimeout = null;
let tiltResetTimeout = null;

const initSocket = () => {
    socket.value = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);

    socket.value.on('connect', () => {});

    socket.value.on('disconnect', () => {});

    socket.value.on('connect_error', () => {});

    socket.value.on('togglePDA', togglePDA);
    socket.value.on('navigate', (direction) => {
        handleNavigation(direction);
    });
    socket.value.on('twitchCommand', () => {});
};

const initSound = () => {
    openSound.value = new Audio('/assets/pda_open.mp3');
    openSound.value.volume = 0.2;

    closeSound.value = new Audio('/assets/pda_hide.mp3');
    closeSound.value.volume = 0.2;

    const sound1 = new Audio('/assets/keyboard_click.mp3');
    sound1.volume = 0.1;
    const sound2 = new Audio('/assets/keyboard_click_2.mp3');
    sound2.volume = 0.1;

    keyboardClickSounds.value = [sound1, sound2];
};

const playOpenSound = () => {
    if (openSound.value) {
        openSound.value.currentTime = 0;
        openSound.value.play().catch(() => {});
    }
};

const playCloseSound = () => {
    if (closeSound.value) {
        closeSound.value.currentTime = 0;
        closeSound.value.play().catch(() => {});
    }
};

const playKeyboardClickSound = (direction) => {
    if (keyboardClickSounds.value.length < 2) {
        return;
    }

    let soundIndex = 0;
    if (direction === 'up' || direction === 'down') {
        soundIndex = 1;
    } else if (direction === 'left' || direction === 'right') {
        soundIndex = 0;
    }

    const selectedSound = keyboardClickSounds.value[soundIndex];
    if (selectedSound) {
        selectedSound.currentTime = 0;
        selectedSound.play().catch(() => {});
    }
};

const togglePDA = () => {
    const wasOpen = isOpen.value;
    isOpen.value = !isOpen.value;
    if (!wasOpen && isOpen.value) {
        playOpenSound();
    } else if (wasOpen && !isOpen.value) {
        playCloseSound();
    }
};

const handleNavigation = (direction) => {
    if (!isOpen.value) {
        return;
    }

    playKeyboardClickSound(direction);

    // Очищаем предыдущие таймауты для прерывания анимации
    if (tiltTimeout) {
        clearTimeout(tiltTimeout);
        tiltTimeout = null;
    }
    if (tiltResetTimeout) {
        clearTimeout(tiltResetTimeout);
        tiltResetTimeout = null;
    }

    tiltState.isAnimating = true;

    const tiltMap = {
        'up': { x: 6, y: 0 },
        'down': { x: -6, y: 0 },
        'left': { x: 0, y: -8 },
        'right': { x: 0, y: 8 }
    };

    const tilt = tiltMap[direction];
    if (tilt) {
        tiltState.x = tilt.x;
        tiltState.y = tilt.y;

        tiltTimeout = setTimeout(() => {
            tiltState.x = 0;
            tiltState.y = 0;
            tiltResetTimeout = setTimeout(() => {
                tiltState.isAnimating = false;
            }, 250);
        }, 150);
    }
};

const containerClasses = computed(() => ({
    'pda-container': true,
    'pda-container--open': isOpen.value,
    'tilting': tiltState.isAnimating
}));

const screenStyle = computed(() => screenConfig);

const baseContainerStyle = computed(() => {
    const baseTransform = isOpen.value
        ? 'translateY(-50%) translateX(0) scale(1)'
        : 'translateY(-50%) translateX(-100%) scale(0.95)';
    return {
        transform: baseTransform
    };
});

const tiltStyle = computed(() => {
    if (tiltState.x === 0 && tiltState.y === 0) {
        return {
            transform: 'translateZ(0)'
        };
    }
    return {
        transform: `rotateX(${tiltState.x}deg) rotateY(${tiltState.y}deg) translateZ(15px)`
    };
});

// Предоставляем состояние isOpen дочерним компонентам
provide('isPDAOpen', isOpen);

onMounted(() => {
    initSocket();
    initSound();
});

onBeforeUnmount(() => {
    if (socket.value) {
        socket.value.off('togglePDA', togglePDA);
        socket.value.off('navigate', handleNavigation);
        socket.value.disconnect();
    }
    if (tiltTimeout) {
        clearTimeout(tiltTimeout);
    }
    if (tiltResetTimeout) {
        clearTimeout(tiltResetTimeout);
    }
});
</script>

<style scoped>
.pda-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
}

.pda-container {
    position: fixed;
    left: 0;
    top: 50%;
    opacity: 0;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 0.3s ease-out;
    z-index: 1000;
    will-change: transform;
    pointer-events: auto;
    transform-origin: center;
    perspective: 1600px;
    perspective-origin: center;
}

.pda-container--open {
    opacity: 1 !important;
}

.pda-container.tilting .pda-tilt-wrapper {
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.pda-tilt-wrapper {
    position: relative;
    transform-origin: center;
    display: inline-block;
    transform-style: preserve-3d;
}

.pda-image {
    display: block;
    max-width: 600px;
    height: auto;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3));
    transition: filter 0.3s ease-out;
}

.pda-container--open .pda-image {
    filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5));
}

.pda-screen {
    position: absolute;
    background: transparent;
    overflow: hidden;
    border-radius: 4px;
    z-index: 10;
    opacity: 0;
    transform: scale(0.98) translateY(10px);
    transition: opacity 0.35s ease-out 0.2s,
                transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
    will-change: opacity, transform;
}

.pda-container--open .pda-screen {
    opacity: 1;
    transform: scale(1) translateY(0);
}

.pda-screen__content {
    position: relative;
    width: 100%;
    height: 100%;
    z-index: 1;
}

.pda-screen__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('/assets/pda_screen_overlay.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    pointer-events: none;
    z-index: 2;
    mix-blend-mode: overlay;
    opacity: 0.8;
}

.pda-screen__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #00ff00;
    font-family: monospace;
    font-size: 12px;
    text-align: center;
    padding: 20px;
    box-sizing: border-box;
}
</style>
