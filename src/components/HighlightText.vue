<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    text: string
    query?: string
  }>(),
  { query: '' },
)

interface Part {
  text: string
  hit: boolean
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const parts = computed<Part[]>(() => {
  const query = props.query.trim()
  if (!query || !props.text) return [{ text: props.text, hit: false }]

  const expression = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  return props.text
    .split(expression)
    .filter((text) => text !== '')
    .map((text) => ({
      text,
      hit: text.toLocaleLowerCase() === query.toLocaleLowerCase(),
    }))
})
</script>

<template>
  <span><template v-for="(part, index) in parts" :key="index"><mark v-if="part.hit" class="text-hit">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
</template>
