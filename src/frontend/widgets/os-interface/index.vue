<template>
    <div class="w-full h-full flex flex-col bg-black/30 text-green-400 font-mono text-xs overflow-hidden">
        <!--Header-->
        <div class="p-2 flex justify-between text-green-400 font-mono text-[10px] border-b border-green-400/50">
            <div>
                [ ⧉ TEO-OS v0.3 ]
            </div>
            <PowerIndicatorFeature />
        </div>

        <div class="flex flex-1 overflow-hidden">
            <div class="w-[50%] min-w-[150px] border-r border-green-400/50 overflow-y-auto flex flex-col">
                <div class="flex-1">
                    <div
                        v-for="item in menuItems"
                        :key="item.id"
                        :class="[
                            'px-2 py-1.5 cursor-pointer font-normal text-[12px] transition-colors duration-150 select-none',
                            item.id === activeMenuId
                                ? 'bg-[rgba(50,142,50,0.5)]'
                                : 'text-[#88ff88] hover:bg-green-400/10'
                        ]"
                    >
                        <template v-if="item.id === activeMenuId">
                            <template v-if="item.id === selectedMenuId">
                                <span class="text-orange-400">#</span>
                                <span class="text-orange-400">[</span>
                                <span class="text-[#88ff88]">{{ item.label }}</span>
                                <span class="text-orange-400">]</span>
                            </template>
                            <template v-else>
                                <span class="text-purple-400">&gt;</span>
                                <span class="text-purple-400">[</span>
                                <span class="text-[#88ff88]">{{ item.label }}</span>
                                <span class="text-purple-400">]</span>
                            </template>
                        </template>
                        <template v-else>
                            {{ item.label }}
                        </template>
                    </div>
                </div>
                <div class="p-2 mx-2 text-[12px] border border-green-400/50">
                    Вы можете оставить тут совет командой <b class="text-orange-400">!совет [текст]</b>
                </div>
                <div class="shrink p-2 mx-2 bg-green-400/30">
                    <div class="text-[12px]">
                        <template v-if="currentAdvice">
                            <span class="text-green-400">{{ currentAdvice }}</span>
                            <br/>
                            <span class="text-[11px] text-orange-200 mt-1 block">Автор: {{ adviceAuthor }}</span>
                        </template>
                    </div>
                </div>
                <div class="shrink text-[10px] p-2">
                    <div>
                        Навигация: (↑ / ↓)
                    </div>
                    <div>
                        {{  selectedMenuId ? `Выбран: ${menuItems.find(item => item.id === selectedMenuId)?.label || selectedMenuId}` : 'Выберите пункт меню (→)' }}
                    </div>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto">
                <div class="w-full h-full">
                    <component
                        v-if="selectedMenuId && currentComponent"
                        :is="currentComponent"
                        :innerNavigationIndex="innerNavigationIndex"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-green-400 opacity-60">
                        <p>Выберите пункт меню (→)</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, inject, watch } from 'vue';
import { io } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../shared/config/socket';
import { PowerIndicatorFeature } from '../../features/power-indicator';
import { TasksFeature } from '../../features/tasks';
import { PlanFeature } from '../../features/plan';

const activeMenuId = ref('tasks');
const selectedMenuId = ref(null);
const innerNavigationIndex = ref(0);
const menuItems = ref([
    { id: 'tasks', label: 'Генератор событий' },
    { id: 'plan', label: 'Генератор задач' }
]);

// Маппинг между id меню и компонентами
const componentMap = {
    tasks: TasksFeature,
    plan: PlanFeature
};

// Вычисляемый компонент для текущего выбранного пункта меню
const currentComponent = computed(() => {
    if (!selectedMenuId.value) return null;
    return componentMap[selectedMenuId.value] || null;
});

const socket = ref(null);

// Состояние для совета
const currentAdvice = ref('');
const adviceAuthor = ref('');

// Загружаем совет из localStorage при монтировании
const loadAdvice = () => {
    const savedAdvice = localStorage.getItem('pda_advice');
    const savedAuthor = localStorage.getItem('pda_advice_author');
    if (savedAdvice) {
        currentAdvice.value = savedAdvice;
        adviceAuthor.value = savedAuthor || 'неизвестно';
    }
};

// Сохраняем совет в localStorage
const saveAdvice = (text, author) => {
    currentAdvice.value = text;
    adviceAuthor.value = author;
    localStorage.setItem('pda_advice', text);
    localStorage.setItem('pda_advice_author', author);
};

// Получаем состояние isOpen из PDA компонента через provide/inject
const isPDAOpen = inject('isPDAOpen', ref(false));

// Следим за закрытием КПК и сбрасываем навигацию
watch(isPDAOpen, (newValue) => {
    if (!newValue) {
        // КПК закрылся - сбрасываем навигацию
        resetNavigation();
    }
});

// Сбрасываем innerNavigationIndex при смене выбранного пункта меню
watch(selectedMenuId, (newValue) => {
    if (newValue) {
        innerNavigationIndex.value = 0;
    }
});

const handleNavigation = (direction) => {
    // Если элемент меню выбран, управляем навигацией внутри него
    if (selectedMenuId.value) {
        if (direction === 'up') {
            // Навигация вверх внутри выбранного элемента
            // Передаем событие в слот content через emit или через состояние
            innerNavigationIndex.value = Math.max(0, innerNavigationIndex.value - 1);
        } else if (direction === 'down') {
            // Навигация вниз внутри выбранного элемента
            innerNavigationIndex.value = innerNavigationIndex.value + 1;
        } else if (direction === 'left') {
            // Возврат к навигации по меню
            selectedMenuId.value = null;
            innerNavigationIndex.value = 0;
        }
        // right внутри выбранного элемента обрабатывается в слоте content
        return;
    }

    // Навигация по меню (когда элемент не выбран)
    const currentIndex = menuItems.value.findIndex(item => item.id === activeMenuId.value);

    if (direction === 'up') {
        const newIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.value.length - 1;
        activeMenuId.value = menuItems.value[newIndex].id;
    } else if (direction === 'down') {
        const newIndex = currentIndex < menuItems.value.length - 1 ? currentIndex + 1 : 0;
        activeMenuId.value = menuItems.value[newIndex].id;
    } else if (direction === 'right') {
        selectedMenuId.value = activeMenuId.value;
        innerNavigationIndex.value = 0;
    }
};

const resetNavigation = () => {
    selectedMenuId.value = null;
    innerNavigationIndex.value = 0;
    activeMenuId.value = 'tasks';
};

onMounted(() => {
    // Загружаем сохраненный совет
    loadAdvice();

    socket.value = io(SOCKET_CONFIG.url, SOCKET_CONFIG.options);
    socket.value.on('navigate', handleNavigation);
    socket.value.on('twitchCommand', (data) => {
        // Обработка команды от Twitch
        if (data.command === 'test') {
            // Тестовая команда
        } else if (data.command === 'advice') {
            // Обработка команды !совет
            saveAdvice(data.message, data.username);
        }
    });
});

onBeforeUnmount(() => {
    if (socket.value) {
        socket.value.off('navigate', handleNavigation);
        socket.value.off('twitchCommand');
        socket.value.disconnect();
    }
});
</script>

<style scoped>
/* Все стили мигрированы на Tailwind CSS */
</style>
