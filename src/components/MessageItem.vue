<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ChatMessage } from '../types/chat'
import { avatarUrl } from '../lib/assets'
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

const messageReferences = computed(() => props.message.references ?? [])

const visibleReferences = computed(() =>
  messageReferences.value
    .map((reference, index) => ({ reference, index }))
    .filter(({ reference }) => {
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
    visibleReferences.value.length > 0,
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
      <p v-if="!message.content.trim()" class="empty-content">空消息</p>
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
        <p v-else-if="!message.attachments?.length" class="empty-content">空消息</p>

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

      <div class="message-actions user-actions">
        <time v-if="message.createdAt">{{ formatDateTime(message.createdAt) }}</time>
        <button
          type="button"
          class="message-action"
          :class="{ 'is-copied': copyState === 'copied' }"
          :aria-label="copyState === 'copied' ? '已复制消息' : '复制消息'"
          :title="copyState === 'copied' ? '已复制' : '复制消息'"
          @click="copyMessage"
        >
          <AppIcon :name="copyState === 'copied' ? 'check' : 'copy'" :size="14" />
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
    <div class="assistant-main">
      <div v-if="isUnknownRole" class="unknown-role">其他消息</div>

      <details
        v-if="message.reasoning?.trim()"
        class="reasoning"
        :open="reasoningOpen"
        @toggle="onReasoningToggle"
      >
        <summary>
          <img class="reasoning-avatar" :src="avatarUrl" alt="" />
          <span class="reasoning-label">已深度思考</span>
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
        :references="messageReferences"
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

      <details v-if="visibleReferences.length" class="references">
        <summary>
          参考来源
          <span>{{ visibleReferences.length }}</span>
        </summary>
        <ol>
          <li
            v-for="item in visibleReferences"
            :key="`${item.index}-${item.reference.url}`"
          >
            <a :href="item.reference.url" target="_blank" rel="noopener noreferrer nofollow">
              <span class="reference-index">{{ item.index + 1 }}</span>
              <HighlightText :text="item.reference.title" :query="query" />
            </a>
          </li>
        </ol>
      </details>

      <p v-if="!hasBody" class="empty-content assistant-empty">该消息没有可展示的内容</p>

      <div class="message-actions assistant-actions">
        <button
          type="button"
          class="message-action"
          :class="{ 'is-copied': copyState === 'copied' }"
          :aria-label="copyState === 'copied' ? '已复制消息' : '复制消息'"
          :title="copyState === 'copied' ? '已复制' : '复制消息'"
          @click="copyMessage"
        >
          <AppIcon :name="copyState === 'copied' ? 'check' : 'copy'" :size="14" />
        </button>
        <time v-if="message.createdAt">{{ formatDateTime(message.createdAt) }}</time>
      </div>
    </div>
  </article>
</template>

<style scoped>
.message {
  display: flex;
  width: 100%;
}

.message + .message {
  margin-top: 22px;
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
  padding: 10px 16px;
  border-radius: 22px;
  background: var(--user-bubble);
  color: var(--text);
  overflow-wrap: anywhere;
}

.user-bubble :deep(.markdown-body) {
  font-size: 16px;
  line-height: 24px;
}

.user-bubble :deep(.markdown-body p) {
  margin: 0 0 8px;
}

.user-bubble :deep(.markdown-body > :last-child) {
  margin-bottom: 0;
}

.message-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  min-height: 28px;
  margin-top: 1px;
  color: var(--text-caption);
  font-size: 11px;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.user-actions {
  padding-right: 2px;
}

.message-user:hover .message-actions,
.message-user:focus-within .message-actions,
.message-assistant:hover .message-actions,
.message-assistant:focus-within .message-actions {
  opacity: 1;
}

.assistant-main {
  width: 100%;
  min-width: 0;
}

.unknown-role {
  margin-bottom: 4px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.reasoning {
  margin: 0 0 6px;
}

.reasoning summary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  margin-left: -7px;
  padding: 4px 7px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  list-style: none;
  cursor: pointer;
  user-select: none;
}

.reasoning summary::-webkit-details-marker {
  display: none;
}

.reasoning summary:hover {
  background: var(--bg-hover);
}

.reasoning-avatar {
  width: 20px;
  height: 20px;
  flex: none;
  border-radius: 50%;
  background: #111;
  object-fit: cover;
}

.reasoning-label {
  line-height: 20px;
}

.reasoning-chevron {
  color: var(--text-caption);
  transition: transform var(--transition-fast);
}

.reasoning[open] .reasoning-chevron {
  transform: rotate(180deg);
}

.reasoning-content {
  padding: 2px 0 10px 26px;
  color: var(--text-secondary);
}

.assistant-attachments {
  margin-top: 8px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.user-bubble .attachment-list {
  margin-top: 6px;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  color: var(--text-caption);
  font-size: 11px;
  white-space: nowrap;
}

.references {
  margin-top: 12px;
}

.references summary {
  display: flex;
  align-items: center;
  gap: 5px;
  width: fit-content;
  padding: 2px 0;
  color: var(--text-tertiary);
  font-size: 12px;
  list-style: none;
  cursor: pointer;
  user-select: none;
}

.references summary::-webkit-details-marker {
  display: none;
}

.references summary span {
  color: var(--text-caption);
  font-size: 11px;
}

.references ol {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 4px 0 0;
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
  font-size: 12px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.references a:hover {
  color: var(--brand);
}

.reference-index {
  min-width: 16px;
  color: var(--text-caption);
  font-size: 11px;
  text-align: right;
}

.empty-content {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 13px;
}

.assistant-empty {
  margin: 3px 0;
}

.message-system {
  justify-content: center;
  margin: 20px 0;
}

.system-box {
  width: min(100%, 600px);
  padding: 9px 12px;
  border-radius: 10px;
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.system-label {
  display: block;
  margin-bottom: 2px;
  color: var(--text-caption);
  font-size: 11px;
  font-weight: 500;
}

.system-box :deep(.markdown-body) {
  font-size: 13px;
  line-height: 20px;
}

.message-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: var(--text-tertiary);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.message-action:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.message-action.is-copied {
  color: var(--success);
}

.assistant-actions {
  margin-top: 4px;
  padding-left: 0;
}

.assistant-actions time {
  color: var(--text-caption);
  font-size: 11px;
}

@media (max-width: 640px) {
  .message + .message {
    margin-top: 18px;
  }

  .message-user {
    padding-left: 0;
  }

  .user-bubble {
    max-width: 92%;
    padding: 9px 13px;
  }

  .user-bubble :deep(.markdown-body) {
    font-size: 15px;
    line-height: 23px;
  }

  .message-actions {
    opacity: 1;
  }

  .reasoning-content {
    padding-left: 12px;
  }
}
</style>
