<template>
    <div>
        <div>
            <div>
                <h2 class="py-2">Лог получения опыта</h2>
            </div>
            <div ref="logsContainer">
                <transition-group name="exp-log" tag="div">
                    <div
                        v-for="log in logs"
                        :key="log.id"
                    >
                        <span>{{ log.username }}</span>
                        <span>
                            получил <span>+{{ log.amount }}</span> опыта
                        </span>
                        <span v-if="log.levelUp">
                            🎉 Уровень {{ log.newLevel }}!
                        </span>
                    </div>
                </transition-group>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../shared/config/socket';

const logs = ref([]);
const logsContainer = ref(null);
const socket = ref(null);
let logIdCounter = 0;

const addLog = (data) => {
    const log = {
        id: logIdCounter++,
        username: data.username,
        amount: data.amount,
        type: 'exp',
        timestamp: Date.now()
    };

    logs.value.unshift(log);

    // Ограничиваем количество логов (последние 50)
    if (logs.value.length > 50) {
        logs.value = logs.value.slice(0, 50);
    }

    // Автоматически удаляем лог через 5 секунд
    setTimeout(() => {
        const index = logs.value.findIndex(l => l.id === log.id);
        if (index !== -1) {
            logs.value.splice(index, 1);
        }
    }, 50000);

    // Прокрутка вверх
    nextTick(() => {
        if (logsContainer.value) {
            logsContainer.value.scrollTop = 0;
        }
    });
};

const addLevelUpLog = (data) => {
    const log = {
        id: logIdCounter++,
        username: data.username,
        amount: 0,
        type: 'levelup',
        levelUp: true,
        newLevel: data.newLevel,
        timestamp: Date.now()
    };

    logs.value.unshift(log);

    if (logs.value.length > 50) {
        logs.value = logs.value.slice(0, 50);
    }

    setTimeout(() => {
        const index = logs.value.findIndex(l => l.id === log.id);
        if (index !== -1) {
            logs.value.splice(index, 1);
        }
    }, 8000);

    nextTick(() => {
        if (logsContainer.value) {
            logsContainer.value.scrollTop = 0;
        }
    });
};

onMounted(() => {
    socket.value = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);

    socket.value.on('connect', () => {
        console.log('[EXP Logger] Подключено к Socket.IO');
    });

    socket.value.on('level:exp:added', (data) => {
        addLog(data);
    });

    socket.value.on('level:up', (data) => {
        addLevelUpLog(data);
    });

    socket.value.on('disconnect', () => {
        console.log('[EXP Logger] Отключено от Socket.IO');
    });

    socket.value.on('connect_error', (error) => {
        console.error('[EXP Logger] Ошибка подключения:', error);
    });
});

onBeforeUnmount(() => {
    if (socket.value) {
        socket.value.off('level:exp:added');
        socket.value.off('level:up');
        socket.value.disconnect();
    }
});
</script>

<style scoped>
/* Анимации для transition-group */
.exp-log-enter-active {
    transition: all 0.3s ease-out;
}

.exp-log-enter-from {
    opacity: 0;
    transform: translateX(-20px);
}

.exp-log-enter-to {
    opacity: 1;
    transform: translateX(0);
}

.exp-log-leave-active {
    transition: all 0.3s ease-in;
}

.exp-log-leave-from {
    opacity: 1;
    transform: translateX(0);
}

.exp-log-leave-to {
    opacity: 0;
    transform: translateX(20px);
}

.exp-log-move {
    transition: transform 0.3s ease;
}
</style>

