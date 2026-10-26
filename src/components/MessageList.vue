<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { StoredConversation } from '../types/chat'
import { t } from '../lib/i18n'
import { buildScrollNavItems, centeredScrollWindow, SCROLL_WINDOW_SIZE } from '../lib/scrollNav'
import AppIcon from './AppIcon.vue'
import MessageItem from './MessageItem.vue'
import ScrollNav from './ScrollNav.vue'

const props = defineProps<{
  conversation: StoredConversation
  query: string
  messageMatchOffsets: Map<string, number>
}>()

const INITIAL_WINDOW = SCROLL_WINDOW_SIZE
const LOAD_CHUNK = SCROLL_WINDOW_SIZE
const BOTTOM_THRESHOLD = 96
// 60px header + 12px reading line, matching --header-height in tokens.css.
const ACTIVE_MESSAGE_OFFSET = 72

const scrollEl = ref<HTMLElement | null>(null)
const windowStart = ref(Math.max(0, props.conversation.messages.length - INITIAL_WINDOW))
const windowEnd = ref(props.conversation.messages.length)
const atBottom = ref(true)

const indexedMessages = computed(() =>
  props.conversation.messages.map((message, index) => ({ message, index })),
)

const visibleMessages = computed(() =>
  indexedMessages.value.slice(windowStart.value, windowEnd.value),
)
const hiddenCount = computed(() => windowStart.value)
const laterCount = computed(() =>
  Math.max(0, props.conversation.messages.length - windowEnd.value),
)
const isEmpty = computed(() => props.conversation.messages.length === 0)
const navItems = computed(() => buildScrollNavItems(props.conversation.messages))
const navItemByIndex = computed(
  () => new Map(navItems.value.map((item) => [item.index, item.id])),
)
const activeNavId = ref('')
const navMediaQuery = window.matchMedia('(min-width: 768px)')
const navHoverQuery = window.matchMedia('(hover: hover)')

let activeFrame = 0

function updateActiveNav(): void {
  const element = scrollEl.value
  if (
    !element ||
    !navMediaQuery.matches ||
    !navHoverQuery.matches ||
    navItems.value.length < 2
  ) {
    activeNavId.value = ''
    return
  }

  const threshold = element.getBoundingClientRect().top + ACTIVE_MESSAGE_OFFSET
  let activeId = ''

  for (const messageElement of element.querySelectorAll<HTMLElement>('[data-message-index]')) {
    const itemId = navItemByIndex.value.get(Number(messageElement.dataset.messageIndex))
    if (!itemId) continue
    if (messageElement.getBoundingClientRect().top > threshold) break
    activeId = itemId
  }

  if (!activeId && atBottom.value) {
    activeId = navItems.value[navItems.value.length - 1]?.id ?? ''
  }

  activeNavId.value = activeId
}

function resetWindow(): void {
  windowStart.value = Math.max(0, props.conversation.messages.length - INITIAL_WINDOW)
  windowEnd.value = props.conversation.messages.length
}

async function ensureMessageWindow(index: number): Promise<void> {
  if (index >= windowStart.value && index < windowEnd.value) return
  const nextWindow = centeredScrollWindow(
    props.conversation.messages.length,
    index,
    INITIAL_WINDOW,
  )
  windowStart.value = nextWindow.start
  windowEnd.value = nextWindow.end
  await nextTick()
}

function scrollBehavior(behavior: ScrollBehavior): ScrollBehavior {
  return behavior === 'smooth' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : behavior
}

async function scrollToBottom(behavior: ScrollBehavior = 'smooth'): Promise<void> {
  await nextTick()
  const element = scrollEl.value
  if (!element) return
  element.scrollTo({ top: element.scrollHeight, behavior: scrollBehavior(behavior) })
  atBottom.value = true
  updateActiveNav()
}

async function scrollToLatest(): Promise<void> {
  if (laterCount.value > 0) {
    resetWindow()
    await nextTick()
  }
  await scrollToBottom()
}

async function loadEarlier(): Promise<void> {
  const element = scrollEl.value
  if (!element) return

  const previousHeight = element.scrollHeight
  const previousTop = element.scrollTop
  windowStart.value = Math.max(0, windowStart.value - LOAD_CHUNK)
  await nextTick()
  element.scrollTop = element.scrollHeight - previousHeight + previousTop
  updateActiveNav()
}

async function loadLater(): Promise<void> {
  windowEnd.value = Math.min(
    props.conversation.messages.length,
    windowEnd.value + LOAD_CHUNK,
  )
  await nextTick()
  updateActiveNav()
}

function onScroll(): void {
  const element = scrollEl.value
  if (!element) return
  atBottom.value =
    element.scrollHeight - element.scrollTop - element.clientHeight < BOTTOM_THRESHOLD

  if (activeFrame) return
  activeFrame = window.requestAnimationFrame(() => {
    activeFrame = 0
    updateActiveNav()
  })
}

