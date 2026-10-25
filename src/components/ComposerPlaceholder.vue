<script setup lang="ts">
import AppIcon from './AppIcon.vue'
</script>

<template>
  <footer class="composer-area">
    <div class="composer" aria-disabled="true">
      <div class="composer-input">
        <span>预览模式，暂不支持发送消息</span>
      </div>

      <div class="composer-toolbar">
        <div class="composer-modes">
          <span class="mode-chip">
            <AppIcon name="shield" :size="13" />
            只读预览
          </span>
          <span class="mode-chip">
            <AppIcon name="database" :size="13" />
            本地数据
          </span>
        </div>

        <div class="composer-actions">
          <button type="button" class="composer-tool" disabled tabindex="-1" aria-label="上传附件">
            <AppIcon name="paperclip" :size="17" />
          </button>
          <button type="button" class="composer-send" disabled tabindex="-1" aria-label="发送">
            <AppIcon name="arrow-up" :size="17" :stroke-width="2" />
          </button>
        </div>
      </div>
    </div>

    <p class="composer-hint">本地预览模式 · 不会发送任何请求</p>
  </footer>
</template>

<style scoped>
.composer-area {
  position: relative;
  z-index: 5;
  flex: none;
  width: 100%;
  padding: 10px 20px calc(9px + env(safe-area-inset-bottom, 0px));
  background: var(--bg-surface);
}

.composer {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--composer-width);
  min-height: 124px;
  margin: 0 auto;
  border: 1px solid var(--border);
  border-radius: 24px;
  background: var(--bg-elevated);
}

.composer-input {
  display: flex;
  align-items: flex-start;
  min-height: 58px;
  flex: 1;
  padding: 12px 16px 0;
}

.composer-input span {
  color: var(--text-caption);
  font-size: 16px;
  line-height: 24px;
  user-select: none;
}

.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 10px 10px 12px;
}

.composer-modes {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.mode-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border-radius: 100px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 12px;
  line-height: 30px;
  white-space: nowrap;
}

.composer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

.composer-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  color: var(--text-caption);
}

.composer-send {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--brand);
  color: white;
  opacity: 0.42;
}

.composer-hint {
  margin: 7px 0 0;
  color: var(--text-caption);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}

@media (max-width: 640px) {
  .composer-area {
    padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
  }

  .composer {
    min-height: 102px;
    border-radius: 20px;
  }

  .composer-input {
    min-height: 50px;
    padding: 10px 13px 0;
  }

  .composer-input span {
    font-size: 15px;
    line-height: 22px;
  }

  .composer-toolbar {
    padding: 2px 8px 8px 10px;
  }

  .mode-chip {
    height: 28px;
    padding: 0 8px;
    font-size: 11px;
    line-height: 28px;
  }

  .composer-hint {
    margin-top: 5px;
    font-size: 11px;
  }
}
</style>
