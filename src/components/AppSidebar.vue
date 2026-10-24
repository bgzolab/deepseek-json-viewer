<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import type { StoredConversation } from '../types/chat'
import { relativeGroup } from '../lib/time'
import { useChatStore } from '../stores/chatStore'
import AppIcon from './AppIcon.vue'
import BrandMark from './BrandMark.vue'
import ConversationListItem from './ConversationListItem.vue'

const emit = defineEmits<{
  import: []
  'request-clear': []
  'request-delete': [id: string]
}>()

const store = useChatStore()
const searchInput = ref<HTMLInputElement | null>(null)

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

function clearSearch(): void {
  store.clearQuery()
  searchInput.value?.focus()
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
    if (store.state.query) {
      clearSearch()
    } else {
      searchInput.value?.blur()
    }
  }
}

async function focusSearch(): Promise<void> {
  if (window.matchMedia('(max-width: 860px)').matches) {
    store.setMobileSidebarOpen(true)
  } else if (store.state.sidebarCollapsed) {
    store.toggleSidebar()
  }
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

onMounted(() => document.addEventListener('keydown', onGlobalKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onGlobalKeydown))
</script>

<template>
  <aside class="sidebar" aria-label="会话列表">
    <header class="sidebar-header">
      <div class="brand-row">
        <BrandMark :size="36" />
        <div class="brand-copy">
          <div class="brand-title">
            对话预览
            <span class="local-badge">本地</span>
          </div>
          <div class="brand-subtitle">DEEPSEEK JSON VIEWER</div>
        </div>
        <button
          type="button"
          class="icon-button sidebar-collapse"
          aria-label="收起侧边栏"
          title="收起侧边栏"
          @click="store.toggleSidebar"
        >
          <AppIcon name="sidebar" :size="17" />
        </button>
        <button
          type="button"
          class="icon-button sidebar-close"
          aria-label="关闭侧边栏"
          @click="closeSidebar"
        >
          <AppIcon name="x" :size="18" />
        </button>
      </div>

      <button type="button" class="import-button" @click="emit('import')">
        <span class="import-icon"><AppIcon name="plus" :size="16" /></span>
        <span>导入 JSON 文件</span>
        <span class="import-hint">可多选</span>
      </button>

      <div class="search-wrap" :class="{ 'has-query': store.state.query }">
        <AppIcon name="search" :size="15" class="search-icon" />
        <input
          ref="searchInput"
          type="search"
          class="search-input"
          placeholder="搜索标题或消息内容"
          aria-label="搜索标题或消息内容"
          autocomplete="off"
          spellcheck="false"
          :value="store.state.query"
          @input="onQueryInput"
          @keydown="onSearchKeydown"
        />
        <button
          v-if="store.state.query"
          type="button"
          class="search-clear"
          aria-label="清空搜索"
          @click="clearSearch"
        >
          <AppIcon name="x" :size="13" />
        </button>
        <kbd v-else class="search-kbd">⌘ K</kbd>
      </div>

      <p v-if="store.normalizedQuery.value" class="search-summary">
        <template v-if="resultCount > 0">
          找到 <strong>{{ resultCount }}</strong> 个会话 · <strong>{{ matchCount }}</strong> 处匹配
        </template>
        <template v-else>没有找到匹配内容</template>
      </p>
    </header>

    <div class="conversation-scroll">
      <nav v-if="groups.length > 0" class="conversation-groups" aria-label="会话">
        <section v-for="group in groups" :key="group.label" class="conversation-group">
          <h2 class="group-label">
            {{ group.label }}
            <span>{{ group.items.length }}</span>
          </h2>
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
        <div class="list-empty-icon"><AppIcon name="search" :size="19" /></div>
        <strong>没有找到相关会话</strong>
        <p>换一个更短的关键词，或清空搜索后浏览全部记录。</p>
        <button type="button" class="btn btn-soft btn-sm" @click="clearSearch">清空搜索</button>
      </div>

      <div v-else class="list-empty">
        <div class="list-empty-icon"><AppIcon name="message" :size="19" /></div>
        <strong>还没有导入记录</strong>
        <p>选择一个 DeepSeek 导出的 JSON 文件，开始本地预览。</p>
        <button type="button" class="btn btn-soft btn-sm" @click="emit('import')">导入文件</button>
      </div>
    </div>

    <footer class="sidebar-footer">
      <div class="storage-card">
        <div class="storage-head">
          <span class="storage-icon"><AppIcon name="database" :size="15" /></span>
          <div>
            <strong>本地缓存</strong>
            <span>{{ store.state.conversations.length }} 个会话 · {{ store.totalMessages.value }} 条消息</span>
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
        <p class="privacy-note">
          <AppIcon name="shield" :size="11" />
          数据仅保存在当前浏览器
        </p>
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
  border-right: 1px solid var(--border);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.35), transparent 120px),
    var(--bg-sidebar);
}

