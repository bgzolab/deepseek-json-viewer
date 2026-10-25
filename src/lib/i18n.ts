import { ref } from 'vue'

export type Locale = 'zh-CN' | 'en'

type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>
type MessageEntry = string | PluralForms
export type MessageParams = Record<string, string | number | null | undefined>

const LOCALE_KEY = 'dsjv:locale'
export const DEFAULT_LOCALE: Locale = 'zh-CN'

export const localeOptions: ReadonlyArray<{ code: Locale; label: string }> = [
  { code: 'zh-CN', label: '中文' },
  { code: 'en', label: 'English' },
]

const zh = {
  'app.title': 'DeepSeek 对话预览',
  'app.description': '在浏览器本地预览、搜索和整理 DeepSeek 导出的 JSON 聊天记录。数据不会离开你的设备。',
  'app.loading': '正在读取本地缓存…',
  'app.databaseBanner': '本地数据库不可用，导入记录可能无法持久保存：{error}',
  'app.dismiss': '关闭提示',
  'app.importInProgress': '导入正在进行，请稍候。',
  'app.closeDialogFirst': '请先关闭当前对话框。',
  'app.clearSuccess': '本地数据已清空。',
  'app.deleteSuccess': '会话已删除。',
  'app.operationFailed': '操作失败：{error}',
  'app.operationFailedRetry': '操作失败，请稍后重试。',
  'app.databaseUnavailable': '本地数据库不可用：{error}',
  'app.dropTitle': '松开即可导入',
  'app.dropHint': '支持多个 JSON 文件 · 重复会话会自动合并',
  'app.databaseReadFailed': '无法读取本地数据库',

  'common.confirm': '确认',
  'common.cancel': '取消',
  'common.close': '关闭',

  'sidebar.aria': '会话列表',
  'sidebar.brandSub': '对话预览',
  'sidebar.avatarAlt': 'DeepSeek 助手头像',
  'sidebar.search': '搜索',
  'sidebar.searchTitle': '搜索（⌘K）',
  'sidebar.collapse': '收起侧边栏',
  'sidebar.close': '关闭侧边栏',
  'sidebar.import': '导入聊天记录',
  'sidebar.searchPlaceholder': '搜索会话和消息',
  'sidebar.closeSearch': '关闭搜索',
  'sidebar.groupsAria': '会话',
  'sidebar.group.search': '搜索结果',
  'sidebar.group.today': '今天',
  'sidebar.group.yesterday': '昨天',
  'sidebar.group.week': '7 天内',
  'sidebar.group.older': '更早',
  'sidebar.noResultsTitle': '没有找到相关会话',
  'sidebar.noResultsBody': '换一个关键词，或清空搜索后浏览全部记录。',
  'sidebar.clearSearch': '清空搜索',
  'sidebar.emptyTitle': '还没有会话',
  'sidebar.emptyBody': '导入 DeepSeek 导出的 JSON 文件后，会话会显示在这里。',
  'sidebar.importFile': '导入文件',
  'sidebar.moreMenu': '更多菜单',
  'sidebar.storageTitle': '本地缓存',

  'search.noMatches': '没有找到匹配内容',

  'theme.label': '主题',
  'theme.auto': '自动',
  'theme.light': '浅色',
  'theme.dark': '深色',

  'language.label': '语言',

  'menu.stats': '数据统计',
  'menu.about': '关于',
  'menu.clear': '清空本地数据',

  'conversation.untitled': '未命名会话',
  'conversation.matches': '{count} 处',
  'conversation.titleMatch': '标题匹配',
  'conversation.messageCount': '{count} 条',
  'conversation.deleteAria': '删除会话：{title}',
  'conversation.delete': '删除会话',

  'header.toggleSidebar': '切换会话侧边栏',
  'header.messages': '{count} 条消息',
  'header.created': '创建 {date}',
  'header.updated': '更新 {date}',
  'header.previewTitle': '对话预览',
  'header.readOnly': '本地只读模式',
  'header.searchNav': '搜索匹配导航',
  'header.previousMatch': '上一处匹配',
  'header.nextMatch': '下一处匹配',
  'header.titleMatch': '标题匹配',
  'header.exitSearch': '退出搜索',

  'empty.welcome': '你好，欢迎回来',
  'empty.lead': '导入 DeepSeek 导出的聊天记录，在本地继续阅读你的对话。',
  'empty.dropTitle': '拖拽 JSON 文件到这里',
  'empty.dropHint': '或点击选择文件，支持一次导入多个',
  'empty.features': '多文件导入 · 自动去重 · 全文搜索',

  'composer.placeholder': '预览模式，暂不支持发送消息',
  'composer.readOnly': '只读预览',
  'composer.localData': '本地数据',
  'composer.uploadAttachment': '上传附件',
  'composer.send': '发送',
  'composer.hint': '本地预览模式 · 不会发送任何请求',

  'message.system': '系统消息',
  'message.empty': '空消息',
  'message.other': '其他消息',
  'message.reasoning': '已深度思考',
  'message.references': '参考来源',
  'message.emptyBody': '该消息没有可展示的内容',
  'message.copy': '复制消息',
  'message.copied': '已复制消息',
  'message.copyTitle': '复制消息',
  'message.copiedTitle': '已复制',

  'messages.emptyTitle': '这个会话没有可展示的消息',
  'messages.emptyBody': '可能是导出时消息为空，或该会话只包含暂不支持的内容。',
  'messages.loadEarlier': '加载更早的 {count} 条消息',
  'messages.scrollBottom': '滚动到底部',

  'markdown.copy': '复制',
  'markdown.copied': '已复制',
  'markdown.copyFailed': '复制失败',
  'markdown.imageOmitted': '图片已省略',
  'markdown.imageOmittedWithText': '图片已省略：{text}',
  'markdown.taskDone': '已完成',
  'markdown.taskPending': '未完成',

  'confirm.clearTitle': '清空本地数据？',
  'confirm.deleteTitle': '删除这个会话？',
  'confirm.clearMessage': '将删除当前浏览器中保存的 {conversations}和{messages}。',
  'confirm.deleteMessage': '“{title}” 将从本地缓存中移除。',
  'confirm.deleteMessageFallback': '该会话将从本地缓存中移除。',
  'confirm.clearDetail': '此操作不可撤销，但不会影响你原始导出的 JSON 文件。',
  'confirm.deleteDetail': '本次操作不会影响原始 JSON 文件；之后仍可重新导入。',
  'confirm.clearLabel': '清空本地数据',
  'confirm.deleteLabel': '删除会话',

  'import.title': '正在导入聊天记录',
  'import.phaseParsing': '正在解析文件',
  'import.phaseSaving': '正在写入本地缓存',
  'import.phasePreparing': '正在准备',
  'import.note': '文件仅在当前浏览器内解析，不会上传。',
  'import.preparing': '正在准备导入…',
  'import.parsingFile': '正在解析 {name}（{index}/{total}）',
  'import.saving': '正在写入本地数据库…',
  'import.savingProgress': '正在写入本地数据库（{written}/{total}）',
  'import.busy': '已有导入任务正在进行',
  'import.noFiles': '没有选择文件',
  'import.parseFailed': '解析失败，原因未知',
  'import.unknownError': '导入过程中发生未知错误，无法写入本地数据库',
  'import.busyLater': '导入正在进行，请稍后再操作。',
  'import.unknownParseError': '未知解析错误',
  'import.missingFile': '没有收到文件',

  'importReport.title': '导入结果',
  'importReport.interrupted': '导入中断',
  'importReport.failed': '导入失败',
  'importReport.partial': '导入完成，部分文件失败',
  'importReport.noNew': '没有新增会话',
  'importReport.complete': '导入完成',
  'importReport.interruptedBody': '导入过程中出现错误，已尽量保留此前写入的数据。',
  'importReport.allFailedBody': '没有文件成功导入，请查看下方失败原因。',
  'importReport.allDuplicatesBody': '这些文件里的会话已经在本地缓存中，没有重复写入。',
  'importReport.parsedBody': '已解析 {count} 个会话，全部数据都保存在当前浏览器。',
  'importReport.fileParseFailed': '解析失败',
  'importReport.fileSummary': '{conversations} 个会话',
  'importReport.fileNew': '新增 {count}',
  'importReport.fileMerged': '合并 {count}',
  'importReport.fileSkipped': '跳过 {count}',
  'search.matchCount': '{count} 处消息匹配',
  'importReport.scannedFiles': '扫描文件',
  'importReport.parsedConversations': '识别会话',
  'importReport.newConversations': '新增会话',
  'importReport.skippedDuplicates': '跳过重复',
  'importReport.mergedDuplicates': '合并重复',
  'importReport.newMessages': '新增消息',
  'importReport.failedFiles': '失败文件',
  'importReport.warnings': '警告',
  'importReport.fileDetails': '文件明细',
  'importReport.fileCount': '{count} 个文件',
  'importReport.statusError': '失败',
  'importReport.statusWarning': '有警告',
  'importReport.statusSuccess': '成功',
  'importReport.warningCount': '{count} 条提示',
  'importReport.startBrowsing': '开始浏览',

  'stats.title': '数据统计',
  'stats.description': '仅统计当前浏览器中保存的本地会话。',
  'stats.conversations': '会话',
  'stats.messages': '消息',
  'stats.userAssistant': '用户 {user} · 助手 {assistant}',
  'stats.characters': '字数',
  'stats.charactersFoot': '含推理内容，不含空白',
  'stats.timeSpan': '时间跨度',
  'stats.summary': '平均每会话 {avgMessages} 条消息 · 日均 {perDay} 条 · 平均每条 {avgChars} 字',
  'stats.details': '会话明细',
  'stats.detailsOrder': '按时间从早到晚',
  'stats.columnConversation': '会话',
  'stats.columnTime': '时间',
  'stats.columnMessages': '消息',
  'stats.columnCharacters': '字数',
  'stats.emptyTitle': '还没有可统计的会话',
  'stats.emptyBody': '导入 DeepSeek 导出的 JSON 后，这里会汇总会话、消息和字数。',
  'stats.exportNote': '导出在本地生成，不会上传数据',
  'stats.exportMarkdown': '导出 Markdown',
  'stats.exportCsv': '导出 CSV',

  'insights.activityAria': '活跃度',
  'insights.activity': '活跃度',
  'insights.activitySub': '按消息日期统计',
  'insights.activeDays': '活跃天数',
  'insights.activeDaysFoot': '有消息的日期',
  'insights.longestStreak': '最长连续',
  'insights.longestStreakFoot': '连续使用纪录',
  'insights.recentStreak': '最近连续',
  'insights.recentStreakFoot': '截至最后一条消息',
  'insights.peakDay': '最活跃一天',
  'insights.peakDayFoot': '{count} 条消息',
  'insights.noData': '暂无数据',
  'insights.habits': '使用习惯',
  'insights.less': '少',
  'insights.more': '多',
  'insights.localTime': '按本地时间',
  'insights.heatmapAria': '周一到周日、按小时的消息分布热力图',
  'insights.heatmapCell': '{day} {hour}:00 · {count} 条消息',
  'insights.ranking': '会话排行 Top 10',
  'insights.rankMetricAria': '排行指标',
  'insights.metricMessages': '消息',
  'insights.metricCharacters': '字数',
  'insights.metricDuration': '时长',
  'insights.noRanked': '还没有可排行的会话。',
  'insights.lengthDistribution': '会话长度分布',
  'insights.byMessages': '按消息数',
  'insights.qaHeading': '问答长度',
  'insights.qaSub': '正文，不含推理',
  'insights.me': '我',
  'insights.qaRatio': '平均回复约为提问的 {ratio} 倍',
  'insights.qaNotEnough': '还没有足够的问答数据',
  'insights.modelsHeading': '模型分布',
  'insights.modelCount': '{count} 个模型',
  'insights.contentHeading': '内容构成',
  'insights.contentSub': '推理、引用与附件',
  'insights.reasoningReplies': '带推理回复',
  'insights.reasoningFoot': '{with} / {count} 条',
  'insights.reasoningCharacters': '推理字数',
  'insights.reasoningIncluded': '已包含在总字数中',
  'insights.references': '引用来源',
  'insights.referenceFoot': '{count} 条消息',
  'insights.attachments': '附件',
  'insights.attachmentFoot': '{count} 条消息',
  'insights.noAnalyzable': '还没有可分析的数据。',

  'trend.aria': '时间趋势',
  'trend.heading': '时间趋势',
  'trend.granularityDay': '按天统计',
  'trend.granularityWeek': '按周统计',
  'trend.granularityMonth': '按月统计',
  'trend.rangeAria': '时间范围',
  'trend.allTime': '全部时间',
  'trend.last7': '最近活跃 7 天',
  'trend.last30': '最近活跃 30 天',
  'trend.last90': '最近活跃 90 天',
  'trend.lastYear': '最近活跃 1 年',
  'trend.metricAria': '统计指标',
  'trend.messages': '消息频次',
  'trend.characters': '对话字数',
  'trend.seriesAria': '系列显示',
  'trend.toggleUser': '点击显示或隐藏我的对话',
  'trend.toggleAssistant': '点击显示或隐藏 DeepSeek 的回复',
  'trend.note': '按消息时间统计',
  'trend.chartMessages': '{granularity}消息频次趋势',
  'trend.chartCharacters': '{granularity}我和 DeepSeek 对话字数趋势',
  'trend.tooltipMessages': '{range} · {count} 条消息',
  'trend.tooltipUser': '我 {count} 条 / {characters} 字',
  'trend.tooltipAssistant': 'DeepSeek {count} 条 / {characters} 字',
  'trend.empty': '当前数据没有带有效时间的消息，无法绘制趋势。',

  'about.title': '关于',
  'about.tagline': '浏览器本地的 DeepSeek 对话导出查看器',
  'about.copy': '导入 DeepSeek 导出的 JSON 文件，即可离线浏览、搜索会话。所有解析与数据都留在浏览器中，不会上传任何聊天内容。',
  'about.githubSub': '有帮到您的话，点个 🌟 鼓励一下我吧',
  'about.feedback': '问题反馈',
  'about.feedbackSub': '报告问题或提出建议',
  'about.link': '友情链接',
  'about.linkSub': '和 DeepSeek 对话',
  'about.note': '数据仅存在浏览器的 IndexedDB 中，清除缓存会同时删除会话',

  'unit.days': '{count} 天',
  'unit.messages': '{count} 条',
  'unit.messageCount': '{count} 条消息',
  'unit.characters': '{count} 字',
  'unit.conversationCount': '{count} 个会话',
  'unit.fileCount': '{count} 个文件',
  'unit.matchCount': '{count} 处',
  'unit.hintCount': '{count} 条提示',
  'unit.modelCount': '{count} 个模型',

  'adapter.invalidRoot': '文件内容不是 JSON 对象或数组',
  'adapter.unrecognizedShape': '无法识别 JSON 结构：未找到会话数组或 conversation 字段',
  'adapter.shapeArray': '顶层数组',
  'adapter.shapeSingleData': '单个会话对象（data）',
  'adapter.shapeSingle': '单个会话对象',
  'adapter.shapeMap': '会话对象映射',
  'adapter.mappingNoRoot': '会话的 mapping 结构缺少根节点，已按文件顺序读取消息',
  'adapter.mappingCurrentNode': '会话的 current_node 无法回溯到根节点，已自动选择最新分支',
  'adapter.mappingNoPath': 'mapping 中没有找到可用的消息路径',
  'adapter.longMessageId': '检测到长度异常的原始消息 ID，已改用内容指纹',
  'adapter.dedupedMessages': '已移除 {count} 条会话内重复消息',
  'adapter.invalidConversation': '会话条目不是对象',
  'adapter.messageSkipped': '第 {index} 条消息无法解析，已跳过',
  'adapter.unknownError': '未知错误',
  'adapter.conversationFailed': '第 {index} 个会话无法解析：{reason}',
  'adapter.noReadableConversations': '文件中的会话结构无法识别：{reason}',
  'adapter.emptyExport': '文件中没有可导入的会话',
  'adapter.hiddenWarnings': '另有 {count} 条警告未显示',
  'adapter.invalidJson': 'JSON 解析失败：{reason}',
  'adapter.databaseUnsupported': '当前浏览器不支持 IndexedDB',

  'report.docTitle': 'DeepSeek 对话统计',
  'report.generatedAt': '生成时间：{time}',
  'report.overview': '总览',
  'report.metric': '指标',
  'report.value': '数值',
  'report.conversationCount': '会话数',
  'report.messageCount': '消息数',
  'report.messagesRow': '消息数 | {total}（我 {user} / DeepSeek {assistant}）',
  'report.characters': '字数',
  'report.charactersRow': '字数 | {count}（含推理）',
  'report.timeSpan': '时间跨度',
  'report.timeSpanValue': '{days} 天（{from} – {to}）',
  'report.summary': '平均每会话 {avgMessages} 条消息 · 日均 {perDay} 条 · 平均每条 {avgChars} 字',
  'report.activity': '活跃度',
  'report.activeDays': '活跃天数',
  'report.longestStreak': '最长连续',
  'report.recentStreak': '最近连续',
  'report.peakDay': '最活跃一天',
  'report.peakDayValue': '{date}（{count} 条）',
  'report.qaHeading': '问答长度',
  'report.avgQuestion': '- 我平均每条提问：{count} 字',
  'report.avgAnswer': '- DeepSeek 平均每条回复：{count} 字（正文，不含推理）',
  'report.responseRatio': '- 回复 / 提问：{ratio}',
  'report.times': '{ratio} 倍',
  'report.lengthDistribution': '会话长度分布',
  'report.length': '长度',
  'report.lengthBucket0': '0 条',
  'report.lengthBucket1': '1–2 条',
  'report.lengthBucket2': '3–10 条',
  'report.lengthBucket3': '11–50 条',
  'report.lengthBucket4': '51+ 条',
  'report.modelDistribution': '模型分布',
  'report.model': '模型',
  'report.conversationColumn': '会话',
  'report.messagesColumn': '消息',
  'report.contentBreakdown': '内容构成',
  'report.reasoningRepliesLine': '- 带推理回复：{with} / {total}（{percent}）',
  'report.reasoningCharactersLine': '- 推理字数：{count}',
  'report.referencesLine': '- 引用来源：{citations}（{count} 条消息）',
  'report.attachmentsLine': '- 附件：{attachments}（{count} 条消息）',
  'report.rankings': '会话排行',
  'report.rankMostMessages': '消息最多',
  'report.rankMostCharacters': '字数最多',
  'report.rankLongestDuration': '持续时间最长',
  'report.details': '会话明细',
  'report.time': '时间',
  'report.duration': '持续',
  'report.unlabeledModel': '未标注模型',
  'report.otherModels': '其他 {count} 个模型',
  'report.durationMinutes': '{count} 分钟',
  'report.durationHours': '{count} 小时',
  'report.durationDays': '{count} 天',
  'report.csv.generatedAt': '报告生成时间',
  'report.csv.conversationCount': '会话数',
  'report.csv.messageCount': '消息数',
  'report.csv.userMessages': '我的消息数',
  'report.csv.assistantMessages': 'DeepSeek 消息数',
  'report.csv.charactersWithReasoning': '字数（含推理）',
  'report.csv.timeSpanDays': '时间跨度（天）',
  'report.csv.earliest': '最早会话',
  'report.csv.latest': '最晚会话',
  'report.csv.avgMessagesPerConversation': '平均每会话消息数',
  'report.csv.messagesPerDay': '日均消息数',
  'report.csv.avgCharactersPerMessage': '平均每条字数',
  'report.csv.activeDays': '活跃天数',
  'report.csv.longestStreakDays': '最长连续天数',
  'report.csv.recentStreakDays': '最近连续天数',
  'report.csv.avgQuestionCharacters': '我平均每条提问字数',
  'report.csv.avgAnswerCharacters': 'DeepSeek 平均每条回复字数',
  'report.csv.responseRatio': '回复/提问比',
  'report.csv.lengthDistribution': '会话长度分布',
  'report.csv.length': '长度',
  'report.csv.conversationCountColumn': '会话数',
  'report.csv.modelDistribution': '模型分布',
  'report.csv.model': '模型',
  'report.csv.messageCountColumn': '消息数',
  'report.csv.charactersColumn': '字数',
  'report.csv.contentBreakdown': '内容构成',
  'report.csv.item': '项目',
  'report.csv.reasoningReplies': '带推理回复',
  'report.csv.reasoningCharacters': '推理字数',
  'report.csv.references': '引用来源',
  'report.csv.referenceMessages': '引用消息数',
  'report.csv.attachments': '附件',
  'report.csv.attachmentMessages': '附件消息数',
  'report.csv.details': '会话明细',
  'report.csv.startTime': '开始时间',
  'report.csv.duration': '持续时间',
} as const

