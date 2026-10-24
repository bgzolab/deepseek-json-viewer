<script setup lang="ts">
import { computed } from 'vue'
import type { ImportProgress } from '../types/import'
import AppIcon from './AppIcon.vue'
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
  if (props.progress.phase === 'parsing') {
    return props.progress.fileCount > 1
      ? `解析文件 ${Math.max(1, props.progress.fileIndex)} / ${props.progress.fileCount}`
      : '正在解析 JSON'
  }
  if (props.progress.phase === 'saving') return '写入本地缓存'
  return '准备中'
})
</script>

<template>
  <ModalShell
    :open="open"
    title="正在导入聊天记录"
    :description="progress.message || '所有处理都在本地完成，请稍候。'"
    :dismissible="false"
    width="sm"
  >
    <div class="progress-visual" aria-hidden="true">
      <div class="progress-orbit">
        <div class="progress-core">
          <AppIcon name="database" :size="20" />
        </div>
        <span class="orbit-dot" />
      </div>
    </div>

    <div class="progress-meta">
      <span>{{ phaseLabel }}</span>
      <span v-if="progress.phase === 'saving'">{{ progress.written }} / {{ progress.total }}</span>
      <span v-else-if="progress.fileName" class="progress-file">{{ progress.fileName }}</span>
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

    <p class="progress-note">
      <AppIcon name="shield" :size="14" />
      文件仅在当前浏览器内解析，不会上传到任何服务器。
    </p>
  </ModalShell>
</template>

<style scoped>
.progress-visual {
  display: flex;
  justify-content: center;
  padding: 8px 0 20px;
}

.progress-orbit {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border: 1px solid rgba(77, 107, 254, 0.18);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f5f8ff, #e9efff);
}

.progress-core {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--brand);
  color: white;
  box-shadow: 0 8px 20px -10px rgba(77, 107, 254, 0.9);
}

.orbit-dot {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border-top: 2px solid var(--brand);
  animation: orbit 1.1s linear infinite;
}

@keyframes orbit {
  to {
    transform: rotate(360deg);
  }
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 9px;
  color: var(--text-secondary);
  font-size: 12.5px;
}

.progress-file {
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-track {
  position: relative;
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: #edf0f6;
}

.progress-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #7188ff, var(--brand));
  transition: width 280ms var(--ease-out);
}

.progress-track.is-indeterminate .progress-fill {
  width: 38%;
  animation: indeterminate 1.15s var(--ease-out) infinite;
}

@keyframes indeterminate {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(310%);
  }
}

.progress-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 16px 0 0;
  color: var(--text-tertiary);
  font-size: 11.5px;
}
</style>
