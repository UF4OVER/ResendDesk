import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity as ActivityIcon,
  ArrowRight,
  Download,
  Check,
  CircleAlert,
  Clock3,
  Code2,
  ContactRound,
  Copy,
  FileText,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  Mail,
  Moon,
  MoreHorizontal,
  Plus,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Type,
  Upload,
  UserPlus,
  X,
} from 'lucide-react'

type View = 'overview' | 'compose' | 'templates' | 'contacts' | 'activity' | 'settings'
type Language = 'zh' | 'en'
type ToastKind = 'success' | 'error'
type Toast = { kind: ToastKind; message: string } | null
type LocaleCopy = typeof copyZh

const APP_VERSION = '0.2.0'
const APP_CREATOR = 'UF4'
const LANGUAGE_KEY = 'resend-desk-language'

const copyZh = {
  app: {
    brand: 'Resend',
    brandSuffix: 'Desk',
    newMail: '新建邮件',
    search: '搜索',
    settings: '设置',
    themeLight: '切换到浅色主题',
    themeDark: '切换到暗色主题',
    language: '语言',
    chinese: '中文',
    english: 'English',
    creator: '制作人',
    version: '版本号',
    exportTemplates: '导出模板',
    importTemplates: '导入模板',
    importHint: '导入 JSON 文件',
    rightClickBlocked: '已屏蔽右键菜单',
  },
  nav: { overview: '总览', compose: '写邮件', templates: '模板', contacts: '联系人', activity: '发送记录', settings: '设置' },
  topbar: { search: '搜索', newMail: '新建邮件' },
  overview: {
    workbench: '工作台',
    connectTitle: '连接你的 Resend 账户',
    connectBody: '添加 API Key 后即可从桌面发送邮件并同步发送记录。密钥由系统安全存储加密。',
    startSetup: '开始设置',
    readyTitle: '准备好发送第一封邮件',
    readyBody: '配置账户后，可在一个窗口里完成编写、测试和发送。',
    statusTitle: '邮件发送状态一目了然',
    statusBody: '查看最近活动，快速回到常用模板。',
    recentTitle: '最近发送',
    recentBody: '当前设备记录的邮件活动',
    viewAll: '查看全部',
    noneTitle: '还没有发送记录',
    noneBody: '发送成功的邮件会显示在这里。',
    writeMail: '写一封邮件',
    templatesTitle: '常用模板',
    templatesBody: '快速开始一封邮件',
    viewTemplates: '查看模板',
  },
  compose: {
    blocked: '发送前需要连接 Resend API。',
    goSettings: '前往设置',
    from: '发件人',
    to: '收件人',
    subject: '主题',
    fromPlaceholder: '团队名称 <hello@yourdomain.com>',
    toPlaceholder: 'name@example.com，多个地址用逗号分隔',
    subjectPlaceholder: '邮件主题',
    html: 'HTML',
    preview: '预览',
    fullHtml: '支持完整 HTML',
    saveTemplate: '保存为模板',
    sendMail: '发送邮件',
    sending: '正在发送',
    checkTitle: '发送检查',
    fromCheck: '发件人地址',
    apiCheck: 'API 连接',
    recipientCheck: (count: number) => `${count || 0} 位收件人`,
    note: '建议先发送到自己的邮箱，检查移动端显示和垃圾邮件表现。',
  },
  templates: {
    title: '模板',
    search: '搜索模板',
    count: (value: number) => `${value} 个模板`,
    delete: '删除',
    use: '使用模板',
    noneTitle: '没有匹配的模板',
    noneBody: '换个关键词，或从邮件编辑器保存一个新模板。',
    toolbar: '模板库',
    exportReady: '模板已导出',
    importReady: '模板已导入',
    importFailed: '模板导入失败',
    exportFailed: '模板导出失败',
    importUnsupported: '请选择 JSON 文件',
    emptyImport: '文件里没有可导入的模板',
  },
  contacts: {
    title: '联系人',
    search: '搜索姓名、邮箱或标签',
    add: '添加联系人',
    noneTitle: '没有联系人',
    noneBody: '添加常用收件人，写邮件时会更方便。',
    name: '姓名',
    email: '邮箱',
    tag: '标签',
    optional: '可选',
    category: '例如 Customer',
    save: '保存联系人',
    saved: '联系人已保存',
    edit: '编辑联系人',
    deleted: '联系人已删除',
    copyEmail: '复制邮箱',
    copied: '邮箱已复制',
    unnamed: '未命名',
    uncategorized: '未分类',
  },
  activity: {
    title: '发送记录',
    all: '全部状态',
    search: '搜索主题、收件人、正文或 ID',
    sync: '同步 Resend',
    emptyTitle: '暂无发送记录',
    emptyBody: '从本客户端成功发送的邮件会记录在这里。',
    noMatchTitle: '没有匹配的发送记录',
    noMatchBody: '换个关键词试试，可搜索主题、收件人、发件人、正文或邮件 ID。',
    sent: '已发送',
    detailTitle: '发送详情',
    id: 'ID',
    status: '状态',
    from: '发件人',
    replyTo: 'Reply-To',
    content: '邮件内容',
    noContent: '此记录没有保存邮件内容。',
    recipient: '收件人',
    time: '时间',
    subject: '主题',
    close: '关闭',
    rowHint: '点击查看详情',
    synced: (count: number) => `已从 Resend 读取 ${count || 0} 条记录`,
  },
  settings: {
    title: '设置',
    connectionTitle: 'Resend 连接',
    connectionBody: '连接信息只保存在当前设备。API Key 使用操作系统提供的安全存储进行加密。',
    apiKey: 'API Key',
    apiSaved: '已保存',
    apiPlaceholder: '已保存 ••••••••••••••••',
    apiHint: '建议创建仅用于本客户端的 API Key。',
    test: '测试连接',
    remove: '移除密钥',
    defaultTitle: '发送默认值',
    defaultBody: '新建邮件时自动填入这些信息，仍可在发送前修改。',
    defaultFrom: '默认发件人',
    defaultReplyTo: '默认 Reply-To',
    save: '保存更改',
    saving: '正在保存',
    versionTitle: '关于',
    creatorLabel: '制作人',
    versionLabel: '版本号',
    languageLabel: '界面语言',
    usageTitle: '当前用量',
    usageBody: '基于当前设备的本地记录统计。',
    usageSentTotal: '累计发送',
    usageSentMonth: '本月发送',
    usageTemplates: '模板数量',
    usageContacts: '联系人数量',
    usageLastSent: '最近发送',
    usageNoSent: '暂无记录',
    usageRemoteTitle: '远端用量',
    usageRemoteBody: '从 Resend API 响应头读取，取决于当前 API Key 权限。',
    usageRefresh: '刷新远端用量',
    usageRefreshing: '正在刷新',
    usageDailyQuota: '今日用量',
    usageMonthlyQuota: '本月用量',
    usageRemoteCount: '远端最近记录',
    usageCheckedAt: '检查时间',
    usageUnavailable: '未返回',
    usageRemoteReady: '远端用量已刷新',
    appearanceTitle: '外观',
    appearanceBody: '选择当前设备已安装的字体作为界面字体。',
    fontLabel: '界面字体',
    fontSystem: '跟随系统',
    fontLoading: '正在读取字体',
    fontUnavailable: '未能读取本地字体',
    updateCheck: '检查更新',
    updateChecking: '正在检查',
    updateReady: (version: string) => `发现新版本 ${version}`,
    updateCurrent: (version: string) => `已是最新版本 ${version}`,
  },
  common: {
    loading: '加载中',
    close: '关闭',
    success: '成功',
    error: '错误',
    preview: '预览',
    import: '导入',
    export: '导出',
  },
}

