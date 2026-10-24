<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ChatMessage } from '../types/chat'
import { copyText } from '../lib/clipboard'
import { countOccurrences } from '../lib/search'
import { formatDateTime, formatFileSize } from '../lib/time'
import AppIcon from './AppIcon.vue'
import HighlightText from './HighlightText.vue'
import MarkdownBody from './MarkdownBody.vue'

const props = withDefaults(
  defineProps<{
    message: ChatMessage
    index: number
    query?: string
    searchStartIndex?: number
  }>(),
  {
    query: '',
    searchStartIndex: 0,
  },
)

const isUser = computed(() => props.message.role === 'user')
const isSystem = computed(() => props.message.role === 'system')
const isUnknownRole = computed(() => props.message.role === 'unknown')
const roleLabel = computed(() => {
  if (isUnknownRole.value) return '其他消息'
  return '助手'
})

const reasoningOpen = ref(false)
const reasoningHasMatch = computed(() => {
  if (!props.query || !props.message.reasoning) return false
  return props.message.reasoning.toLocaleLowerCase().includes(props.query)
})

watch(
  reasoningHasMatch,
  (hasMatch) => {
    if (hasMatch) reasoningOpen.value = true
  },
  { immediate: true },
)

const contentMatchCount = computed(() => {
  if (!props.query) return 0
  return countOccurrences(props.message.content.toLocaleLowerCase(), props.query)
})

const reasoningStartIndex = computed(
  () => Math.max(0, props.searchStartIndex) + contentMatchCount.value,
)

const safeReferences = computed(() =>
  (props.message.references ?? []).filter((reference) => {
    try {
      const url = new URL(reference.url)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }),
)

const hasBody = computed(
  () =>
    Boolean(props.message.content.trim()) ||
    Boolean(props.message.reasoning?.trim()) ||
    Boolean(props.message.attachments?.length) ||
    safeReferences.value.length > 0,
)

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
let copyTimer: number | undefined

async function copyMessage(): Promise<void> {
  const parts = [props.message.reasoning, props.message.content].filter(
    (value): value is string => Boolean(value?.trim()),
  )
  const successful = await copyText(parts.join('\n\n'))
  copyState.value = successful ? 'copied' : 'failed'
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copyState.value = 'idle'
  }, 1600)
}

function onReasoningToggle(event: Event): void {
  reasoningOpen.value = (event.currentTarget as HTMLDetailsElement).open
}
</script>

