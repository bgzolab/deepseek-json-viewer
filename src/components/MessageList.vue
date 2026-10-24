<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import type { StoredConversation } from '../types/chat'
import AppIcon from './AppIcon.vue'
import MessageItem from './MessageItem.vue'

const props = defineProps<{
  conversation: StoredConversation
  query: string
  messageMatchOffsets: Map<string, number>
}>()

const INITIAL_WINDOW = 80
const LOAD_CHUNK = 80
const BOTTOM_THRESHOLD = 96

const scrollEl = ref<HTMLElement | null>(null)
const windowStart = ref(0)
const atBottom = ref(true)

const indexedMessages = computed(() =>
  props.conversation.messages.map((message, index) => ({ message, index })),
)

const visibleMessages = computed(() => indexedMessages.value.slice(windowStart.value))
const hiddenCount = computed(() => windowStart.value)
const isEmpty = computed(() => props.conversation.messages.length === 0)

function resetWindow(): void {
  windowStart.value = Math.max(0, props.conversation.messages.length - INITIAL_WINDOW)
}

async function scrollToBottom(behavior: ScrollBehavior = 'smooth'): Promise<void> {
  await nextTick()
  const element = scrollEl.value
  if (!element) return
  element.scrollTo({ top: element.scrollHeight, behavior })
  atBottom.value = true
}

async function loadEarlier(): Promise<void> {
  const element = scrollEl.value
  if (!element) return

  const previousHeight = element.scrollHeight
  const previousTop = element.scrollTop
  windowStart.value = Math.max(0, windowStart.value - LOAD_CHUNK)
  await nextTick()
  element.scrollTop = element.scrollHeight - previousHeight + previousTop
}

function onScroll(): void {
  const element = scrollEl.value
  if (!element) return
  atBottom.value =
    element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_THRESHOLD
}

function centerElementInScrollContainer(
  container: HTMLElement,
  target: HTMLElement,
): void {
  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const targetTop =
    targetRect.top -
    containerRect.top +
    container.scrollTop -
    (container.clientHeight - targetRect.height) / 2

  container.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' })
}

async function focusMatch(matchIndex: number, messageId: string): Promise<void> {
  const messageIndex = props.conversation.messages.findIndex(
    (message) => message.id === messageId,
  )

  if (messageIndex >= 0 && messageIndex < windowStart.value) {
    windowStart.value = Math.max(0, messageIndex - 16)
  }

  await nextTick()
  await nextTick()

  const element = scrollEl.value
  if (!element) return

  element
    .querySelectorAll<HTMLElement>('.md-search-hit.is-current')
    .forEach((mark) => mark.classList.remove('is-current'))

  const mark = element.querySelector<HTMLElement>(`[data-search-index="${matchIndex}"]`)
  if (mark) {
    mark.classList.add('is-current')
    centerElementInScrollContainer(element, mark)
    return
  }

  const messageElement =
    messageIndex >= 0
      ? element.querySelector<HTMLElement>(`[data-message-index="${messageIndex}"]`)
      : null
  if (messageElement) centerElementInScrollContainer(element, messageElement)
}

function messageOffset(messageId: string): number {
  return props.messageMatchOffsets.get(messageId) ?? 0
}

watch(
  () => props.conversation.id,
  async () => {
    resetWindow()
    await nextTick()
    if (props.query) {
      scrollEl.value?.scrollTo({ top: 0, behavior: 'auto' })
    } else {
      await scrollToBottom('auto')
    }
  },
)

watch(
  () => props.conversation.messages.length,
  async (length, previousLength) => {
    if (length > previousLength && atBottom.value) {
      await scrollToBottom('auto')
    }
  },
)

onMounted(async () => {
  resetWindow()
  if (props.query) {
    scrollEl.value?.scrollTo({ top: 0, behavior: 'auto' })
  } else {
    await scrollToBottom('auto')
  }
})

defineExpose({ scrollToBottom, focusMatch })
</script>

<template>
  <div class="message-list-shell">
    <div ref="scrollEl" class="message-list" @scroll.passive="onScroll">
      <div class="message-stream">
        <div v-if="isEmpty" class="messages-empty">
          <div class="messages-empty-icon"><AppIcon name="message" :size="22" /></div>
          <strong>这个会话没有可展示的消息</strong>
          <p>可能是导出时消息为空，或该会话只包含暂不支持的内容。</p>
        </div>

        <template v-else>
          <button
            v-if="hiddenCount > 0"
            type="button"
            class="load-earlier"
            @click="loadEarlier"
          >
            <AppIcon name="chevron-up" :size="14" />
            加载更早的 {{ Math.min(hiddenCount, 80) }} 条消息
            <span v-if="hiddenCount > 80">（还有 {{ hiddenCount }} 条）</span>
          </button>

          <MessageItem
            v-for="item in visibleMessages"
            :key="`${conversation.id}:${item.message.id}:${item.index}`"
            :message="item.message"
            :index="item.index"
            :query="query"
            :search-start-index="messageOffset(item.message.id)"
          />
        </template>
      </div>
    </div>

    <Transition name="scroll-button">
      <button
        v-if="!atBottom && !isEmpty"
        type="button"
        class="scroll-bottom"
        aria-label="滚动到底部"
        title="滚动到底部"
        @click="scrollToBottom()"
      >
        <AppIcon name="arrow-down" :size="16" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.message-list-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: var(--bg-surface);
}

.message-list {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  background: var(--bg-surface);
  overscroll-behavior: contain;
}

.message-stream {
  width: min(100%, var(--content-width));
  min-height: 100%;
  margin: 0 auto;
  padding: 28px 26px 34px;
}

.load-earlier {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0 auto 24px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-surface);
  color: var(--text-tertiary);
  font-size: 10.5px;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background-color var(--transition-fast);
}

.load-earlier:hover {
  border-color: var(--border-strong);
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.messages-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 42vh;
  text-align: center;
}

.messages-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin-bottom: 13px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-muted);
  color: var(--text-tertiary);
}

.messages-empty strong {
  font-size: 13px;
  font-weight: 600;
}

.messages-empty p {
  margin: 6px 0 0;
  color: var(--text-tertiary);
  font-size: 11.5px;
}

.scroll-bottom {
  position: absolute;
  bottom: 18px;
  left: 50%;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  color: var(--text-secondary);
  box-shadow: var(--shadow-sm);
  transform: translateX(-50%);
  backdrop-filter: blur(8px);
}

.scroll-bottom:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.scroll-button-enter-active,
.scroll-button-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.scroll-button-enter-from,
.scroll-button-leave-to {
  opacity: 0;
  transform: translate(-50%, 4px);
}

@media (max-width: 640px) {
  .message-stream {
    padding: 22px 15px 28px;
  }
}
</style>
