<script setup lang="ts">
import { computed } from 'vue'
import type { ChatReference } from '../types/chat'
import { copyText } from '../lib/clipboard'
import { t } from '../lib/i18n'
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

const baseHtml = computed(() => renderMarkdown(props.text, props.references))

const html = computed(() => {
  if (!props.query) return baseHtml.value
  return highlightSearchInHtml(baseHtml.value, props.query, props.searchStartIndex).html
})

async function onClick(event: MouseEvent): Promise<void> {
  const target = event.target
  if (!(target instanceof Element)) return

  const button = target.closest<HTMLButtonElement>('[data-copy-code]')
  if (!button) return

  const block = button.closest('.md-code-block')
  const code = block?.querySelector('code')?.textContent ?? ''
  const successful = await copyText(code)
  const original = t('markdown.copy')
  button.textContent = successful ? t('markdown.copied') : t('markdown.copyFailed')
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
