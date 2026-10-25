# AGENTS.md

## Repo at a glance

- Single-package Vue 3 + TypeScript + Vite SPA. No backend, router, auth, external API, or CSS framework.
- Use **npm** (`package-lock.json`); do not use yarn/pnpm. Node.js `>=22.12.0`.
- `.github/workflows` are OpenCode PR-review automation, not test/build CI. Run checks locally.
- This is a local-only viewer for exported DeepSeek chats. Never add code that uploads chat content or fetches remote assets.

## Commands

- `npm install`
- `npm run dev`
- `npm run typecheck`
- `npm test` — Vitest, Node environment, colocated `src/**/*.test.ts`
- `npx vitest run src/lib/adapter.test.ts` — run one test file
- `npm run build` — validates `public/sw.js` with `node --check`, runs `vue-tsc -b`, then Vite; output goes to `dist/`
- `npm run preview` — serve the production build; the service worker registers only in production
- Recommended verification: `npm run typecheck && npm test && npm run build`
- There is no lint or formatter script.

## Git conventions

- Archive a feature branch before deleting it. Create an annotated tag at the reviewed HEAD, push it, then delete the branch:
  `git tag -a archive/<branch> <sha> -m "archive <branch> after PR #N" && git push origin archive/<branch> && git push origin --delete <branch>`.
  Restore later with `git switch -c <branch> archive/<branch>`. Tags keep the commits reachable, survive repository migration, and do not clutter the branch list.
- Do not rely on GitHub's PR `Restore branch` as the only copy: it restores only the last pushed PR head, not later or unpushed commits, and GitHub documents no retention guarantee for deleted branches.
- Keep the repository setting `delete_branch_on_merge` disabled so branch deletion is always an explicit, archive-first action.
- Squash merge is the only enabled merge method; the merged `main` commit intentionally differs from the feature branch history.

## Architecture and data flow

- `src/main.ts` mounts `App.vue`. `ChatView.vue` contains the header/thread/composer; `AppSidebar.vue` owns the conversation list and search UI.
- `src/stores/chatStore.ts` is a singleton reactive store. It owns conversations, selection, import orchestration, search results, and match navigation. There is no Pinia.
- Import path: `lib/parseFile.ts` sends a `File` to `workers/import.worker.ts` → `lib/adapter.ts` normalizes → `lib/merge.ts` merges/dedupes → `lib/db.ts` writes batches → the store publishes state and rebuilds search indexes.
  - If the worker chunk cannot load (for example, offline), `parseFile.ts` falls back to main-thread parsing. Preserve that fallback.
- Persistence: IndexedDB `deepseek-json-viewer` v1, object store `conversations`, keyPath `id`. Each record is a `StoredConversation` including its messages.
- Search index: an in-memory `Map` in the store. `searchIndexes` is non-reactive, so every mutation must also increment `indexVersion` or call `refreshSearchIndex` / `rebuildSearchIndexes`.
- Markdown: `lib/markdown.ts` (marked renderer + DOMPurify + citation markers + search highlighting). `MarkdownBody.vue` is the only `v-html` boundary.
- Brand assets: `src/lib/assets.ts` exposes `${BASE_URL}`-aware avatar/hero URLs. Public images live in `public/images/`.
- `target/` is an ignored reference snapshot of the real DeepSeek UI, not part of the application.

## Critical invariants

