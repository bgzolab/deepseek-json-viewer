<script setup lang="ts">
import { computed } from 'vue'
import type { ImportFileOutcome, ImportReport } from '../types/import'
import { t } from '../lib/i18n'
import { formatFileSize } from '../lib/time'
import AppIcon from './AppIcon.vue'
import ModalShell from './ModalShell.vue'

const props = defineProps<{
  open: boolean
  report: ImportReport | null
}>()

const emit = defineEmits<{
  close: []
}>()

const totals = computed(() => props.report?.totals ?? null)

const tone = computed<'success' | 'warning' | 'danger'>(() => {
  if (!props.report) return 'success'
  if (props.report.fatalError || props.report.totals.failedFiles > 0) return 'danger'
  if (props.report.totals.skippedDuplicates > 0 || props.report.totals.warnings > 0) return 'warning'
  return 'success'
})

const title = computed(() => {
  if (!props.report) return t('importReport.title')
  if (props.report.fatalError) return t('importReport.interrupted')

  const totals = props.report.totals
  if (totals.scannedFiles > 0 && totals.failedFiles === totals.scannedFiles) {
    return t('importReport.failed')
  }
  if (totals.failedFiles > 0) return t('importReport.partial')
  if (totals.newConversations === 0) return t('importReport.noNew')
  return t('importReport.complete')
})

const description = computed(() => {
  if (!props.report) return ''
  if (props.report.fatalError) return t('importReport.interruptedBody')

  const totals = props.report.totals
  if (totals.scannedFiles > 0 && totals.failedFiles === totals.scannedFiles) {
    return t('importReport.allFailedBody')
  }
  if (totals.newConversations === 0 && totals.mergedDuplicates === 0) {
    return t('importReport.allDuplicatesBody')
  }
  return t('importReport.parsedBody', {
    count: totals.parsedConversations,
    conversations: totals.parsedConversations,
  })
})

function fileSummary(file: ImportFileOutcome): string {
  if (file.status === 'error') return t('importReport.fileParseFailed')
  const parts = [
    t('importReport.fileSummary', {
      count: file.conversationCount,
      conversations: file.conversationCount,
    }),
  ]
  if (file.newConversations > 0) {
    parts.push(t('importReport.fileNew', { count: file.newConversations }))
  }
  if (file.mergedDuplicates > 0) {
    parts.push(t('importReport.fileMerged', { count: file.mergedDuplicates }))
  }
  if (file.skippedDuplicates > 0) {
    parts.push(t('importReport.fileSkipped', { count: file.skippedDuplicates }))
  }
  return parts.join(' · ')
}
</script>

