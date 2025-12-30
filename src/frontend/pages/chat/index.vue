<template>
    <div class="h-screen w-screen bg-black flex flex-col">
        <div
            class="flex-1 overflow-hidden p-4 space-y-1 flex flex-col justify-end"
        >
            <transition-group name="chat-message" tag="div" class="flex flex-col gap-3">
                <ChatMessage
                    v-for="message in visibleMessages"
                    :key="message.id"
                    :message="message"
                />
            </transition-group>
        </div>

        <div v-if="showDebugControls" class="px-4 py-3 bg-gray-900/80 border-t border-gray-700">
            <div class="flex flex-wrap gap-2 mb-2">
                <button
                    @click="sendTestMessage('basic')"
                    class="px-3 py-1.5 text-xs bg-blue-500/30 hover:bg-blue-500/50 rounded border border-blue-400/30 transition-colors text-white"
                >
                    Базовое сообщение
                </button>
                <button
                    @click="sendTestMessage('withLevel')"
                    class="px-3 py-1.5 text-xs bg-purple-500/30 hover:bg-purple-500/50 rounded border border-purple-400/30 transition-colors text-white"
                >
                    С уровнем (Lv.5)
                </button>
                <button
                    @click="sendTestMessage('withSub')"
                    class="px-3 py-1.5 text-xs bg-green-500/30 hover:bg-green-500/50 rounded border border-green-400/30 transition-colors text-white"
                >
                    С подпиской
                </button>
                <button
                    @click="sendTestMessage('withBoth')"
                    class="px-3 py-1.5 text-xs bg-yellow-500/30 hover:bg-yellow-500/50 rounded border border-yellow-400/30 transition-colors text-white"
                >
                    Уровень + Подписка
                </button>
                <button
                    @click="sendTestMessage('highLevel')"
                    class="px-3 py-1.5 text-xs bg-indigo-500/30 hover:bg-indigo-500/50 rounded border border-indigo-400/30 transition-colors text-white"
                >
                    Высокий уровень (Lv.50)
                </button>
                <button
                    @click="sendTestMessage('longMessage')"
                    class="px-3 py-1.5 text-xs bg-orange-500/30 hover:bg-orange-500/50 rounded border border-orange-400/30 transition-colors text-white"
                >
                    Длинное сообщение
                </button>
                <button
                    @click="sendTestMessage('command')"
                    class="px-3 py-1.5 text-xs bg-red-500/30 hover:bg-red-500/50 rounded border border-red-400/30 transition-colors text-white"
                >
                    Команда (!test)
                </button>
                <button
                    @click="sendTestMessage('enrichment')"
                    class="px-3 py-1.5 text-xs bg-pink-500/30 hover:bg-pink-500/50 rounded border border-pink-400/30 transition-colors text-white"
                >
                    Тест обогащения
                </button>
            </div>
            <div class="flex items-center gap-2">
                <button
                    @click="showDebugControls = !showDebugControls"
                    class="px-3 py-1 text-xs bg-gray-600/30 hover:bg-gray-600/50 rounded border border-gray-500/30 transition-colors text-gray-300"
                >
                    {{ showDebugControls ? 'Скрыть' : 'Показать' }} дебаг
                </button>
                <button
                    @click="clearMessages"
                    class="px-3 py-1 text-xs bg-red-600/30 hover:bg-red-600/50 rounded border border-red-500/30 transition-colors text-red-300"
                >
                    Очистить чат
                </button>
            </div>
        </div>

        <div v-if="!isConnected" class="px-4 py-2 bg-red-500/20 border-t border-red-500/30">
            <div class="flex items-center gap-2 text-xs text-red-400">
                <div class="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Отключено от сервера</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import ChatMessage from '@shared/components/ChatMessage.vue';
import { useChat } from '@shared/composables/useChat';
import { useSocketConnection } from '@shared/composables/useSocketConnection';
import type { ChatMessageEvent } from '@shared/types/chat';

const { messages, addMessage, updateMessage, clearMessages, cleanup } = useChat({
    maxMessages: 100
});

