<p align="center">
  <img src="./assets/deepseek-gril-profile-logo.webp" width="180" alt="DeepSeek JSON Viewer logo" />
</p>

[![Contributors](https://img.shields.io/github/contributors/bgzolab/deepseek-json-viewer.svg?style=for-the-badge)](https://github.com/bgzolab/deepseek-json-viewer/graphs/contributors)
[![Forks](https://img.shields.io/github/forks/bgzolab/deepseek-json-viewer.svg?style=for-the-badge)](https://github.com/bgzolab/deepseek-json-viewer/network/members)
[![Stargazers](https://img.shields.io/github/stars/bgzolab/deepseek-json-viewer.svg?style=for-the-badge)](https://github.com/bgzolab/deepseek-json-viewer/stargazers)
[![Issues](https://img.shields.io/github/issues/bgzolab/deepseek-json-viewer.svg?style=for-the-badge)](https://github.com/bgzolab/deepseek-json-viewer/issues)
[![Licence](https://img.shields.io/github/license/bgzolab/deepseek-json-viewer.svg?style=for-the-badge)](https://github.com/bgzolab/deepseek-json-viewer/blob/main/LICENCE)
[![Telegram](https://img.shields.io/badge/-telegram-black.svg?style=for-the-badge&logo=telegram&colorB=555)](https://t.me/imbGZo)

# DeepSeek JSON Viewer

A local-first, browser-only viewer for DeepSeek chat exports. Import one or more JSON files and browse, search, and organize them without sending chat data anywhere.

## Highlights

- Multi-file import via file picker or drag and drop; repeated imports are de-duplicated
- DeepSeek `mapping` exports plus common generic export shapes
- Conversation-level and message-level merging/deduplication
- IndexedDB persistence, per-conversation delete, and clear-all
- DeepSeek-style layout with Markdown, tables, reasoning, citations, and copyable code blocks
- Full-text search across titles, messages, and reasoning, with match navigation
- Responsive sidebar drawer for mobile; assistant avatar and welcome artwork are bundled locally
- Offline app-shell caching in production builds

## Quick start

Requires Node.js `>=22.12.0` and npm.

```bash
npm install
npm run dev
```

Production build and local preview:

```bash
npm run build
npm run preview
```

Tests and type checks:

```bash
npm test
npm run typecheck
```

`npm run build` emits a static site to `dist/`.

## Privacy and storage

- All parsing, deduplication, search, and storage happen in the browser.
- Chat content is never uploaded. There is no backend, account, or synchronization.
- Conversations are stored in IndexedDB. Clearing site data removes them.
- Only small UI state (selected conversation and sidebar state) is stored in localStorage.
- Production builds cache the app shell with a service worker for offline use; development does not register it.
- No external CDN, fonts, images, or third-party scripts are used at runtime.

## Supported imports

- Official DeepSeek exports with a `mapping` tree and `REQUEST` / `RESPONSE` / `THINK` fragments.
- Generic structures such as a top-level array, `{ conversations }`, `{ chats }`, `{ data }`, or a single conversation object.
- Common field aliases for IDs, titles, roles, content, and timestamps.
- Branching conversations are flattened to the current/newest branch.

Unknown or broken files are reported individually and do not abort the other files in the same import.

## Limitations

- No sending messages, model API calls, export, cloud sync, or branch-tree view.
- Reasoning is shown as collapsible text; tool-call details are not rendered.
- Attachments are shown as metadata only.
- All conversations are loaded into memory for instant search; very large exports use more memory.

## Contributing

Any contributions made are **greatly appreciated**.

See [AGENTS.md](./AGENTS.md) for architecture, data-flow, format-adapter assumptions, persistence gotchas, UI conventions, and manual verification steps.

Put local exports in `data/raw/` for testing; that directory is git-ignored. Do not commit real chat data.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat(module):add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Top contributors:

<a href="https://github.com/bgzolab/deepseek-json-viewer/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=bgzolab/deepseek-json-viewer" alt="contrib.rocks image" />
</a>

## License

AGPL-3.0. See [LICENCE](./LICENCE).
