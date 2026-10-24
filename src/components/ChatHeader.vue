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
const desktopToggleVisible = computed(() => store.state.sidebarCollapsed)
</script>

<template>
  <header class="chat-header">
    <div class="header-left">
      <button
        type="button"
        class="icon-button sidebar-toggle"
        :class="{ 'is-desktop-visible': desktopToggleVisible }"
        aria-label="切换会话侧边栏"
        title="切换会话侧边栏"
        @click="emit('toggle-sidebar')"
      >
        <AppIcon name="sidebar" :size="17" class="desktop-icon" />
        <AppIcon name="menu" :size="18" class="mobile-icon" />
      </button>

      <div v-if="conversation" class="title-block">
        <h1 :title="conversation.title">
          <HighlightText :text="conversation.title || '未命名会话'" :query="store.state.query.trim()" />
        </h1>
        <div class="meta-row">
          <span v-if="conversation.model">{{ conversation.model }}</span>
          <span v-if="conversation.model" class="meta-separator">·</span>
          <span>{{ conversation.messages.length }} 条消息</span>
          <span v-if="conversation.createdAt" class="meta-extra">
            <span class="meta-separator">·</span>创建 {{ formatDateTime(conversation.createdAt) }}
          </span>
          <span v-if="conversation.updatedAt" class="meta-extra">
            <span class="meta-separator">·</span>更新 {{ formatDateTime(conversation.updatedAt) }}
          </span>
        </div>
      </div>

      <div v-else class="title-block">
        <h1>对话预览</h1>
        <div class="meta-row">
          <span>本地只读模式</span>
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
  padding: 0 14px 0 8px;
  background: var(--bg-surface);
}

.header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.sidebar-toggle {
  display: none;
  flex: none;
}

.sidebar-toggle.is-desktop-visible {
  display: flex;
}

.mobile-icon {
  display: none;
}

.title-block {
  min-width: 0;
  flex: 1;
  padding: 5px 8px;
  border-radius: 10px;
}

.title-block h1 {
  overflow: hidden;
  margin: 0;
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-row {
  display: flex;
  align-items: center;
  min-width: 0;
  margin-top: 1px;
  overflow: hidden;
  color: var(--text-caption);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

.meta-separator {
  margin: 0 5px;
  color: #d0d3d8;
}

.meta-extra {
  overflow: hidden;
  text-overflow: ellipsis;
}

.match-nav {
  display: flex;
  align-items: center;
  gap: 1px;
  flex: none;
}

.match-counter {
  min-width: 52px;
  padding: 0 5px;
  color: var(--text-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: center;
  white-space: nowrap;
}

.title-match-label {
  padding: 0 5px;
  color: var(--text-tertiary);
  font-size: 12px;
  white-space: nowrap;
}

.close-search {
  margin-left: 5px;
}

@media (max-width: 860px) {
  .sidebar-toggle {
    display: flex;
  }

  .desktop-icon {
    display: none;
  }

  .mobile-icon {
    display: block;
  }
}

@media (max-width: 640px) {
  .chat-header {
    padding: 0 8px 0 4px;
  }

  .title-block {
    padding-left: 6px;
  }

  .title-block h1 {
    font-size: 14px;
  }

  .meta-extra {
    display: none;
  }

  .match-counter {
    min-width: 40px;
    font-size: 11px;
  }
}
</style>
