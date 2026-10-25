<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { acquireModalInert, releaseModalInert } from '../lib/modalStack'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    description?: string
    width?: 'sm' | 'md' | 'lg'
    dismissible?: boolean
  }>(),
  {
    title: '',
    description: '',
    width: 'md',
    dismissible: true,
  },
)

const emit = defineEmits<{
  close: []
}>()

const panel = ref<HTMLElement | null>(null)
let inertHeld = false
let returnFocusTo: HTMLElement | null = null

function requestClose(): void {
  if (!props.dismissible) return
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.open) return
  if (event.key === 'Escape') {
    event.preventDefault()
    requestClose()
  }
}

watch(
  () => props.open,
  async (open, wasOpen) => {
    if (open && !inertHeld) {
      returnFocusTo =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      inertHeld = true
      acquireModalInert()
    } else if (!open && wasOpen && inertHeld) {
      inertHeld = false
      releaseModalInert()
      await nextTick()
      returnFocusTo?.focus()
      returnFocusTo = null
    }

    if (!open) return
    await nextTick()
    panel.value?.focus()
  },
  { immediate: true },
)

document.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  if (inertHeld) {
    inertHeld = false
    releaseModalInert()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="modal-layer" @mousedown.self="requestClose">
        <section
          ref="panel"
          class="modal-panel"
          :class="`is-${width}`"
          role="dialog"
          aria-modal="true"
          :aria-label="title || undefined"
          tabindex="-1"
        >
          <header v-if="title || $slots.header || dismissible" class="modal-head">
            <slot name="header">
              <div class="modal-title-wrap">
                <div v-if="$slots.icon" class="modal-icon"><slot name="icon" /></div>
                <div>
                  <h2 v-if="title">{{ title }}</h2>
                  <p v-if="description">{{ description }}</p>
                </div>
              </div>
            </slot>
            <button
              v-if="dismissible"
              type="button"
              class="icon-button modal-close"
              aria-label="关闭"
              @click="requestClose"
            >
              <AppIcon name="x" :size="17" />
            </button>
          </header>

          <div class="modal-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-layer {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-overlay);
}

.modal-panel {
  display: flex;
  flex-direction: column;
  width: min(100%, 560px);
  max-height: min(86vh, 760px);
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-md);
  outline: none;
}

.modal-panel.is-sm {
  width: min(100%, 430px);
}

.modal-panel.is-lg {
  width: min(100%, 720px);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 20px 0;
}

.modal-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: 10px;
  background: var(--brand-soft);
  color: var(--brand);
}

.modal-title-wrap h2 {
  margin: 1px 0 0;
  font-size: 16px;
  font-weight: 500;
}

.modal-title-wrap p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.modal-close {
  margin: -4px -5px 0 0;
  flex: none;
}

.modal-body {
  min-height: 0;
  padding: 18px 20px;
  overflow: auto;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px 20px;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition:
    transform 220ms var(--ease-out),
    opacity 180ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: translateY(8px) scale(0.985);
  opacity: 0;
}

@media (max-width: 560px) {
  .modal-layer {
    align-items: flex-end;
    padding: 10px;
  }

  .modal-panel,
  .modal-panel.is-sm,
  .modal-panel.is-lg {
    width: 100%;
    max-height: 92vh;
    border-radius: 16px;
  }

  .modal-head {
    padding: 18px 16px 0;
  }

  .modal-body {
    padding: 16px;
  }

  .modal-footer {
    padding: 0 16px 16px;
  }
}
</style>