.sidebar-header {
  flex: none;
  padding: 16px 13px 10px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 2px 16px 3px;
}

.brand-copy {
  min-width: 0;
  flex: 1;
}

.brand-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #202531;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.local-badge {
  padding: 1px 5px;
  border: 1px solid #dbe4ff;
  border-radius: 5px;
  background: var(--brand-soft);
  color: var(--brand-pressed);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.brand-subtitle {
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 8.5px;
  font-weight: 560;
  letter-spacing: 0.12em;
}

.sidebar-collapse {
  width: 30px;
  height: 30px;
}

.sidebar-close {
  display: none;
  width: 30px;
  height: 30px;
}

.import-button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid #dfe6fb;
  border-radius: 11px;
  background: linear-gradient(180deg, #fbfcff, #f0f4ff);
  color: #354698;
  font-size: 12.5px;
  font-weight: 580;
  text-align: left;
  box-shadow: 0 4px 12px -10px rgba(55, 79, 174, 0.5);
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.import-button:hover {
  border-color: #cbd8f9;
  background: #f5f8ff;
  box-shadow: 0 8px 18px -14px rgba(55, 79, 174, 0.6);
}

.import-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 23px;
  height: 23px;
  flex: none;
  border-radius: 7px;
  background: var(--brand);
  color: white;
  box-shadow: 0 4px 10px -6px rgba(77, 107, 254, 0.9);
}

.import-hint {
  margin-left: auto;
  color: #96a1c0;
  font-size: 9.5px;
  font-weight: 500;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  margin-top: 10px;
  padding: 0 9px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.72);
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.search-wrap:hover {
  background: rgba(255, 255, 255, 0.94);
}

.search-wrap:focus-within {
  border-color: var(--border-focus);
  background: var(--bg-surface);
  box-shadow: 0 0 0 3px rgba(77, 107, 254, 0.08);
}

.search-icon {
  flex: none;
  color: #9aa3b3;
}

.search-input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 12px;
}

.search-input::placeholder {
  color: #9aa3b3;
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-kbd {
  flex: none;
  padding: 1px 5px;
  border: 1px solid #e0e4ed;
  border-radius: 4px;
  background: #f7f8fb;
  color: #a0a8b6;
  font-size: 9px;
  line-height: 1.5;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 5px;
  color: #939cab;
}

.search-clear:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.search-summary {
  margin: 7px 3px 0;
  color: var(--text-tertiary);
  font-size: 10px;
  line-height: 1.5;
}

.search-summary strong {
  color: var(--text-secondary);
  font-weight: 600;
}

.conversation-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 2px 9px 14px;
  overscroll-behavior: contain;
}

.conversation-group + .conversation-group {
  margin-top: 12px;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 7px 7px 5px;
  color: #9aa3b2;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.group-label span {
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(146, 156, 174, 0.1);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 44px auto 0;
  padding: 0 18px;
  text-align: center;
}

.list-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin-bottom: 12px;
  border: 1px solid #e1e6f1;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.7);
  color: #9ba6ba;
}

.list-empty strong {
  font-size: 12.5px;
  font-weight: 600;
}

.list-empty p {
  margin: 5px 0 12px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.6;
}

.sidebar-footer {
  flex: none;
  padding: 9px 10px 12px;
  border-top: 1px solid rgba(225, 229, 238, 0.75);
}

.storage-card {
  padding: 10px 11px 8px;
  border: 1px solid rgba(225, 230, 240, 0.9);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.55);
}

.storage-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.storage-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 8px;
  background: #eef1f7;
  color: #7b8699;
}

.storage-head > div {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.storage-head strong {
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
}

.storage-head span {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 9.5px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clear-button {
  flex: none;
  padding: 4px 7px;
  border-radius: 6px;
  color: var(--danger);
  font-size: 10px;
  font-weight: 550;
  transition: background-color var(--transition-fast);
}

.clear-button:hover:not(:disabled) {
  background: var(--danger-soft);
}

.clear-button:disabled {
  color: var(--text-tertiary);
  opacity: 0.5;
}

.privacy-note {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 7px 0 0;
  padding-top: 6px;
  border-top: 1px solid #eceff5;
  color: #a2aab8;
  font-size: 9px;
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

  .search-kbd {
    display: none;
  }
}
</style>
