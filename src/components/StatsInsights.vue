<script setup lang="ts">
import { computed, ref } from 'vue'
import { conversationTitle } from '../lib/conversationTitle'
import { locale, t } from '../lib/i18n'
import type { ChatStats } from '../lib/stats'
import {
  formatDay,
  formatDecimal,
  formatDuration,
  formatNumber,
  formatPercent,
  type ChatReport,
  type ConversationRank,
} from '../lib/report'
import AppIcon from './AppIcon.vue'

type RankMetric = 'messages' | 'characters' | 'duration'

const props = defineProps<{
  report: ChatReport
  stats: ChatStats
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const rankMetric = ref<RankMetric>('messages')
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(
      new Date(2026, 0, 5 + index),
    ),
  ),
)
const hourLabels = new Set([0, 6, 12, 18, 23])

const rankTabs = computed<Array<{ value: RankMetric; label: string }>>(() => [
  { value: 'messages', label: t('insights.metricMessages') },
  { value: 'characters', label: t('insights.metricCharacters') },
  { value: 'duration', label: t('insights.metricDuration') },
])

const activityCards = computed(() => {
  const activity = props.report.activity
  return [
    {
      label: t('insights.activeDays'),
      value: t('unit.days', { count: activity.activeDays }),
      foot: t('insights.activeDaysFoot'),
    },
    {
      label: t('insights.longestStreak'),
      value: t('unit.days', { count: activity.longestStreak }),
      foot: t('insights.longestStreakFoot'),
    },
    {
      label: t('insights.recentStreak'),
      value: t('unit.days', { count: activity.recentStreak }),
      foot: t('insights.recentStreakFoot'),
    },
    {
      label: t('insights.peakDay'),
      value: formatDay(activity.peakDay?.start ?? null),
      foot: activity.peakDay
        ? t('insights.peakDayFoot', { count: activity.peakDay.count })
        : t('insights.noData'),
    },
  ]
})

function heatLevel(count: number): number {
  if (count <= 0 || props.report.activity.heatmapMax <= 0) return 0
  return Math.max(1, Math.ceil((count / props.report.activity.heatmapMax) * 4))
}

function heatStyle(count: number): Record<string, string> {
  const level = heatLevel(count)
  if (level === 0) return {}
  const alpha = [0.14, 0.32, 0.54, 0.78, 1][level - 1] ?? 0.14
  return { backgroundColor: `rgba(57, 100, 254, ${alpha})` }
}

function rankValue(row: ConversationRank): string {
  if (rankMetric.value === 'messages') return t('unit.messages', { count: row.messages })
  if (rankMetric.value === 'characters') return t('unit.characters', { count: row.characters })
  return formatDuration(row.durationMs)
}

function rankScore(row: ConversationRank): number {
  if (rankMetric.value === 'messages') return row.messages
  if (rankMetric.value === 'characters') return row.characters
  return row.durationMs
}

const rankedConversations = computed(() =>
  [...props.report.conversations]
    .sort((left, right) => rankScore(right) - rankScore(left))
    .slice(0, 10),
)

const maxLengthCount = computed(() =>
  Math.max(1, ...props.report.lengthDistribution.map((bucket) => bucket.count)),
)

const qa = computed(() => {
  const content = props.report.content
  const averageUser =
    content.userMessages > 0 ? content.userCharacters / content.userMessages : 0
  const averageAssistant =
    content.assistantMessages > 0 ? content.assistantCharacters / content.assistantMessages : 0
  const max = Math.max(1, averageUser, averageAssistant)
  return {
    averageUser,
    averageAssistant,
    ratio: averageUser > 0 ? averageAssistant / averageUser : 0,
    userWidth: (averageUser / max) * 100,
    assistantWidth: (averageAssistant / max) * 100,
  }
})

const maxModelMessages = computed(() => {
  let max = 1
  for (const model of props.report.models) max = Math.max(max, model.messages)
  return max
})

