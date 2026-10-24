<script setup lang="ts">
import { computed } from 'vue'
import type { ChatReference } from '../types/chat'
import { copyText } from '../lib/clipboard'
import { highlightSearchInHtml, renderMarkdown } from '../lib/markdown'

const props = withDefaults(
  defineProps<{
    text: string
    references?: ChatReference[]
    query?: string
    searchStartIndex?: number
  }>(),
  {
    references: undefined,
    query: '',
    searchStartIndex: 0,
  },
)

const html = computed(() => {
  const rendered = renderMarkdown(props.text, props.references)
  if (!props.query) return rendered
  return highlightSearchInHtml(rendered, props.query, props.searchStartIndex).html
})

async function onClick(event: MouseEvent): Promise<void> {
  const target = event.target
  if (!(target instanceof Element)) return

  const button = target.closest<HTMLButtonElement>('[data-copy-code]')
  if (!button) return

  const block = button.closest('.md-code-block')
  const code = block?.querySelector('code')?.textContent ?? ''
  const successful = await copyText(code)
  const original = '复制'
  button.textContent = successful ? '已复制' : '复制失败'
  button.classList.toggle('is-copied', successful)

  window.setTimeout(() => {
    if (button.isConnected) {
      button.textContent = original
      button.classList.remove('is-copied')
    }
  }, 1600)
}
</script>

<template>
  <div class="markdown-body" @click="onClick" v-html="html" />
</template>
