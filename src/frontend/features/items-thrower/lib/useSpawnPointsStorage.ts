import { SPAWN_POINTS_CONFIG } from '../config';
import type { SpawnPoint } from '../types';

export function useSpawnPointsStorage() {
    function saveSpawnPoints(points: SpawnPoint[]): void {
        try {
            localStorage.setItem(SPAWN_POINTS_CONFIG.STORAGE_KEY, JSON.stringify(points));
            console.log('[useSpawnPointsStorage] Spawn points saved:', points);
        } catch (error) {
            console.error('[useSpawnPointsStorage] Failed to save spawn points:', error);
        }
    }

    function loadSpawnPoints(): SpawnPoint[] | null {
        try {
            const stored = localStorage.getItem(SPAWN_POINTS_CONFIG.STORAGE_KEY);
            if (!stored) {
                return null;
            }

            const points = JSON.parse(stored) as SpawnPoint[];

            if (!Array.isArray(points) || points.length === 0) {
                console.warn('[useSpawnPointsStorage] Invalid spawn points data, returning null');
                return null;
            }

            console.log('[useSpawnPointsStorage] Spawn points loaded:', points);
            return points;
        } catch (error) {
            console.error('[useSpawnPointsStorage] Failed to load spawn points:', error);
            return null;
        }
    }

    function getDefaultSpawnPoints(): SpawnPoint[] {
        return SPAWN_POINTS_CONFIG.DEFAULT_POINTS.map(p => ({ ...p }));
    }

    return {
        saveSpawnPoints,
        loadSpawnPoints,
        getDefaultSpawnPoints,
    };
}
