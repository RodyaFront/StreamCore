import openBottleSound from '@shared/assets/sounds/open_bottle.mp3';
import drinkingSound from '@shared/assets/sounds/drinking.mp3';
import lvlUpSound from '@shared/assets/sounds/lvl_up.mp3';

const AUDIO_VOLUME = 0.3;

class SoundManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();

    constructor() {
        this.sounds.set('openBottle', new Audio(openBottleSound));
        this.sounds.set('drinking', new Audio(drinkingSound));
        this.sounds.set('lvlUp', new Audio(lvlUpSound));

        this.sounds.forEach((audio) => {
            audio.volume = AUDIO_VOLUME;
        });
    }

    play(soundName: string): void {
        const audio = this.sounds.get(soundName);
        if (!audio) {
            console.warn(`[SoundManager] Звук "${soundName}" не найден`);
            return;
        }

        audio.currentTime = 0;
        audio.play().catch((error) => {
            console.error(`[SoundManager] Ошибка воспроизведения "${soundName}":`, error);
        });
    }
}

let soundManagerInstance: SoundManager | null = null;

export function useSoundManager(): SoundManager {
    if (!soundManagerInstance) {
        soundManagerInstance = new SoundManager();
    }
    return soundManagerInstance;
}
