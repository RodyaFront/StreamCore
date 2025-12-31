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
        class="flex items-center gap-1.5 shrink-0 pl-3 pr-1 py-1 text-white rounded-full -mb-2 -ml-2 z-2 shadow-lg"
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
        <span class="font-bold pr-2 text-sm shrink-0">
          {{ message.displayName }}
        </span>
        <span
          v-if="message.level"
          class="level-badge text-xs -ml-2 font-medium px-2 py-1 rounded-full text-white relative isolation-isolate"
          :class="{ 'has-glow-effect': message.level >= 45 }"
          :style="levelBadgeStyle"
        >
          <span v-if="message.level >= 45" class="level-badge-shimmer"></span>
          <span class="level-badge-text relative z-10">{{ message.level }} ур.</span>
        </span>
        <span
          v-if="message.isSubscriber"
          class="flex text-xs -ml-0.5 font-medium px-2 py-1 rounded-full text-whit"
          :style="subscriberBadgeStyle"
        >
          Бро
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


const subscriberBadgeStyle = computed(() => {
  if (!props.message.isSubscriber) {
    return {};
  }

  const baseColor = tinycolor('#10b981');

  const darkenedColor = baseColor
    .clone()
    .spin(-100)
    .darken(5)
    .toRgbString();

  // Градиент от левого нижнего угла к правому верхнему
  const gradient = `linear-gradient(to top right, ${baseColor.toRgbString()}, ${darkenedColor})`;

  // Бордер с прозрачностью 0.5 от основного цвета
  const borderColor = baseColor.setAlpha(0.5).lighten(15).toRgbString();

  return {
    background: gradient,
    border: `1px dashed ${borderColor}`
  };
});


const levelBadgeStyle = computed(() => {
  if (!props.message.level) {
    return {};
  }

  const baseColor = tinycolor(levelColor.value);
  const hsl = baseColor.toHsl();

  // Затемнённый цвет с немного смещённым оттенком для правого верхнего угла
  const darkenedColor = baseColor
    .clone()
    .spin(-50)
    .toRgbString();

  // Градиент от левого нижнего угла к правому верхнему
  const gradient = `linear-gradient(to top right, ${baseColor.toRgbString()}, ${darkenedColor})`;

  // Бордер с прозрачностью 0.5 от основного цвета
  const borderColor = baseColor.setAlpha(0.5).lighten(15).toRgbString();

  // Цвета для свечения (немного смещённые оттенки)
  const glowColor1 = baseColor.clone().spin(20).toHsl();
  const glowColor2 = baseColor.clone().spin(-20).toHsl();

  return {
    background: gradient,
    border: `1px dashed ${borderColor}`,
    '--glow-hue-1': `${Math.round(hsl.h)}deg`,
    '--glow-hue-2': `${Math.round(glowColor1.h)}deg`,
    '--glow-hue-3': `${Math.round(glowColor2.h)}deg`,
    '--glow-sat-1': `${Math.round(hsl.s * 100)}%`,
    '--glow-lit-1': `${Math.round(hsl.l * 100)}%`,
    '--glow-sat-2': `${Math.round(glowColor1.s * 100)}%`,
    '--glow-lit-2': `${Math.round(glowColor1.l * 100)}%`,
    '--glow-sat-3': `${Math.round(glowColor2.s * 100)}%`,
    '--glow-lit-3': `${Math.round(glowColor2.l * 100)}%`
  };
});

const borderColor = computed(() => {
  const color = getUsernameColor(props.message.username);
  return tinycolor(color).setAlpha(0.3).toRgbString();
});

const isFirstMessage = computed(() => {
  return props.message.isFirstMessage === true;
});
</script>

<style scoped>
@property --mask {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

@keyframes level-badge-spin {
  0% {
    --mask: 0deg;
  }
  100% {
    --mask: 360deg;
  }
}

.level-badge-shimmer {
  position: absolute;
  inset: -8px;
  border-radius: inherit;
  mix-blend-mode: plus-lighter;
  pointer-events: none;
  opacity: 1;
  mask-image: conic-gradient(
    from var(--mask, 0deg),
    transparent 0%,
    transparent 10%,
    black 36%,
    black 45%,
    transparent 50%,
    transparent 60%,
    black 85%,
    black 95%,
    transparent 100%
  );
  mask-size: cover;
  animation: level-badge-spin 3s linear infinite;
}

.level-badge-shimmer::before,
.level-badge-shimmer::after {
  content: "";
  border-radius: inherit;
  position: absolute;
  inset: 8px;
}

.level-badge-shimmer::before {
  box-shadow:
    0 0 3px 2px hsl(var(--glow-hue-1) var(--glow-sat-1) var(--glow-lit-1) / 0.8),
    0 0 7px 4px hsl(var(--glow-hue-1) var(--glow-sat-1) var(--glow-lit-1) / 0.6),
    0 0 13px 8px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.4),
    0 0 22px 6px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.2);
  z-index: -1;
}

.level-badge-shimmer::after {
  box-shadow:
    inset 0 0 0 1px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.9),
    inset 0 0 3px 1px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.7),
    inset 0 0 9px 1px hsl(var(--glow-hue-2) var(--glow-sat-2) var(--glow-lit-2) / 0.5);
  z-index: 2;
}
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
  word-break: break-word;
  line-height: 1.4;
}

.message-content :deep(.twitch-emote) {
  display: inline-block;
  vertical-align: middle;
  height: 1.5em;
  width: auto;
  margin: 0 0.1em;
}

.message-content :deep(.mention) {
  color: #60a5fa;
  font-weight: 600;
  text-shadow: 0 0 2px rgba(96, 165, 250, 0.5);
}

.message-content :deep(.message-link) {
  color: #3b82f6;
  text-decoration: underline;
  text-decoration-color: rgba(59, 130, 246, 0.5);
  word-break: break-all;
}

.message-content :deep(.message-link:hover) {
  color: #2563eb;
  text-decoration-color: rgba(37, 99, 235, 0.8);
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
