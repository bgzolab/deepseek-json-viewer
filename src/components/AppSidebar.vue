<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { StoredConversation } from '../types/chat'
import { avatarUrl } from '../lib/assets'
import { relativeGroup } from '../lib/time'
import { useChatStore } from '../stores/chatStore'
import AppIcon from './AppIcon.vue'
import ConversationListItem from './ConversationListItem.vue'

const emit = defineEmits<{
  import: []
  'request-clear': []
  'request-delete': [id: string]
}>()

const store = useChatStore()
const searchInput = ref<HTMLInputElement | null>(null)
const searchOpen = ref(false)

const groups = computed<Array<{ label: string; items: StoredConversation[] }>>(() => {
  const conversations = store.visibleConversations.value
  if (store.normalizedQuery.value) {
    return conversations.length > 0 ? [{ label: '搜索结果', items: conversations }] : []
  }

  const buckets = new Map<string, StoredConversation[]>()
  for (const conversation of conversations) {
    const label = relativeGroup(conversation)
    const bucket = buckets.get(label) ?? []
    bucket.push(conversation)
    buckets.set(label, bucket)
  }

  return ['今天', '昨天', '7 天内', '更早']
    .map((label) => ({ label, items: buckets.get(label) ?? [] }))
    .filter((group) => group.items.length > 0)
})

const resultCount = computed(() => store.searchResults.value.ordered.length)
const matchCount = computed(() => store.searchResults.value.totalMatches)

function matchCountFor(id: string): number {
  return store.searchResults.value.map.get(id)?.totalMatches ?? 0
}

function onQueryInput(event: Event): void {
  const target = event.target as HTMLInputElement
  store.setQuery(target.value)
}

function clearSearch(close = false): void {
  store.clearQuery()
  if (close) {
    searchOpen.value = false
    searchInput.value?.blur()
  } else {
    searchInput.value?.focus()
  }
}

function closeSidebar(): void {
  if (window.matchMedia('(max-width: 860px)').matches) {
    store.setMobileSidebarOpen(false)
  } else {
    store.toggleSidebar()
  }
}

function onSearchKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    clearSearch(true)
  }
}

async function focusSearch(): Promise<void> {
  if (window.matchMedia('(max-width: 860px)').matches) {
    store.setMobileSidebarOpen(true)
  } else if (store.state.sidebarCollapsed) {
    store.toggleSidebar()
  }
  searchOpen.value = true
  await nextTick()
  searchInput.value?.focus()
  searchInput.value?.select()
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
    event.preventDefault()
    void focusSearch()
  }
}

watch(
  () => store.state.query,
  (query) => {
    if (query) return
    if (searchInput.value === document.activeElement) return
    searchOpen.value = false
  },
)

onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <aside class="sidebar" aria-label="会话列表">
    <header class="sidebar-top">
      <div class="brand-row">
        <img class="brand-avatar" :src="avatarUrl" alt="DeepSeek 助手头像" />
        <div class="brand-copy">
          <span class="brand-word">deepseek</span>
          <span class="brand-sub">对话预览</span>
        </div>
        <div class="top-actions">
          <button
            type="button"
            class="icon-button top-action"
            :class="{ 'is-active': searchOpen || store.state.query }"
            aria-label="搜索"
            title="搜索（⌘K）"
            @click="focusSearch"
          >
            <AppIcon name="search" :size="16" />
          </button>
          <button
            type="button"
            class="icon-button top-action sidebar-collapse"
            aria-label="收起侧边栏"
            title="收起侧边栏"
            @click="store.toggleSidebar"
          >
            <AppIcon name="sidebar" :size="16" />
          </button>
          <button
            type="button"
            class="icon-button top-action sidebar-close"
            aria-label="关闭侧边栏"
            @click="closeSidebar"
          >
            <AppIcon name="x" :size="17" />
          </button>
        </div>
      </div>

      <button type="button" class="new-chat-button" @click="emit('import')">
        <AppIcon name="plus" :size="16" />
        <span>导入聊天记录</span>
      </button>

      <Transition name="search-field">
        <div v-if="searchOpen || store.state.query" class="search-wrap">
          <AppIcon name="search" :size="14" class="search-icon" />
          <input
            ref="searchInput"
            type="search"
            class="search-input"
            placeholder="搜索会话和消息"
            aria-label="搜索会话和消息"
            autocomplete="off"
            spellcheck="false"
            :value="store.state.query"
            @input="onQueryInput"
            @keydown="onSearchKeydown"
          />
          <button
            type="button"
            class="search-clear"
            aria-label="关闭搜索"
            @click="clearSearch(true)"
          >
            <AppIcon name="x" :size="13" />
          </button>
        </div>
      </Transition>

      <p v-if="store.normalizedQuery.value" class="search-summary">
        <template v-if="resultCount > 0">
          {{ resultCount }} 个会话 · {{ matchCount }} 处匹配
        </template>
        <template v-else>没有找到匹配内容</template>
      </p>
    </header>

    <div class="conversation-scroll">
      <nav v-if="groups.length > 0" class="conversation-groups" aria-label="会话">
        <section v-for="group in groups" :key="group.label" class="conversation-group">
          <h2 class="group-label">{{ group.label }}</h2>
          <div class="conversation-list">
            <ConversationListItem
              v-for="conversation in group.items"
              :key="conversation.id"
              :conversation="conversation"
              :active="conversation.id === store.state.selectedId"
              :query="store.state.query.trim()"
              :match-count="matchCountFor(conversation.id)"
              @select="store.selectConversation"
              @delete="emit('request-delete', $event)"
            />
          </div>
        </section>
      </nav>

      <div v-else-if="store.normalizedQuery.value" class="list-empty">
        <strong>没有找到相关会话</strong>
        <p>换一个关键词，或清空搜索后浏览全部记录。</p>
        <button type="button" class="text-action" @click="clearSearch()">清空搜索</button>
      </div>

      <div v-else class="list-empty">
        <strong>还没有会话</strong>
        <p>导入 DeepSeek 导出的 JSON 文件后，会话会显示在这里。</p>
        <button type="button" class="text-action" @click="emit('import')">导入文件</button>
      </div>
    </div>

    <footer class="sidebar-footer">
      <div class="storage-row" title="数据仅保存在当前浏览器的 IndexedDB 中">
        <span class="storage-icon"><AppIcon name="database" :size="16" /></span>
        <div class="storage-copy">
          <span class="storage-title">本地缓存</span>
          <span class="storage-meta">
            {{ store.state.conversations.length }} 个会话 · {{ store.totalMessages.value }} 条消息
          </span>
        </div>
        <button
          type="button"
          class="clear-button"
          :disabled="!store.hasConversations.value"
          @click="emit('request-clear')"
        >
          清空
        </button>
      </div>
    </footer>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-right: 1px solid var(--border-subtle);
  background: var(--bg-sidebar);
}

