<script setup lang="ts">
import { computed } from 'vue'
import type { StoredConversation } from '../types/chat'
import { lastMessageTime, toTime } from '../lib/time'
import AppIcon from './AppIcon.vue'
import HighlightText from './HighlightText.vue'

const props = defineProps<{
  conversation: StoredConversation
  active: boolean
  query: string
  matchCount: number
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
}>()

const title = computed(() => props.conversation.title || '未命名会话')

const dateLabel = computed(() => {
  const updated = toTime(props.conversation.updatedAt)
  const created = toTime(props.conversation.createdAt)
  const last = lastMessageTime(props.conversation)
  const timestamp = updated ?? last ?? created
  if (timestamp === null) return ''

  const date = new Date(timestamp)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const days = Math.round((startOfToday - startOfDate) / 86_400_000)

  if (days === 0) {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date)
  }
  if (days === 1) return '昨天'
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
  return `${date.getFullYear()}/${date.getMonth() + 1}`
})

const metaLabel = computed(() => {
  if (props.matchCount > 0) return `${props.matchCount} 处`
  const parts: string[] = []
  if (dateLabel.value) parts.push(dateLabel.value)
  parts.push(`${props.conversation.messages.length} 条`)
  return parts.join(' · ')
})
</script>

<template>
  <div class="conversation-item" :class="{ 'is-active': active }">
    <button
      type="button"
      class="item-main"
      :aria-current="active ? 'page' : undefined"
      @click="emit('select', conversation.id)"
    >
      <span class="item-title">
        <HighlightText :text="title" :query="query" />
      </span>
      <span class="item-meta" :class="{ 'is-match': matchCount > 0 }">{{ metaLabel }}</span>
    </button>

    <button
      type="button"
      class="item-delete"
      :aria-label="`删除会话：${title}`"
      title="删除会话"
      @click.stop="emit('delete', conversation.id)"
    >
      <AppIcon name="trash" :size="15" />
    </button>
  </div>
</template>

<style scoped>
.conversation-item {
  position: relative;
  border-radius: 12px;
  transition: background-color var(--transition-fast);
}

.conversation-item:hover {
  background: var(--bg-hover);
}

.conversation-item.is-active {
  background: var(--bg-active);
}

.item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 40px;
  padding: 9px 10px;
  color: var(--text);
  text-align: left;
}

.item-title {
  display: block;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 14px;
  font-weight: 400;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-active .item-title {
  color: var(--brand);
  font-weight: 400;
}

.item-meta {
  flex: none;
  color: var(--text-caption);
  font-size: 11px;
  line-height: 18px;
  white-space: nowrap;
  transition: opacity var(--transition-fast);
}

.is-active .item-meta {
  color: #7d9bea;
}

.item-meta.is-match {
  color: var(--brand);
}

.item-delete {
  position: absolute;
  top: 50%;
  right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  color: var(--text-tertiary);
  opacity: 0;
  transform: translateY(-50%);
  transition:
    opacity var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.conversation-item:hover .item-delete,
.conversation-item:focus-within .item-delete {
  opacity: 1;
}

.conversation-item:hover .item-meta,
.conversation-item:focus-within .item-meta {
  opacity: 0;
}

.item-delete:hover {
  background: rgba(236, 19, 19, 0.06);
  color: var(--danger);
}

@media (hover: none) {
  .item-delete {
    opacity: 0;
  }

  .conversation-item.is-active .item-delete {
    opacity: 0.55;
  }

  .conversation-item.is-active .item-main {
    padding-right: 38px;
  }

  .conversation-item.is-active .item-meta {
    display: none;
  }
}
</style>