export type MessageKey = keyof typeof zh

const en = {
  'app.title': 'DeepSeek Chat Viewer',
  'app.description':
    'Preview, search, and organize exported DeepSeek chat JSON files in your browser. Your data never leaves your device.',
  'app.loading': 'Loading local cache…',
  'app.databaseBanner': 'Local database unavailable. Imported records may not persist: {error}',
  'app.dismiss': 'Dismiss',
  'app.importInProgress': 'An import is already running. Please wait.',
  'app.closeDialogFirst': 'Close the current dialog first.',
  'app.clearSuccess': 'Local data cleared.',
  'app.deleteSuccess': 'Conversation deleted.',
  'app.operationFailed': 'Operation failed: {error}',
  'app.operationFailedRetry': 'Operation failed. Please try again.',
  'app.databaseUnavailable': 'Local database unavailable: {error}',
  'app.dropTitle': 'Drop to import',
  'app.dropHint': 'Multiple JSON files supported · Duplicate conversations merge automatically',
  'app.databaseReadFailed': 'Could not read the local database',

  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.close': 'Close',

  'sidebar.aria': 'Conversation list',
  'sidebar.brandSub': 'Chat viewer',
  'sidebar.avatarAlt': 'DeepSeek assistant avatar',
  'sidebar.search': 'Search',
  'sidebar.searchTitle': 'Search (⌘K)',
  'sidebar.collapse': 'Collapse sidebar',
  'sidebar.close': 'Close sidebar',
  'sidebar.import': 'Import chats',
  'sidebar.searchPlaceholder': 'Search conversations and messages',
  'sidebar.closeSearch': 'Close search',
  'sidebar.groupsAria': 'Conversations',
  'sidebar.group.search': 'Search results',
  'sidebar.group.today': 'Today',
  'sidebar.group.yesterday': 'Yesterday',
  'sidebar.group.week': 'Previous 7 days',
  'sidebar.group.older': 'Older',
  'sidebar.noResultsTitle': 'No conversations found',
  'sidebar.noResultsBody': 'Try another keyword, or clear the search to browse everything.',
  'sidebar.clearSearch': 'Clear search',
  'sidebar.emptyTitle': 'No conversations yet',
  'sidebar.emptyBody': 'Import a JSON file exported from DeepSeek to see conversations here.',
  'sidebar.importFile': 'Import file',
  'sidebar.moreMenu': 'More menu',
  'sidebar.storageTitle': 'Local cache',

  'search.noMatches': 'No matches found',

  'theme.label': 'Theme',
  'theme.auto': 'Auto',
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  'language.label': 'Language',

  'menu.stats': 'Statistics',
  'menu.about': 'About',
  'menu.clear': 'Clear local data',

  'conversation.untitled': 'Untitled conversation',
  'conversation.matches': { one: '{count} match', other: '{count} matches' },
  'conversation.titleMatch': 'Title match',
  'conversation.messageCount': {
    one: '{count} message',
    other: '{count} messages',
  },
  'conversation.deleteAria': 'Delete conversation: {title}',
  'conversation.delete': 'Delete conversation',

  'header.toggleSidebar': 'Toggle conversation sidebar',
  'header.messages': { one: '{count} message', other: '{count} messages' },
  'header.created': 'Created {date}',
  'header.updated': 'Updated {date}',
  'header.previewTitle': 'Chat preview',
  'header.readOnly': 'Local read-only mode',
  'header.searchNav': 'Search match navigation',
  'header.previousMatch': 'Previous match',
  'header.nextMatch': 'Next match',
  'header.titleMatch': 'Title match',
  'header.exitSearch': 'Exit search',

  'empty.welcome': 'Hello, welcome back',
  'empty.lead': 'Import your exported DeepSeek chats and keep reading them locally.',
  'empty.dropTitle': 'Drop JSON files here',
  'empty.dropHint': 'or click to choose files. Multiple files are supported.',
  'empty.features': 'Multi-file import · Automatic dedupe · Full-text search',

  'composer.placeholder': 'Preview mode. Sending messages is not supported.',
  'composer.readOnly': 'Read-only preview',
  'composer.localData': 'Local data',
  'composer.uploadAttachment': 'Upload attachment',
  'composer.send': 'Send',
  'composer.hint': 'Local preview · No requests are sent',

  'message.system': 'System message',
  'message.empty': 'Empty message',
  'message.other': 'Other message',
  'message.reasoning': 'Thought process',
  'message.references': 'Sources',
  'message.emptyBody': 'This message has no displayable content',
  'message.copy': 'Copy message',
  'message.copied': 'Message copied',
  'message.copyTitle': 'Copy message',
  'message.copiedTitle': 'Copied',

  'messages.emptyTitle': 'This conversation has no messages to show',
  'messages.emptyBody':
    'The export may contain empty messages, or the conversation may only contain content that is not supported yet.',
  'messages.loadEarlier': {
    one: 'Load {count} earlier message',
    other: 'Load {count} earlier messages',
  },
  'messages.scrollBottom': 'Scroll to bottom',

  'markdown.copy': 'Copy',
  'markdown.copied': 'Copied',
  'markdown.copyFailed': 'Copy failed',
  'markdown.imageOmitted': 'Image omitted',
  'markdown.imageOmittedWithText': 'Image omitted: {text}',
  'markdown.taskDone': 'Completed',
  'markdown.taskPending': 'Not completed',

  'confirm.clearTitle': 'Clear local data?',
  'confirm.deleteTitle': 'Delete this conversation?',
  'confirm.clearMessage':
    'This will delete {conversations} and {messages} stored in this browser.',
  'confirm.deleteMessage': '“{title}” will be removed from the local cache.',
  'confirm.deleteMessageFallback': 'This conversation will be removed from the local cache.',
  'confirm.clearDetail':
    'This cannot be undone, but your original exported JSON files are not affected.',
  'confirm.deleteDetail':
    'Your original JSON files are not affected. You can import them again later.',
  'confirm.clearLabel': 'Clear local data',
  'confirm.deleteLabel': 'Delete conversation',

  'import.title': 'Importing chats',
  'import.phaseParsing': 'Parsing files',
  'import.phaseSaving': 'Saving to local cache',
  'import.phasePreparing': 'Preparing',
  'import.note': 'Files are parsed in this browser and are never uploaded.',
  'import.preparing': 'Preparing the import…',
  'import.parsingFile': 'Parsing {name} ({index}/{total})',
  'import.saving': 'Saving to the local database…',
  'import.savingProgress': 'Saving to the local database ({written}/{total})',
  'import.busy': 'An import is already running',
  'import.noFiles': 'No files selected',
  'import.parseFailed': 'Parsing failed for an unknown reason',
  'import.unknownError': 'An unknown error occurred and the local database could not be written',
  'import.busyLater': 'An import is running. Please try again later.',
  'import.unknownParseError': 'Unknown parsing error',
  'import.missingFile': 'No file received',

  'importReport.title': 'Import results',
  'importReport.interrupted': 'Import interrupted',
  'importReport.failed': 'Import failed',
  'importReport.partial': 'Import finished with some failed files',
  'importReport.noNew': 'No new conversations',
  'importReport.complete': 'Import complete',
  'importReport.interruptedBody':
    'An error occurred during the import. Data written before the error was kept where possible.',
  'importReport.allFailedBody': 'No files were imported successfully. See the reasons below.',
  'importReport.allDuplicatesBody':
    'The conversations in these files are already in the local cache, so nothing was duplicated.',
  'importReport.parsedBody': {
    one: 'Parsed {count} conversation. All data stays in this browser.',
    other: 'Parsed {count} conversations. All data stays in this browser.',
  },
  'importReport.fileParseFailed': 'Parsing failed',
  'importReport.fileSummary': {
    one: '{conversations} conversation',
    other: '{conversations} conversations',
  },
  'importReport.fileNew': '{count} new',
  'importReport.fileMerged': '{count} merged',
  'importReport.fileSkipped': '{count} skipped',
  'search.matchCount': {
    one: '{count} message match',
    other: '{count} message matches',
  },
  'importReport.scannedFiles': 'Files scanned',
  'importReport.parsedConversations': 'Conversations found',
  'importReport.newConversations': 'New conversations',
  'importReport.skippedDuplicates': 'Skipped duplicates',
  'importReport.mergedDuplicates': 'Merged duplicates',
  'importReport.newMessages': 'New messages',
  'importReport.failedFiles': 'Failed files',
  'importReport.warnings': 'Warnings',
  'importReport.fileDetails': 'File details',
  'importReport.fileCount': { one: '{count} file', other: '{count} files' },
  'importReport.statusError': 'Failed',
  'importReport.statusWarning': 'Warnings',
  'importReport.statusSuccess': 'Success',
  'importReport.warningCount': {
    one: '{count} note',
    other: '{count} notes',
  },
  'importReport.startBrowsing': 'Start browsing',

  'stats.title': 'Statistics',
  'stats.description': 'Only local conversations saved in this browser are included.',
  'stats.conversations': 'Conversations',
  'stats.messages': 'Messages',
  'stats.userAssistant': 'User {user} · Assistant {assistant}',
  'stats.characters': 'Characters',
  'stats.charactersFoot': 'Includes reasoning, excludes whitespace',
  'stats.timeSpan': 'Time span',
  'stats.summary':
    'Avg. {avgMessages} messages per conversation · {perDay} per day · {avgChars} characters per message',
  'stats.details': 'Conversation details',
  'stats.detailsOrder': 'Oldest first',
  'stats.columnConversation': 'Conversation',
  'stats.columnTime': 'Time',
  'stats.columnMessages': 'Messages',
  'stats.columnCharacters': 'Characters',
  'stats.emptyTitle': 'No conversations to summarize yet',
  'stats.emptyBody':
    'Import a DeepSeek JSON export to see conversations, messages, and character counts here.',
  'stats.exportNote': 'Exports are generated locally. No data is uploaded.',
  'stats.exportMarkdown': 'Export Markdown',
  'stats.exportCsv': 'Export CSV',

  'insights.activityAria': 'Activity',
  'insights.activity': 'Activity',
  'insights.activitySub': 'Based on message dates',
  'insights.activeDays': 'Active days',
  'insights.activeDaysFoot': 'Days with messages',
  'insights.longestStreak': 'Longest streak',
  'insights.longestStreakFoot': 'Record streak',
  'insights.recentStreak': 'Current streak',
  'insights.recentStreakFoot': 'Through the latest message',
  'insights.peakDay': 'Busiest day',
  'insights.peakDayFoot': {
    one: '{count} message',
    other: '{count} messages',
  },
  'insights.noData': 'No data',
  'insights.habits': 'Usage habits',
  'insights.less': 'Less',
  'insights.more': 'More',
  'insights.localTime': 'Local time',
  'insights.heatmapAria': 'Message heatmap by weekday and hour',
  'insights.heatmapCell': {
    one: '{day} {hour}:00 · {count} message',
    other: '{day} {hour}:00 · {count} messages',
  },
  'insights.ranking': 'Top 10 conversations',
  'insights.rankMetricAria': 'Ranking metric',
  'insights.metricMessages': 'Messages',
  'insights.metricCharacters': 'Characters',
  'insights.metricDuration': 'Duration',
  'insights.noRanked': 'No conversations to rank yet.',
  'insights.lengthDistribution': 'Conversation length distribution',
  'insights.byMessages': 'By message count',
  'insights.qaHeading': 'Message length',
  'insights.qaSub': 'Content only, excluding reasoning',
  'insights.me': 'Me',
  'insights.qaRatio': 'Replies are about {ratio}× longer than questions',
  'insights.qaNotEnough': 'Not enough Q&A data yet',
  'insights.modelsHeading': 'Models',
  'insights.modelCount': { one: '{count} model', other: '{count} models' },
  'insights.contentHeading': 'Content breakdown',
  'insights.contentSub': 'Reasoning, citations, and attachments',
  'insights.reasoningReplies': 'Replies with reasoning',
  'insights.reasoningFoot': {
    one: '{with} / {count} message',
    other: '{with} / {count} messages',
  },
  'insights.reasoningCharacters': 'Reasoning characters',
  'insights.reasoningIncluded': 'Included in total characters',
  'insights.references': 'Citations',
  'insights.referenceFoot': {
    one: '{count} message',
    other: '{count} messages',
  },
  'insights.attachments': 'Attachments',
  'insights.attachmentFoot': {
    one: '{count} message',
    other: '{count} messages',
  },
  'insights.noAnalyzable': 'No data to analyze yet.',

  'trend.aria': 'Timeline',
  'trend.heading': 'Timeline',
  'trend.granularityDay': 'Daily',
  'trend.granularityWeek': 'Weekly',
  'trend.granularityMonth': 'Monthly',
  'trend.rangeAria': 'Time range',
  'trend.allTime': 'All time',
  'trend.last7': 'Last 7 active days',
  'trend.last30': 'Last 30 active days',
  'trend.last90': 'Last 90 active days',
  'trend.lastYear': 'Last active year',
  'trend.metricAria': 'Metric',
  'trend.messages': 'Message frequency',
  'trend.characters': 'Characters',
  'trend.seriesAria': 'Series visibility',
  'trend.toggleUser': 'Show or hide your messages',
  'trend.toggleAssistant': 'Show or hide DeepSeek replies',
  'trend.note': 'Based on message timestamps',
  'trend.chartMessages': '{granularity} message frequency',
  'trend.chartCharacters': '{granularity} character trend',
  'trend.tooltipMessages': {
    one: '{range} · {count} message',
    other: '{range} · {count} messages',
  },
  'trend.tooltipUser': {
    one: 'Me {count} message / {characters} characters',
    other: 'Me {count} messages / {characters} characters',
  },
  'trend.tooltipAssistant': {
    one: 'DeepSeek {count} message / {characters} characters',
    other: 'DeepSeek {count} messages / {characters} characters',
  },
  'trend.empty': 'No messages with valid timestamps, so no trend can be drawn.',

  'about.title': 'About',
  'about.tagline': 'A local viewer for DeepSeek chat exports',
  'about.copy':
    'Import a JSON file exported from DeepSeek to browse and search your conversations offline. All parsing and data stay in your browser; no chat content is uploaded.',
  'about.githubSub': 'If this helps, give it a star 🌟',
  'about.feedback': 'Feedback',
  'about.feedbackSub': 'Report a bug or suggest an idea',
  'about.link': 'Related link',
  'about.linkSub': 'Chat with DeepSeek',
  'about.note':
    "Data lives only in your browser's IndexedDB. Clearing site data also deletes conversations.",

  'unit.days': { one: '{count} day', other: '{count} days' },
  'unit.messages': { one: '{count} message', other: '{count} messages' },
  'unit.messageCount': {
    one: '{count} message',
    other: '{count} messages',
  },
  'unit.characters': {
    one: '{count} character',
    other: '{count} characters',
  },
  'unit.conversationCount': {
    one: '{count} conversation',
    other: '{count} conversations',
  },
  'unit.fileCount': { one: '{count} file', other: '{count} files' },
  'unit.matchCount': { one: '{count} match', other: '{count} matches' },
  'unit.hintCount': { one: '{count} note', other: '{count} notes' },
  'unit.modelCount': { one: '{count} model', other: '{count} models' },

  'adapter.invalidRoot': 'The file content is not a JSON object or array',
  'adapter.unrecognizedShape':
    'Unrecognized JSON structure: no conversation array or conversation field found',
  'adapter.shapeArray': 'Top-level array',
  'adapter.shapeSingleData': 'Single conversation object (data)',
  'adapter.shapeSingle': 'Single conversation object',
  'adapter.shapeMap': 'Conversation object map',
  'adapter.mappingNoRoot':
    'The conversation mapping has no root node; messages were read in file order',
  'adapter.mappingCurrentNode':
    'current_node does not lead back to a root; the latest branch was selected',
  'adapter.mappingNoPath': 'No usable message path was found in the mapping',
  'adapter.longMessageId':
    'An unusually long raw message ID was replaced with a content fingerprint',
  'adapter.dedupedMessages': {
    one: 'Removed {count} duplicate message within the conversation',
    other: 'Removed {count} duplicate messages within the conversation',
  },
  'adapter.invalidConversation': 'The conversation entry is not an object',
  'adapter.messageSkipped': 'Message {index} could not be parsed and was skipped',
  'adapter.unknownError': 'Unknown error',
  'adapter.conversationFailed': 'Conversation {index} could not be parsed: {reason}',
  'adapter.noReadableConversations': 'The conversation structure is unrecognized: {reason}',
  'adapter.emptyExport': 'The file has no importable conversations',
  'adapter.hiddenWarnings': {
    one: '{count} more warning was not shown',
    other: '{count} more warnings were not shown',
  },
  'adapter.invalidJson': 'JSON parsing failed: {reason}',
  'adapter.databaseUnsupported': 'This browser does not support IndexedDB',

  'report.docTitle': 'DeepSeek Chat Statistics',
  'report.generatedAt': 'Generated: {time}',
  'report.overview': 'Overview',
  'report.metric': 'Metric',
  'report.value': 'Value',
  'report.conversationCount': 'Conversations',
  'report.messageCount': 'Messages',
  'report.messagesRow': 'Messages | {total} (me {user} / DeepSeek {assistant})',
  'report.characters': 'Characters',
  'report.charactersRow': 'Characters | {count} (including reasoning)',
  'report.timeSpan': 'Time span',
  'report.timeSpanValue': {
    one: '{days} day ({from} – {to})',
    other: '{days} days ({from} – {to})',
  },
  'report.summary':
    'Avg. {avgMessages} messages per conversation · {perDay} per day · {avgChars} characters per message',
  'report.activity': 'Activity',
  'report.activeDays': 'Active days',
  'report.longestStreak': 'Longest streak',
  'report.recentStreak': 'Current streak',
  'report.peakDay': 'Busiest day',
  'report.peakDayValue': {
    one: '{date} ({count} message)',
    other: '{date} ({count} messages)',
  },
  'report.qaHeading': 'Message length',
  'report.avgQuestion': '- My average question: {count} characters',
  'report.avgAnswer': '- Average DeepSeek reply: {count} characters (content only, excluding reasoning)',
  'report.responseRatio': '- Reply / question: {ratio}',
  'report.times': '{ratio}×',
  'report.lengthDistribution': 'Conversation length distribution',
  'report.length': 'Length',
  'report.lengthBucket0': '0 messages',
  'report.lengthBucket1': '1–2 messages',
  'report.lengthBucket2': '3–10 messages',
  'report.lengthBucket3': '11–50 messages',
  'report.lengthBucket4': '51+ messages',
  'report.modelDistribution': 'Model distribution',
  'report.model': 'Model',
  'report.conversationColumn': 'Conversation',
  'report.messagesColumn': 'Messages',
  'report.contentBreakdown': 'Content breakdown',
  'report.reasoningRepliesLine': '- Replies with reasoning: {with} / {total} ({percent})',
  'report.reasoningCharactersLine': '- Reasoning characters: {count}',
  'report.referencesLine': {
    one: '- Citations: {citations} ({count} message)',
    other: '- Citations: {citations} ({count} messages)',
  },
  'report.attachmentsLine': {
    one: '- Attachments: {attachments} ({count} message)',
    other: '- Attachments: {attachments} ({count} messages)',
  },
  'report.rankings': 'Conversation rankings',
  'report.rankMostMessages': 'Most messages',
  'report.rankMostCharacters': 'Most characters',
  'report.rankLongestDuration': 'Longest duration',
  'report.details': 'Conversation details',
  'report.time': 'Time',
  'report.duration': 'Duration',
  'report.unlabeledModel': 'Unlabeled model',
  'report.otherModels': {
    one: '{count} more model',
    other: '{count} more models',
  },
  'report.durationMinutes': '{count} min',
  'report.durationHours': '{count} h',
  'report.durationDays': { one: '{count} day', other: '{count} days' },
  'report.csv.generatedAt': 'Generated at',
  'report.csv.conversationCount': 'Conversations',
  'report.csv.messageCount': 'Messages',
  'report.csv.userMessages': 'My messages',
  'report.csv.assistantMessages': 'DeepSeek messages',
  'report.csv.charactersWithReasoning': 'Characters (including reasoning)',
  'report.csv.timeSpanDays': 'Time span (days)',
  'report.csv.earliest': 'Earliest conversation',
  'report.csv.latest': 'Latest conversation',
  'report.csv.avgMessagesPerConversation': 'Average messages per conversation',
  'report.csv.messagesPerDay': 'Messages per day',
  'report.csv.avgCharactersPerMessage': 'Average characters per message',
  'report.csv.activeDays': 'Active days',
  'report.csv.longestStreakDays': 'Longest streak (days)',
  'report.csv.recentStreakDays': 'Current streak (days)',
  'report.csv.avgQuestionCharacters': 'Average question characters',
  'report.csv.avgAnswerCharacters': 'Average DeepSeek reply characters',
  'report.csv.responseRatio': 'Reply / question ratio',
  'report.csv.lengthDistribution': 'Conversation length distribution',
  'report.csv.length': 'Length',
  'report.csv.conversationCountColumn': 'Conversations',
  'report.csv.modelDistribution': 'Model distribution',
  'report.csv.model': 'Model',
  'report.csv.messageCountColumn': 'Messages',
  'report.csv.charactersColumn': 'Characters',
  'report.csv.contentBreakdown': 'Content breakdown',
  'report.csv.item': 'Item',
  'report.csv.reasoningReplies': 'Replies with reasoning',
  'report.csv.reasoningCharacters': 'Reasoning characters',
  'report.csv.references': 'Citations',
  'report.csv.referenceMessages': 'Messages with citations',
  'report.csv.attachments': 'Attachments',
  'report.csv.attachmentMessages': 'Messages with attachments',
  'report.csv.details': 'Conversation details',
  'report.csv.startTime': 'Started at',
  'report.csv.duration': 'Duration',
} satisfies Record<MessageKey, MessageEntry>

