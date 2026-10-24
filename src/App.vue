<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import type { ImportReport } from './types/import'
import { useChatStore } from './stores/chatStore'
import AppIcon from './components/AppIcon.vue'
import AppSidebar from './components/AppSidebar.vue'
import ChatView from './components/ChatView.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ImportProgressOverlay from './components/ImportProgressOverlay.vue'
import ImportReportDialog from './components/ImportReportDialog.vue'

const store = useChatStore()
const fileInput = ref<HTMLInputElement | null>(null)
const report = ref<ImportReport | null>(null)
const reportOpen = ref(false)
const isDragging = ref(false)
const dismissedDatabaseError = ref(false)
const isMobileViewport = ref(false)

let dragDepth = 0
let noticeTimer: number | undefined

const notice = reactive({
  visible: false,
  type: 'info' as 'info' | 'error' | 'success',
  message: '',
})

const confirmState = reactive({
  open: false,
  action: null as 'clear' | 'delete' | null,
  conversationId: '',
  busy: false,
})

const confirmTitle = computed(() =>
  confirmState.action === 'clear' ? '清空本地数据？' : '删除这个会话？',
)

const confirmMessage = computed(() => {
  if (confirmState.action === 'clear') {
    return `将删除当前浏览器中保存的 ${store.state.conversations.length} 个会话和 ${store.totalMessages.value} 条消息。`
  }
  const conversation = store.conversationMap.value.get(confirmState.conversationId)
  return conversation
    ? `“${conversation.title || '未命名会话'}” 将从本地缓存中移除。`
    : '该会话将从本地缓存中移除。'
})

const confirmDetail = computed(() =>
  confirmState.action === 'clear'
    ? '此操作不可撤销，但不会影响你原始导出的 JSON 文件。'
    : '本次操作不会影响原始 JSON 文件；之后仍可重新导入。',
)

const confirmLabel = computed(() =>
  confirmState.action === 'clear' ? '清空本地数据' : '删除会话',
)

const databaseError = computed(
  () => Boolean(store.state.loadError) && !dismissedDatabaseError.value,
)

const sidebarInert = computed(() =>
  isMobileViewport.value
    ? !store.state.mobileSidebarOpen
    : store.state.sidebarCollapsed,
)

function showNotice(
  message: string,
  type: 'info' | 'error' | 'success' = 'info',
): void {
  notice.message = message
  notice.type = type
  notice.visible = true
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => {
    notice.visible = false
  }, 3600)
}

function openFilePicker(): void {
  if (store.state.importing) return
  fileInput.value?.click()
}

function hasOpenDialog(): boolean {
  return reportOpen.value || confirmState.open || store.state.importing
}

async function runImport(files: File[]): Promise<void> {
  if (files.length === 0) return
  if (hasOpenDialog()) {
    showNotice('请先关闭当前对话框。', 'info')
    return
  }

  const result = await store.importFiles(files)
  report.value = result
  reportOpen.value = true
}

function onFileInputChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  void runImport(files)
}

function hasDraggedFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function onDragEnter(event: DragEvent): void {
  if (!hasDraggedFiles(event)) return
  event.preventDefault()
  if (hasOpenDialog()) return
  dragDepth += 1
  isDragging.value = true
}