- **Never write Vue reactive proxies to IndexedDB.** The import working set uses `toRaw`; keep merged conversations/messages plain, otherwise IDB throws “could not be cloned”.
- Search navigation relies on absolute `data-search-index` values. Search text order is `content + reasoning`; `MessageItem` derives the reasoning offset from content matches. Re-check prev/next navigation in a real browser after changing either.
- Write to IndexedDB before reporting/applying imported state. Batch writes intentionally yield between chunks.
- Do not add `fetch` / XHR / WebSocket calls that include chat content. Only same-origin app assets may be loaded; no CDN, remote fonts, or remote images.
- Markdown safety: render all content through `renderMarkdown`; never bind raw user content with `v-html`. DOMPurify blocks images/iframes/video/style in chat, and links are restricted to http(s).
- `lib/hash.ts` uses cyrb128 (non-cryptographic) for local dedupe. IDs are raw IDs when available, otherwise `fp_...`. Keep fingerprints deterministic.
- `lib/adapter.ts` must stay lenient: one bad file, conversation, or message must not abort the rest of an import. Preserve missing-title fallbacks, ISO time normalization, and empty conversation/message handling.
- DeepSeek mapping: use the `current_node` path when present; otherwise choose the root→leaf path whose leaf message timestamp is newest. Branches are flattened to one active path, not rendered as a tree.
- DeepSeek fragments: `REQUEST` = user, `RESPONSE` = assistant, `THINK` = reasoning, `TOOL_SEARCH` = references, `FILE` = attachment metadata only. Text can contain both `[!reference:N]` and `[reference:N]` markers.
- Supported generic shapes: top-level array, `{conversations|chats|data}`, nested `data.conversations`, or a single conversation; message arrays `messages|message_list|chat_messages|turns|history`. Full alias lists live at the top of `adapter.ts`; add tests for new aliases.
- Dedupe semantics: conversations match by raw ID, then by fingerprint of title + sorted message fingerprints; messages match by raw ID, then by `role + content + createdAt`. Newer conversation metadata wins during a merge. Do not change these rules without updating `merge.test.ts` and `hash.test.ts`.
- localStorage is only for `dsjv:selected-conversation` and `dsjv:sidebar-collapsed`. Never store chat content there.
- Service worker: production only. `public/sw.js` precaches index-referenced assets, discovers the Vite import worker chunk from the app bundle, and caches the avatar/hero images; bump the cache name when changing the shell cache.
- `data/raw/` is ignored. Never commit real chat exports.
- UI convention: intentionally mirrors the DeepSeek web chat. Preserve the layout tokens (260px sidebar, 60px header, 752px thread, 776px composer), colors in `src/styles/tokens.css`, and inline SVG icons via `AppIcon.vue`. Avoid reintroducing gradients, glows, or marketing-style cards.
- Search is intentionally hidden behind the sidebar search icon / `Cmd/Ctrl+K`, matching the reference UI.
- The brand master is `assets/deepseek-gril-profile-transparent.png`; `assets/deepseek-gril-profile-logo.webp` is the README derivative. App avatar/hero derivatives live under `public/`. The master was made from the opaque original with `magick <original> -alpha on -fuzz 16% -transparent black <master.png>`; that original was removed because flattening the master over black reproduces it. Do not replace these with remote art.
- Responsive behavior: sidebar becomes a drawer at 860px; additional mobile tweaks apply at 640px. Verify both after UI changes.

## Known deferred edge cases

- Search occurrence counts come from raw Markdown while `<mark>` indexes come from rendered/sanitized text. Queries consisting of Markdown syntax or spanning stripped markup can overcount; message-level scroll fallback prevents breakage. Fixing this properly requires making rendered text the search-index source.
- Messages with neither an ID nor a timestamp are intentionally deduplicated by `role + content` fingerprint per the existing contract. Legitimate identical messages in such minimal exports can collapse; changing this needs a product decision about cross-import merge semantics.
- Re-importing a conversation after its active mapping branch changes keeps messages from the previous flattened branch (union merge). Message paths/node IDs are not persisted, so branch pruning/replacement needs a path-aware data model and a product decision.
- `parseFile` creates and terminates one worker per file. Multi-file imports pay repeated worker startup cost; a reusable worker queue would be a performance optimization, not a correctness issue.

## Tests and manual verification

- Unit tests cover the parser/adapter, merge/dedupe, hash, and search only (`src/lib/*.test.ts`). There is no DOM, IndexedDB, worker, or service-worker test suite.
- For import, persistence, markdown, search-highlighting, or service-worker changes, run a real browser flow: import `data/raw/conversations.json`, reload, search and jump matches, re-import for de-duplication, clear data, and check an offline production reload.
- `npm run build` output (`dist/`) is ignored; do not commit it.