<template>
  <article
    v-if="isSystem"
    class="message message-system"
    :data-message-index="index"
    :data-message-id="message.id"
  >
    <div class="system-box">
      <span class="system-label">系统消息</span>
      <p v-if="!message.content.trim()" class="empty-content">（空消息）</p>
      <MarkdownBody
        v-else
        :text="message.content"
        :query="query"
        :search-start-index="searchStartIndex"
      />
    </div>
  </article>

  <article
    v-else-if="isUser"
    class="message message-user"
    :data-message-index="index"
    :data-message-id="message.id"
  >
    <div class="user-column">
      <div class="user-bubble">
        <MarkdownBody
          v-if="message.content.trim()"
          :text="message.content"
          :query="query"
          :search-start-index="searchStartIndex"
        />
        <p v-else-if="!message.attachments?.length" class="empty-content">（空消息）</p>

        <div v-if="message.attachments?.length" class="attachment-list">
          <span
            v-for="attachment in message.attachments"
            :key="`${attachment.name}-${attachment.size ?? ''}`"
            class="attachment-chip"
          >
            <AppIcon name="file" :size="13" />
            <span class="attachment-name">{{ attachment.name }}</span>
            <span v-if="attachment.size" class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
          </span>
        </div>
      </div>

      <div class="user-meta">
        <time v-if="message.createdAt">{{ formatDateTime(message.createdAt) }}</time>
        <button
          type="button"
          class="message-action"
          :class="{ 'is-copied': copyState === 'copied' }"
          :aria-label="copyState === 'copied' ? '已复制消息' : '复制消息'"
          :title="copyState === 'copied' ? '已复制' : '复制消息'"
          @click="copyMessage"
        >
          <AppIcon :name="copyState === 'copied' ? 'check' : 'copy'" :size="13" />
        </button>
      </div>
    </div>
  </article>

  <article
    v-else
    class="message message-assistant"
    :data-message-index="index"
    :data-message-id="message.id"
  >
    <div class="assistant-avatar" aria-hidden="true">
      <AppIcon name="sparkles" :size="16" />
    </div>

    <div class="assistant-body">
      <div class="assistant-head">
        <span class="role-label" :class="{ 'is-unknown': isUnknownRole }">{{ roleLabel }}</span>
        <time v-if="message.createdAt">{{ formatDateTime(message.createdAt) }}</time>
        <button
          type="button"
          class="message-action"
          :class="{ 'is-copied': copyState === 'copied' }"
          :aria-label="copyState === 'copied' ? '已复制消息' : '复制消息'"
          :title="copyState === 'copied' ? '已复制' : '复制消息'"
          @click="copyMessage"
        >
          <AppIcon :name="copyState === 'copied' ? 'check' : 'copy'" :size="13" />
          <span v-if="copyState === 'copied'">已复制</span>
          <span v-else-if="copyState === 'failed'">复制失败</span>
        </button>
      </div>

      <details
        v-if="message.reasoning?.trim()"
        class="reasoning"
        :open="reasoningOpen"
        @toggle="onReasoningToggle"
      >
        <summary>
          <span class="reasoning-spark"><AppIcon name="sparkles" :size="13" /></span>
          <span>深度思考</span>
          <span class="reasoning-summary-hint">{{ reasoningOpen ? '收起' : '展开' }}</span>
          <AppIcon name="chevron-down" :size="14" class="reasoning-chevron" />
        </summary>
        <div class="reasoning-content">
          <MarkdownBody
            :text="message.reasoning"
            :query="query"
            :search-start-index="reasoningStartIndex"
          />
        </div>
      </details>

      <MarkdownBody
        v-if="message.content.trim()"
        :text="message.content"
        :references="safeReferences"
        :query="query"
        :search-start-index="searchStartIndex"
      />

      <div v-if="message.attachments?.length" class="attachment-list assistant-attachments">
        <span
          v-for="attachment in message.attachments"
          :key="`${attachment.name}-${attachment.size ?? ''}`"
          class="attachment-chip"
        >
          <AppIcon name="file" :size="13" />
          <span class="attachment-name">{{ attachment.name }}</span>
          <span v-if="attachment.size" class="attachment-size">{{ formatFileSize(attachment.size) }}</span>
        </span>
      </div>

      <details v-if="safeReferences.length" class="references">
        <summary>
          <AppIcon name="layers" :size="13" />
          参考来源
          <span>{{ safeReferences.length }}</span>
        </summary>
        <ol>
          <li v-for="(reference, referenceIndex) in safeReferences" :key="reference.url">
            <a :href="reference.url" target="_blank" rel="noopener noreferrer nofollow">
              <span class="reference-index">{{ referenceIndex + 1 }}</span>
              <HighlightText :text="reference.title" :query="query" />
            </a>
          </li>
        </ol>
      </details>

      <p v-if="!hasBody" class="empty-content assistant-empty">（该消息没有可展示的内容）</p>
    </div>
  </article>
</template>

<style scoped>
.message {
  display: flex;
  width: 100%;
}

.message + .message {
  margin-top: 26px;
}

.message-user {
  justify-content: flex-end;
  padding-left: 12%;
}

.user-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 100%;
  min-width: 0;
}

.user-bubble {
  max-width: 100%;
  padding: 10px 15px;
  border: 1px solid var(--user-bubble-border);
  border-radius: 17px 17px 5px 17px;
  background: var(--user-bubble);
  color: #232b3d;
  overflow-wrap: anywhere;
}

.user-bubble :deep(.markdown-body) {
  font-size: 15px;
  line-height: 1.72;
}

.user-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 20px;
  margin-top: 4px;
  padding-right: 3px;
  color: var(--text-tertiary);
  font-size: 9.5px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.message-user:hover .user-meta,
.message-user:focus-within .user-meta {
  opacity: 1;
}

.assistant-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin-top: 1px;
  flex: none;
  border-radius: 9px;
  background: var(--assistant-avatar);
  color: white;
  box-shadow: 0 8px 16px -12px rgba(77, 107, 254, 0.9);
}