const copyEn: LocaleCopy = {
  app: {
    brand: 'Resend',
    brandSuffix: 'Desk',
    newMail: 'New mail',
    search: 'Search',
    settings: 'Settings',
    themeLight: 'Switch to light theme',
    themeDark: 'Switch to dark theme',
    language: 'Language',
    chinese: 'Chinese',
    english: 'English',
    creator: 'Creator',
    version: 'Version',
    exportTemplates: 'Export templates',
    importTemplates: 'Import templates',
    importHint: 'Import a JSON file',
    rightClickBlocked: 'Context menu blocked',
  },
  nav: { overview: 'Overview', compose: 'Compose', templates: 'Templates', contacts: 'Contacts', activity: 'Activity', settings: 'Settings' },
  topbar: { search: 'Search', newMail: 'New mail' },
  overview: {
    workbench: 'Workbench',
    connectTitle: 'Connect your Resend account',
    connectBody: 'Add an API key to send mail from the desktop and sync activity. The key is encrypted by the operating system.',
    startSetup: 'Set up',
    readyTitle: 'Ready to send your first email',
    readyBody: 'After setup, you can write, test, and send in one window.',
    statusTitle: 'Your sending status at a glance',
    statusBody: 'Review recent activity and jump back to templates quickly.',
    recentTitle: 'Recent sends',
    recentBody: 'Mail activity recorded on this device',
    viewAll: 'View all',
    noneTitle: 'No send history yet',
    noneBody: 'Successfully sent messages will appear here.',
    writeMail: 'Write a mail',
    templatesTitle: 'Popular templates',
    templatesBody: 'Start a message quickly',
    viewTemplates: 'View templates',
  },
  compose: {
    blocked: 'Connect the Resend API before sending.',
    goSettings: 'Open settings',
    from: 'From',
    to: 'To',
    subject: 'Subject',
    fromPlaceholder: 'Team Name <hello@yourdomain.com>',
    toPlaceholder: 'name@example.com, separate multiple addresses with commas',
    subjectPlaceholder: 'Email subject',
    html: 'HTML',
    preview: 'Preview',
    fullHtml: 'Full HTML supported',
    saveTemplate: 'Save as template',
    sendMail: 'Send mail',
    sending: 'Sending',
    checkTitle: 'Send check',
    fromCheck: 'From address',
    apiCheck: 'API connection',
    recipientCheck: (count: number) => `${count || 0} recipient(s)`,
    note: 'Send to yourself first to check mobile rendering and spam behavior.',
  },
  templates: {
    title: 'Templates',
    search: 'Search templates',
    count: (value: number) => `${value} template(s)`,
    delete: 'Delete',
    use: 'Use template',
    noneTitle: 'No matching templates',
    noneBody: 'Try another keyword, or save a new template from the editor.',
    toolbar: 'Template library',
    exportReady: 'Templates exported',
    importReady: 'Templates imported',
    importFailed: 'Template import failed',
    exportFailed: 'Template export failed',
    importUnsupported: 'Please choose a JSON file',
    emptyImport: 'No templates found in the file',
  },
  contacts: {
    title: 'Contacts',
    search: 'Search name, email, or tag',
    add: 'Add contact',
    noneTitle: 'No contacts',
    noneBody: 'Add common recipients to make composing easier.',
    name: 'Name',
    email: 'Email',
    tag: 'Tag',
    optional: 'Optional',
    category: 'For example Customer',
    save: 'Save contact',
    saved: 'Contact saved',
    edit: 'Edit contact',
    deleted: 'Contact deleted',
    copyEmail: 'Copy email',
    copied: 'Email copied',
    unnamed: 'Unnamed',
    uncategorized: 'Uncategorized',
  },
  activity: {
    title: 'Activity',
    all: 'All status',
    search: 'Search subject, recipient, content, or ID',
    sync: 'Sync Resend',
    emptyTitle: 'No activity yet',
    emptyBody: 'Successfully sent messages from this client will show up here.',
    noMatchTitle: 'No matching send records',
    noMatchBody: 'Try another keyword. You can search subject, recipient, sender, content, or message ID.',
    sent: 'Sent',
    detailTitle: 'Activity details',
    id: 'ID',
    status: 'Status',
    from: 'From',
    replyTo: 'Reply-To',
    content: 'Email content',
    noContent: 'This record has no saved email content.',
    recipient: 'Recipient',
    time: 'Time',
    subject: 'Subject',
    close: 'Close',
    rowHint: 'Click to view details',
    synced: (count: number) => `Loaded ${count || 0} record(s) from Resend`,
  },
  settings: {
    title: 'Settings',
    connectionTitle: 'Resend connection',
    connectionBody: 'Connection info stays on this device only. The API key is encrypted with the operating system secure store.',
    apiKey: 'API key',
    apiSaved: 'Saved',
    apiPlaceholder: 'Saved ••••••••••••••••',
    apiHint: 'Create a key dedicated to this client.',
    test: 'Test connection',
    remove: 'Remove key',
    defaultTitle: 'Default sending values',
    defaultBody: 'These values will be prefilled in new messages and can still be edited before sending.',
    defaultFrom: 'Default from',
    defaultReplyTo: 'Default Reply-To',
    save: 'Save changes',
    saving: 'Saving',
    versionTitle: 'About',
    creatorLabel: 'Creator',
    versionLabel: 'Version',
    languageLabel: 'UI language',
    usageTitle: 'Current usage',
    usageBody: 'Calculated from local records on this device.',
    usageSentTotal: 'Total sent',
    usageSentMonth: 'Sent this month',
    usageTemplates: 'Templates',
    usageContacts: 'Contacts',
    usageLastSent: 'Last sent',
    usageNoSent: 'No records yet',
    usageRemoteTitle: 'Remote usage',
    usageRemoteBody: 'Read from Resend API response headers. Availability depends on the current API key permission.',
    usageRefresh: 'Refresh remote usage',
    usageRefreshing: 'Refreshing',
    usageDailyQuota: 'Daily usage',
    usageMonthlyQuota: 'Monthly usage',
    usageRemoteCount: 'Remote recent records',
    usageCheckedAt: 'Checked at',
    usageUnavailable: 'Not returned',
    usageRemoteReady: 'Remote usage refreshed',
    appearanceTitle: 'Appearance',
    appearanceBody: 'Choose a locally installed font for the interface.',
    fontLabel: 'Interface font',
    fontSystem: 'System default',
    fontLoading: 'Loading fonts',
    fontUnavailable: 'Could not load local fonts',
    updateCheck: 'Check updates',
    updateChecking: 'Checking',
    updateReady: (version: string) => `New version ${version} available`,
    updateCurrent: (version: string) => `You are on the latest version ${version}`,
  },
  common: {
    loading: 'Loading',
    close: 'Close',
    success: 'Success',
    error: 'Error',
    preview: 'Preview',
    import: 'Import',
    export: 'Export',
  },
}

