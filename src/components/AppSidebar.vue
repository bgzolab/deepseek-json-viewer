<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { StoredConversation } from '../types/chat'
import { avatarUrl } from '../lib/assets'
import { locale, localeOptions, setLocale, t } from '../lib/i18n'
import { hasActiveModal } from '../lib/modalStack'
import { setThemePreference, themePreference, type ThemePreference } from '../lib/theme'
import { relativeGroup } from '../lib/time'
import { useChatStore } from '../stores/chatStore'
import AppIcon from './AppIcon.vue'
import ConversationListItem from './ConversationListItem.vue'

const emit = defineEmits<{
  import: []
  'request-clear': []
  'request-delete': [id: string]
  'open-about': []
  'open-stats': []
}>()

const store = useChatStore()
const searchInput = ref<HTMLInputElement | null>(null)
const searchOpen = ref(false)
const footerMenuOpen = ref(false)
const footerMenu = ref<HTMLElement | null>(null)
const footerTrigger = ref<HTMLButtonElement | null>(null)

const themeOptions = computed<Array<{ value: ThemePreference; label: string }>>(() => [
  { value: 'auto', label: t('theme.auto') },
  { value: 'light', label: t('theme.light') },
  { value: 'dark', label: t('theme.dark') },
])

const groups = computed<Array<{ key: string; label: string; items: StoredConversation[] }>>(() => {
  const conversations = store.visibleConversations.value
  if (store.normalizedQuery.value) {
    return conversations.length > 0
      ? [{ key: 'search', label: t('sidebar.group.search'), items: conversations }]
      : []
  }

  const buckets = new Map<string, StoredConversation[]>()
  for (const conversation of conversations) {
    const key = relativeGroup(conversation)
    const bucket = buckets.get(key) ?? []
    bucket.push(conversation)
    buckets.set(key, bucket)
  }

  return (['today', 'yesterday', 'week', 'older'] as const)
    .map((key) => ({ key, label: t(`sidebar.group.${key}`), items: buckets.get(key) ?? [] }))
    .filter((group) => group.items.length > 0)
})

const resultCount = computed(() => store.searchResults.value.ordered.length)
const messageMatchCount = computed(() =>
  store.searchResults.value.ordered.reduce((total, result) => total + result.messageMatches, 0),
)

function messageMatchCountFor(id: string): number {
  return store.searchResults.value.map.get(id)?.messageMatches ?? 0
}

function titleMatchCountFor(id: string): number {
  return store.searchResults.value.map.get(id)?.titleMatches ?? 0
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
  if (hasActiveModal()) return
  footerMenuOpen.value = false
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
  if (event.key === 'Escape' && footerMenuOpen.value) {
    footerMenuOpen.value = false
    footerTrigger.value?.focus()
    return
  }
  if (hasActiveModal()) return
  if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
    event.preventDefault()
    void focusSearch()
  }
}

function onDocumentPointerDown(event: PointerEvent): void {
  if (!footerMenuOpen.value) return
  const target = event.target as Node
  if (footerMenu.value?.contains(target) || footerTrigger.value?.contains(target)) return
  footerMenuOpen.value = false
}

function toggleFooterMenu(): void {
  footerMenuOpen.value = !footerMenuOpen.value
}

function openFooterDialog(dialog: 'about' | 'stats'): void {
  footerMenuOpen.value = false
  footerTrigger.value?.focus()
  if (dialog === 'about') emit('open-about')
  else emit('open-stats')
}

function requestClearFromMenu(): void {
  footerMenuOpen.value = false
  footerTrigger.value?.focus()
  emit('request-clear')
}

function onLocaleChange(event: Event): void {
  setLocale((event.target as HTMLSelectElement).value)
}

