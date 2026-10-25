import type { ChatMessage } from '../types/chat'

/**
 * cyrb128 is a small, deterministic 128-bit non-cryptographic string hash.
 * It is only used for local de-duplication, never for security purposes.
 */
export function hash128(input: string): string {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179)
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)

  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1

  return [h1, h2, h3, h4]
    .map((value) => (value >>> 0).toString(16).padStart(8, '0'))
    .join('')
}

export function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim()
}

export function fingerprintMessage(
  message: Pick<ChatMessage, 'role' | 'content' | 'createdAt'>,
): string {
  return hash128(
    `${message.role}\u001f${normalizeText(message.content)}\u001f${message.createdAt ?? ''}`,
  )
}

export function fingerprintConversation(
  title: string,
  messages: Array<Pick<ChatMessage, 'role' | 'content' | 'createdAt'>>,
): string {
  const messageFingerprints = messages.map(fingerprintMessage).sort()
  return hash128(
    `${normalizeText(title).toLocaleLowerCase()}\u001e${messageFingerprints.join('\u001f')}`,
  )
}