.assistant-body {
  min-width: 0;
  max-width: 100%;
  flex: 1;
  padding-left: 13px;
}

.assistant-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  margin-bottom: 3px;
}

.role-label {
  color: #394154;
  font-size: 11.5px;
  font-weight: 620;
  letter-spacing: 0.01em;
}

.role-label.is-unknown {
  color: var(--text-tertiary);
}

.assistant-head time {
  color: var(--text-tertiary);
  font-size: 9.5px;
}

.message-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 5px;
  border-radius: 5px;
  color: #a2aab8;
  font-size: 9.5px;
  opacity: 0;
  transition:
    opacity var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.message-user:hover .message-action,
.message-user:focus-within .message-action,
.message-assistant:hover .message-action,
.message-assistant:focus-within .message-action {
  opacity: 1;
}

.message-action:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.message-action.is-copied {
  color: var(--success);
  opacity: 1;
}

.reasoning {
  margin: 2px 0 12px;
  overflow: hidden;
  border: 1px solid #e6e9f2;
  border-radius: 11px;
  background: #fafbfe;
}

.reasoning summary {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 11px;
  color: #707b90;
  font-size: 11.5px;
  font-weight: 550;
  list-style: none;
  cursor: pointer;
  user-select: none;
}

.reasoning summary::-webkit-details-marker {
  display: none;
}

.reasoning summary:hover {
  background: #f6f8fc;
}

.reasoning-spark {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7c8cff;
}

.reasoning-summary-hint {
  margin-left: auto;
  color: #a9b1c0;
  font-size: 9.5px;
  font-weight: 400;
}

.reasoning-chevron {
  color: #a9b1c0;
  transition: transform var(--transition-fast);
}

.reasoning[open] .reasoning-chevron {
  transform: rotate(180deg);
}

.reasoning[open] .reasoning-summary-hint {
  display: none;
}

.reasoning-content {
  padding: 1px 13px 12px;
  border-top: 1px solid #edf0f6;
  color: var(--text-secondary);
}

.reasoning-content :deep(.markdown-body) {
  padding-top: 10px;
}

.assistant-attachments {
  margin-top: 9px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.user-bubble .attachment-list {
  margin-top: 8px;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 5px 8px;
  border: 1px solid rgba(180, 192, 220, 0.5);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.58);
  color: #5b667b;
  font-size: 10.5px;
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  color: var(--text-tertiary);
  font-size: 9.5px;
  white-space: nowrap;
}

.references {
  margin-top: 13px;
  border-top: 1px solid #edf0f6;
  padding-top: 9px;
}

.references summary {
  display: flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  color: var(--text-tertiary);
  font-size: 10.5px;
  list-style: none;
  cursor: pointer;
  user-select: none;
}

.references summary::-webkit-details-marker {
  display: none;
}

.references summary span {
  padding: 0 4px;
  border-radius: 4px;
  background: var(--bg-muted);
  font-size: 9px;
}

.references ol {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.references li {
  min-width: 0;
}

.references a {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.55;
}

.references a:hover {
  color: var(--brand);
}

.reference-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  flex: none;
  border-radius: 4px;
  background: var(--bg-muted);
  color: var(--text-tertiary);
  font-size: 9px;
  line-height: 1;
}

.empty-content {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 12.5px;
}

.assistant-empty {
  margin: 3px 0;
}

.message-system {
  justify-content: center;
  margin: 18px 0;
}

.system-box {
  width: min(100%, 600px);
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.system-label {
  display: block;
  margin-bottom: 3px;
  color: var(--text-tertiary);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.system-box :deep(.markdown-body) {
  font-size: 13px;
}

@media (max-width: 640px) {
  .message + .message {
    margin-top: 22px;
  }

  .message-user {
    padding-left: 0;
  }

  .user-bubble {
    max-width: 92%;
    padding: 9px 13px;
  }

  .assistant-avatar {
    width: 27px;
    height: 27px;
    border-radius: 8px;
  }

  .assistant-body {
    padding-left: 10px;
  }

  .message-action {
    opacity: 0.6;
  }

  .user-meta {
    opacity: 0.7;
  }
}
</style>
