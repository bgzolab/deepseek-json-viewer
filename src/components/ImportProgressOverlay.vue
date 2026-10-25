<script setup lang="ts">
import { computed } from 'vue'
import type { ImportProgress } from '../types/import'
import { t } from '../lib/i18n'
import ModalShell from './ModalShell.vue'

const props = defineProps<{
  open: boolean
  progress: ImportProgress
}>()

const percentage = computed(() => {
  if (props.progress.phase !== 'saving' || props.progress.total === 0) return 0
  return Math.min(100, Math.round((props.progress.written / props.progress.total) * 100))
})

const phaseLabel = computed(() => {
  if (props.progress.phase === 'parsing') return t('import.phaseParsing')
  if (props.progress.phase === 'saving') return t('import.phaseSaving')
  return t('import.phasePreparing')
})
</script>

<template>
  <ModalShell
    :open="open"
    :title="t('import.title')"
    width="sm"
    :dismissible="false"
  >
    <div class="progress-summary">
      <span class="spinner" />
      <span>{{ phaseLabel }}</span>
      <span v-if="progress.phase === 'saving'" class="progress-count">
        {{ progress.written }} / {{ progress.total }}
      </span>
      <span v-else-if="progress.fileCount > 0" class="progress-count">
        {{ Math.max(1, progress.fileIndex) }} / {{ progress.fileCount }}
      </span>
    </div>

    <div
      class="progress-track"
      :class="{ 'is-indeterminate': progress.phase !== 'saving' }"
      role="progressbar"
      :aria-valuenow="progress.phase === 'saving' ? percentage : undefined"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span
        class="progress-fill"
        :style="progress.phase === 'saving' ? { width: `${percentage}%` } : undefined"
      />
    </div>

    <p v-if="progress.fileName" class="progress-file">{{ progress.fileName }}</p>
    <p class="progress-note">{{ t('import.note') }}</p>
  </ModalShell>
</template>

<style scoped>
.progress-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 20px;
}

.progress-summary .spinner {
  width: 15px;
  height: 15px;
  color: var(--brand);
}

.progress-count {
  margin-left: auto;
  color: var(--text-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.progress-track {
  height: 4px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bg-hover);
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
  transition: width 240ms var(--ease-out);
}

.progress-track.is-indeterminate .progress-fill {
  width: 36%;
  animation: indeterminate 1.1s ease-in-out infinite;
}

@keyframes indeterminate {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(310%);
  }
}

.progress-file {
  margin: 12px 0 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-note {
  margin: 3px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 18px;
}
</style>