function onDragOver(event: DragEvent): void {
  if (!hasDraggedFiles(event)) return
  event.preventDefault()
  if (hasOpenDialog()) return
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave(event: DragEvent): void {
  if (!isDragging.value) return
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDragging.value = false
}

function onDragEnd(): void {
  dragDepth = 0
  isDragging.value = false
}

function onDrop(event: DragEvent): void {
  if (!hasDraggedFiles(event) && !event.dataTransfer?.files.length) return
  event.preventDefault()
  dragDepth = 0
  isDragging.value = false
  if (hasOpenDialog()) return
  const files = Array.from(event.dataTransfer?.files ?? [])
  void runImport(files)
}

function onWindowBlur(): void {
  dragDepth = 0
  isDragging.value = false
}

function toggleSidebarFromHeader(): void {
  if (window.matchMedia('(max-width: 860px)').matches) {
    store.setMobileSidebarOpen(!store.state.mobileSidebarOpen)
  } else {
    store.toggleSidebar()
  }
}

function requestDelete(id: string): void {
  confirmState.action = 'delete'
  confirmState.conversationId = id
  confirmState.open = true
}

function requestClear(): void {
  if (!store.hasConversations.value) return
  confirmState.action = 'clear'
  confirmState.conversationId = ''
  confirmState.open = true
}

function closeConfirm(): void {
  if (confirmState.busy) return
  confirmState.open = false
  confirmState.action = null
  confirmState.conversationId = ''
}

async function executeConfirm(): Promise<void> {
  if (!confirmState.action || confirmState.busy) return
  confirmState.busy = true
  const action = confirmState.action
  const conversationId = confirmState.conversationId

  try {
    if (action === 'clear') {
      await store.clearAllData()
      showNotice('本地数据已清空。', 'success')
    } else {
      await store.deleteConversation(conversationId)
      showNotice('会话已删除。', 'success')
    }
    confirmState.open = false
    confirmState.action = null
    confirmState.conversationId = ''
  } catch (error) {
    showNotice(
      error instanceof Error ? `操作失败：${error.message}` : '操作失败，请稍后重试。',
      'error',
    )
  } finally {
    confirmState.busy = false
  }
}

function onResize(): void {
  isMobileViewport.value = window.innerWidth <= 860
  if (window.innerWidth > 860) store.setMobileSidebarOpen(false)
}

onMounted(async () => {
  isMobileViewport.value = window.innerWidth <= 860
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
  window.addEventListener('dragend', onDragEnd)
  window.addEventListener('blur', onWindowBlur)
  window.addEventListener('resize', onResize)

  await store.initializeStore()
  if (store.state.loadError) {
    showNotice(`本地数据库不可用：${store.state.loadError}`, 'error')
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
  window.removeEventListener('dragend', onDragEnd)
  window.removeEventListener('blur', onWindowBlur)
  window.removeEventListener('resize', onResize)
  window.clearTimeout(noticeTimer)
})
</script>

<template>
  <div
    class="app-shell"
    :class="{
      'sidebar-is-collapsed': store.state.sidebarCollapsed,
      'mobile-sidebar-open': store.state.mobileSidebarOpen,
    }"
  >
    <div
      class="sidebar-backdrop"
      :class="{ 'is-visible': store.state.mobileSidebarOpen }"
      aria-hidden="true"
      @click="store.setMobileSidebarOpen(false)"
    />

    <div class="sidebar-slot" :inert="sidebarInert">
      <AppSidebar
        @import="openFilePicker"
        @request-clear="requestClear"
        @request-delete="requestDelete"
      />
    </div>

    <main class="app-main" :inert="isMobileViewport && store.state.mobileSidebarOpen">
      <div v-if="databaseError" class="database-banner">
        <AppIcon name="alert" :size="15" />
        <span>本地数据库不可用，导入记录可能无法持久保存：{{ store.state.loadError }}</span>
        <button
          type="button"
          class="icon-button is-small"
          aria-label="关闭提示"
          @click="dismissedDatabaseError = true"
        >
          <AppIcon name="x" :size="13" />
        </button>
      </div>

      <div v-if="store.state.status === 'loading'" class="app-loading">
        <span class="loading-orb"><AppIcon name="database" :size="21" /></span>
        <span class="spinner" />
        <span>正在读取本地缓存…</span>
      </div>
      <ChatView
        v-else
        class="app-chat"
        @import="openFilePicker"
        @toggle-sidebar="toggleSidebarFromHeader"
      />
    </main>

    <input
      ref="fileInput"
      type="file"
      accept=".json,application/json"
      multiple
      class="sr-only"
      tabindex="-1"
      @change="onFileInputChange"
    />

    <ImportProgressOverlay
      :open="store.state.importing"
      :progress="store.state.importProgress"
    />

    <ImportReportDialog
      :open="reportOpen"
      :report="report"
      @close="reportOpen = false"
    />

    <ConfirmDialog
      :open="confirmState.open"
      :title="confirmTitle"
      :message="confirmMessage"
      :detail="confirmDetail"
      :confirm-label="confirmLabel"
      :danger="true"
      :busy="confirmState.busy"
      @close="closeConfirm"
      @confirm="executeConfirm"
    />

    <Transition name="drop-overlay">
      <div v-if="isDragging" class="drop-overlay">
        <div class="drop-overlay-card">
          <div class="drop-overlay-icon"><AppIcon name="upload" :size="25" /></div>
          <strong>松开即可导入</strong>
          <span>支持多个 JSON 文件 · 重复会话会自动合并</span>
        </div>
      </div>
    </Transition>

    <Transition name="toast">
      <div
        v-if="notice.visible"
        class="toast"
        :class="`is-${notice.type}`"
        role="status"
        aria-live="polite"
      >
        <AppIcon
          :name="notice.type === 'error' ? 'alert' : notice.type === 'success' ? 'check' : 'info'"
          :size="15"
        />
        <span>{{ notice.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bg-app);
}

.sidebar-slot {
  width: var(--sidebar-width);
  height: 100%;
  flex: none;
  overflow: hidden;
  transition: width 250ms var(--ease-out);
}

.sidebar-slot > :deep(*) {
  width: var(--sidebar-width);
  height: 100%;
  transition:
    transform 250ms var(--ease-out),
    opacity 180ms ease;
}

.app-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
}