const visibleMessages = computed(() => {
    return messages.value.filter(message => !message.isCommand);
});

const isConnected = ref(false);
const showDebugControls = ref(true);

const generateMessageId = () => {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const sendTestMessage = (type: string) => {
    const baseMessage: ChatMessageEvent = {
        id: generateMessageId(),
        username: 'testuser',
        displayName: 'TestUser',
        message: 'Тестовое сообщение',
        timestamp: new Date().toISOString(),
        channel: '#test',
        isCommand: false
    };

    switch (type) {
        case 'basic':
            addMessage({
                ...baseMessage,
                username: 'basicuser',
                displayName: 'BasicUser',
                message: 'Обычное сообщение без дополнительных данных'
            });
            break;

        case 'withLevel':
            addMessage({
                ...baseMessage,
                username: 'leveluser',
                displayName: 'LevelUser',
                message: 'Сообщение от пользователя с уровнем',
                level: 5
            });
            break;

        case 'withSub':
            addMessage({
                ...baseMessage,
                username: 'subuser',
                displayName: 'SubUser',
                message: 'Сообщение от подписчика',
                isSubscriber: true
            });
            break;

        case 'withBoth':
            addMessage({
                ...baseMessage,
                username: 'vipuser',
                displayName: 'VIPUser',
                message: 'Сообщение от подписчика с высоким уровнем',
                level: 25,
                isSubscriber: true
            });
            break;

        case 'highLevel':
            addMessage({
                ...baseMessage,
                username: 'highlevel',
                displayName: 'HighLevel',
                message: 'Сообщение от пользователя с очень высоким уровнем',
                level: 50
            });
            break;

        case 'longMessage':
            addMessage({
                ...baseMessage,
                username: 'longuser',
                displayName: 'LongUser',
                message: 'Это очень длинное сообщение, которое должно проверить, как компонент обрабатывает длинный текст. Оно содержит много слов и должно корректно переноситься на новую строку, не выходя за границы контейнера.'
            });
            break;

        case 'command':
            addMessage({
                ...baseMessage,
                username: 'commanduser',
                displayName: 'CommandUser',
                message: '!test команда для тестирования',
                isCommand: true
            });
            break;

        case 'enrichment':
            // Отправляем сообщение без подписки, затем обогащаем
            const messageId = generateMessageId();
            addMessage({
                ...baseMessage,
                id: messageId,
                username: 'enrichuser',
                displayName: 'EnrichUser',
                message: 'Сообщение, которое будет обогащено информацией о подписке',
                level: 10
            });
            // Симулируем обогащение через 1 секунду
            setTimeout(() => {
                updateMessage(messageId, { isSubscriber: true });
            }, 1000);
            break;

        default:
            addMessage(baseMessage);
    }
};

useSocketConnection({
    onConnect: () => {
        isConnected.value = true;
        console.log('[Chat] Подключено к Socket.IO');
    },
    onDisconnect: () => {
        isConnected.value = false;
        console.log('[Chat] Отключено от Socket.IO');
    },
    onError: (error: Error) => {
        console.error('[Chat] Ошибка подключения:', error);
    },
    onValidationError: (event: string, data: unknown, error: string) => {
        console.error(`[Chat] Ошибка валидации события ${event}:`, error, data);
    },
    onChatMessage: (data: ChatMessageEvent) => {
        addMessage(data);
    },
    onChatMessageEnriched: (data: { messageId: string; isSubscriber: boolean }) => {
        updateMessage(data.messageId, { isSubscriber: data.isSubscriber });
    }
});

onBeforeUnmount(() => {
    cleanup();
});
</script>

<style scoped>
.chat-message-enter-active {
    transition: all 0.3s ease-out;
}

.chat-message-enter-from {
    opacity: 0;
    transform: translateY(10px) scale(0.95);
}

.chat-message-enter-to {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.chat-message-leave-active {
    transition: opacity 0.2s ease-in;
}

.chat-message-leave-from {
    opacity: 1;
}

.chat-message-leave-to {
    opacity: 0;
}

.chat-message-move {
    transition: transform 0.3s ease;
}
</style>

