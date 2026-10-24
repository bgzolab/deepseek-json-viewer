# DeepSeek JSON Viewer

一个纯前端的 DeepSeek 聊天记录预览工具。导入 DeepSeek 导出的 JSON 后，在浏览器本地完成解析、去重、缓存和搜索，并以接近 DeepSeek 网页版的布局重新呈现对话。

聊天数据不会上传。没有后端、账号、登录或云同步。

## 功能

- 点击选择或拖拽导入，支持一次上传多个 JSON 文件
- 兼容 DeepSeek 官方导出结构，并适配多种常见聊天导出字段
- 会话级、消息级自动去重；重复导入不会产生副本
- 使用 IndexedDB 持久化，刷新页面后仍可浏览
- 左侧会话列表：按更新时间排序、按日期分组、标题过滤、消息数量、删除会话
- 右侧聊天详情：Markdown、表格、引用、行内代码、代码块语言标签与复制按钮
- DeepSeek 深度思考内容折叠展示，搜索命中时自动展开
- 搜索覆盖标题、消息正文和思考内容，支持大小写不敏感与中文
- 搜索结果高亮，上一条 / 下一条匹配定位
- 长会话按 80 条一页渐进渲染，可加载更早消息
- “清空本地数据” / 删除单个会话
- 移动端抽屉式侧边栏
- 所有资源本地打包，无外部 CDN；生产构建可离线打开已缓存页面

## 快速开始

要求 Node.js 22.12+（或 Vite 8 支持的其他版本）。

```bash
npm install
npm run dev
```

生产构建与本地预览：

```bash
npm run build
npm run preview
```

测试与类型检查：

```bash
npm test
npm run typecheck
```

`npm run build` 会把静态产物输出到 `dist/`，可以部署到任意静态托管服务。

## 使用方式

1. 从 DeepSeek 导出聊天记录，得到 `conversations.json` 一类的文件。
2. 打开应用，点击“导入 JSON 文件”，或把文件拖进窗口。
3. 可以一次选择多个文件，也可以重复导入同一个文件。
4. 导入完成后的结果面板会显示扫描文件数、识别会话数、新增会话、跳过重复、合并重复、新增消息、失败文件及原因。
5. 数据写入当前浏览器的 IndexedDB。刷新页面后会从本地恢复。
6. 需要删除时，使用侧边栏底部的“清空”，或会话行右侧的删除按钮。

清除浏览器站点数据（Cookies / Site data / IndexedDB）也会删除这些记录。原始 JSON 文件不受影响。

## 支持的数据格式

### 1. DeepSeek 官方导出

典型结构：

```json
[
  {
    "id": "...",
    "title": "...",
    "inserted_at": "2026-01-01T08:00:00.000+08:00",
    "updated_at": "2026-01-01T09:00:00.000+08:00",
    "mapping": {
      "root": { "id": "root", "parent": null, "children": ["1"], "message": null },
      "1": {
        "id": "1",
        "parent": "root",
        "children": ["2"],
        "message": {
          "model": "deepseek-reasoner",
          "inserted_at": "...",
          "fragments": [
            { "type": "REQUEST", "content": "用户问题" }
          ]
        }
      }
    }
  }
]
```

适配器会：

- 从 `mapping` 构建消息路径。
- 如果存在 `current_node` / `current_node_id`，沿该节点回溯到根节点。
- 如果没有当前节点标记，而会话存在分支，则选择最后一条消息时间最新的根到叶路径；分支不会被同时展开。
- 读取 `REQUEST`、`RESPONSE`、`THINK` 片段，分别映射为用户消息、助手正文、思考内容。
- 从 `TOOL_SEARCH.results` 提取参考来源，并把正文中的 `[!reference:N]` / `[reference:N]` 渲染为引用标记。
- 从 `FILE` 片段提取附件名称和大小，仅展示元数据，不读取附件文件。
- `TOOL_OPEN`、`TOOL_FIND` 等工具过程不单独展示。

### 2. 常见通用结构

顶层支持：

- 会话数组 `[...]`
- `{ "conversations": [...] }`
- `{ "chats": [...] }`
- `{ "data": [...] }`
- `{ "data": { "conversations": [...] } }`
- 单个会话对象，例如 `{ "id": "...", "messages": [...] }`

字段别名：

| 内部字段 | 支持的来源字段 |
| --- | --- |
| 会话 ID | `id`, `conversation_id`, `conversationId`, `chat_id`, `chatId`, `session_id`, `sessionId`, `uuid`, `_id` |
| 会话标题 | `title`, `name`, `summary`, `topic`, `subject` |
| 模型 | `model`, `model_name`, `modelName`, `model_slug`, `current_model` |
| 消息数组 | `messages`, `message_list`, `chat_messages`, `turns`, `history` |
| 消息内容 | `content`, `text`, `message`, `answer`, `response`, `value`, `body` |
| 角色 | `role`, `author`, `sender`, `from`, `speaker` |
| 消息 ID | `id`, `message_id`, `messageId`, `msg_id`, `msgId`, `uuid`, `_id` |
| 创建时间 | `created_at`, `createdAt`, `created_time`, `create_time`, `createTime`, `created`, `inserted_at`, `timestamp`, `time`, `sent_at`, `sentAt` |
| 更新时间 | `updated_at`, `updatedAt`, `updated_time`, `update_time`, `updateTime`, `modified_at`, `modifiedAt`, `last_updated_at` |

角色值会被归一化为：

- 用户：`user`, `human`, `customer`, `client`, `requester`, `me`
- 助手：`assistant`, `ai`, `bot`, `model`, `gpt`, `deepseek`, `chatbot`, `agent`
- 系统：`system`, `developer`, `instructions`, `prompt`
- 其他：`unknown`

