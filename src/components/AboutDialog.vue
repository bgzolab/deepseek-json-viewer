<script setup lang="ts">
import { avatarUrl } from '../lib/assets'
import { t } from '../lib/i18n'
import AppIcon from './AppIcon.vue'
import ModalShell from './ModalShell.vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const repoUrl = 'https://github.com/bgzolab/deepseek-json-viewer'
</script>

<template>
  <ModalShell :open="open" width="sm" :title="t('about.title')" @close="emit('close')">
    <template #icon>
      <AppIcon name="info" :size="19" />
    </template>

    <div class="about">
      <div class="about-hero">
        <img class="about-avatar" :src="avatarUrl" :alt="t('sidebar.avatarAlt')" />
        <div>
          <h3>DeepSeek JSON Viewer</h3>
          <p>{{ t('about.tagline') }}</p>
        </div>
      </div>

      <p class="about-copy">{{ t('about.copy') }}</p>

      <div class="about-links">
        <a :href="repoUrl" target="_blank" rel="noopener noreferrer">
          <span class="about-link-icon"><AppIcon name="link" :size="16" /></span>
          <span class="about-link-copy">
            <span>GitHub</span>
            <small>{{ t('about.githubSub') }}</small>
          </span>
          <AppIcon name="external" :size="14" class="about-link-arrow" />
        </a>
        <a :href="`${repoUrl}/issues/new`" target="_blank" rel="noopener noreferrer">
          <span class="about-link-icon"><AppIcon name="message" :size="16" /></span>
          <span class="about-link-copy">
            <span>{{ t('about.feedback') }}</span>
            <small>{{ t('about.feedbackSub') }}</small>
          </span>
          <AppIcon name="external" :size="14" class="about-link-arrow" />
        </a>
        <a href="https://chat.deepseek.com" target="_blank" rel="noopener noreferrer">
          <span class="about-link-icon"><AppIcon name="link" :size="16" /></span>
          <span class="about-link-copy">
            <span>{{ t('about.link') }}</span>
            <small>{{ t('about.linkSub') }}</small>
          </span>
          <AppIcon name="external" :size="14" class="about-link-arrow" />
        </a>
      </div>

      <div class="about-note">
        <AppIcon name="shield" :size="15" />
        <span>{{ t('about.note') }}</span>
      </div>
    </div>

    <template #footer>
      <button type="button" class="btn btn-ghost" @click="emit('close')">
        {{ t('common.close') }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.about-hero {
  display: flex;
  align-items: center;
  gap: 11px;
}

.about-avatar {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 50%;
  background: #111;
  object-fit: cover;
}

.about-hero h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
}

.about-hero p {
  margin: 2px 0 0;
  color: var(--text-tertiary);
  font-size: 12px;
}

.about-copy {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.7;
}

.about-links {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.about-links a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  color: var(--text);
  border-top: 1px solid var(--border-subtle);
}

.about-links a:first-child {
  border-top: 0;
}

.about-links a:hover {
  background: var(--bg-hover);
  text-decoration: none;
}

.about-link-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand);
}

.about-link-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  font-size: 12.5px;
  line-height: 1.45;
}

.about-link-copy small {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.about-link-arrow {
  flex: none;
  color: var(--text-caption);
}

.about-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 8px;
  background: var(--bg-muted);
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.6;
}

.about-note :deep(.app-icon) {
  margin-top: 1px;
  flex: none;
  color: var(--success);
}
</style>