function onThemeOptionKeydown(event: KeyboardEvent, index: number): void {
  const step =
    event.key === 'ArrowRight' || event.key === 'ArrowDown'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
        ? -1
        : 0
  if (step === 0) return
  event.preventDefault()
  const nextIndex = (index + step + themeOptions.value.length) % themeOptions.value.length
  setThemePreference(themeOptions.value[nextIndex].value)
  const buttons =
    (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>(
      '.theme-option',
    )
  buttons?.[nextIndex]?.focus()
}

watch(
  () => store.state.query,
  (query) => {
    if (query) return
    if (searchInput.value === document.activeElement) return
    searchOpen.value = false
  },
)

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <aside class="sidebar" :aria-label="t('sidebar.aria')">
    <header class="sidebar-top">
      <div class="brand-row">
        <img class="brand-avatar" :src="avatarUrl" :alt="t('sidebar.avatarAlt')" />
        <div class="brand-copy">
          <span class="brand-word">deepseek</span>
          <span class="brand-sub">{{ t('sidebar.brandSub') }}</span>
        </div>
        <div class="top-actions">
          <button
            type="button"
            class="icon-button top-action"
            :class="{ 'is-active': searchOpen || store.state.query }"
            :aria-label="t('sidebar.search')"
            :title="t('sidebar.searchTitle')"
            @click="focusSearch"
          >
            <AppIcon name="search" :size="16" />
          </button>
          <button
            type="button"
            class="icon-button top-action sidebar-collapse"
            :aria-label="t('sidebar.collapse')"
            :title="t('sidebar.collapse')"
            @click="store.toggleSidebar"
          >
            <AppIcon name="sidebar" :size="16" />
          </button>
          <button
            type="button"
            class="icon-button top-action sidebar-close"
            :aria-label="t('sidebar.close')"
            @click="closeSidebar"
          >
            <AppIcon name="x" :size="17" />
          </button>
        </div>
      </div>

      <button type="button" class="new-chat-button" @click="emit('import')">
        <AppIcon name="plus" :size="16" />
        <span>{{ t('sidebar.import') }}</span>
      </button>

      <Transition name="search-field">
        <div v-if="searchOpen || store.state.query" class="search-wrap">
          <AppIcon name="search" :size="14" class="search-icon" />
          <input
            ref="searchInput"
            type="search"
            class="search-input"
            :placeholder="t('sidebar.searchPlaceholder')"
            :aria-label="t('sidebar.searchPlaceholder')"
            autocomplete="off"
            spellcheck="false"
            :value="store.state.query"
            @input="onQueryInput"
            @keydown="onSearchKeydown"
          />
          <button
            type="button"
            class="search-clear"
            :aria-label="t('sidebar.closeSearch')"
            @click="clearSearch(true)"
          >
            <AppIcon name="x" :size="13" />
          </button>
        </div>
      </Transition>

      <p v-if="store.normalizedQuery.value" class="search-summary">
        <template v-if="resultCount > 0">
          {{ t('unit.conversationCount', { count: resultCount }) }} ·
          {{ t('search.matchCount', { count: messageMatchCount }) }}
        </template>
        <template v-else>{{ t('search.noMatches') }}</template>
      </p>
    </header>

    <div class="conversation-scroll">
      <nav v-if="groups.length > 0" class="conversation-groups" :aria-label="t('sidebar.groupsAria')">
        <section v-for="group in groups" :key="group.key" class="conversation-group">
          <h2 class="group-label">{{ group.label }}</h2>
          <div class="conversation-list">
            <ConversationListItem
              v-for="conversation in group.items"
              :key="conversation.id"
              :conversation="conversation"
              :active="conversation.id === store.state.selectedId"
              :query="store.state.query.trim()"
              :match-count="messageMatchCountFor(conversation.id)"
              :title-match-count="titleMatchCountFor(conversation.id)"
              @select="store.selectConversation"
              @delete="emit('request-delete', $event)"
            />
          </div>
        </section>
      </nav>

      <div v-else-if="store.normalizedQuery.value" class="list-empty">
        <strong>{{ t('sidebar.noResultsTitle') }}</strong>
        <p>{{ t('sidebar.noResultsBody') }}</p>
        <button type="button" class="text-action" @click="clearSearch()">
          {{ t('sidebar.clearSearch') }}
        </button>
      </div>

      <div v-else class="list-empty">
        <strong>{{ t('sidebar.emptyTitle') }}</strong>
        <p>{{ t('sidebar.emptyBody') }}</p>
        <button type="button" class="text-action" @click="emit('import')">
          {{ t('sidebar.importFile') }}
        </button>
      </div>
    </div>

    <footer class="sidebar-footer">
      <div class="footer-menu-wrap">
        <button
          ref="footerTrigger"
          type="button"
          class="storage-row"
          :class="{ 'is-open': footerMenuOpen }"
          :aria-expanded="footerMenuOpen"
          :title="t('sidebar.moreMenu')"
          @click="toggleFooterMenu"
        >
          <span class="storage-icon"><AppIcon name="database" :size="16" /></span>
          <span class="storage-copy">
            <span class="storage-title">{{ t('sidebar.storageTitle') }}</span>
            <span class="storage-meta">
              {{ t('unit.conversationCount', { count: store.state.conversations.length }) }} ·
              {{ t('unit.messageCount', { count: store.totalMessages.value }) }}
            </span>
          </span>
          <AppIcon
            class="storage-chevron"
            :name="footerMenuOpen ? 'chevron-down' : 'chevron-up'"
            :size="15"
          />
        </button>

        <Transition name="footer-menu">
          <div
            v-if="footerMenuOpen"
            ref="footerMenu"
            class="footer-menu"
            role="group"
            :aria-label="t('sidebar.moreMenu')"
          >
            <div class="footer-theme">
              <div class="footer-theme-label">
                <AppIcon name="sun" :size="16" />
                <span>{{ t('theme.label') }}</span>
              </div>
              <div class="theme-options" role="radiogroup" :aria-label="t('theme.label')">
                <button
                  v-for="(option, index) in themeOptions"
                  :key="option.value"
                  type="button"
                  class="theme-option"
                  :class="{ 'is-active': themePreference === option.value }"
                  role="radio"
                  :aria-checked="themePreference === option.value"
                  :tabindex="themePreference === option.value ? 0 : -1"
                  @click="setThemePreference(option.value)"
                  @keydown="onThemeOptionKeydown($event, index)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <label class="footer-language">
              <span class="footer-theme-label">
                <AppIcon name="language" :size="16" />
                <span>{{ t('language.label') }}</span>
              </span>
              <select class="locale-select" :value="locale" @change="onLocaleChange">
                <option
                  v-for="option in localeOptions"
                  :key="option.code"
                  :value="option.code"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>
            <div class="footer-menu-divider" role="separator" />
            <button
              type="button"
              class="footer-menu-item"
              @click="openFooterDialog('stats')"
            >
              <AppIcon name="chart" :size="16" />
              <span>{{ t('menu.stats') }}</span>
            </button>
            <button
              type="button"
              class="footer-menu-item"
              @click="openFooterDialog('about')"
            >
              <AppIcon name="info" :size="16" />
              <span>{{ t('menu.about') }}</span>
            </button>
            <div class="footer-menu-divider" role="separator" />
            <button
              type="button"
              class="footer-menu-item is-danger"
              :disabled="!store.hasConversations.value"
              @click="requestClearFromMenu"
            >
              <AppIcon name="trash" :size="16" />
              <span>{{ t('menu.clear') }}</span>
            </button>
          </div>
        </Transition>
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
  background: var(--bg-elevated);
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
  background: var(--bg-hover);
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
  background: var(--bg-elevated);
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
  --scroll-pad-top: 18px;
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: var(--scroll-pad-top) 12px 12px;
  overscroll-behavior: contain;
}

