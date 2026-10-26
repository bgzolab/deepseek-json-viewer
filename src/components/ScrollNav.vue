<script setup lang="ts">
import { ref, watch } from 'vue'
import { t } from '../lib/i18n'
import type { ScrollNavItem } from '../lib/scrollNav'

const props = defineProps<{
  items: ScrollNavItem[]
  activeId: string
}>()

const emit = defineEmits<{
  select: [index: number]
}>()

const listEl = ref<HTMLElement | null>(null)

watch(
  () => props.activeId,
  () => {
    listEl.value
      ?.querySelector<HTMLElement>('.scroll-nav-item.is-active')
      ?.scrollIntoView({ block: 'nearest' })
  },
  { flush: 'post' },
)

function itemTitle(item: ScrollNavItem): string {
  return item.title || t('message.empty')
}
</script>

<template>
  <nav
    v-if="items.length > 1"
    class="scroll-nav"
    :aria-label="t('nav.aria')"
  >
    <div class="scroll-nav-bg" aria-hidden="true" />
    <div class="scroll-nav-panel">
      <div ref="listEl" class="scroll-nav-list">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="scroll-nav-item"
          :class="{ 'is-active': item.id === activeId }"
          :aria-current="item.id === activeId ? 'location' : undefined"
          :title="itemTitle(item)"
          @click="emit('select', item.index)"
        >
          <span class="scroll-nav-title">{{ itemTitle(item) }}</span>
          <span class="scroll-nav-indicator" aria-hidden="true">
            <span class="scroll-nav-line" />
          </span>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.scroll-nav {
  position: fixed;
  top: 50%;
  right: 16px;
  z-index: 5;
  display: flex;
  align-items: center;
  width: 34px;
  height: 300px;
  border-radius: 8px;
  transform: translateY(-50%);
  transition: all 0.2s;
  user-select: none;
}

.scroll-nav-bg {
  position: absolute;
  top: 50%;
  right: 0;
  z-index: -1;
  width: 34px;
  height: calc(100% - 8px);
  max-height: calc(100% - 8px);
  border-radius: 16px;
  background: var(--scroll-nav-bg);
  backdrop-filter: blur(5px);
  transform: translateY(-50%);
}

.scroll-nav-panel {
  position: absolute;
  top: 50%;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: fit-content;
  max-width: min(480px, calc(100vw - 80px));
  max-height: 100%;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 16px;
  pointer-events: none;
  transform: translateY(-50%);
  transition:
    background 0.2s,
    box-shadow 0.2s;
}

.scroll-nav:hover .scroll-nav-panel,
.scroll-nav:focus-within .scroll-nav-panel {
  border-color: var(--border);
  background: var(--scroll-nav-panel);
  box-shadow: var(--shadow-md);
  pointer-events: auto;
}

.scroll-nav-list {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-height: 250px;
  padding: 15px 24px 15px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.scroll-nav-list::-webkit-scrollbar {
  display: none;
}

.scroll-nav-item {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: flex-end;
  width: calc(100% - 6px);
  min-width: 0;
  height: 30px;
  margin-right: 8px;
  padding: 0;
  color: var(--text-tertiary);
  line-height: 20px;
  cursor: pointer;
  scroll-margin-block: 15px;
}

.scroll-nav-title {
  min-width: 0;
  margin-right: 12px;
  overflow: hidden;
  font-size: 13px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0;
  transition:
    opacity 0.1s,
    color 0.2s;
}

.scroll-nav:hover .scroll-nav-title,
.scroll-nav:focus-within .scroll-nav-title {
  opacity: 1;
}

.scroll-nav-item:hover {
  color: var(--text);
}

.scroll-nav-item.is-active .scroll-nav-title {
  color: var(--brand);
  font-weight: 500;
}

.scroll-nav-indicator {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 20px;
}

.scroll-nav-line {
  width: 8px;
  height: 2px;
  flex: none;
  border-radius: 4px;
  background: var(--border);
  transition: background-color 0.2s;
}

.scroll-nav-item:hover .scroll-nav-line {
  background: var(--text);
}

.scroll-nav-item.is-active .scroll-nav-line {
  background: var(--brand);
  transform: scale(1.5);
}

@media (max-width: 767px), (hover: none) {
  .scroll-nav {
    display: none;
  }
}
</style>
