<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 34 })
</script>

<template>
  <span class="brand-mark" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <svg viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="10" fill="url(#brand-gradient)" />
      <path
        d="M9.5 11.2c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2v5.2c0 1.1-.9 2-2 2h-4.6l-3.5 2.7c-.5.4-1.2 0-1.2-.6v-2.1h-.7c-1.1 0-2-.9-2-2v-5.2Z"
        fill="white"
        fill-opacity=".95"
      />
      <path
        d="M13 9.6V8.5c0-1.1.9-2 2-2h7c1.1 0 2 .9 2 2v4.3c0 1.1-.9 2-2 2h-.6v1.6c0 .6-.7 1-1.2.6l-2.7-2.2"
        stroke="white"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-opacity=".75"
      />
      <defs>
        <linearGradient id="brand-gradient" x1="4" y1="2" x2="28" y2="30">
          <stop stop-color="#6d86ff" />
          <stop offset="1" stop-color="#3d56e8" />
        </linearGradient>
      </defs>
    </svg>
  </span>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  flex: none;
  border-radius: 10px;
  box-shadow: 0 6px 16px -8px rgba(77, 107, 254, 0.75);
}

.brand-mark svg {
  width: 100%;
  height: 100%;
}
</style>