.conversation-group + .conversation-group {
  margin-top: 16px;
}

.group-label {
  position: sticky;
  /* Pull the sticky label over the scroll container's top padding. */
  top: calc(-1 * var(--scroll-pad-top));
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
  position: relative;
  z-index: 5;
  flex: none;
  padding: 0 12px 10px;
}

.footer-menu-wrap {
  position: relative;
}

.storage-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  padding: 6px 8px 6px 6px;
  border-radius: 12px;
  text-align: left;
  transition: background-color var(--transition-fast);
}

.storage-row:hover,
.storage-row.is-open {
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

.storage-chevron {
  flex: none;
  color: var(--text-caption);
}

.footer-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  left: 0;
  z-index: 10;
  padding: 5px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
}

.footer-theme {
  padding: 4px 9px 6px;
}

.footer-theme-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text);
  font-size: 13px;
  line-height: 20px;
}

.footer-theme-label :deep(.app-icon) {
  flex: none;
  color: var(--text-tertiary);
}

.footer-language {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 9px 8px;
  cursor: pointer;
}

.footer-language .footer-theme-label {
  flex: none;
  font-size: 13px;
}

.locale-select {
  max-width: 124px;
  height: 27px;
  padding: 0 22px 0 8px;
  border: 1px solid var(--border);
  border-radius: 7px;
  outline: none;
  appearance: none;
  background-color: var(--bg-elevated);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2381858c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  color: var(--text-secondary);
  font-size: 11.5px;
}

.locale-select:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 1px;
}

.theme-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin-top: 7px;
  padding: 2px;
  border-radius: 8px;
  background: var(--bg-muted);
}

.theme-option {
  padding: 3px 0;
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 18px;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.theme-option:hover {
  color: var(--text);
}

.theme-option.is-active {
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.footer-menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 9px;
  border-radius: 8px;
  color: var(--text);
  font-size: 13px;
  line-height: 20px;
  text-align: left;
}

.footer-menu-item:hover {
  background: var(--bg-hover);
  text-decoration: none;
}

.footer-menu-item :deep(.app-icon) {
  flex: none;
  color: var(--text-tertiary);
}

.footer-menu-item.is-danger {
  color: var(--danger);
}

.footer-menu-item.is-danger :deep(.app-icon) {
  color: var(--danger);
}

.footer-menu-item.is-danger:hover:not(:disabled) {
  background: var(--danger-soft);
}

.footer-menu-item:disabled {
  color: var(--text-caption);
  opacity: 0.6;
}

.footer-menu-item:disabled :deep(.app-icon) {
  color: var(--text-caption);
}

.footer-menu-divider {
  height: 1px;
  margin: 5px 7px;
  background: var(--border-subtle);
}

.footer-menu-enter-active,
.footer-menu-leave-active {
  transition:
    opacity 140ms ease,
    transform 140ms var(--ease-out);
}

.footer-menu-enter-from,
.footer-menu-leave-to {
  transform: translateY(4px) scale(0.985);
  opacity: 0;
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