async function jumpToMessage(index: number): Promise<void> {
  const element = scrollEl.value
  if (!element) return

  await ensureMessageWindow(index)

  const target = element.querySelector<HTMLElement>(`[data-message-index="${index}"]`)
  if (!target) return

  const targetTop =
    target.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop
  element.scrollTo({ top: Math.max(0, targetTop - 12), behavior: scrollBehavior('smooth') })
}

function centerElementInScrollContainer(container: HTMLElement, target: HTMLElement): void {
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

  if (messageIndex >= 0) {
    await ensureMessageWindow(messageIndex)
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
    updateActiveNav()
  },
)

watch(
  () => props.conversation.messages.length,
  async (length, previousLength) => {
    if (length > previousLength) {
      if (windowEnd.value === previousLength) windowEnd.value = length
      if (atBottom.value) await scrollToBottom('auto')
    } else if (length < previousLength) {
      windowStart.value = Math.min(windowStart.value, length)
      windowEnd.value = Math.min(windowEnd.value, length)
    }
    updateActiveNav()
  },
)

watch(navItems, async () => {
  await nextTick()
  updateActiveNav()
})

onMounted(async () => {
  resetWindow()
  if (props.query) {
    scrollEl.value?.scrollTo({ top: 0, behavior: 'auto' })
  } else {
    await scrollToBottom('auto')
  }
  updateActiveNav()
  navMediaQuery.addEventListener('change', updateActiveNav)
  navHoverQuery.addEventListener('change', updateActiveNav)
})

onBeforeUnmount(() => {
  navMediaQuery.removeEventListener('change', updateActiveNav)
  navHoverQuery.removeEventListener('change', updateActiveNav)
  if (activeFrame) window.cancelAnimationFrame(activeFrame)
})

defineExpose({ scrollToBottom, focusMatch })
</script>

<template>
  <div class="message-list-shell">
    <div ref="scrollEl" class="message-list" @scroll.passive="onScroll">
      <div class="message-stream">
        <div v-if="isEmpty" class="messages-empty">
          <strong>{{ t('messages.emptyTitle') }}</strong>
          <p>{{ t('messages.emptyBody') }}</p>
        </div>

        <template v-else>
          <button
            v-if="hiddenCount > 0"
            type="button"
            class="load-earlier"
            @click="loadEarlier"
          >
            {{ t('messages.loadEarlier', { count: Math.min(hiddenCount, LOAD_CHUNK) }) }}
          </button>

          <MessageItem
            v-for="item in visibleMessages"
            :key="`${conversation.id}:${item.message.id}`"
            :message="item.message"
            :index="item.index"
            :query="query"
            :search-start-index="messageOffset(item.message.id)"
          />

          <button
            v-if="laterCount > 0"
            type="button"
            class="load-later"
            @click="loadLater"
          >
            {{ t('messages.loadLater', { count: Math.min(laterCount, LOAD_CHUNK) }) }}
          </button>
        </template>
      </div>
    </div>

    <Transition name="scroll-button">
      <button
        v-if="!atBottom && !isEmpty"
        type="button"
        class="scroll-bottom"
        :aria-label="t('messages.scrollBottom')"
        :title="t('messages.scrollBottom')"
        @click="scrollToLatest()"
      >
        <AppIcon name="arrow-down" :size="16" />
      </button>
    </Transition>

    <ScrollNav :items="navItems" :active-id="activeNavId" @select="jumpToMessage" />
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
  width: 100%;
  max-width: calc(var(--content-width) + var(--content-gutter) * 2);
  min-height: 100%;
  margin: 0 auto;
  padding: 34px var(--content-gutter) 28px;
}

.load-earlier,
.load-later {
  display: block;
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 20px;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.load-earlier {
  margin: 0 auto 24px;
}

.load-later {
  margin: 24px auto 0;
}

.load-earlier:hover,
.load-later:hover {
  background: var(--bg-hover);
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

.messages-empty strong {
  font-size: 14px;
  font-weight: 500;
}

.messages-empty p {
  margin: 5px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.scroll-bottom {
  position: absolute;
  right: max(
    var(--content-gutter),
    calc((100% - var(--content-width) - var(--content-gutter) * 2) / 2 + var(--content-gutter))
  );
  bottom: 18px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-surface);
  color: var(--text-secondary);
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.scroll-bottom:hover {
  border-color: var(--border-strong);
  background: var(--bg-muted);
}

.scroll-button-enter-active,
.scroll-button-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.scroll-button-enter-from,
.scroll-button-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 860px) {
  .message-stream {
    max-width: 100%;
    padding: 24px 18px 24px;
  }
}

@media (max-width: 640px) {
  .message-stream {
    padding: 20px 14px 22px;
  }
}

@media (min-width: 768px) and (max-width: 1140px) {
  .message-stream {
    padding-right: 64px;
  }
}
</style>