.sidebar-top {
  flex: none;
  padding: 6px 12px 0;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 50px;
  padding: 10px 2px 8px 4px;
  margin-bottom: 12px;
}

.brand-avatar {
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 50%;
  background: #111;
  object-fit: cover;
}

.brand-copy {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  flex: 1;
  white-space: nowrap;
}

.brand-word {
  color: var(--brand);
  font-size: 19px;
  font-weight: 600;
  line-height: 23px;
  letter-spacing: -0.03em;
}

.brand-sub {
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 400;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
  margin-left: auto;
}

.top-action {
  width: 30px;
  height: 30px;
  border-radius: 8px;
}

.top-action.is-active {
  background: var(--bg-hover);
  color: var(--text);
}

.sidebar-close {
  display: none;
}

.new-chat-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(103, 158, 254, 0);
  border-radius: 100px;
  background: var(--bg-surface);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  box-shadow:
    0 -2px 2px rgba(72, 104, 178, 0.04),
    0 1px 2px rgba(72, 104, 178, 0.04),
    0 2px 8px rgba(72, 104, 178, 0.04);
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.new-chat-button:hover {
  border-color: var(--border);
  background: #fcfcfd;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  margin-top: 9px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.search-wrap:hover {
  background: var(--bg-hover);
}

.search-wrap:focus-within {
  border-color: var(--border);
  background: var(--bg-surface);
}

.search-icon {
  flex: none;
  color: var(--text-tertiary);
}

.search-input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
}

.search-input::placeholder {
  color: var(--text-caption);
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 5px;
  color: var(--text-tertiary);
}

.search-clear:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.search-summary {
  margin: 3px 10px 0;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 18px;
}

.search-field-enter-active,
.search-field-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.search-field-enter-from,
.search-field-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

.conversation-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 18px 12px 12px;
  overscroll-behavior: contain;
}

.conversation-group + .conversation-group {
  margin-top: 16px;
}

.group-label {
  position: sticky;
  top: 0;
  z-index: 2;
  margin: 0;
  padding: 2px 10px;
  background: var(--bg-sidebar);
  color: var(--text-tertiary);
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 54px;
  padding: 0 18px;
  text-align: center;
}

.list-empty strong {
  font-size: 13px;
  font-weight: 500;
}

.list-empty p {
  margin: 5px 0 9px;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.text-action {
  padding: 3px 6px;
  border-radius: 6px;
  color: var(--brand);
  font-size: 12px;
}

.text-action:hover {
  background: var(--brand-soft);
}

.sidebar-footer {
  flex: none;
  padding: 0 12px 10px;
}

.storage-row {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 6px 8px 6px 6px;
  border-radius: 12px;
  transition: background-color var(--transition-fast);
}

.storage-row:hover {
  background: var(--bg-hover);
}

.storage-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: 50%;
  background: var(--bg-hover);
  color: var(--text-tertiary);
}

.storage-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  line-height: 1.4;
}

.storage-title {
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
}

.storage-meta {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-button {
  flex: none;
  padding: 4px 7px;
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.clear-button:hover:not(:disabled) {
  background: var(--danger-soft);
  color: var(--danger);
}

.clear-button:disabled {
  opacity: 0.45;
}

@media (max-width: 860px) {
  .sidebar-close {
    display: flex;
  }

  .sidebar-collapse {
    display: none;
  }

  .sidebar {
    box-shadow: var(--shadow-md);
  }
}
</style>
