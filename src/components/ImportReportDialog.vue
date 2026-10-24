<script setup lang="ts">
import { computed } from 'vue'
import type { ImportFileOutcome, ImportReport } from '../types/import'
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
  if (!props.report) return '导入结果'
  if (props.report.fatalError) return '导入中断'

  const totals = props.report.totals
  if (totals.scannedFiles > 0 && totals.failedFiles === totals.scannedFiles) {
    return '导入失败'
  }
  if (totals.failedFiles > 0) return '导入完成，部分文件失败'
  if (totals.newConversations === 0) return '没有新增会话'
  return '导入完成'
})

const description = computed(() => {
  if (!props.report) return ''
  if (props.report.fatalError) return '导入过程中出现错误，已尽量保留此前写入的数据。'

  const totals = props.report.totals
  if (totals.scannedFiles > 0 && totals.failedFiles === totals.scannedFiles) {
    return '没有文件成功导入，请查看下方失败原因。'
  }
  if (totals.newConversations === 0 && totals.mergedDuplicates === 0) {
    return '这些文件里的会话已经在本地缓存中，没有重复写入。'
  }
  return `已解析 ${totals.parsedConversations} 个会话，全部数据都保存在当前浏览器。`
})

function fileSummary(file: ImportFileOutcome): string {
  if (file.status === 'error') return '解析失败'
  const parts = [`${file.conversationCount} 个会话`]
  if (file.newConversations > 0) parts.push(`新增 ${file.newConversations}`)
  if (file.mergedDuplicates > 0) parts.push(`合并 ${file.mergedDuplicates}`)
  if (file.skippedDuplicates > 0) parts.push(`跳过 ${file.skippedDuplicates}`)
  return parts.join(' · ')
}
</script>

<template>
  <ModalShell
    :open="open"
    width="lg"
    title="导入结果"
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
          <span class="stat-label">扫描文件</span>
          <strong>{{ totals.scannedFiles }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">识别会话</span>
          <strong>{{ totals.parsedConversations }}</strong>
        </div>
        <div class="stat-card is-accent">
          <span class="stat-label">新增会话</span>
          <strong>{{ totals.newConversations }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">跳过重复</span>
          <strong>{{ totals.skippedDuplicates }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">合并重复</span>
          <strong>{{ totals.mergedDuplicates }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">新增消息</span>
          <strong>{{ totals.newMessages }}</strong>
        </div>
        <div class="stat-card" :class="{ 'is-danger': totals.failedFiles > 0 }">
          <span class="stat-label">失败文件</span>
          <strong>{{ totals.failedFiles }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">警告</span>
          <strong>{{ totals.warnings }}</strong>
        </div>
      </div>

      <div v-if="report.fatalError" class="report-alert">
        <AppIcon name="alert" :size="16" />
        <span>{{ report.fatalError }}</span>
      </div>

      <div class="file-section">
        <div class="section-heading">
          <h4>文件明细</h4>
          <span>{{ report.files.length }} 个文件</span>
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
                {{ file.status === 'error' ? '失败' : file.status === 'warning' ? '有警告' : '成功' }}
              </span>
            </div>

            <p v-if="file.error" class="file-error">{{ file.error }}</p>

            <details v-if="file.warnings.length" class="file-warnings">
              <summary>{{ file.warnings.length }} 条提示</summary>
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
        开始浏览
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
  background: var(--bg-surface);
}

.file-row {
  padding: 10px 12px;
  border-top: 1px solid var(--border);
  background: var(--bg-surface);
}

.file-row:first-child {
  border-top: 0;
}

.file-row.is-error {
  background: #fffafa;
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
