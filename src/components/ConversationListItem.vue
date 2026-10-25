<script setup lang="ts">
import { computed } from 'vue'
import type { StoredConversation } from '../types/chat'
import { conversationTitle } from '../lib/conversationTitle'
import { t } from '../lib/i18n'
import { compactConversationDate } from '../lib/time'
import AppIcon from './AppIcon.vue'
import HighlightText from './HighlightText.vue'

const props = defineProps<{
  conversation: StoredConversation
  active: boolean
  query: string
  matchCount: number
  titleMatchCount?: number
}>()

const emit = defineEmits<{
  select: [id: string]
  delete: [id: string]
}>()

const title = computed(() =>
  conversationTitle(props.conversation.title, t('conversation.untitled')),
)

const dateLabel = computed(() => compactConversationDate(props.conversation))

const metaLabel = computed(() => {
  if (props.matchCount > 0) {
    return t('conversation.matches', { count: props.matchCount })
  }
  if ((props.titleMatchCount ?? 0) > 0) return t('conversation.titleMatch')
  const parts: string[] = []
  if (dateLabel.value) parts.push(dateLabel.value)
  parts.push(t('conversation.messageCount', { count: props.conversation.messages.length }))
  return parts.join(' · ')
})

const hasMatch = computed(
  () => props.matchCount > 0 || (props.titleMatchCount ?? 0) > 0,
)
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
      <span class="item-meta" :class="{ 'is-match': hasMatch }">{{ metaLabel }}</span>
    </button>

    <button
      type="button"
      class="item-delete"
      :aria-label="t('conversation.deleteAria', { title })"
      :title="t('conversation.delete')"
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
  color: var(--brand-hover);
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
  background: var(--danger-soft);
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