<template>
  <ModalShell
    :open="open"
    width="lg"
    :title="t('importReport.title')"
    @close="emit('close')"
  >
    <template #icon>
      <AppIcon :name="tone === 'danger' ? 'alert' : tone === 'warning' ? 'info' : 'check'" :size="19" />
    </template>

    <div v-if="report && totals" class="report">
      <div class="report-hero" :class="`is-${tone}`">
        <div class="report-hero-icon">
          <AppIcon :name="tone === 'danger' ? 'alert' : tone === 'warning' ? 'info' : 'check'" :size="20" />
        </div>
        <div>
          <h3>{{ title }}</h3>
          <p>{{ description }}</p>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-label">{{ t('importReport.scannedFiles') }}</span>
          <strong>{{ totals.scannedFiles }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('importReport.parsedConversations') }}</span>
          <strong>{{ totals.parsedConversations }}</strong>
        </div>
        <div class="stat-card is-accent">
          <span class="stat-label">{{ t('importReport.newConversations') }}</span>
          <strong>{{ totals.newConversations }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('importReport.skippedDuplicates') }}</span>
          <strong>{{ totals.skippedDuplicates }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('importReport.mergedDuplicates') }}</span>
          <strong>{{ totals.mergedDuplicates }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('importReport.newMessages') }}</span>
          <strong>{{ totals.newMessages }}</strong>
        </div>
        <div class="stat-card" :class="{ 'is-danger': totals.failedFiles > 0 }">
          <span class="stat-label">{{ t('importReport.failedFiles') }}</span>
          <strong>{{ totals.failedFiles }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">{{ t('importReport.warnings') }}</span>
          <strong>{{ totals.warnings }}</strong>
        </div>
      </div>

      <div v-if="report.fatalError" class="report-alert">
        <AppIcon name="alert" :size="16" />
        <span>{{ report.fatalError }}</span>
      </div>

      <div class="file-section">
        <div class="section-heading">
          <h4>{{ t('importReport.fileDetails') }}</h4>
          <span>{{ t('importReport.fileCount', { count: report.files.length }) }}</span>
        </div>
        <div class="file-list">
          <article
            v-for="(file, fileIndex) in report.files"
            :key="`${fileIndex}-${file.name}-${file.size}`"
            class="file-row"
            :class="`is-${file.status}`"
          >
            <div class="file-row-main">
              <span class="file-status-dot" />
              <div class="file-info">
                <div class="file-name" :title="file.name">{{ file.name }}</div>
                <div class="file-meta">
                  <span>{{ formatFileSize(file.size) }}</span>
                  <span v-if="file.shape">· {{ file.shape }}</span>
                  <span v-if="file.conversationCount > 0">· {{ fileSummary(file) }}</span>
                </div>
              </div>
              <span class="file-result" :class="`is-${file.status}`">
                <AppIcon
                  :name="file.status === 'error' ? 'alert' : file.status === 'warning' ? 'info' : 'check'"
                  :size="14"
                />
                {{
                  file.status === 'error'
                    ? t('importReport.statusError')
                    : file.status === 'warning'
                      ? t('importReport.statusWarning')
                      : t('importReport.statusSuccess')
                }}
              </span>
            </div>

            <p v-if="file.error" class="file-error">{{ file.error }}</p>

            <details v-if="file.warnings.length" class="file-warnings">
              <summary>{{ t('importReport.warningCount', { count: file.warnings.length }) }}</summary>
              <ul>
                <li v-for="(warning, index) in file.warnings" :key="index">{{ warning }}</li>
              </ul>
            </details>
          </article>
        </div>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-primary" @click="emit('close')">
        <AppIcon name="message" :size="15" />
        {{ t('importReport.startBrowsing') }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.report {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-hero {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.report-hero-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  background: var(--success-soft);
  color: var(--success);
}

.report-hero.is-warning .report-hero-icon {
  background: var(--warning-soft);
  color: var(--warning);
}

.report-hero.is-danger .report-hero-icon {
  background: var(--danger-soft);
  color: var(--danger);
}

.report-hero h3 {
  margin: 1px 0 0;
  font-size: 15px;
  font-weight: 500;
}

.report-hero p {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-muted);
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 10px 12px;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.stat-card:nth-child(4n) {
  border-right: 0;
}

.stat-card:nth-last-child(-n + 4) {
  border-bottom: 0;
}

.stat-label {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-card strong {
  color: var(--text);
  font-size: 19px;
  font-weight: 500;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

.stat-card.is-accent strong {
  color: var(--brand);
}

.stat-card.is-danger strong {
  color: var(--danger);
}

.report-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--danger-soft);
  color: var(--danger);
  font-size: 12px;
  line-height: 1.55;
}

.file-section {
  min-width: 0;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-heading h4 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
}

.section-heading span {
  color: var(--text-tertiary);
  font-size: 11.5px;
}

.file-list {
  max-height: 280px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
}

.file-row {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
}

.file-row:first-child {
  border-top: 0;
}

.file-row.is-error {
  background: var(--danger-soft);
}

.file-row-main {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}

.file-status-dot {
  width: 7px;
  height: 7px;
  margin-top: 6px;
  flex: none;
  border-radius: 50%;
  background: var(--success);
}

.is-warning .file-status-dot {
  background: var(--warning);
}

.is-error .file-status-dot {
  background: var(--danger);
}

.file-info {
  min-width: 0;
  flex: 1;
}

.file-name {
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 560;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.5;
}

.file-result {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  color: var(--success);
  font-size: 11px;
  white-space: nowrap;
}

.file-result.is-warning {
  color: var(--warning);
}

.file-result.is-error {
  color: var(--danger);
}

.file-error {
  margin: 7px 0 0 16px;
  color: var(--danger);
  font-size: 11.5px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.file-warnings {
  margin: 6px 0 0 16px;
  color: var(--text-secondary);
  font-size: 11.5px;
}

.file-warnings summary {
  width: fit-content;
  cursor: pointer;
  color: var(--warning);
  font-size: 11px;
  user-select: none;
}

.file-warnings ul {
  margin: 5px 0 0;
  padding-left: 16px;
}

.file-warnings li {
  margin: 2px 0;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

@media (max-width: 560px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-card:nth-child(4n) {
    border-right: 1px solid var(--border);
  }

  .stat-card:nth-child(2n) {
    border-right: 0;
  }

  .stat-card:nth-last-child(-n + 4) {
    border-bottom: 1px solid var(--border);
  }

  .stat-card:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .file-list {
    max-height: 240px;
  }
}
</style>