const contentCards = computed(() => {
  const content = props.report.content
  return [
    {
      label: t('insights.reasoningReplies'),
      value: formatPercent(content.reasoningMessages, content.assistantMessages),
      foot: t('insights.reasoningFoot', {
        with: content.reasoningMessages,
        count: content.assistantMessages,
      }),
    },
    {
      label: t('insights.reasoningCharacters'),
      value: formatNumber(content.reasoningCharacters),
      foot: t('insights.reasoningIncluded'),
    },
    {
      label: t('insights.references'),
      value: formatNumber(content.references),
      foot: t('insights.referenceFoot', { count: content.referenceMessages }),
    },
    {
      label: t('insights.attachments'),
      value: formatNumber(content.attachments),
      foot: t('insights.attachmentFoot', { count: content.attachmentMessages }),
    },
  ]
})
</script>

<template>
  <div class="insights">
    <section class="insight-section" :aria-label="t('insights.activityAria')">
      <div class="section-heading">
        <h3>{{ t('insights.activity') }}</h3>
        <span>{{ t('insights.activitySub') }}</span>
      </div>

      <div class="metric-grid">
        <div v-for="card in activityCards" :key="card.label" class="metric-cell">
          <span class="metric-label">{{ card.label }}</span>
          <strong>{{ card.value }}</strong>
          <span class="metric-foot">{{ card.foot }}</span>
        </div>
      </div>

      <div class="heatmap-card">
        <div class="heatmap-head">
          <h4>{{ t('insights.habits') }}</h4>
          <div class="heatmap-legend">
            <span>{{ t('insights.less') }}</span>
            <i class="heat-level is-1" />
            <i class="heat-level is-2" />
            <i class="heat-level is-3" />
            <i class="heat-level is-4" />
            <span>{{ t('insights.more') }}</span>
            <span class="heatmap-note">{{ t('insights.localTime') }}</span>
          </div>
        </div>

        <div class="heatmap-hours" aria-hidden="true">
          <span />
          <span v-for="hour in 24" :key="hour">
            {{ hourLabels.has(hour - 1) ? hour - 1 : '' }}
          </span>
        </div>

        <div class="heatmap" role="img" :aria-label="t('insights.heatmapAria')">
          <template v-for="(label, row) in weekdays" :key="label">
            <span class="heatmap-day">{{ label }}</span>
            <span
              v-for="(count, hour) in report.activity.heatmap[row]"
              :key="`${row}-${hour}`"
              class="heatmap-cell"
              :class="{ 'is-empty': count === 0 }"
              :style="heatStyle(count)"
              :title="t('insights.heatmapCell', { day: label, hour, count })"
            />
          </template>
        </div>
      </div>
    </section>

    <section class="insight-section" :aria-label="t('insights.ranking')">
      <div class="section-heading">
        <h3>{{ t('insights.ranking') }}</h3>
        <div class="rank-switch" role="group" :aria-label="t('insights.rankMetricAria')">
          <button
            v-for="tab in rankTabs"
            :key="tab.value"
            type="button"
            :class="{ 'is-active': rankMetric === tab.value }"
            :aria-pressed="rankMetric === tab.value"
            @click="rankMetric = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div v-if="rankedConversations.length > 0" class="rank-list">
        <button
          v-for="(row, index) in rankedConversations"
          :key="row.id"
          type="button"
          class="rank-row"
          @click="emit('select', row.id)"
        >
          <span class="rank-index">{{ index + 1 }}</span>
          <span class="rank-copy">
            <span class="rank-title">
              {{ conversationTitle(row.title, t('conversation.untitled')) }}
            </span>
            <span class="rank-meta">
              {{ t('unit.messageCount', { count: row.messages }) }} ·
              {{ t('unit.characters', { count: row.characters }) }}
            </span>
          </span>
          <span class="rank-value">{{ rankValue(row) }}</span>
        </button>
      </div>
      <p v-else class="insight-empty">{{ t('insights.noRanked') }}</p>
    </section>

    <div class="insight-grid">
      <section class="insight-card" :aria-label="t('insights.lengthDistribution')">
        <div class="card-heading">
          <h4>{{ t('insights.lengthDistribution') }}</h4>
          <span>{{ t('insights.byMessages') }}</span>
        </div>
        <div class="dist-list">
          <div v-for="bucket in report.lengthDistribution" :key="bucket.label" class="dist-row">
            <span class="dist-label">{{ bucket.label }}</span>
            <span class="dist-track">
              <span
                class="dist-fill"
                :style="{ width: `${(bucket.count / maxLengthCount) * 100}%` }"
              />
            </span>
            <span class="dist-value">
              {{ formatNumber(bucket.count) }}
              <small>{{ formatPercent(bucket.count, stats.conversationCount) }}</small>
            </span>
          </div>
        </div>
      </section>

      <section class="insight-card" :aria-label="t('insights.qaHeading')">
        <div class="card-heading">
          <h4>{{ t('insights.qaHeading') }}</h4>
          <span>{{ t('insights.qaSub') }}</span>
        </div>
        <div class="qa-list">
          <div class="qa-row">
            <span class="qa-label">{{ t('insights.me') }}</span>
            <span class="qa-track">
              <span class="qa-fill is-user" :style="{ width: `${qa.userWidth}%` }" />
            </span>
            <span class="qa-value">
              {{ t('unit.characters', { count: Math.round(qa.averageUser) }) }}
            </span>
          </div>
          <div class="qa-row">
            <span class="qa-label">DeepSeek</span>
            <span class="qa-track">
              <span class="qa-fill is-assistant" :style="{ width: `${qa.assistantWidth}%` }" />
            </span>
            <span class="qa-value">
              {{ t('unit.characters', { count: Math.round(qa.averageAssistant) }) }}
            </span>
          </div>
        </div>
        <p class="card-note">
          {{
            qa.ratio > 0
              ? t('insights.qaRatio', { ratio: formatDecimal(qa.ratio) })
              : t('insights.qaNotEnough')
          }}
        </p>
      </section>

      <section class="insight-card" :aria-label="t('insights.modelsHeading')">
        <div class="card-heading">
          <h4>{{ t('insights.modelsHeading') }}</h4>
          <span>{{ t('insights.modelCount', { count: report.modelCount }) }}</span>
        </div>
        <div class="model-list">
          <div v-for="model in report.models" :key="model.model" class="model-row">
            <div class="model-copy">
              <span class="model-name" :title="model.model">{{ model.model }}</span>
              <span class="model-meta">
                {{ t('unit.conversationCount', { count: model.conversations }) }} ·
                {{ t('unit.messageCount', { count: model.messages }) }}
              </span>
            </div>
            <span class="model-share">
              {{ formatPercent(model.messages, stats.messageCount) }}
            </span>
            <span class="model-track">
              <span
                class="model-fill"
                :style="{ width: `${(model.messages / maxModelMessages) * 100}%` }"
              />
            </span>
          </div>
        </div>
      </section>

      <section class="insight-card" :aria-label="t('insights.contentHeading')">
        <div class="card-heading">
          <h4>{{ t('insights.contentHeading') }}</h4>
          <span>{{ t('insights.contentSub') }}</span>
        </div>
        <div class="content-grid">
          <div v-for="card in contentCards" :key="card.label" class="content-cell">
            <span class="content-label">{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <span class="content-foot">{{ card.foot }}</span>
          </div>
        </div>
      </section>
    </div>

    <p v-if="report.conversations.length === 0" class="insight-empty">
      <AppIcon name="chart" :size="16" />
      {{ t('insights.noAnalyzable') }}
    </p>
  </div>
</template>

<style scoped>
.insights {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.insight-section {
  min-width: 0;
}

.section-heading,
.card-heading,
.heatmap-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-heading {
  margin-bottom: 8px;
}

.section-heading h3 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
}

.section-heading > span,
.card-heading > span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-muted);
}