.app-chat {
  flex: 1;
  min-height: 0;
}

.sidebar-backdrop {
  display: none;
}

.app-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 0;
  flex: 1;
  color: var(--text-tertiary);
  font-size: 12px;
}

.app-loading .spinner {
  width: 15px;
  height: 15px;
  color: var(--brand);
}

.loading-orb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: var(--brand-soft);
  color: var(--brand);
}

.database-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 8px 12px;
  border-bottom: 1px solid #f0d7d7;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 11.5px;
  line-height: 1.5;
}

.database-banner span {
  min-width: 0;
  flex: 1;
}

.database-banner .icon-button {
  color: var(--danger);
}

.drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: rgba(249, 250, 251, 0.82);
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.drop-overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: min(100%, 520px);
  min-height: 220px;
  padding: 28px;
  border: 1.5px dashed #b7c8fe;
  border-radius: 20px;
  background: var(--bg-surface);
  text-align: center;
}

.drop-overlay-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 14px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
}

.drop-overlay-card strong {
  font-size: 16px;
  font-weight: 500;
}

.drop-overlay-card > span {
  margin-top: 5px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.toast {
  position: fixed;
  bottom: 26px;
  left: 50%;
  z-index: 95;
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: min(90vw, 520px);
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
}

.toast.is-error {
  border-color: #f0d7d7;
  color: var(--danger);
}

.toast.is-success {
  border-color: #d8eee3;
  color: var(--success);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 200ms var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

.drop-overlay-enter-active,
.drop-overlay-leave-active {
  transition: opacity 150ms ease;
}

.drop-overlay-enter-from,
.drop-overlay-leave-to {
  opacity: 0;
}

@media (min-width: 861px) {
  .sidebar-is-collapsed .sidebar-slot {
    width: 0;
  }

  .sidebar-is-collapsed .sidebar-slot > :deep(*) {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-14px);
  }
}

@media (max-width: 860px) {
  .sidebar-slot {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 50;
    width: min(86vw, 280px);
    transform: translateX(-102%);
    transition: transform 260ms var(--ease-out);
  }

  .sidebar-slot > :deep(*) {
    width: 100%;
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }

  .mobile-sidebar-open .sidebar-slot {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    display: block;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    pointer-events: none;
    transition: opacity 220ms ease;
  }

  .sidebar-backdrop.is-visible {
    opacity: 1;
    pointer-events: auto;
  }

  .toast {
    bottom: 84px;
  }
}
</style>
