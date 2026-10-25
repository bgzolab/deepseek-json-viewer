<script setup lang="ts">
import { brandHeroUrl } from '../lib/assets'
import { t } from '../lib/i18n'
import AppIcon from './AppIcon.vue'

const emit = defineEmits<{
  import: []
}>()
</script>

<template>
  <section class="empty-state">
    <div class="empty-inner">
      <img
        class="welcome-avatar"
        :src="brandHeroUrl"
        :alt="t('sidebar.avatarAlt')"
      />

      <h1>{{ t('empty.welcome') }}</h1>
      <p class="empty-lead">{{ t('empty.lead') }}</p>

      <button type="button" class="upload-box" @click="emit('import')">
        <span class="upload-icon"><AppIcon name="upload" :size="18" /></span>
        <span class="upload-copy">
          <strong>{{ t('empty.dropTitle') }}</strong>
          <span>{{ t('empty.dropHint') }}</span>
        </span>
      </button>

      <p class="empty-features">{{ t('empty.features') }}</p>
    </div>
  </section>
</template>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 32px 24px 72px;
  background: var(--bg-surface);
}

.empty-inner {
  width: min(100%, 620px);
  text-align: center;
}

.welcome-avatar {
  width: 104px;
  height: 104px;
  border-radius: 50%;
  object-fit: cover;
}

h1 {
  margin: 20px 0 0;
  color: var(--text);
  font-size: 24px;
  font-weight: 500;
  line-height: 32px;
}

.empty-lead {
  margin: 8px 0 0;
  color: var(--text-tertiary);
  font-size: 14px;
  line-height: 22px;
}

.upload-box {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  max-width: 620px;
  margin: 30px auto 0;
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-surface);
  color: var(--text);
  text-align: left;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast);
}

.upload-box:hover {
  border-color: var(--border-strong);
  background: var(--bg-muted);
}

.upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand);
}

.upload-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.upload-copy strong {
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}

.upload-copy span {
  color: var(--text-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.empty-features {
  margin: 18px 0 0;
  color: var(--text-caption);
  font-size: 12px;
  line-height: 18px;
}

@media (max-width: 640px) {
  .empty-state {
    align-items: flex-start;
    padding: 56px 16px 40px;
  }

  .welcome-avatar {
    width: 84px;
    height: 84px;
  }

  h1 {
    margin-top: 16px;
    font-size: 22px;
    line-height: 30px;
  }

  .empty-lead {
    font-size: 13px;
    line-height: 21px;
  }

  .upload-box {
    margin-top: 24px;
    padding: 14px;
    border-radius: 16px;
  }
}
</style>