const translations = { zh: copyZh, en: copyEn } as const
const LocaleContext = createContext<{ lang: Language; setLang: (lang: Language) => void; t: LocaleCopy }>({ lang: 'zh', setLang: () => {}, t: copyZh })

function useLocale() {
  return useContext(LocaleContext)
}

function formatTime(value: string, lang: Language) {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

const navItems: { id: View; icon: typeof Mail }[] = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'compose', icon: Send },
  { id: 'templates', icon: FileText },
  { id: 'contacts', icon: ContactRound },
  { id: 'activity', icon: ActivityIcon },
]

const defaultState: AppState = {
  settings: { hasApiKey: false, defaultFrom: '', replyTo: '', uiFont: '' },
  templates: [], contacts: [], activity: [],
}

function validateFromAddress(value: string, lang: Language) {
  const from = value.trim()
  if (!from) return ''
  const email = '[^\\s<>@]+@[^\\s<>@]+\\.[^\\s<>@]+'
  if (!new RegExp(`^(?:${email}|[^<>]+\\s*<${email}>)$`).test(from)) {
    return lang === 'zh' ? '格式应为 name@example.com 或 Name <name@example.com>' : 'Use name@example.com or Name <name@example.com>'
  }
  if (/@example\.(com|org|net)>?$/i.test(from)) {
    return lang === 'zh' ? '示例地址不能用于发送，请填写已验证域名的邮箱' : 'Example domains cannot send real mail. Use a verified Resend domain.'
  }
  return ''
}

function friendlyError(error: unknown, lang: Language) {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw.replace(/^Error invoking remote method '[^']+': Error:\s*/i, '')
  if (/Invalid `from` field/i.test(message)) {
    return lang === 'zh'
      ? '发件人地址无效。请使用 name@example.com 或 Name <name@example.com> 格式，并确认域名已在 Resend 验证。'
      : 'The from address is invalid. Use name@example.com or Name <name@example.com>, and confirm the domain is verified in Resend.'
  }
  if (/domain is not verified/i.test(message)) {
    return lang === 'zh' ? '发件域名尚未验证，请先在 Resend 控制台完成域名验证。' : 'The sending domain is not verified. Verify it in the Resend dashboard first.'
  }
  return message
}

function normalizeTemplates(input: unknown): Partial<Template>[] {
  const source = Array.isArray(input) ? input : (input && typeof input === 'object' && 'templates' in input ? (input as { templates?: unknown }).templates : [])
  if (!Array.isArray(source)) return []
  return source
    .filter((item): item is Partial<Template> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : undefined,
      name: typeof item.name === 'string' ? item.name : 'Imported template',
      subject: typeof item.subject === 'string' ? item.subject : '',
      html: typeof item.html === 'string' ? item.html : '',
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
    }))
    .filter((item) => item.name || item.subject || item.html)
}