.metric-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-right: 1px solid var(--border);
}

.metric-cell:last-child {
  border-right: 0;
}

.metric-label {
  color: var(--text-tertiary);
  font-size: 11px;
}

.metric-cell strong {
  overflow: hidden;
  color: var(--text);
  font-size: 17px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.metric-foot {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 10.5px;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heatmap-card {
  margin-top: 10px;
  padding: 10px 12px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.heatmap-head {
  margin-bottom: 8px;
}

.heatmap-head h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
}

.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-tertiary);
  font-size: 10.5px;
}

.heatmap-note {
  margin-left: 6px;
}

.heat-level {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  background: var(--brand);
}

.heat-level.is-1 {
  opacity: 0.18;
}

.heat-level.is-2 {
  opacity: 0.38;
}

.heat-level.is-3 {
  opacity: 0.6;
}

.heat-level.is-4 {
  opacity: 0.85;
}

.heatmap-hours,
.heatmap {
  display: grid;
  grid-template-columns: 26px repeat(24, minmax(0, 1fr));
  gap: 2px;
}

.heatmap-hours {
  margin-bottom: 3px;
  color: var(--text-tertiary);
  font-size: 9px;
  line-height: 1;
}

.heatmap-hours span {
  overflow: hidden;
  white-space: nowrap;
}

