let activeModalCount = 0

function applyInert(): void {
  if (typeof document === 'undefined') return
  const app = document.getElementById('app')
  if (!app) return
  app.toggleAttribute('inert', activeModalCount > 0)
}

export function hasActiveModal(): boolean {
  return activeModalCount > 0
}

export function acquireModalInert(): void {
  activeModalCount += 1
  applyInert()
}

export function releaseModalInert(): void {
  activeModalCount = Math.max(0, activeModalCount - 1)
  applyInert()
}
