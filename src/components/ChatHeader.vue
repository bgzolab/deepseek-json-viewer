<script setup lang="ts">
import { computed } from 'vue'
import type { StoredConversation } from '../types/chat'
import { formatDateTime } from '../lib/time'
import { useChatStore } from '../stores/chatStore'
import AppIcon from './AppIcon.vue'
import HighlightText from './HighlightText.vue'

defineProps<{
  conversation: StoredConversation | null
}>()

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const store = useChatStore()

const searchResult = computed(() => store.currentSearchResult.value)
const matchTotal = computed(() => store.currentMatchTotal.value)
const showSearchNav = computed(
  () => Boolean(store.normalizedQuery.value) && Boolean(searchResult.value),
)
const activeMatchNumber = computed(() => {
  if (matchTotal.value === 0) return 0
  return Math.min(store.state.activeMatch + 1, matchTotal.value)
})
</script>

<template>
  <header class="chat-header">
    <div class="header-left">
      <button
        type="button"
        class="icon-button sidebar-toggle"
        aria-label="切换会话侧边栏"
        title="切换会话侧边栏"
        @click="emit('toggle-sidebar')"
      >
        <AppIcon name="sidebar" :size="18" class="desktop-icon" />
        <AppIcon name="menu" :size="18" class="mobile-icon" />
      </button>

      <div v-if="conversation" class="title-block">
        <h1 :title="conversation.title">
          <HighlightText :text="conversation.title || '未命名会话'" :query="store.state.query.trim()" />
        </h1>
        <div class="meta-row">
          <span v-if="conversation.model" class="meta-chip model-chip">
            <AppIcon name="sparkles" :size="11" />
            {{ conversation.model }}
          </span>
          <span class="meta-chip">
            <AppIcon name="message" :size="11" />
            {{ conversation.messages.length }} 条消息
          </span>
          <span v-if="conversation.createdAt" class="meta-chip meta-time">
            <AppIcon name="calendar" :size="11" />
            创建 {{ formatDateTime(conversation.createdAt) }}
          </span>
          <span v-if="conversation.updatedAt" class="meta-chip meta-time">
            <AppIcon name="clock" :size="11" />
            更新 {{ formatDateTime(conversation.updatedAt) }}
          </span>
        </div>
      </div>

      <div v-else class="title-block">
        <h1>对话预览</h1>
        <div class="meta-row">
          <span class="meta-chip">
            <AppIcon name="shield" :size="11" />
            本地只读模式
          </span>
        </div>
      </div>
    </div>

    <div v-if="showSearchNav" class="match-nav" aria-label="搜索匹配导航">
      <template v-if="matchTotal > 0">
        <span class="match-counter">{{ activeMatchNumber }} / {{ matchTotal }}</span>
        <button
          type="button"
          class="icon-button is-small"
          aria-label="上一处匹配"
          title="上一处匹配"
          @click="store.previousMatch"
        >
          <AppIcon name="chevron-up" :size="15" />
        </button>
        <button
          type="button"
          class="icon-button is-small"
          aria-label="下一处匹配"
          title="下一处匹配"
          @click="store.nextMatch"
        >
          <AppIcon name="chevron-down" :size="15" />
        </button>
      </template>
      <span v-else class="title-match-label">标题匹配</span>
      <button
        type="button"
        class="icon-button is-small close-search"
        aria-label="退出搜索"
        title="退出搜索"
        @click="store.clearQuery"
      >
        <AppIcon name="x" :size="14" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.chat-header {
  position: relative;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: var(--header-height);
  flex: none;
  padding: 0 20px 0 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.sidebar-toggle {
  flex: none;
}

.mobile-icon {
  display: none;
}

.title-block {
  min-width: 0;
  flex: 1;
  padding: 5px 0;
}

.title-block h1 {
  overflow: hidden;
  margin: 0;
  color: #1d222c;
  font-size: 14.5px;
  font-weight: 610;
  line-height: 1.4;
  letter-spacing: -0.012em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-top: 3px;
  overflow: hidden;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  color: var(--text-tertiary);
  font-size: 9.5px;
  line-height: 1.4;
  white-space: nowrap;
}

.model-chip {
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--brand-soft);
  color: #5169c8;
  font-weight: 550;
}

.meta-time {
  overflow: hidden;
  text-overflow: ellipsis;
}

.match-nav {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: none;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--bg-muted);
}

.match-counter {
  min-width: 48px;
  padding: 0 5px;
  color: var(--text-secondary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
}

.title-match-label {
  padding: 0 5px;
  color: var(--text-tertiary);
  font-size: 10px;
  white-space: nowrap;
}

.close-search {
  width: 26px;
  height: 26px;
}

@media (max-width: 860px) {
  .desktop-icon {
    display: none;
  }

  .mobile-icon {
    display: block;
  }
}

@media (max-width: 640px) {
  .chat-header {
    min-height: 58px;
    padding: 0 10px 0 8px;
  }

  .header-left {
    gap: 6px;
  }

  .title-block h1 {
    font-size: 13.5px;
  }

  .meta-row {
    gap: 6px;
  }

  .meta-time {
    display: none;
  }

  .match-counter {
    min-width: 36px;
    font-size: 9.5px;
  }

  .match-nav {
    gap: 1px;
    padding: 3px;
  }
}
</style>
