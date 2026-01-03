import { ref, computed } from 'vue';
import { useHitboxStorage } from '../lib/useHitboxStorage';
import { HITBOX_CONFIG } from '../config';
import type { HitboxModel } from '../types';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '@shared/config/socket.js';

export function useHitboxModel() {
    const storage = useHitboxStorage();
    const loadedHitbox = storage.loadHitbox();
    const defaultHitbox = storage.getDefaultHitbox();
    const hitbox = ref<HitboxModel>(loadedHitbox || { ...defaultHitbox, hp: defaultHitbox.hp ?? HITBOX_CONFIG.DEFAULT_HP });

    const center = computed(() => hitbox.value.center);
    const vertices = computed(() => hitbox.value.vertices);
    const hp = computed(() => hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP);

    let lastDamageDealer: string | null = null;
    let isHpZero = false;
    let hpWatcherInterval: ReturnType<typeof setInterval> | null = null;
    let lastHpValue: number | null = null;
    let lastHpChangeTime: number = 0;
    const socket = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);
    const FINISHING_BLOW_EXP = 500;
    const HP_STABLE_DURATION = 3000;
    const HP_WATCHER_CHECK_INTERVAL = 100;

    function updateHitbox(newHitbox: HitboxModel): void {
        hitbox.value = { ...newHitbox, hp: newHitbox.hp ?? hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP };
        storage.saveHitbox(hitbox.value);
        console.log('[useHitboxModel] Hitbox updated:', hitbox.value);
    }

    function startHpWatcher(): void {
        if (hpWatcherInterval) {
            clearInterval(hpWatcherInterval);
        }

        const currentHp = hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP;
        lastHpValue = currentHp;
        lastHpChangeTime = Date.now();

        console.log('[useHitboxModel] HP watcher started, current HP:', currentHp);

        hpWatcherInterval = setInterval(() => {
            const currentHp = hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP;
            const now = Date.now();
            const timeSinceLastChange = now - lastHpChangeTime;

            if (currentHp !== lastHpValue) {
                lastHpValue = currentHp;
                lastHpChangeTime = now;
                console.log('[useHitboxModel] HP changed to:', currentHp, 'resetting watcher');
                return;
            }

            if (currentHp <= 0 && timeSinceLastChange >= HP_STABLE_DURATION) {
                console.log('[useHitboxModel] HP stable at 0 for', timeSinceLastChange, 'ms, restoring HP');
                stopHpWatcher();
                restoreFullHp();
            }
        }, HP_WATCHER_CHECK_INTERVAL);
    }

    function stopHpWatcher(): void {
        if (hpWatcherInterval) {
            clearInterval(hpWatcherInterval);
            hpWatcherInterval = null;
        }
        lastHpValue = null;
        lastHpChangeTime = 0;
    }

    function applyDamage(damage: number, username?: string): void {
        const currentHp = hitbox.value.hp ?? HITBOX_CONFIG.DEFAULT_HP;

        // Если HP = 0 и это лечение (отрицательный урон), не применяем
        if (currentHp <= 0 && damage < 0) {
            console.log('[useHitboxModel] Healing blocked: HP is 0, only Restore HP button can heal');
            return;
        }

        // Если HP уже = 0 и это урон (не лечение), не применяем урон, но перезапускаем вотчер
        if (currentHp <= 0 && damage > 0) {
            console.log('[useHitboxModel] Damage ignored: HP is already 0, restarting watcher');
            if (isHpZero) {
                startHpWatcher();
            }
            return;
        }

        // Отслеживаем последнего нанесшего урон (только если это урон, не лечение)
        if (damage > 0 && username) {
            lastDamageDealer = username;
        }

        const newHp = Math.max(0, Math.min(100, currentHp - damage));
        const wasHpAboveZero = currentHp > 0;
        const isNowZero = newHp <= 0;

        hitbox.value = { ...hitbox.value, hp: newHp };
        storage.saveHitbox(hitbox.value);

        // Если HP упало до 0 и это первый раз (не было уже 0), начисляем опыт последнему нанесшему урон
        if (wasHpAboveZero && isNowZero && lastDamageDealer && !isHpZero) {
            isHpZero = true;
            console.log('[useHitboxModel] Finishing blow detected:', { username: lastDamageDealer, exp: FINISHING_BLOW_EXP });

            socket.emit('item:finishing_blow', {
                username: lastDamageDealer,
                exp: FINISHING_BLOW_EXP,
                source: 'finishing_blow'
            });

            startHpWatcher();
        }

        // Если HP уже 0 и пришел новый урон, перезапускаем вотчер
        if (isHpZero && newHp <= 0) {
            startHpWatcher();
        }

        console.log('[useHitboxModel] Damage applied:', { damage, oldHp: currentHp, newHp, username });
    }

    function resetHitbox(): void {
        const defaultHitbox = storage.getDefaultHitbox();
        updateHitbox({ ...defaultHitbox, hp: HITBOX_CONFIG.DEFAULT_HP });
    }

    function restoreFullHp(): void {
        stopHpWatcher();

        hitbox.value = { ...hitbox.value, hp: HITBOX_CONFIG.DEFAULT_HP };
        storage.saveHitbox(hitbox.value);
        isHpZero = false;
        lastDamageDealer = null;
        console.log('[useHitboxModel] Full HP restored:', hitbox.value.hp);
    }

    return {
        hitbox: computed(() => hitbox.value),
        center,
        vertices,
        hp,
        updateHitbox,
        applyDamage,
        resetHitbox,
        restoreFullHp,
    };
}
