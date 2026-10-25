<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ChatTimeline, TimelineBucket } from '../lib/stats'

type Metric = 'messages' | 'characters'

const props = defineProps<{
  timeline: ChatTimeline
}>()

const metric = ref<Metric>('messages')
const container = ref<HTMLElement | null>(null)
const chartWidth = ref(640)
let observer: ResizeObserver | null = null

const HEIGHT = 230
const LEFT = 44
const RIGHT = 10
const TOP = 12
const BOTTOM = 30
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM

const numberFormat = new Intl.NumberFormat('zh-CN')
const compactFormat = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const fullDateFormat = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const granularityLabel = computed(
  () => ({ day: '按天', week: '按周', month: '按月' })[props.timeline.granularity],
)

function formatNumber(value: number): string {
  return numberFormat.format(value)
}

function formatDate(timestamp: number): string {
  return fullDateFormat.format(new Date(timestamp)).replace(/\//g, '-')
}

function formatAxis(value: number): string {
  return value >= 10_000 ? compactFormat.format(value) : formatNumber(value)
}

function niceStep(value: number): number {
  const power = 10 ** Math.floor(Math.log10(value))
  const normalized = value / power
  const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return rounded * power
}

function bucketRange(bucket: TimelineBucket): string {
  if (props.timeline.granularity === 'month') {
    const date = new Date(bucket.start)
    return `${date.getFullYear()}年${date.getMonth() + 1}月`
  }
  if (props.timeline.granularity === 'week') {
    return `${formatDate(bucket.start)} – ${formatDate(bucket.end)}`
  }
  return formatDate(bucket.start)
}

function bucketTooltip(bucket: TimelineBucket): string {
  return [
    bucketRange(bucket),
    `我 ${formatNumber(bucket.userMessages)} 条 / ${formatNumber(bucket.userCharacters)} 字`,
    `DeepSeek ${formatNumber(bucket.assistantMessages)} 条 / ${formatNumber(bucket.assistantCharacters)} 字`,
  ].join(' · ')
}

const chart = computed(() => {
  const rows = props.timeline.buckets.map((bucket) => ({
    bucket,
    user: metric.value === 'messages' ? bucket.userMessages : bucket.userCharacters,
    assistant:
      metric.value === 'messages' ? bucket.assistantMessages : bucket.assistantCharacters,
  }))

  if (rows.length === 0) {
    return { rows, bars: [], yTicks: [], xTicks: [], barWidth: 0 }
  }

  const plotWidth = chartWidth.value - LEFT - RIGHT
  const maxValue = Math.max(4, ...rows.flatMap((row) => [row.user, row.assistant]))
  const step = niceStep(maxValue / 4)
  const yMax = step * 4
  const groupWidth = plotWidth / rows.length
  const barWidth = Math.min(9, Math.max(0.6, groupWidth * 0.3))
  const barGap = groupWidth > 4 ? 1 : groupWidth * 0.08

  const yTicks = Array.from({ length: 5 }, (_, index) => ({
    value: step * index,
    y: TOP + PLOT_HEIGHT - (PLOT_HEIGHT * index) / 4,
  }))

  const labelInterval = Math.max(1, Math.ceil(rows.length / 7))
  const xTicks = rows.flatMap((row, index) => {
    const isLast = index === rows.length - 1
    if (index !== 0 && !isLast && index % labelInterval !== 0) return []
    if (!isLast && index !== 0 && rows.length - 1 - index < labelInterval * 0.6) return []
    return [
      {
        key: index,
        label: row.bucket.label,
        x: LEFT + groupWidth * index + groupWidth / 2,
        anchor: index === 0 ? 'start' : isLast ? 'end' : 'middle',
      },
    ]
  })

  const bars = rows.map((row, index) => {
    const center = LEFT + groupWidth * index + groupWidth / 2
    const userHeight = (row.user / yMax) * PLOT_HEIGHT
    const assistantHeight = (row.assistant / yMax) * PLOT_HEIGHT
    return {
      key: row.bucket.start,
      tooltip: bucketTooltip(row.bucket),
      hitX: LEFT + groupWidth * index,
      hitWidth: groupWidth,
      userX: center - barGap / 2 - barWidth,
      assistantX: center + barGap / 2,
      userY: TOP + PLOT_HEIGHT - userHeight,
      assistantY: TOP + PLOT_HEIGHT - assistantHeight,
      userHeight,
      assistantHeight,
      radius: Math.min(2, barWidth / 2),
    }
  })

  return { rows, bars, yTicks, xTicks, barWidth }
})

onMounted(() => {
  if (!container.value) return
  observer = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect.width ?? 0
    if (width > 0) chartWidth.value = Math.max(300, Math.round(width))
  })
  observer.observe(container.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="container" class="trend" aria-label="时间趋势">
    <div class="trend-head">
      <div class="trend-title">
        <h3>时间趋势</h3>
        <span>{{ granularityLabel }}统计</span>
      </div>
      <div class="metric-switch" role="group" aria-label="统计指标">
        <button
          type="button"
          :class="{ 'is-active': metric === 'messages' }"
          :aria-pressed="metric === 'messages'"
          @click="metric = 'messages'"
        >
          消息频次
        </button>
        <button
          type="button"
          :class="{ 'is-active': metric === 'characters' }"
          :aria-pressed="metric === 'characters'"
          @click="metric = 'characters'"
        >
          对话字数
        </button>
      </div>
    </div>

    <div class="trend-meta">
      <div class="legend">
        <span><i class="legend-dot is-user" />我</span>
        <span><i class="legend-dot is-assistant" />DeepSeek</span>
      </div>
      <span class="trend-note">按消息时间统计</span>
    </div>

    <div v-if="chart.rows.length > 0" class="chart-scroll">
      <svg
        class="trend-chart"
        :viewBox="`0 0 ${chartWidth} ${HEIGHT}`"
        :width="chartWidth"
        :height="HEIGHT"
        role="img"
        :aria-label="`${granularityLabel}消息与字数趋势，区分我和 DeepSeek`"
      >
        <g class="grid">
          <template v-for="tick in chart.yTicks" :key="tick.value">
            <line :x1="LEFT" :x2="chartWidth - RIGHT" :y1="tick.y" :y2="tick.y" />
            <text :x="LEFT - 7" :y="tick.y + 3" text-anchor="end">
              {{ formatAxis(tick.value) }}
            </text>
          </template>
        </g>

        <g class="bars">
          <rect
            v-for="bar in chart.bars"
            :key="`user-${bar.key}`"
            class="bar is-user"
            :x="bar.userX"
            :y="bar.userY"
            :width="chart.barWidth"
            :height="bar.userHeight"
            :rx="bar.radius"
          />
          <rect
            v-for="bar in chart.bars"
            :key="`assistant-${bar.key}`"
            class="bar is-assistant"
            :x="bar.assistantX"
            :y="bar.assistantY"
            :width="chart.barWidth"
            :height="bar.assistantHeight"
            :rx="bar.radius"
          />
        </g>

        <g class="axis">
          <text
            v-for="tick in chart.xTicks"
            :key="tick.key"
            :x="tick.x"
            :y="HEIGHT - 9"
            :text-anchor="tick.anchor"
          >
            {{ tick.label }}
          </text>
        </g>

        <g class="hits">
          <rect
            v-for="bar in chart.bars"
            :key="`hit-${bar.key}`"
            :x="bar.hitX"
            :y="TOP"
            :width="bar.hitWidth"
            :height="PLOT_HEIGHT"
            fill="transparent"
          >
            <title>{{ bar.tooltip }}</title>
          </rect>
        </g>
      </svg>
    </div>

    <p v-else class="trend-empty">没有带时间戳的消息，无法绘制趋势。</p>
  </section>
</template>

<style scoped>
.trend {
  padding: 12px 12px 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.trend-head,
.trend-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.trend-title {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.trend-title h3 {
  margin: 0;
  font-size: 12.5px;
  font-weight: 500;
}

.trend-title span,
.trend-note {
  color: var(--text-tertiary);
  font-size: 11px;
}

.trend-meta {
  margin: 6px 0 2px;
}

.legend {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 11px;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.legend-dot.is-user {
  background: #f0a43c;
}

.legend-dot.is-assistant {
  background: var(--brand);
}

.metric-switch {
  display: flex;
  flex: none;
  padding: 2px;
  border-radius: 7px;
  background: var(--bg-muted);
}

.metric-switch button {
  padding: 3px 8px;
  border-radius: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 18px;
}

.metric-switch button.is-active {
  background: var(--bg-surface);
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.chart-scroll {
  overflow-x: auto;
}

.trend-chart {
  display: block;
  max-width: 100%;
  overflow: visible;
}

.trend-chart text {
  fill: var(--text-tertiary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.trend-chart .grid line {
  stroke: var(--border-subtle);
  stroke-width: 1;
}

.bar {
  transition: opacity var(--transition-fast);
}

.bar.is-user {
  fill: #f0a43c;
}

.bar.is-assistant {
  fill: var(--brand);
}

.hits rect {
  cursor: default;
}

.hits rect:hover {
  fill: rgba(57, 100, 254, 0.04);
}

.trend-empty {
  margin: 18px 0 10px;
  color: var(--text-tertiary);
  font-size: 11.5px;
  text-align: center;
}

@media (max-width: 560px) {
  .trend-head {
    align-items: flex-start;
  }

  .trend-title {
    flex-direction: column;
    gap: 1px;
  }
}
</style>
