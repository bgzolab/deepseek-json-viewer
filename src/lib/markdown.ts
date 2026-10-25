import DOMPurify from 'dompurify'
import { marked, Renderer, type Tokens } from 'marked'
import type { ChatReference } from '../types/chat'
import { t } from './i18n'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString()
  } catch {
    // Invalid URLs are not rendered as links.
  }
  return null
}

const renderer = new Renderer()

renderer.code = ({ text, lang }: Tokens.Code): string => {
  const requestedLanguage = (lang ?? '').trim().split(/\s+/)[0] ?? ''
  const language = requestedLanguage.replace(/[^a-zA-Z0-9_+#.-]/g, '').slice(0, 32)
  const label = language || 'text'
  const className = language ? ` class="language-${escapeAttribute(language)}"` : ''

  return [
    '<div class="md-code-block">',
    '<div class="md-code-head">',
    `<span class="md-code-lang">${escapeHtml(label)}</span>`,
    `<button type="button" class="md-code-copy" data-copy-code>${escapeHtml(t('markdown.copy'))}</button>`,
    '</div>',
    `<pre><code${className}>${escapeHtml(text)}</code></pre>`,
    '</div>',
  ].join('')
}

renderer.link = function ({ href, title, tokens }: Tokens.Link): string {
  const label = this.parser.parseInline(tokens)
  const url = safeHttpUrl(href)
  if (!url) return label

  const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : ''
  return `<a href="${escapeAttribute(url)}"${titleAttribute} target="_blank" rel="noopener noreferrer nofollow">${label}</a>`
}

renderer.image = ({ text }: Tokens.Image): string => {
  const label = text
    ? t('markdown.imageOmittedWithText', { text })
    : t('markdown.imageOmitted')
  return `<span class="md-image-placeholder">${escapeHtml(label)}</span>`
}

renderer.checkbox = ({ checked }: Tokens.Checkbox): string => {
  return `<span class="md-task-checkbox${checked ? ' is-checked' : ''}" role="img" aria-label="${escapeHtml(
    checked ? t('markdown.taskDone') : t('markdown.taskPending'),
  )}"></span>`
}

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
})

const REFERENCE_MARKER = /\[!?reference:(\d+)\]/g
const SKIPPED_REFERENCE_TAGS = new Set(['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE'])

function applyReferencesToHtml(html: string, references?: ChatReference[]): string {
  if (!html.includes('reference:')) return html
  if (typeof document === 'undefined') return html

  const doc = document.implementation.createHTMLDocument('')
  doc.body.innerHTML = html
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []

  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (
      parent &&
      !SKIPPED_REFERENCE_TAGS.has(parent.tagName) &&
      !parent.closest('a, code, pre')
    ) {
      textNodes.push(node as Text)
    }
    node = walker.nextNode()
  }

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? ''
    REFERENCE_MARKER.lastIndex = 0
    let match = REFERENCE_MARKER.exec(text)
    if (!match) continue

    const fragment = doc.createDocumentFragment()
    let cursor = 0

    while (match) {
      if (match.index > cursor) {
        fragment.appendChild(doc.createTextNode(text.slice(cursor, match.index)))
      }

      const index = Number(match[1])
      const reference = references?.[index]
      const url = reference ? safeHttpUrl(reference.url) : null
      if (reference && url) {
        const anchor = doc.createElement('a')
        anchor.className = 'md-citation'
        anchor.href = url
        anchor.title = reference.title
        anchor.target = '_blank'
        anchor.rel = 'noopener noreferrer nofollow'
        anchor.textContent = String(index + 1)
        fragment.appendChild(anchor)
      } else {
        // Keep unresolved markers visible instead of silently deleting user text.
        fragment.appendChild(doc.createTextNode(match[0]))
      }

      cursor = match.index + match[0].length
      match = REFERENCE_MARKER.exec(text)
    }

    if (cursor < text.length) {
      fragment.appendChild(doc.createTextNode(text.slice(cursor)))
    }
    textNode.parentNode?.replaceChild(fragment, textNode)
  }

  return doc.body.innerHTML
}

export function renderMarkdown(markdown: string, references?: ChatReference[]): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string
  const sanitized = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'data-copy-code'],
    FORBID_TAGS: [
      'style',
      'img',
      'iframe',
      'video',
      'audio',
      'form',
      'input',
      'textarea',
      'select',
      'option',
      'link',
      'meta',
      'base',
      'object',
      'embed',
    ],
    FORBID_ATTR: ['style', 'srcset'],
  })

  return applyReferencesToHtml(sanitized, references)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const SKIPPED_HIGHLIGHT_TAGS = new Set(['SCRIPT', 'STYLE', 'BUTTON', 'TEXTAREA'])

export function highlightSearchInHtml(
  html: string,
  query: string,
  startIndex = 0,
): { html: string; count: number } {
  if (!query) return { html, count: 0 }

  const doc = document.implementation.createHTMLDocument('')
  doc.body.innerHTML = html
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []

  let node = walker.nextNode()
  while (node) {
    const parent = node.parentElement
    if (parent && !SKIPPED_HIGHLIGHT_TAGS.has(parent.tagName)) {
      textNodes.push(node as Text)
    }
    node = walker.nextNode()
  }

  const expression = new RegExp(escapeRegExp(query), 'gi')
  let highlighted = 0

  for (const textNode of textNodes) {
    const text = textNode.nodeValue ?? ''
    const matches: Array<{ start: number; end: number }> = []
    expression.lastIndex = 0

    let match: RegExpExecArray | null = expression.exec(text)
    while (match) {
      matches.push({ start: match.index, end: match.index + match[0].length })
      match = expression.exec(text)
    }

    if (matches.length === 0) continue

    const fragment = doc.createDocumentFragment()
    let cursor = 0

    for (const range of matches) {
      if (range.start > cursor) {
        fragment.appendChild(doc.createTextNode(text.slice(cursor, range.start)))
      }
      const mark = doc.createElement('mark')
      mark.className = 'md-search-hit'
      mark.dataset.searchIndex = String(startIndex + highlighted)
      mark.textContent = text.slice(range.start, range.end)
      fragment.appendChild(mark)
      highlighted += 1
      cursor = range.end
    }

    if (cursor < text.length) {
      fragment.appendChild(doc.createTextNode(text.slice(cursor)))
    }
    textNode.parentNode?.replaceChild(fragment, textNode)
  }

  return { html: doc.body.innerHTML, count: highlighted }
}
