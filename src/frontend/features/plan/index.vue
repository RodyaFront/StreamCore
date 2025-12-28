<template>
    <div class="w-full h-full text-green-400 font-mono text-xs flex flex-col">
        <div class="p-4 shrink-0">
            <h2 class="text-lg text-orange-400">Генератор задач</h2>
            <p class="text-sm">Модуль генерации задач. Получить задачу можно командой <b class="text-orange-400">!задача</b></p>
        </div>
        <div class="flex-1 overflow-y-auto px-4 pb-4">
            <div class="space-y-2">
                <button
                    v-for="(action, index) in actions"
                    :key="action.id"
                    :class="[
                        'px-4 py-2 text-xs w-full transition-all duration-150 text-left',
                        isActionFocused(index)
                            ? 'bg-green-400 text-black border-2 border-green-400'
                            : 'bg-green-400/30 text-green-400 border-2 border-transparent',
                        actionStates[action.id]?.loading ? 'opacity-50 cursor-not-allowed' : ''
                    ]"
                >
                    <span v-if="actionStates[action.id]?.loading">Загрузка...</span>
                    <span v-else>{{ action.label }} →</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../shared/config/socket';

const props = defineProps({
    innerNavigationIndex: {
        type: Number,
        default: 0
    }
});

const socket = ref(null);
const actionStates = ref({});

const actions = ref([
    {
        id: 'generate-task',
        label: 'Генерировать задачу',
        handler: async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
]);

const currentActionIndex = computed(() => {
    return props.innerNavigationIndex;
});

const isActionFocused = (index) => {
    return currentActionIndex.value === index;
};

const getCurrentAction = () => {
    const index = currentActionIndex.value;
    if (index >= 0 && index < actions.value.length) {
        return actions.value[index];
    }
    return null;
};

const handleAction = async (action) => {
    if (!action || actionStates.value[action.id]?.loading) {
        return;
    }

    if (!actionStates.value[action.id]) {
        actionStates.value[action.id] = { loading: false };
    }

    actionStates.value[action.id].loading = true;

    try {
        if (action.handler && typeof action.handler === 'function') {
            await action.handler();
        }
    } catch (error) {
    } finally {
        actionStates.value[action.id].loading = false;
    }
};

const handleNavigation = (direction) => {
    if (direction === 'right') {
        const action = getCurrentAction();
        if (action && !actionStates.value[action.id]?.loading) {
            handleAction(action);
        }
    }
};

const addAction = (actionConfig) => {
    if (!actionConfig.id || !actionConfig.label || !actionConfig.handler) {
        return;
    }
    actions.value.push(actionConfig);
};

const removeAction = (actionId) => {
    const index = actions.value.findIndex(a => a.id === actionId);
    if (index !== -1) {
        actions.value.splice(index, 1);
        delete actionStates.value[actionId];
    }
};

onMounted(() => {
    socket.value = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);
    socket.value.on('navigate', handleNavigation);
});

onBeforeUnmount(() => {
    if (socket.value) {
        socket.value.off('navigate', handleNavigation);
        socket.value.disconnect();
    }
});

defineExpose({
    addAction,
    removeAction,
    actions
});
</script>

<style scoped>
/* Стили компонента */
</style>

