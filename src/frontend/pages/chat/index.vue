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

        <div v-if="true" class="px-4 py-3 bg-gray-900/80 border-t border-gray-700">
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
                <button
                    @click="sendTestMessage('firstMessage')"
                    class="px-3 py-1.5 text-xs bg-cyan-500/30 hover:bg-cyan-500/50 rounded border border-cyan-400/30 transition-colors text-white"
                >
                    Первое сообщение
                </button>
                <button
                    @click="sendTestMessage('withMentionAndLink')"
                    class="px-3 py-1.5 text-xs bg-teal-500/30 hover:bg-teal-500/50 rounded border border-teal-400/30 transition-colors text-white"
                >
                    Упоминание + Ссылка
                </button>
            </div>
            <div class="flex flex-wrap gap-2 mb-2">
                <span class="text-xs text-gray-400 self-center mr-2">Тест цветов уровней:</span>
                <button
                    v-for="levelConfig in levelTestConfigs"
                    :key="levelConfig.level"
                    @click="sendTestMessageWithLevel(levelConfig.level)"
                    class="px-3 py-1.5 text-xs rounded border transition-colors text-white hover:opacity-80"
                    :style="getButtonStyle(levelConfig.color)"
                >
                    Lv.{{ levelConfig.level }} ({{ levelConfig.name }})
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
import { LEVEL_COLOR_CHECKPOINTS } from '@shared/utils/levelColors';
import { getLevelCategory } from '@shared/utils/levelColors';

const { messages, addMessage, updateMessage, clearMessages, cleanup } = useChat({
    maxMessages: 100
});

const visibleMessages = computed(() => {
    return messages.value.filter(message => !message.isCommand);
});

const isConnected = ref(false);
const showDebugControls = ref(true);

const levelTestConfigs = computed(() => {
    return LEVEL_COLOR_CHECKPOINTS.map((checkpoint) => {
        const testLevel = checkpoint.maxLevel === Infinity
            ? 95
            : Math.floor((checkpoint.minLevel + checkpoint.maxLevel) / 2);
        return {
            level: testLevel,
            name: getLevelCategory(testLevel),
            color: checkpoint.color
        };
    });
});

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
          }
        : { r: 107, g: 114, b: 128 };
};

const getButtonStyle = (color: string) => {
    const rgb = hexToRgb(color);
    return {
        backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
        borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`
    };
};

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

        case 'firstMessage':
            addMessage({
                ...baseMessage,
                username: 'newuser',
                displayName: 'NewUser',
                message: 'Моё! 🎉',
                level: 1,
                isFirstMessage: true
            });
            break;

        case 'withMentionAndLink':
            const mentionLinkMessage = 'Привет @testuser! Проверь эту ссылку: https://www.twitch.tv/testuser очень интересный канал';
            // Форматируем сообщение для теста (в реальности это делается на backend)
            let parsedMentionLink = mentionLinkMessage
                .replace(/@(\w+)/g, '<span class="mention">@$1</span>')
                .replace(/(https?:\/\/[^\s<>"']+)/gi, (url) => {
                    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
                    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${displayUrl}</a>`;
                });
            addMessage({
                ...baseMessage,
                username: 'mentionuser',
                displayName: 'MentionUser',
                message: mentionLinkMessage,
                parsedMessage: parsedMentionLink,
                level: 15
            });
            break;

        default:
            addMessage(baseMessage);
    }
};

const sendTestMessageWithLevel = (level: number) => {
    const levelNames: Record<number, string> = {
        5: 'Серый',
        15: 'Синий',
        25: 'Голубой',
        35: 'Зелёный',
        45: 'Жёлтый',
        55: 'Оранжевый',
        65: 'Красный',
        75: 'Фиолетовый',
        85: 'Розовый',
        95: 'Золотой'
    };

    addMessage({
        id: generateMessageId(),
        username: `level${level}user`,
        displayName: `Level${level}User`,
        message: `Тестовое сообщение с уровнем ${level} (${levelNames[level] || 'Неизвестный'})`,
        timestamp: new Date().toISOString(),
        channel: '#test',
        isCommand: false,
        level: level
    });
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

