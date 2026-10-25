<script setup lang="ts">
import { computed } from 'vue'
import { computeChatStats } from '../lib/stats'
import {
  buildCsvReport,
  buildMarkdownReport,
  computeChatReport,
  formatDay,
  formatNumber,
} from '../lib/report'
import { useChatStore } from '../stores/chatStore'
import AppIcon from './AppIcon.vue'
import ModalShell from './ModalShell.vue'
import StatsInsights from './StatsInsights.vue'
import StatsTrendChart from './StatsTrendChart.vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  select: [id: string]
}>()

const store = useChatStore()
const stats = computed(() => computeChatStats(store.state.conversations))
const report = computed(() => computeChatReport(store.state.conversations))

function formatDecimal(value: number): string {
  return value >= 100 ? formatNumber(Math.round(value)) : value.toFixed(1)
}

function fileDate(timestamp = Date.now()): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function downloadFile(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function exportMarkdown(): void {
  downloadFile(
    `deepseek-stats-${fileDate()}.md`,
    buildMarkdownReport(stats.value, report.value),
    'text/markdown;charset=utf-8',
  )
}

function exportCsv(): void {
  downloadFile(
    `deepseek-stats-${fileDate()}.csv`,
    `\uFEFF${buildCsvReport(stats.value, report.value)}`,
    'text/csv;charset=utf-8',
  )
}
</script>

<template>
  <ModalShell
    :open="open"
    width="lg"
    title="数据统计"
    description="仅统计当前浏览器中保存的本地会话。"
    @close="emit('close')"
  >
    <template #icon>
      <AppIcon name="chart" :size="19" />
    </template>

    <div v-if="stats.conversationCount > 0" class="stats">
      <div class="stats-grid">
        <div class="stat-cell">
          <span class="stat-label">会话</span>
          <strong>{{ formatNumber(stats.conversationCount) }}</strong>
        </div>
        <div class="stat-cell">
          <span class="stat-label">消息</span>
          <strong>{{ formatNumber(stats.messageCount) }}</strong>
          <span class="stat-foot">
            用户 {{ formatNumber(stats.userMessageCount) }} · 助手
            {{ formatNumber(stats.assistantMessageCount) }}
          </span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">字数</span>
          <strong>{{ formatNumber(stats.characterCount) }}</strong>
          <span class="stat-foot">含推理内容，不含空白</span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">时间跨度</span>
          <strong>{{ stats.spanDays > 0 ? `${formatNumber(stats.spanDays)} 天` : '—' }}</strong>
          <span class="stat-foot">
            {{ formatDay(stats.earliest) }} – {{ formatDay(stats.latest) }}
          </span>
        </div>
      </div>

      <p class="stats-summary">
        平均每会话 {{ formatDecimal(stats.averageMessagesPerConversation) }} 条消息 ·
        日均 {{ formatDecimal(stats.messagesPerDay) }} 条 ·
        平均每条 {{ formatDecimal(stats.averageCharactersPerMessage) }} 字
      </p>

      <StatsTrendChart :conversations="store.state.conversations" />

      <StatsInsights :report="report" :stats="stats" @select="emit('select', $event)" />

      <section class="conversation-section" aria-label="会话明细">
        <div class="section-heading">
          <h3>会话明细</h3>
          <span>按时间从早到晚</span>
        </div>

        <div class="table-wrap">
          <table class="stats-table">
            <thead>
              <tr>
                <th scope="col">会话</th>
                <th scope="col">时间</th>
                <th scope="col" class="is-number">消息</th>
                <th scope="col" class="is-number">字数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in stats.conversations" :key="row.id">
                <td class="is-title">
                  <span :title="row.title || '未命名会话'">{{ row.title || '未命名会话' }}</span>
                </td>
                <td class="is-date">{{ formatDay(row.startedAt) }}</td>
                <td class="is-number">{{ formatNumber(row.messageCount) }}</td>
                <td class="is-number">{{ formatNumber(row.characterCount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div v-else class="stats-empty">
      <span class="stats-empty-icon"><AppIcon name="chart" :size="22" /></span>
      <strong>还没有可统计的会话</strong>
      <p>导入 DeepSeek 导出的 JSON 后，这里会汇总会话、消息和字数。</p>
    </div>

    <template #footer>
      <span class="export-note">导出在本地生成，不会上传数据</span>
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="stats.conversationCount === 0"
        @click="exportMarkdown"
      >
        导出 Markdown
      </button>
      <button
        type="button"
        class="btn btn-ghost"
        :disabled="stats.conversationCount === 0"
        @click="exportCsv"
      >
        导出 CSV
      </button>
      <button type="button" class="btn btn-primary" @click="emit('close')">关闭</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-muted);
}

.stat-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  padding: 11px 12px;
  border-right: 1px solid var(--border);
}

.stat-cell:last-child {
  border-right: 0;
}

.stat-label {
  color: var(--text-tertiary);
  font-size: 11px;
}

.stat-cell strong {
  color: var(--text);
  font-size: 19px;
  font-weight: 500;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}

.stat-foot {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 10.5px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-summary {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.6;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.section-heading h3 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
}

.section-heading span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.table-wrap {
  max-height: 300px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.stats-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 7px 12px;
  background: var(--bg-muted);
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
}

.stats-table td {
  padding: 7px 12px;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  vertical-align: top;
}

.stats-table tbody tr:hover {
  background: var(--bg-hover);
}

.stats-table .is-title {
  width: 100%;
  color: var(--text);
}

.stats-table .is-title span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-table .is-date {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.stats-table .is-number {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.stats-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 26px 20px 30px;
  text-align: center;
}

.stats-empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-bottom: 10px;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
}

.stats-empty strong {
  font-size: 13px;
  font-weight: 500;
}

.stats-empty p {
  margin: 5px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 1.6;
}

.export-note {
  margin-right: auto;
  color: var(--text-tertiary);
  font-size: 10.5px;
}

@media (max-width: 560px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-cell {
    border-bottom: 1px solid var(--border);
  }

  .stat-cell:nth-child(2n) {
    border-right: 0;
  }

  .stat-cell:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .export-note {
    display: none;
  }
}
</style>
