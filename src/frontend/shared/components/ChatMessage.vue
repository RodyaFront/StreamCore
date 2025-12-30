<template>
  <div
    class="chat-message-wrapper"
  >
    <div
      class="chat-message inline-flex flex-col items-start gap-1 rounded-xl"
      :class="{ 'p-6 pt-8 rounded-2xl border-2 border-amber-400 relative': isFirstMessage }"
    >
      <div v-if="isFirstMessage" class="text-amber-400 text-xs absolute top-2 left-2 text-shadow-xl font-medium">Впервые с нами!</div>
      <Sparkles v-if="isFirstMessage" :size="16" color="#fbbf24" class="absolute top-2 right-2"/>
      <div
        class="flex items-center gap-1.5 shrink-0 px-2 pr-1 py-1 text-white rounded-full -mb-2 -ml-2 z-2 shadow-lg"
        :style="{
          transform: `rotate(${randomRotation}deg)`,
          backgroundColor: randomBackgroundColor,
          border: `2px solid ${borderColor}`,
          backgroundImage: `url(${panelBgGrass})`,
          backgroundSize: '140%',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          boxShadow: `0 0 24px 4px ${borderColor}`
        }"
      >
        <Star v-if="message.isSubscriber" color=white :size="18" :stroke-width="1" :fill="getUsernameColor(message.username)" />
        <span v-else class="w-3 h-3 ring ring-white rounded-full" :style="{ backgroundColor: getUsernameColor(message.username) }"></span>
        <span class="font-bold pr-2 text-sm shrink-0">
          {{ message.displayName }}
        </span>
        <span
          v-if="message.level"
          class="text-xs -ml-2 font-medium px-2 py-1 rounded-full text-white"
          :style="{ backgroundColor: levelColor }"
        >
          {{ message.level }} ур.
        </span>
        <span
          v-if="message.isSubscriber"
          class="text-xs -ml-1 font-medium px-2 py-1 rounded-full text-white bg-green-700"
        >
          Спонсор
        </span>
      </div>
      <div class="relative message-content__wrapper">
        <div class="max-w-124 message-content px-3 py-3 bg-white rounded-xl" v-html="displayMessage"></div>
        <img v-if="message.username === 'kitkate_e'" :src="KitkateGoat" alt="" aria-hidden="true" class="w-12 h-12 text-shadow-xl absolute top-[-24px] right-[-14px]" />
        <img
          v-if="message.isSubscriber"
          :src="TreeLvl3"
          alt=""
          aria-hidden="true"
          class="w-10 h-10 absolute -right-6 -bottom-3 rotate-18"
        />
        <svg width="21" height="22" viewBox="0 0 21 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 0C17.9155 9.66934 12.0808 15.555 0 13.3829C6.0661 22.0713 12.7234 24.2434 21 19.654V0Z"
            fill="white"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChatMessage } from '@shared/types/chat';
import TreeLvl3 from '@shared/assets/images/tree_lvl3.png';
import panelBgGrass from '@shared/assets/images/panel_bg_grass.png';
import { getLevelColor } from '@shared/utils/levelColors';
import { useUsernameColor } from '@shared/composables/useUsernameColor';
import tinycolor from 'tinycolor2';
import { Sparkles, Star } from 'lucide-vue-next';
import KitkateGoat from '@shared/assets/images/kitkate_goat.png';

const props = defineProps<{
  message: ChatMessage;
}>();

const { getUsernameColor } = useUsernameColor();

const randomRotation = ref(Math.random() * 4 - 2);

const backgroundColors = ['#01241E', '#152522'];
const randomBackgroundColor = ref(backgroundColors[Math.floor(Math.random() * backgroundColors.length)]);

const displayMessage = computed(() => {
  return props.message.parsedMessage || props.message.message;
});

const levelColor = computed(() => getLevelColor(props.message.level));

const borderColor = computed(() => {
  const color = getUsernameColor(props.message.username);
  return tinycolor(color).setAlpha(0.3).toRgbString();
});

const isFirstMessage = computed(() => {
  return props.message.isFirstMessage === true;
});
</script>

<style scoped>
.chat-message-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
  overflow: visible;
}

.chat-message {
  min-height: 1.5rem;
  position: relative;
  overflow: visible;
}

.tail::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 35%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 8px 8px 8px 0;
  border-color: transparent white transparent transparent;
}

.level-badge {
  background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%);
  color: white;
  box-shadow: 0 1px 2px rgba(147, 51, 234, 0.2);
}

.subscriber-badge {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  box-shadow: 0 1px 2px rgba(16, 185, 129, 0.2);
}

.message-content {
  word-wrap: break-word;
  line-height: 1.4;
}

.message-content :deep(.twitch-emote) {
  display: inline-block;
  vertical-align: middle;
  height: 1.5em;
  width: auto;
  margin: 0 0.1em;
}

.message-content__wrapper {
  svg {
    position: absolute;
    top: 45%;
    left: -16px;
    transform: translateY(-50%);
  }
}
</style>
