<script setup lang="ts">
import AppIcon from './AppIcon.vue'

const emit = defineEmits<{
  import: []
}>()
</script>

<template>
  <section class="empty-state">
    <div class="empty-inner">
      <div class="privacy-pill">
        <AppIcon name="shield" :size="14" />
        100% 本地运行
      </div>

      <h1>让导出的对话，<br /><span>重新变得可读</span></h1>
      <p class="empty-lead">
        导入 DeepSeek 导出的 JSON 聊天记录。自动解析、合并去重、建立本地搜索，<br class="wide-only" />
        所有内容只保存在当前浏览器。
      </p>

      <button type="button" class="drop-zone" @click="emit('import')">
        <span class="drop-glow" aria-hidden="true" />
        <span class="drop-icon">
          <AppIcon name="upload" :size="23" />
        </span>
        <span class="drop-title">拖拽 JSON 文件到这里</span>
        <span class="drop-subtitle">或点击选择文件 · 支持一次导入多个</span>
        <span class="drop-action">
          <AppIcon name="plus" :size="15" />
          选择 JSON 文件
        </span>
      </button>

      <ul class="feature-row">
        <li>
          <span class="feature-icon"><AppIcon name="file" :size="15" /></span>
          <span><strong>多格式适配</strong><small>兼容常见导出结构</small></span>
        </li>
        <li>
          <span class="feature-icon"><AppIcon name="layers" :size="15" /></span>
          <span><strong>自动去重</strong><small>重复导入不产生副本</small></span>
        </li>
        <li>
          <span class="feature-icon"><AppIcon name="search" :size="15" /></span>
          <span><strong>全文搜索</strong><small>标题与消息一网打尽</small></span>
        </li>
      </ul>

      <p class="empty-footnote">
        数据存放在 IndexedDB。刷新页面不会丢失，清除站点数据后会一并删除。
      </p>
    </div>

    <div class="empty-decoration" aria-hidden="true">
      <div class="deco-card deco-card-a">
        <span class="deco-avatar" />
        <span class="deco-lines"><i /><i /></span>
      </div>
      <div class="deco-card deco-card-b">
        <span class="deco-dot" />
        <span class="deco-lines"><i /><i /><i /></span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.empty-state {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 40px 24px 30px;
  background:
    radial-gradient(620px 360px at 50% 2%, rgba(232, 238, 255, 0.8), transparent 70%),
    linear-gradient(180deg, #fbfcff 0%, #ffffff 46%);
}

.empty-inner {
  position: relative;
  z-index: 1;
  width: min(100%, 660px);
  text-align: center;
}

.privacy-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border: 1px solid #dfe7fb;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #5269c9;
  font-size: 11.5px;
  font-weight: 560;
  box-shadow: var(--shadow-xs);
  backdrop-filter: blur(8px);
}

h1 {
  margin: 22px 0 0;
  color: #171b24;
  font-size: clamp(31px, 4.6vw, 46px);
  font-weight: 640;
  line-height: 1.18;
  letter-spacing: -0.038em;
}

h1 span {
  background: linear-gradient(100deg, #445fe6 5%, #7890ff 54%, #4d6bfe 100%);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.empty-lead {
  margin: 17px auto 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.drop-zone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 30px;
  padding: 25px 24px 23px;
  overflow: hidden;
  border: 1.5px dashed #cbd6f3;
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    0 18px 50px -32px rgba(38, 54, 110, 0.36),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  text-align: center;
  transition:
    border-color var(--transition-base),
    background-color var(--transition-base),
    transform var(--transition-base),
    box-shadow var(--transition-base);
  backdrop-filter: blur(12px);
}

.drop-zone:hover {
  border-color: #a8b9ed;
  background: rgba(255, 255, 255, 0.95);
  box-shadow:
    0 24px 58px -30px rgba(38, 54, 110, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.drop-glow {
  position: absolute;
  top: -90px;
  left: 50%;
  width: 330px;
  height: 190px;
  border-radius: 50%;
  background: rgba(205, 218, 255, 0.42);
  filter: blur(34px);
  transform: translateX(-50%);
  pointer-events: none;
}

.drop-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid #dbe3fa;
  border-radius: 14px;
  background: linear-gradient(180deg, #f7f9ff, #eef3ff);
  color: var(--brand);
  box-shadow: 0 10px 24px -18px rgba(77, 107, 254, 0.8);
}

.drop-title {
  position: relative;
  margin-top: 13px;
  font-size: 15px;
  font-weight: 620;
  letter-spacing: -0.01em;
}

.drop-subtitle {
  position: relative;
  margin-top: 4px;
  color: var(--text-tertiary);
  font-size: 12px;
}

.drop-action {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 15px;
  padding: 7px 13px;
  border-radius: 8px;
  background: var(--brand);
  color: white;
  font-size: 12.5px;
  font-weight: 560;
  box-shadow: 0 8px 20px -12px rgba(77, 107, 254, 0.9);
}

.feature-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
  text-align: left;
}

.feature-row li {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-width: 0;
  padding: 11px 12px;
  border: 1px solid rgba(226, 231, 243, 0.8);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.6);
}

.feature-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  border-radius: 8px;
  background: var(--brand-soft);
  color: var(--brand);
}

.feature-row strong,
.feature-row small {
  display: block;
}

.feature-row strong {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
}

.feature-row small {
  margin-top: 1px;
  color: var(--text-tertiary);
  font-size: 10.5px;
  line-height: 1.45;
}

.empty-footnote {
  margin: 19px 0 0;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.6;
}

.empty-decoration {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.deco-card {
  position: absolute;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 13px;
  border: 1px solid rgba(225, 231, 244, 0.75);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 18px 36px -28px rgba(35, 49, 93, 0.38);
  backdrop-filter: blur(7px);
  opacity: 0.8;
}

.deco-card-a {
  top: 19%;
  left: max(18px, calc(50% - 460px));
  transform: rotate(-5deg);
}

.deco-card-b {
  right: max(18px, calc(50% - 452px));
  bottom: 18%;
  transform: rotate(4deg);
}

.deco-avatar {
  width: 21px;
  height: 21px;
  border-radius: 7px;
  background: linear-gradient(145deg, #738cff, #4d6bfe);
}

.deco-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: #b8c9ff;
}

.deco-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.deco-lines i {
  display: block;
  width: 56px;
  height: 4px;
  border-radius: 999px;
  background: #edf0f8;
}

.deco-lines i:nth-child(2) {
  width: 36px;
}

.deco-lines i:nth-child(3) {
  width: 44px;
}

@media (max-width: 900px) {
  .empty-decoration {
    display: none;
  }

  .wide-only {
    display: none;
  }
}

@media (max-width: 640px) {
  .empty-state {
    align-items: flex-start;
    padding: 32px 16px 24px;
  }

  .empty-inner {
    padding-top: 12px;
  }

  h1 {
    font-size: 30px;
  }

  .empty-lead {
    font-size: 13px;
  }

  .drop-zone {
    margin-top: 24px;
    padding: 22px 16px 20px;
  }

  .feature-row {
    grid-template-columns: 1fr;
    gap: 7px;
    margin-top: 16px;
  }

  .feature-row li {
    align-items: center;
  }

  .feature-row small {
    display: none;
  }

  .empty-footnote {
    margin-top: 15px;
  }
}
</style>