.heatmap-day {
  align-self: center;
  color: var(--text-tertiary);
  font-size: 10px;
  line-height: 16px;
}

.heatmap-cell {
  height: 16px;
  border-radius: 2px;
  background: var(--bg-muted);
}

.heatmap-cell.is-empty {
  background: var(--bg-muted);
}

.rank-switch {
  display: flex;
  flex: none;
  padding: 2px;
  border-radius: 7px;
  background: var(--bg-muted);
}

.rank-switch button {
  padding: 2px 8px;
  border-radius: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 17px;
}

.rank-switch button.is-active {
  background: var(--bg-elevated);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.rank-list {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.rank-row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 11px;
  border-top: 1px solid var(--border-subtle);
  text-align: left;
}

.rank-row:first-child {
  border-top: 0;
}

.rank-row:hover {
  background: var(--bg-hover);
}

.rank-index {
  width: 16px;
  flex: none;
  color: var(--text-caption);
  font-size: 11px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.rank-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  line-height: 1.45;
}

.rank-title {
  overflow: hidden;
  color: var(--text);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-meta {
  color: var(--text-tertiary);
  font-size: 10.5px;
}

.rank-value {
  flex: none;
  color: var(--text-secondary);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.insight-card {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.card-heading {
  margin-bottom: 8px;
}

.card-heading h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
}

.dist-list,
.qa-list,
.model-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dist-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
}

.dist-label {
  width: 46px;
  flex: none;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.dist-track,
.qa-track,
.model-track {
  display: block;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bg-muted);
}

.dist-track {
  height: 6px;
  flex: 1;
}

.dist-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
}

.dist-value {
  width: 48px;
  flex: none;
  color: var(--text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.dist-value small {
  color: var(--text-caption);
  font-size: 9.5px;
}

.qa-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
}

.qa-label {
  width: 58px;
  flex: none;
  overflow: hidden;
  color: var(--text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qa-track {
  height: 7px;
  flex: 1;
}

.qa-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.qa-fill.is-user {
  background: #f0a43c;
}

.qa-fill.is-assistant {
  background: var(--brand);
}

.qa-value {
  width: 48px;
  flex: none;
  color: var(--text-secondary);
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.card-note {
  margin: 9px 0 0;
  padding-top: 7px;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-tertiary);
  font-size: 10.5px;
}

.model-list {
  gap: 8px;
}

.model-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1px 8px;
  align-items: center;
}

.model-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.4;
}

.model-name {
  overflow: hidden;
  color: var(--text);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-meta {
  color: var(--text-tertiary);
  font-size: 10px;
}

.model-share {
  color: var(--text-tertiary);
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}

.model-track {
  grid-column: 1 / -1;
  height: 5px;
}

.model-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.content-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.content-label {
  color: var(--text-tertiary);
  font-size: 10.5px;
}

.content-cell strong {
  overflow: hidden;
  color: var(--text);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.content-foot {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 9.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insight-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--text-tertiary);
  font-size: 11.5px;
}

@media (max-width: 560px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-cell {
    border-bottom: 1px solid var(--border);
  }

  .metric-cell:nth-child(2n) {
    border-right: 0;
  }

  .metric-cell:nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  .insight-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .heatmap-legend .heatmap-note {
    display: none;
  }
}
</style>