const dictionaries: Record<Locale, Record<MessageKey, MessageEntry>> = {
  'zh-CN': zh,
  en,
}

const pluralRules = new Map<Locale, Intl.PluralRules>()
const numberFormats = new Map<Locale, Intl.NumberFormat>()

function getPluralRules(value: Locale): Intl.PluralRules {
  let rules = pluralRules.get(value)
  if (!rules) {
    rules = new Intl.PluralRules(value)
    pluralRules.set(value, rules)
  }
  return rules
}

function getNumberFormat(value: Locale): Intl.NumberFormat {
  let format = numberFormats.get(value)
  if (!format) {
    format = new Intl.NumberFormat(value)
    numberFormats.set(value, format)
  }
  return format
}

export function formatNumber(value: number): string {
  return getNumberFormat(locale.value).format(value)
}

function interpolate(
  template: string,
  params: MessageParams | undefined,
  value: Locale,
): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const param = params[name]
    if (param === undefined || param === null) return match
    return typeof param === 'number' ? getNumberFormat(value).format(param) : param
  })
}

export function translate(
  value: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  const dictionary = dictionaries[value] ?? dictionaries[DEFAULT_LOCALE]
  const entry = dictionary[key] ?? dictionaries[DEFAULT_LOCALE][key]
  if (entry === undefined) return key

  let template: string = typeof entry === 'string' ? entry : ''
  if (typeof entry !== 'string') {
    const count = params?.count
    const category = typeof count === 'number' ? getPluralRules(value).select(count) : 'other'
    template = entry[category] ?? entry.other ?? entry.one ?? ''
  }

  return interpolate(template, params, value)
}

export function t(key: MessageKey, params?: MessageParams): string {
  return translate(locale.value, key, params)
}

export function normalizeLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') return null
  return localeOptions.some((option) => option.code === value)
    ? (value as Locale)
    : null
}

export function resolveLocale(
  stored: string | null,
  browserLanguage?: string | null,
): Locale {
  return (
    normalizeLocale(stored) ??
    (browserLanguage?.toLowerCase().startsWith('en') ? 'en' : DEFAULT_LOCALE)
  )
}

function readLocale(): Locale {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(LOCALE_KEY)
  } catch {
    // Storage can be unavailable; fall back to the browser language.
  }
  return resolveLocale(stored, typeof window !== 'undefined' ? navigator.language : null)
}

export const locale = ref<Locale>(readLocale())

export function applyLocale(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale.value
  document.title = t('app.title')
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', t('app.description'))
}

export function setLocale(value: string): void {
  const next = normalizeLocale(value)
  if (!next || next === locale.value) return
  locale.value = next
  try {
    localStorage.setItem(LOCALE_KEY, next)
  } catch {
    // Storage may be unavailable; the selected language still applies this session.
  }
  applyLocale()
}

export function initI18n(): void {
  applyLocale()
}
