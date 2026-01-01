export function useSoundManager() {
    const soundCache = new Map<string, HTMLAudioElement>();

    function play(soundPath: string, volume: number = 0.5): void {
        let audio = soundCache.get(soundPath);

        if (!audio) {
            audio = new Audio(soundPath);
            audio.volume = volume;
            soundCache.set(soundPath, audio);
        }

        try {
            audio.currentTime = 0;
            audio.play().catch((error) => {
                console.warn('[useSoundManager] Failed to play sound:', soundPath, error);
            });
        } catch (error) {
            console.error('[useSoundManager] Error playing sound:', soundPath, error);
        }
    }

    return {
        play,
    };
}
