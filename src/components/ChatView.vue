<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useChatStore } from '../stores/chatStore'
import ChatHeader from './ChatHeader.vue'
import ComposerPlaceholder from './ComposerPlaceholder.vue'
import EmptyState from './EmptyState.vue'
import MessageList from './MessageList.vue'

const emit = defineEmits<{
  import: []
  'toggle-sidebar': []
}>()

const store = useChatStore()
const messageListRef = ref<InstanceType<typeof MessageList> | null>(null)

async function focusActiveMatch(): Promise<void> {
  if (!store.normalizedQuery.value) return
  const result = store.currentSearchResult.value
  if (!result || result.messageMatches === 0) return

  const messageId = store.activeMatchMessageId.value
  if (!messageId) return

  const token = store.state.focusToken
  await nextTick()
  if (token !== store.state.focusToken) return
  await messageListRef.value?.focusMatch(store.state.activeMatch, messageId)
}

watch(
  () => store.state.focusToken,
  () => {
    void focusActiveMatch()
  },
  { flush: 'post' },
)
</script>

<template>
  <section class="chat-view">
    <ChatHeader
      :conversation="store.selectedConversation.value"
      @toggle-sidebar="emit('toggle-sidebar')"
    />

    <div class="chat-body">
      <EmptyState v-if="!store.selectedConversation.value" @import="emit('import')" />
      <MessageList
        v-else
        ref="messageListRef"
        :conversation="store.selectedConversation.value"
        :query="store.normalizedQuery.value"
        :message-match-offsets="store.messageMatchOffsets.value"
      />
    </div>

    <ComposerPlaceholder />
  </section>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  background: var(--bg-surface);
}

.chat-body {
  display: flex;
  min-height: 0;
  flex: 1;
}
</style>
