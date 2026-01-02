import type { ExperienceElixirEvent } from '../types';

export function useAvatarUrl() {
    function getUrl(data: ExperienceElixirEvent): string {
        if (data.avatarUrl) {
            return data.avatarUrl;
        }
        return `https://static-cdn.jtvnw.net/jtv_user_pictures/${data.username}-profile_image-150x150.jpg`;
    }

    return {
        getUrl
    };
}
