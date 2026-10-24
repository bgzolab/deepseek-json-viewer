<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import ModalShell from './ModalShell.vue'

withDefaults(
  defineProps<{
    open: boolean
    title: string
    message: string
    detail?: string
    confirmLabel?: string
    cancelLabel?: string
    danger?: boolean
    busy?: boolean
  }>(),
  {
    detail: '',
    confirmLabel: '确认',
    cancelLabel: '取消',
    danger: false,
    busy: false,
  },
)

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <ModalShell :open="open" width="sm" @close="emit('close')">
    <template #header>
      <div class="confirm-heading">
        <div class="confirm-icon" :class="{ 'is-danger': danger }">
          <AppIcon :name="danger ? 'alert' : 'info'" :size="19" />
        </div>
        <div>
          <h2>{{ title }}</h2>
          <p>{{ message }}</p>
        </div>
      </div>
    </template>

    <p v-if="detail" class="confirm-detail">{{ detail }}</p>

    <template #footer>
      <button type="button" class="btn btn-ghost" :disabled="busy" @click="emit('close')">
        {{ cancelLabel }}
      </button>
      <button
        type="button"
        class="btn"
        :class="danger ? 'btn-danger' : 'btn-primary'"
        :disabled="busy"
        @click="emit('confirm')"
      >
        <span v-if="busy" class="spinner" />
        <span>{{ confirmLabel }}</span>
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.confirm-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 11px;
  background: var(--brand-soft);
  color: var(--brand);
}

.confirm-icon.is-danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.confirm-heading h2 {
  margin: 1px 0 0;
  font-size: 17px;
  font-weight: 650;
}

.confirm-heading p {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.confirm-detail {
  margin: 15px 0 0;
  padding: 11px 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.6;
}
</style>
