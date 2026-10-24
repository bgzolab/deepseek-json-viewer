import DOMPurify from 'dompurify'
import { marked, Renderer, type Tokens } from 'marked'
import type { ChatReference } from '../types/chat'

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
    '<button type="button" class="md-code-copy" data-copy-code>复制</button>',
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
  return `<span class="md-image-placeholder">图片已省略${text ? `：${escapeHtml(text)}` : ''}</span>`
}

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
})

function applyReferences(markdown: string, references?: ChatReference[]): string {
  if (!markdown.includes('reference:')) return markdown

  return markdown.replace(/\[!?reference:(\d+)\]/g, (_match, rawIndex: string) => {
    const index = Number(rawIndex)
    const reference = references?.[index]
    const url = reference ? safeHttpUrl(reference.url) : null
    if (!reference || !url) return ''

    return `<a class="md-citation" href="${escapeAttribute(url)}" title="${escapeAttribute(
      reference.title,
    )}" target="_blank" rel="noopener noreferrer nofollow">${index + 1}</a>`
  })
}

export function renderMarkdown(markdown: string, references?: ChatReference[]): string {
  const source = applyReferences(markdown, references)
  const rawHtml = marked.parse(source, { async: false }) as string

  return DOMPurify.sanitize(rawHtml, {
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
