<script setup lang="ts">
import AppIcon from './AppIcon.vue'
</script>

<template>
  <footer class="composer-area">
    <div class="composer" aria-disabled="true">
      <div class="composer-main">
        <button type="button" class="composer-tool" disabled tabindex="-1" aria-label="上传附件">
          <AppIcon name="plus" :size="18" />
        </button>
        <div class="composer-placeholder">预览模式，暂不支持发送消息</div>
        <button type="button" class="composer-send" disabled tabindex="-1" aria-label="发送">
          <AppIcon name="arrow-up" :size="18" :stroke-width="2" />
        </button>
      </div>
    </div>
    <p class="composer-hint">
      <AppIcon name="shield" :size="12" />
      本地预览模式 · 不会发送任何请求
    </p>
  </footer>
</template>

<style scoped>
.composer-area {
  position: relative;
  z-index: 5;
  flex: none;
  width: 100%;
  padding: 10px 20px calc(13px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), #ffffff 34%);
}

.composer {
  width: min(100%, var(--content-width));
  margin: 0 auto;
  padding: 7px;
  border: 1px solid #e2e6ef;
  border-radius: 22px;
  background: var(--bg-surface);
  box-shadow:
    0 8px 28px -20px rgba(31, 41, 72, 0.3),
    0 1px 2px rgba(31, 41, 72, 0.03);
}

.composer-main {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 42px;
  padding: 0 2px;
}

.composer-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  color: #a5adbb;
}

.composer-placeholder {
  flex: 1;
  padding: 0 9px;
  color: #9aa2b1;
  font-size: 14px;
  line-height: 1.4;
  user-select: none;
}

.composer-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: 50%;
  background: #eef1f6;
  color: #b4bcc9;
}

.composer-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 7px 0 0;
  color: var(--text-tertiary);
  font-size: 10.5px;
  letter-spacing: 0.01em;
}

@media (max-width: 640px) {
  .composer-area {
    padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .composer {
    border-radius: 19px;
  }

  .composer-main {
    min-height: 40px;
  }

  .composer-hint {
    margin-top: 5px;
    font-size: 10px;
  }
}
</style>
