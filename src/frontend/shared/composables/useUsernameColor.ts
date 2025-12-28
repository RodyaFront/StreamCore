const usernameColorCache = new Map<string, string>();

export function useUsernameColor() {
    const getUsernameColor = (username: string): string => {
        if (usernameColorCache.has(username)) {
            return usernameColorCache.get(username)!;
        }

        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash) % 360;
        const saturation = 60 + (Math.abs(hash) % 20);
        const lightness = 50 + (Math.abs(hash) % 15);

        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        usernameColorCache.set(username, color);
        return color;
    };

    return {
        getUsernameColor
    };
}

