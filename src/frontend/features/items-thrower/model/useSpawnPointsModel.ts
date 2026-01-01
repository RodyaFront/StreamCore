import { ref, computed } from 'vue';
import { useSpawnPointsStorage } from '../lib/useSpawnPointsStorage';
import type { SpawnPoint, Point } from '../types';

export function useSpawnPointsModel() {
    const storage = useSpawnPointsStorage();
    const spawnPoints = ref<SpawnPoint[]>(storage.loadSpawnPoints() || storage.getDefaultSpawnPoints());

    function updateSpawnPoint(pointId: string, newPosition: Point): void {
        const pointIndex = spawnPoints.value.findIndex(p => p.id === pointId);
        if (pointIndex !== -1) {
            spawnPoints.value[pointIndex] = {
                ...spawnPoints.value[pointIndex],
                position: newPosition,
            };
            storage.saveSpawnPoints(spawnPoints.value);
            console.log('[useSpawnPointsModel] Spawn point updated:', pointId, newPosition);
        }
    }

    function addSpawnPoint(position: Point): void {
        const newId = `spawn-${Date.now()}`;
        const newPoint: SpawnPoint = {
            id: newId,
            position,
        };
        spawnPoints.value.push(newPoint);
        storage.saveSpawnPoints(spawnPoints.value);
        console.log('[useSpawnPointsModel] Spawn point added:', newPoint);
    }

    function removeSpawnPoint(pointId: string): void {
        if (spawnPoints.value.length <= 1) {
            console.warn('[useSpawnPointsModel] Cannot remove spawn point: minimum 1 point required');
            return;
        }
        spawnPoints.value = spawnPoints.value.filter(p => p.id !== pointId);
        storage.saveSpawnPoints(spawnPoints.value);
        console.log('[useSpawnPointsModel] Spawn point removed:', pointId);
    }

    function getRandomSpawnPoint(): SpawnPoint {
        const randomIndex = Math.floor(Math.random() * spawnPoints.value.length);
        return spawnPoints.value[randomIndex];
    }

    return {
        spawnPoints: computed(() => spawnPoints.value),
        updateSpawnPoint,
        addSpawnPoint,
        removeSpawnPoint,
        getRandomSpawnPoint,
    };
}