function buildPreviewDocument(html: string) {
  const previewGuard = '<base href="about:blank"><style>a{pointer-events:none!important;cursor:default!important}</style>'
  if (/<head(?:\s[^>]*)?>/i.test(html)) return html.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${previewGuard}`)
  if (/<html(?:\s[^>]*)?>/i.test(html)) return html.replace(/<html(?:\s[^>]*)?>/i, (root) => `${root}<head>${previewGuard}</head>`)
  return `<!doctype html><html><head>${previewGuard}</head><body style="font-family:Arial,sans-serif;padding:32px;color:#171717">${html}</body></html>`
}

function App() {
  const [view, setView] = useState<View>('overview')
  const [state, setState] = useState<AppState>(defaultState)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<Toast>(null)
  const [composeSeed, setComposeSeed] = useState<Partial<Template> | null>(null)
  const [activitySearchFocusToken, setActivitySearchFocusToken] = useState(0)
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY)
    return saved === 'en' || saved === 'zh' ? saved : 'zh'
  })
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('resend-desk-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const localeValue = useMemo(() => ({ lang, setLang, t: translations[lang] }), [lang])
  const t = localeValue.t

  useEffect(() => {
    window.resendDesk.getState().then(setState).catch((error) => notify('error', friendlyError(error, lang))).finally(() => setLoading(false))
  }, [lang])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('resend-desk-theme', theme)
  }, [theme])

  useEffect(() => {
    const font = state.settings.uiFont?.trim()
    document.documentElement.style.setProperty('--app-font', font ? `"${font}", "Segoe UI Variable", "Segoe UI", Arial, sans-serif` : '"Segoe UI Variable", "Segoe UI", Arial, sans-serif')
  }, [state.settings.uiFont])

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    localStorage.setItem(LANGUAGE_KEY, lang)
  }, [lang])

  useEffect(() => {
    const blockContextMenu = (event: MouseEvent) => event.preventDefault()
    window.addEventListener('contextmenu', blockContextMenu)
    return () => window.removeEventListener('contextmenu', blockContextMenu)
  }, [])

  const notify = (kind: ToastKind, message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 3600)
  }

  const openCompose = (template?: Partial<Template>) => {
    setComposeSeed(template || null)
    setView('compose')
  }

  const openActivitySearch = () => {
    setView('activity')
    setActivitySearchFocusToken((value) => value + 1)
  }

  if (loading) return <LocaleContext.Provider value={localeValue}><LoadingScreen /></LocaleContext.Provider>

  return (
    <LocaleContext.Provider value={localeValue}>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><img src="./app-icon.png" alt="" /></div>
          <div><strong>{t.app.brand}</strong><span>{t.app.brandSuffix}</span></div>
        </div>

        <button className="compose-shortcut" onClick={() => openCompose()}>
          <Plus size={16} /> {t.app.newMail} <kbd>⌘ N</kbd>
        </button>

        <nav className="main-nav" aria-label={t.app.settings}>
          {navItems.map((item) => {
            const Icon = item.icon
            return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><Icon size={17} />{t.nav[item.id]}</button>
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className={`connection ${state.settings.hasApiKey ? 'connected' : ''}`}>
            <span className="status-dot" />
            <div><strong>{state.settings.hasApiKey ? (lang === 'zh' ? 'API 已连接' : 'API connected') : (lang === 'zh' ? '尚未连接' : 'Not connected')}</strong><small>{state.settings.hasApiKey ? (lang === 'zh' ? '密钥已安全保存' : 'Key saved securely') : (lang === 'zh' ? '添加 Resend API Key' : 'Add a Resend API key')}</small></div>
          </div>
          <button className={view === 'settings' ? 'settings-link active' : 'settings-link'} onClick={() => setView('settings')}><Settings size={17} />{t.app.settings}</button>
        </div>
      </aside>

      <main className="main-area">
        <Topbar view={view} onCompose={() => openCompose()} onSearch={openActivitySearch} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
        <div className="page-scroll">
          {view === 'overview' && <Overview state={state} onNavigate={setView} onCompose={openCompose} />}
          {view === 'compose' && <Compose state={state} seed={composeSeed} onState={setState} notify={notify} onSettings={() => setView('settings')} />}
          {view === 'templates' && <Templates state={state} onState={setState} onUse={openCompose} notify={notify} />}
          {view === 'contacts' && <Contacts state={state} onState={setState} notify={notify} />}
          {view === 'activity' && <Activity state={state} notify={notify} focusToken={activitySearchFocusToken} />}
          {view === 'settings' && <SettingsView state={state} onState={setState} notify={notify} />}
        </div>
      </main>

      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.kind === 'success' ? <Check size={16} /> : <CircleAlert size={16} />}{toast.message}<button onClick={() => setToast(null)} aria-label={t.common.close}><X size={14} /></button></div>}
    </div>
    </LocaleContext.Provider>
  )
}

function LoadingScreen() {
  const { t } = useLocale()
  return <div className="loading-screen" aria-label={t.common.loading}><div className="brand-mark large"><img src="./app-icon.png" alt="" /></div><div className="loading-line" /></div>
}

function Topbar({ view, onCompose, onSearch, theme, onToggleTheme }: { view: View; onCompose: () => void; onSearch: () => void; theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const { lang, setLang, t } = useLocale()
  return <header className="topbar"><h1>{t.nav[view]}</h1><div className="top-actions"><button className="icon-button" title={theme === 'dark' ? t.app.themeLight : t.app.themeDark} onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button" title={t.topbar.search} onClick={onSearch}><Search size={17} /></button><button className="secondary small language-button" title={t.app.language} onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>{lang === 'zh' ? 'EN' : '中'}</button>{view !== 'compose' && <button className="primary small" onClick={onCompose}><Plus size={16} />{t.topbar.newMail}</button>}</div></header>
}

function Overview({ state, onNavigate, onCompose }: { state: AppState; onNavigate: (v: View) => void; onCompose: (t?: Partial<Template>) => void }) {
  const { lang, t } = useLocale()
  const [selected, setSelected] = useState<Activity | null>(null)
  const delivered = state.activity.filter((item) => item.status === 'sent' || item.status === 'delivered').length
  const metrics = [
    { label: lang === 'zh' ? '已发送' : 'Sent', value: state.activity.length, note: lang === 'zh' ? '本地记录' : 'Local records', icon: Send },
    { label: lang === 'zh' ? '已送达' : 'Delivered', value: delivered, note: state.activity.length ? `${Math.round((delivered / state.activity.length) * 100)}% ${lang === 'zh' ? '送达率' : 'delivery'}` : (lang === 'zh' ? '等待首次发送' : 'Waiting for first send'), icon: Inbox },
    { label: t.nav.templates, value: state.templates.length, note: lang === 'zh' ? '可直接复用' : 'Ready to reuse', icon: FileText },
    { label: t.nav.contacts, value: state.contacts.length, note: lang === 'zh' ? '本地通讯录' : 'Local address book', icon: ContactRound },
  ]

  return <div className="page overview-page">
    {!state.settings.hasApiKey && <section className="setup-banner">
      <div className="setup-icon"><ShieldCheck size={22} /></div>
      <div><h2>{t.overview.connectTitle}</h2><p>{t.overview.connectBody}</p></div>
      <button className="primary" onClick={() => onNavigate('settings')}>{t.overview.startSetup} <ArrowRight size={16} /></button>
    </section>}

    <section className="welcome-row"><div><p className="muted-label">{t.overview.workbench}</p><h2>{state.settings.hasApiKey ? t.overview.statusTitle : t.overview.readyTitle}</h2><p>{state.settings.hasApiKey ? t.overview.statusBody : t.overview.readyBody}</p></div><button className="secondary" onClick={() => onCompose()}><Code2 size={16} />{lang === 'zh' ? '打开编辑器' : 'Open editor'}</button></section>

    <section className="metric-grid">{metrics.map(({ label, value, note, icon: Icon }) => <div className="metric" key={label}><div className="metric-top"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{note}</small></div>)}</section>

    <div className="overview-columns">
      <section className="panel recent-panel"><div className="panel-header"><div><h3>{t.overview.recentTitle}</h3><p>{t.overview.recentBody}</p></div><button className="text-button" onClick={() => onNavigate('activity')}>{t.overview.viewAll} <ArrowRight size={14} /></button></div>
        {state.activity.length ? <div className="activity-list">{state.activity.slice(0, 5).map((item) => <ActivityRow key={item.id} item={item} onOpen={setSelected} />)}</div> : <Empty compact icon={Send} title={t.overview.noneTitle} body={t.overview.noneBody} action={t.overview.writeMail} onAction={() => onCompose()} />}
      </section>
      <section className="panel templates-panel"><div className="panel-header"><div><h3>{t.overview.templatesTitle}</h3><p>{t.overview.templatesBody}</p></div><button className="icon-button flat" title={t.overview.viewTemplates} onClick={() => onNavigate('templates')}><MoreHorizontal size={17} /></button></div>
        <div className="quick-templates">{state.templates.slice(0, 4).map((template) => <button key={template.id} onClick={() => onCompose(template)}><span className="template-glyph"><Mail size={16} /></span><div><strong>{template.name}</strong><small>{template.subject}</small></div><ArrowRight size={15} /></button>)}</div>
      </section>
    </div>
    {selected && <ActivityDetails item={selected} onClose={() => setSelected(null)} />}
  </div>
}

function Compose({ state, seed, onState, notify, onSettings }: { state: AppState; seed: Partial<Template> | null; onState: (s: AppState) => void; notify: (k: 'success' | 'error', m: string) => void; onSettings: () => void }) {
  const { lang, t } = useLocale()
  const [from, setFrom] = useState(state.settings.defaultFrom)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(seed?.subject || '')
  const [html, setHtml] = useState(seed?.html || (lang === 'zh' ? '<h1>你好</h1>\n<p>在这里写下你的邮件内容。</p>' : '<h1>Hello</h1>\n<p>Write your email content here.</p>'))
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [sending, setSending] = useState(false)

  useEffect(() => { setSubject(seed?.subject || ''); if (seed?.html) setHtml(seed.html) }, [seed])
  const recipients = to.split(',').map((value) => value.trim()).filter(Boolean)
  const fromError = validateFromAddress(from, lang)
  const canSend = Boolean(from && !fromError && recipients.length && subject && html && state.settings.hasApiKey)

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const response = await window.resendDesk.sendEmail({ from, to: recipients, subject, html, replyTo: state.settings.replyTo })
      onState(response.state)
      notify('success', lang === 'zh' ? `邮件已交给 Resend，ID: ${response.result.id}` : `Message handed to Resend, ID: ${response.result.id}`)
      setTo(''); setSubject('')
    } catch (error) { notify('error', friendlyError(error, lang)) }
    finally { setSending(false) }
  }

  const saveTemplate = async () => {
    try {
      const next = await window.resendDesk.saveTemplate({ name: subject || (lang === 'zh' ? '未命名模板' : 'Untitled template'), subject, html })
      onState(next); notify('success', lang === 'zh' ? '模板已保存' : 'Template saved')
    } catch (error) { notify('error', friendlyError(error, lang)) }
  }

  return <div className="compose-layout">
    <section className="composer">
      {!state.settings.hasApiKey && <div className="inline-warning"><CircleAlert size={16} /><span>{t.compose.blocked}</span><button onClick={onSettings}>{t.compose.goSettings}</button></div>}
      <div className="compose-fields">
        <label className={fromError ? 'invalid' : ''}><span>{t.compose.from}</span><div className="compose-input"><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder={t.compose.fromPlaceholder} />{fromError && <small>{fromError}</small>}</div></label>
        <label><span>{t.compose.to}</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder={t.compose.toPlaceholder} /></label>
        <label><span>{t.compose.subject}</span><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t.compose.subjectPlaceholder} /></label>
      </div>
      <div className="editor-toolbar"><div className="segmented"><button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>{t.compose.html}</button><button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>{t.compose.preview}</button></div><div className="editor-meta"><Code2 size={14} />{t.compose.fullHtml}</div></div>
      <div className="editor-area">{mode === 'edit' ? <textarea value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} /> : <iframe title="邮件预览" sandbox="" srcDoc={buildPreviewDocument(html)} />}</div>
      <footer className="compose-footer"><div><button className="secondary" onClick={saveTemplate}><FileText size={15} />{t.compose.saveTemplate}</button><span>{html.length} {lang === 'zh' ? '字符' : 'chars'}</span></div><button className="primary send-button" disabled={!canSend || sending} onClick={send}>{sending ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}{sending ? t.compose.sending : t.compose.sendMail}</button></footer>
    </section>
    <aside className="compose-aside"><h3>{t.compose.checkTitle}</h3><CheckItem done={Boolean(from)} text={t.compose.fromCheck} /><CheckItem done={recipients.length > 0} text={t.compose.recipientCheck(recipients.length)} /><CheckItem done={Boolean(subject)} text={t.compose.subject} /><CheckItem done={state.settings.hasApiKey} text={t.compose.apiCheck} /><div className="aside-note"><Sparkles size={16} /><p>{t.compose.note}</p></div></aside>
  </div>
}

function CheckItem({ done, text }: { done: boolean; text: string }) { return <div className={`check-item ${done ? 'done' : ''}`}><span>{done && <Check size={12} />}</span>{text}</div> }

function Templates({ state, onState, onUse, notify }: { state: AppState; onState: (s: AppState) => void; onUse: (t: Template) => void; notify: (k: 'success' | 'error', m: string) => void }) {
  const { lang, t } = useLocale()
  const [query, setQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const filtered = state.templates.filter((item) => `${item.name} ${item.subject}`.toLowerCase().includes(query.toLowerCase()))
  const remove = async (id: string) => { try { onState(await window.resendDesk.deleteTemplate(id)); notify('success', lang === 'zh' ? '模板已删除' : 'Template deleted') } catch (e) { notify('error', friendlyError(e, lang)) } }
  const exportTemplates = async () => {
    try {
      const payload = JSON.stringify({ app: 'Resend Desk', version: APP_VERSION, exportedAt: new Date().toISOString(), templates: state.templates }, null, 2)
      const fileName = `resend-desk-templates-${new Date().toISOString().slice(0, 10)}.json`
      const path = await window.resendDesk.exportTemplates(payload, fileName)
      if (path) notify('success', `${t.templates.exportReady}: ${path}`)
    } catch (error) {
      notify('error', `${t.templates.exportFailed}: ${friendlyError(error, lang)}`)
    }
  }
  const importTemplates = async (file?: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.json')) {
      notify('error', t.templates.importUnsupported)
      return
    }
    try {
      const templates = normalizeTemplates(JSON.parse(await file.text()))
      if (!templates.length) {
        notify('error', t.templates.emptyImport)
        return
      }
      onState(await window.resendDesk.importTemplates(templates))
      notify('success', `${t.templates.importReady}: ${templates.length}`)
    } catch (error) {
      notify('error', `${t.templates.importFailed}: ${friendlyError(error, lang)}`)
    }
  }

  return <div className="page"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.templates.search} /></div><div className="toolbar-actions"><span>{t.templates.count(filtered.length)}</span><button className="secondary small" onClick={exportTemplates} disabled={!state.templates.length}><Download size={15} />{t.app.exportTemplates}</button><button className="secondary small" onClick={() => fileInputRef.current?.click()}><Upload size={15} />{t.app.importTemplates}</button><input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={(event) => { void importTemplates(event.target.files?.[0]); event.currentTarget.value = '' }} /></div></div>
    <div className="template-grid">{filtered.map((item) => <article className="template-card" key={item.id}><div className="template-preview" dangerouslySetInnerHTML={{ __html: item.html }} /><div className="template-info"><div><h3>{item.name}</h3><p>{item.subject}</p><small>{lang === 'zh' ? '更新于' : 'Updated'} {formatTime(item.updatedAt, lang)}</small></div><div className="card-actions"><button className="icon-button flat" title={t.templates.delete} onClick={() => remove(item.id)}><Trash2 size={15} /></button><button className="secondary small" onClick={() => onUse(item)}>{t.templates.use}</button></div></div></article>)}</div>
    {!filtered.length && <Empty icon={FileText} title={t.templates.noneTitle} body={t.templates.noneBody} />}
  </div>
}

function Contacts({ state, onState, notify }: { state: AppState; onState: (s: AppState) => void; notify: (k: 'success' | 'error', m: string) => void }) {
  const { lang, t } = useLocale()
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<Partial<Contact>>({ name: '', email: '', tag: '' })
  const filtered = state.contacts.filter((item) => `${item.name} ${item.email} ${item.tag}`.toLowerCase().includes(query.toLowerCase()))
  const openCreate = () => { setForm({ name: '', email: '', tag: '' }); setShowForm(true) }
  const openEdit = (contact: Contact) => { setForm(contact); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setForm({ name: '', email: '', tag: '' }) }
  const save = async () => { if (!form.email) return; try { onState(await window.resendDesk.saveContact(form)); closeForm(); notify('success', t.contacts.saved) } catch (e) { notify('error', friendlyError(e, lang)) } }
  const remove = async (id: string) => { try { onState(await window.resendDesk.deleteContact(id)); notify('success', t.contacts.deleted) } catch (e) { notify('error', friendlyError(e, lang)) } }
  return <div className="page"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.contacts.search} /></div><button className="primary small" onClick={openCreate}><UserPlus size={16} />{t.contacts.add}</button></div>
    <section className="table-panel"><div className="table-head"><span>{t.contacts.title}</span><span>{t.contacts.tag}</span><span>{t.contacts.email}</span><span /></div>{filtered.map((contact) => <div className="contact-row" key={contact.id}><div className="contact-name"><span>{(contact.name || contact.email).slice(0, 1).toUpperCase()}</span><strong>{contact.name || t.contacts.unnamed}</strong></div><div><span className="tag">{contact.tag || t.contacts.uncategorized}</span></div><div className="email-cell">{contact.email}<button title={t.contacts.copyEmail} onClick={() => { navigator.clipboard.writeText(contact.email); notify('success', t.contacts.copied) }}><Copy size={13} /></button></div><div className="row-actions"><button className="icon-button flat" title={t.contacts.edit} onClick={() => openEdit(contact)}><Pencil size={15} /></button><button className="icon-button flat" title={t.templates.delete} onClick={() => remove(contact.id)}><Trash2 size={15} /></button></div></div>)}</section>
    {!filtered.length && <Empty icon={ContactRound} title={t.contacts.noneTitle} body={t.contacts.noneBody} action={t.contacts.add} onAction={openCreate} />}
    {showForm && <Modal title={form.id ? t.contacts.edit : t.contacts.add} onClose={closeForm}><div className="form-stack"><label>{t.contacts.name}<input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t.contacts.optional} /></label><label>{t.contacts.email}<input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></label><label>{t.contacts.tag}<input value={form.tag || ''} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder={t.contacts.category} /></label><div className="modal-actions"><button className="secondary" onClick={closeForm}>{t.common.close}</button><button className="primary" disabled={!form.email} onClick={save}>{t.contacts.save}</button></div></div></Modal>}
  </div>
}

function Activity({ state, notify, focusToken }: { state: AppState; notify: (k: 'success' | 'error', m: string) => void; focusToken: number }) {
  const { lang, t } = useLocale()
  const [syncing, setSyncing] = useState(false)
  const [selected, setSelected] = useState<Activity | null>(null)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    if (focusToken) searchRef.current?.focus()
  }, [focusToken])
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery
    ? state.activity.filter((item) => [
      item.subject,
      item.to,
      item.id,
      item.status,
      item.from,
      item.replyTo,
      item.html,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedQuery))
    : state.activity
  const sync = async () => { setSyncing(true); try { const result = await window.resendDesk.refreshEmails(); notify('success', t.activity.synced(result.data?.length || 0)) } catch (e) { notify('error', friendlyError(e, lang)) } finally { setSyncing(false) } }
  return <div className="page"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.activity.search} /></div><div className="toolbar-actions"><span>{normalizedQuery ? `${filtered.length} / ${state.activity.length}` : `${state.activity.length}`}</span><button className="secondary small" onClick={sync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} />{t.activity.sync}</button></div></div>
    <section className="panel activity-page-panel"><div className="activity-table-head"><span>{t.activity.status}</span><span>{t.activity.subject}</span><span>{t.activity.recipient}</span><span>{t.activity.time}</span></div>{filtered.map((item) => <ActivityRow key={item.id} item={item} table onOpen={setSelected} />)}{!state.activity.length && <Empty icon={Clock3} title={t.activity.emptyTitle} body={t.activity.emptyBody} />}{Boolean(state.activity.length && !filtered.length) && <Empty icon={Search} title={t.activity.noMatchTitle} body={t.activity.noMatchBody} />}</section>
    {selected && <ActivityDetails item={selected} onClose={() => setSelected(null)} />}
  </div>
}

function ActivityRow({ item, table = false, onOpen }: { item: Activity; table?: boolean; onOpen?: (item: Activity) => void }) {
  const { lang, t } = useLocale()
  const status = item.status === 'sent' ? t.activity.sent : item.status
  if (table) return <button className="activity-table-row" title={t.activity.rowHint} onClick={() => onOpen?.(item)}><span><span className="status-badge"><Check size={11} />{status}</span></span><span><strong>{item.subject}</strong><small>{item.id}</small></span><span>{item.to}</span><span>{formatTime(item.createdAt, lang)}</span></button>
  return <button className="activity-row" title={t.activity.rowHint} onClick={() => onOpen?.(item)}><span className="mail-icon"><Mail size={15} /></span><div><strong>{item.subject}</strong><small>{lang === 'zh' ? '发送至' : 'To'} {item.to}</small></div><span className="status-badge"><Check size={11} />{status}</span><time>{formatTime(item.createdAt, lang)}</time></button>
}

function ActivityDetails({ item, onClose }: { item: Activity; onClose: () => void }) {
  const { lang, t } = useLocale()
  const status = item.status === 'sent' ? t.activity.sent : item.status
  return <Modal title={t.activity.detailTitle} onClose={onClose}><div className="detail-stack">
    <div><span>{t.activity.subject}</span><strong>{item.subject}</strong></div>
    {item.from && <div><span>{t.activity.from}</span><strong>{item.from}</strong></div>}
    <div><span>{t.activity.recipient}</span><strong>{item.to}</strong></div>
    {item.replyTo && <div><span>{t.activity.replyTo}</span><strong>{item.replyTo}</strong></div>}
    <div><span>{t.activity.status}</span><strong>{status}</strong></div>
    <div><span>{t.activity.time}</span><strong>{formatTime(item.createdAt, lang)}</strong></div>
    <div><span>{t.activity.id}</span><code>{item.id}</code></div>
    <div className="detail-preview"><span>{t.activity.content}</span>{item.html ? <iframe title={t.activity.content} sandbox="" srcDoc={buildPreviewDocument(item.html)} /> : <p>{t.activity.noContent}</p>}</div>
    <div className="modal-actions"><button className="primary" onClick={onClose}>{t.activity.close}</button></div>
  </div></Modal>
}

function SettingsView({ state, onState, notify }: { state: AppState; onState: (s: AppState) => void; notify: (k: 'success' | 'error', m: string) => void }) {
  const { lang, setLang, t } = useLocale()
  const [apiKey, setApiKey] = useState('')
  const [defaultFrom, setDefaultFrom] = useState(state.settings.defaultFrom)
  const [replyTo, setReplyTo] = useState(state.settings.replyTo)
  const [uiFont, setUiFont] = useState(state.settings.uiFont || '')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [usage, setUsage] = useState<RemoteUsage | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [fonts, setFonts] = useState<string[]>([])
  const [fontsLoading, setFontsLoading] = useState(false)
  const [version, setVersion] = useState<VersionCheck | null>(null)
  const [versionLoading, setVersionLoading] = useState(false)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlySent = state.activity.filter((item) => item.createdAt.slice(0, 7) === currentMonth).length
  const lastSent = state.activity[0]?.createdAt
  useEffect(() => {
    setFontsLoading(true)
    window.resendDesk.listSystemFonts()
      .then(setFonts)
      .catch(() => notify('error', t.settings.fontUnavailable))
      .finally(() => setFontsLoading(false))
  }, [t.settings.fontUnavailable])
  const test = async () => { setTesting(true); try { const result = await window.resendDesk.testConnection(apiKey || undefined); notify('success', result.access === 'sending_only' ? (lang === 'zh' ? '连接成功，当前密钥为仅发送权限' : 'Connected. This key only has sending permission.') : (lang === 'zh' ? `连接成功，发现 ${result.domainCount} 个域名` : `Connected. Found ${result.domainCount} domain(s).`)) } catch (e) { notify('error', friendlyError(e, lang)) } finally { setTesting(false) } }
  const save = async () => { setSaving(true); try { onState(await window.resendDesk.saveSettings({ apiKey: apiKey || undefined, defaultFrom, replyTo, uiFont })); setApiKey(''); notify('success', lang === 'zh' ? '设置已保存' : 'Settings saved') } catch (e) { notify('error', friendlyError(e, lang)) } finally { setSaving(false) } }
  const remove = async () => { try { onState(await window.resendDesk.saveSettings({ removeApiKey: true, defaultFrom, replyTo, uiFont })); notify('success', lang === 'zh' ? 'API Key 已移除' : 'API key removed') } catch (e) { notify('error', friendlyError(e, lang)) } }
  const refreshUsage = async () => {
    setUsageLoading(true)
    try {
      setUsage(await window.resendDesk.getUsage())
      notify('success', t.settings.usageRemoteReady)
    } catch (error) {
      notify('error', friendlyError(error, lang))
    } finally {
      setUsageLoading(false)
    }
  }
  const checkVersion = async () => {
    setVersionLoading(true)
    try {
      const result = await window.resendDesk.checkVersion()
      setVersion(result)
      notify('success', result.updateAvailable ? t.settings.updateReady(result.latestVersion) : t.settings.updateCurrent(result.currentVersion))
    } catch (error) {
      notify('error', friendlyError(error, lang))
    } finally {
      setVersionLoading(false)
    }
  }
  return <div className="settings-page"><section className="settings-section"><div className="section-intro"><h2>{t.settings.connectionTitle}</h2><p>{t.settings.connectionBody}</p></div><div className="settings-form"><label><span>{t.settings.apiKey}</span><div className="input-with-status"><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={state.settings.hasApiKey ? t.settings.apiPlaceholder : 're_...'} />{state.settings.hasApiKey && <span className="saved-label"><Check size={12} />{t.settings.apiSaved}</span>}</div><small>{t.settings.apiHint}</small></label><div className="inline-actions"><button className="secondary" onClick={test} disabled={testing || (!apiKey && !state.settings.hasApiKey)}>{testing && <RefreshCw className="spin" size={15} />}{t.settings.test}</button>{state.settings.hasApiKey && <button className="danger-text" onClick={remove}>{t.settings.remove}</button>}</div></div></section>
    <section className="settings-section"><div className="section-intro"><h2>{t.settings.defaultTitle}</h2><p>{t.settings.defaultBody}</p></div><div className="settings-form"><label><span>{t.settings.defaultFrom}</span><input value={defaultFrom} onChange={(e) => setDefaultFrom(e.target.value)} placeholder={t.compose.fromPlaceholder} /></label><label><span>{t.settings.defaultReplyTo}</span><input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="support@yourdomain.com" /></label></div></section>
    <section className="settings-section"><div className="section-intro"><h2>{t.settings.appearanceTitle}</h2><p>{t.settings.appearanceBody}</p></div><div className="settings-form"><label><span>{t.settings.fontLabel}</span><div className="select-wrap"><Type size={15} /><select value={uiFont} onChange={(e) => setUiFont(e.target.value)} disabled={fontsLoading}><option value="">{fontsLoading ? t.settings.fontLoading : t.settings.fontSystem}</option>{fonts.map((font) => <option key={font} value={font}>{font}</option>)}</select></div></label></div></section>
    <section className="settings-section"><div className="section-intro"><h2>{t.settings.usageTitle}</h2><p>{t.settings.usageBody}</p></div><div className="usage-grid"><div><span>{t.settings.usageSentTotal}</span><strong>{state.activity.length}</strong></div><div><span>{t.settings.usageSentMonth}</span><strong>{monthlySent}</strong></div><div><span>{t.settings.usageTemplates}</span><strong>{state.templates.length}</strong></div><div><span>{t.settings.usageContacts}</span><strong>{state.contacts.length}</strong></div><div className="usage-wide"><span>{t.settings.usageLastSent}</span><strong>{lastSent ? formatTime(lastSent, lang) : t.settings.usageNoSent}</strong></div></div></section>
    <section className="settings-section"><div className="section-intro"><h2>{t.settings.usageRemoteTitle}</h2><p>{t.settings.usageRemoteBody}</p></div><div className="settings-form usage-remote"><div className="usage-grid"><div><span>{t.settings.usageDailyQuota}</span><strong>{usage?.dailyQuota || t.settings.usageUnavailable}</strong></div><div><span>{t.settings.usageMonthlyQuota}</span><strong>{usage?.monthlyQuota || t.settings.usageUnavailable}</strong></div><div><span>{t.settings.usageRemoteCount}</span><strong>{usage?.remoteCount ?? '-'}</strong></div><div><span>{t.settings.usageCheckedAt}</span><strong>{usage?.checkedAt ? formatTime(usage.checkedAt, lang) : '-'}</strong></div></div><button className="secondary" onClick={refreshUsage} disabled={usageLoading || !state.settings.hasApiKey}>{usageLoading && <RefreshCw className="spin" size={15} />}{usageLoading ? t.settings.usageRefreshing : t.settings.usageRefresh}</button></div></section>
    <section className="settings-section"><div className="section-intro"><h2>{t.app.language}</h2><p>{lang === 'zh' ? '切换界面显示语言。' : 'Switch the interface language.'}</p></div><div className="settings-form"><label><span>{t.settings.languageLabel}</span><div className="segmented language-segment"><button className={lang === 'zh' ? 'active' : ''} onClick={() => setLang('zh')}>{t.app.chinese}</button><button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>{t.app.english}</button></div></label></div></section>
    <section className="settings-section"><div className="section-intro"><h2>{t.settings.versionTitle}</h2><p>{lang === 'zh' ? '应用信息、构建版本和 GitHub 更新检查。' : 'Application info, build version, and GitHub update checks.'}</p></div><div className="about-grid"><div><span>{t.settings.creatorLabel}</span><strong>{APP_CREATOR}</strong></div><div><span>{t.settings.versionLabel}</span><strong>{APP_VERSION}</strong></div>{version && <div><span>{version.updateAvailable ? t.settings.updateReady(version.latestVersion) : t.settings.updateCurrent(version.currentVersion)}</span>{version.releaseUrl ? <a href={version.releaseUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} />GitHub</a> : <strong>{formatTime(version.checkedAt, lang)}</strong>}</div>}<button className="secondary" onClick={checkVersion} disabled={versionLoading}>{versionLoading && <RefreshCw className="spin" size={15} />}{versionLoading ? t.settings.updateChecking : t.settings.updateCheck}</button></div></section>
    <div className="settings-save"><button className="primary" onClick={save} disabled={saving}>{saving ? t.settings.saving : t.settings.save}</button></div>
  </div>
}

function Empty({ icon: Icon, title, body, compact, action, onAction }: { icon: typeof Mail; title: string; body: string; compact?: boolean; action?: string; onAction?: () => void }) {
  return <div className={`empty ${compact ? 'compact' : ''}`}><span><Icon size={20} /></span><h3>{title}</h3><p>{body}</p>{action && <button className="text-button" onClick={onAction}>{action}<ArrowRight size={14} /></button>}</div>
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useLocale()
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-header"><h2>{title}</h2><button className="icon-button flat" onClick={onClose} aria-label={t.common.close}><X size={17} /></button></div>{children}</div></div>
}

export default App
