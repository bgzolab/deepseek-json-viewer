<script setup lang="ts">
import { computed } from 'vue'
import type { StoredConversation } from '../types/chat'
import { conversationDateLabel } from '../lib/time'
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

const dateLabel = computed(() => conversationDateLabel(props.conversation))
const title = computed(() => props.conversation.title || '未命名会话')
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
      <span class="item-meta">
        <span class="item-date">{{ dateLabel }}</span>
        <span class="meta-dot" aria-hidden="true">·</span>
        <span>{{ conversation.messages.length }} 条</span>
        <span v-if="matchCount > 0" class="match-badge">{{ matchCount }} 处匹配</span>
      </span>
    </button>

    <button
      type="button"
      class="item-delete"
      :aria-label="`删除会话：${title}`"
      title="删除会话"
      @click.stop="emit('delete', conversation.id)"
    >
      <AppIcon name="trash" :size="14" />
    </button>
  </div>
</template>

<style scoped>
.conversation-item {
  position: relative;
  border-radius: 10px;
  transition: background-color var(--transition-fast);
}

.conversation-item:hover {
  background: var(--bg-hover);
}

.conversation-item.is-active {
  background: var(--bg-active);
}

.conversation-item.is-active::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 2.5px;
  border-radius: 999px;
  background: var(--brand);
  content: '';
}

.item-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 9px 36px 9px 11px;
  text-align: left;
}

.item-title {
  display: block;
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  font-weight: 530;
  line-height: 1.55;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-active .item-title {
  color: #2f46a8;
  font-weight: 580;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: var(--text-tertiary);
  font-size: 10.5px;
  line-height: 1.45;
}

.item-date {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-dot {
  color: #c0c6d2;
}

.match-badge {
  flex: none;
  margin-left: 2px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #fff1c7;
  color: #8b6000;
  font-size: 9.5px;
  font-weight: 600;
  line-height: 1.5;
}

.item-delete {
  position: absolute;
  top: 50%;
  right: 5px;
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

.item-delete:hover {
  background: rgba(207, 63, 63, 0.08);
  color: var(--danger);
}

@media (hover: none) {
  .item-delete {
    opacity: 0.7;
  }

  .item-main {
    padding-right: 40px;
  }
}
</style>