内容可以是字符串、数字，或 `[{ "type": "text", "text": "..." }]` 形式的片段数组。

时间支持 ISO 字符串、秒级时间戳和毫秒级时间戳。无法解析的时间会被忽略，而不是导致导入失败。

缺少标题时，会使用第一条用户消息生成标题；仍为空则显示“未命名会话”。

### 3. 容错策略

- 单个文件失败不会中断其他文件。
- 单个会话解析失败不会中断同文件中的其他会话。
- 缺少 ID、标题、时间、模型、消息内容都可以正常导入。
- 空会话和空消息会保留并显示占位状态。
- 完全无法识别的结构或被损坏的 JSON 会报告具体错误。

## 去重规则

### 会话

1. 优先使用原始会话 ID 作为唯一键。
2. 没有稳定 ID 时，使用规范化指纹：
   `标题 + 排序后的消息指纹集合`，通过本地 128 位非加密哈希（cyrb128）计算。
3. 跨文件或重复导入命中同一会话时合并消息，并保留更新时间较新的标题、模型等元数据。
4. 合并后的消息按 ID / 消息指纹去重。

### 消息

1. 优先使用原始消息 ID。
2. 没有消息 ID 时，使用 `role + content + createdAt` 的哈希作为指纹。
3. DeepSeek 的 `mapping` 节点 ID 会作为消息 ID 使用。

重复导入同一个文件时，结果面板会显示“跳过重复”，不会写入重复会话。

## 本地存储

- 使用 IndexedDB，数据库名：`deepseek-json-viewer`，对象仓库：`conversations`。
- 会话与消息一起存储，便于本地全文搜索。
- localStorage 只保存少量界面状态：当前选中的会话、侧边栏是否收起。
- 不会把聊天内容写入 localStorage、Cookie 或任何网络请求。
- “清空本地数据”会删除 IndexedDB 中的全部会话记录。

## 搜索

- 点击侧边栏顶部的搜索图标，或按 `⌘K` / `Ctrl+K` 打开搜索框。
- 搜索标题、消息正文、思考内容。
- 大小写不敏感，中文直接子串匹配。
- 侧边栏实时过滤会话，并显示每个会话的匹配总数。
- 右侧高亮全部匹配；顶部提供“上一处 / 下一处”导航，自动滚动到对应消息。
- 搜索完全基于当前内存中的 IndexedDB 数据，不发起网络请求。

## 安全与隐私

- 解析在 Web Worker 中完成，大文件不会长时间阻塞界面；Worker 不可用或离线加载失败时自动回退到主线程。
- 不发送聊天内容。应用运行时唯一的网络请求是加载自身静态资源；生产环境会通过 service worker 缓存应用外壳以支持离线浏览。
- Markdown 使用 `marked` 渲染，并在写入 DOM 前经过 `DOMPurify` 净化。
- 额外禁止图片、iframe、video、form、style 等标签和 `style` 属性，避免外部资源请求与样式注入。
- Markdown 图片不会加载，只显示“图片已省略”占位。
- 链接仅允许 `http:` / `https:`，外部链接添加 `target="_blank"` 与 `rel="noopener noreferrer nofollow"`。
- 引用标题、搜索高亮、界面文本均通过文本节点或转义写入，不使用未净化的 `innerHTML`。

## 离线使用

`npm run build` 后通过静态服务器打开，首次加载完成后 service worker 会预缓存应用外壳（HTML、JS、CSS、图标）。之后断网刷新仍可打开页面并浏览已导入数据。

注意：

- Service worker 只在生产构建中注册，开发模式不启用。
- 如果部署在子路径，需要同时配置 Vite 的 `base` 和静态服务器路径。
- 离线时 Worker 脚本若未缓存，导入会回退到主线程解析，仍可继续工作。

## 项目结构

```text
src/
  components/       界面组件（侧边栏、消息、弹窗、图标等）
  lib/
    adapter.ts      JSON 格式适配与规范化
    merge.ts        会话 / 消息合并去重
    hash.ts         指纹与哈希
    search.ts       本地搜索索引
    markdown.ts     Markdown 渲染、净化与高亮
    db.ts           IndexedDB 数据层
    parseFile.ts    Worker 调度与回退
  stores/
    chatStore.ts    应用状态、导入编排、搜索导航
  workers/
    import.worker.ts 后台解析 Worker
  styles/           设计变量、基础样式、Markdown 样式
  types/            统一数据结构与导入报告类型
assets/
  deepseek-gril-profile.png  项目维护者提供的助手头像源文件
public/
  sw.js             离线缓存
  favicon.png       站点图标
  images/           助手头像与欢迎页插图（由源文件压缩生成）
```

## 设计取舍与限制

- 分支会话只展示当前/最新分支，不提供树状分支视图（非目标）。
- 不展示工具调用明细和思考耗时；思考文本本身会保留。
- 附件只保留名称和大小，不解析或加载文件内容。
- 会话与消息一次性读入内存，以换取即时全文搜索。对于极大的导出（数百 MB），首次加载会占用更多内存。
- 搜索导航按消息计数，同一消息中的多处匹配会分别高亮并逐步定位。
- 暂不支持发送消息、模型 API、导出、云备份和统计图表。
- 助手头像与欢迎页插图使用项目维护者提供的 `assets/deepseek-gril-profile.png` 处理生成；其余界面图标为内联 SVG，运行时不加载任何外部图片或 CDN 资源。

## 验证

```bash
npm test          # 适配、去重、哈希、搜索单元测试
npm run typecheck
npm run build
```

测试数据请放在 `data/raw/`（已在 `.gitignore` 中忽略），不要提交真实聊天记录。

## License

AGPL-3.0，见 [LICENCE](./LICENCE)。
