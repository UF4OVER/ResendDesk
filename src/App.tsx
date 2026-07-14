import { useEffect, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Code2,
  ContactRound,
  Copy,
  FileText,
  Inbox,
  LayoutDashboard,
  Mail,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'

type View = 'overview' | 'compose' | 'templates' | 'contacts' | 'activity' | 'settings'
type ToastKind = 'success' | 'error'
type Toast = { kind: ToastKind; message: string } | null

const navItems: { id: View; label: string; icon: typeof Mail }[] = [
  { id: 'overview', label: '总览', icon: LayoutDashboard },
  { id: 'compose', label: '写邮件', icon: Send },
  { id: 'templates', label: '模板', icon: FileText },
  { id: 'contacts', label: '联系人', icon: ContactRound },
  { id: 'activity', label: '发送记录', icon: ActivityIcon },
]

const defaultState: AppState = {
  settings: { hasApiKey: false, defaultFrom: '', replyTo: '' },
  templates: [], contacts: [], activity: [],
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function validateFromAddress(value: string) {
  const from = value.trim()
  if (!from) return ''
  const email = '[^\\s<>@]+@[^\\s<>@]+\\.[^\\s<>@]+'
  if (!new RegExp(`^(?:${email}|[^<>]+\\s*<${email}>)$`).test(from)) return '格式应为 name@example.com 或 Name <name@example.com>'
  if (/@example\.(com|org|net)>?$/i.test(from)) return '示例地址不能用于发送，请填写已验证域名的邮箱'
  return ''
}

function friendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw.replace(/^Error invoking remote method '[^']+': Error:\s*/i, '')
  if (/Invalid `from` field/i.test(message)) return '发件人地址无效。请使用 name@example.com 或 Name <name@example.com> 格式，并确认域名已在 Resend 验证。'
  if (/domain is not verified/i.test(message)) return '发件域名尚未验证，请先在 Resend 控制台完成域名验证。'
  return message
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
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('resend-desk-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    window.resendDesk.getState().then(setState).catch((error) => notify('error', friendlyError(error))).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('resend-desk-theme', theme)
  }, [theme])

  const notify = (kind: ToastKind, message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 3600)
  }

  const openCompose = (template?: Partial<Template>) => {
    setComposeSeed(template || null)
    setView('compose')
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><img src="./app-icon.png" alt="" /></div>
          <div><strong>Resend</strong><span>Desk</span></div>
        </div>

        <button className="compose-shortcut" onClick={() => openCompose()}>
          <Plus size={16} /> 新建邮件 <kbd>⌘ N</kbd>
        </button>

        <nav className="main-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon
            return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><Icon size={17} />{item.label}</button>
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className={`connection ${state.settings.hasApiKey ? 'connected' : ''}`}>
            <span className="status-dot" />
            <div><strong>{state.settings.hasApiKey ? 'API 已连接' : '尚未连接'}</strong><small>{state.settings.hasApiKey ? '密钥已安全保存' : '添加 Resend API Key'}</small></div>
          </div>
          <button className={view === 'settings' ? 'settings-link active' : 'settings-link'} onClick={() => setView('settings')}><Settings size={17} />设置</button>
        </div>
      </aside>

      <main className="main-area">
        <Topbar view={view} onCompose={() => openCompose()} theme={theme} onToggleTheme={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
        <div className="page-scroll">
          {view === 'overview' && <Overview state={state} onNavigate={setView} onCompose={openCompose} />}
          {view === 'compose' && <Compose state={state} seed={composeSeed} onState={setState} notify={notify} onSettings={() => setView('settings')} />}
          {view === 'templates' && <Templates state={state} onState={setState} onUse={openCompose} notify={notify} />}
          {view === 'contacts' && <Contacts state={state} onState={setState} notify={notify} />}
          {view === 'activity' && <Activity state={state} notify={notify} />}
          {view === 'settings' && <SettingsView state={state} onState={setState} notify={notify} />}
        </div>
      </main>

      {toast && <div className={`toast ${toast.kind}`} role="status">{toast.kind === 'success' ? <Check size={16} /> : <CircleAlert size={16} />}{toast.message}<button onClick={() => setToast(null)} aria-label="关闭"><X size={14} /></button></div>}
    </div>
  )
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="brand-mark large"><img src="./app-icon.png" alt="" /></div><div className="loading-line" /></div>
}

function Topbar({ view, onCompose, theme, onToggleTheme }: { view: View; onCompose: () => void; theme: 'light' | 'dark'; onToggleTheme: () => void }) {
  const titles: Record<View, string> = { overview: '总览', compose: '写邮件', templates: '模板', contacts: '联系人', activity: '发送记录', settings: '设置' }
  return <header className="topbar"><h1>{titles[view]}</h1><div className="top-actions"><button className="icon-button" title={theme === 'dark' ? '切换到浅色主题' : '切换到暗色主题'} onClick={onToggleTheme}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button><button className="icon-button" title="搜索"><Search size={17} /></button>{view !== 'compose' && <button className="primary small" onClick={onCompose}><Plus size={16} />新建邮件</button>}</div></header>
}

function Overview({ state, onNavigate, onCompose }: { state: AppState; onNavigate: (v: View) => void; onCompose: (t?: Partial<Template>) => void }) {
  const delivered = state.activity.filter((item) => item.status === 'sent' || item.status === 'delivered').length
  const metrics = [
    { label: '已发送', value: state.activity.length, note: '本地记录', icon: Send },
    { label: '已送达', value: delivered, note: state.activity.length ? `${Math.round((delivered / state.activity.length) * 100)}% 送达率` : '等待首次发送', icon: Inbox },
    { label: '模板', value: state.templates.length, note: '可直接复用', icon: FileText },
    { label: '联系人', value: state.contacts.length, note: '本地通讯录', icon: ContactRound },
  ]

  return <div className="page overview-page">
    {!state.settings.hasApiKey && <section className="setup-banner">
      <div className="setup-icon"><ShieldCheck size={22} /></div>
      <div><h2>连接你的 Resend 账户</h2><p>添加 API Key 后即可从桌面发送邮件并同步发送记录。密钥由系统安全存储加密。</p></div>
      <button className="primary" onClick={() => onNavigate('settings')}>开始设置 <ArrowRight size={16} /></button>
    </section>}

    <section className="welcome-row"><div><p className="muted-label">工作台</p><h2>{state.settings.hasApiKey ? '邮件发送状态一目了然' : '准备好发送第一封邮件'}</h2><p>{state.settings.hasApiKey ? '查看最近活动，快速回到常用模板。' : '配置账户后，可在一个窗口里完成编写、测试和发送。'}</p></div><button className="secondary" onClick={() => onCompose()}><Code2 size={16} />打开编辑器</button></section>

    <section className="metric-grid">{metrics.map(({ label, value, note, icon: Icon }) => <div className="metric" key={label}><div className="metric-top"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small>{note}</small></div>)}</section>

    <div className="overview-columns">
      <section className="panel recent-panel"><div className="panel-header"><div><h3>最近发送</h3><p>当前设备记录的邮件活动</p></div><button className="text-button" onClick={() => onNavigate('activity')}>查看全部 <ArrowRight size={14} /></button></div>
        {state.activity.length ? <div className="activity-list">{state.activity.slice(0, 5).map((item) => <ActivityRow key={item.id} item={item} />)}</div> : <Empty compact icon={Send} title="还没有发送记录" body="发送成功的邮件会显示在这里。" action="写一封邮件" onAction={() => onCompose()} />}
      </section>
      <section className="panel templates-panel"><div className="panel-header"><div><h3>常用模板</h3><p>快速开始一封邮件</p></div><button className="icon-button flat" title="查看模板" onClick={() => onNavigate('templates')}><MoreHorizontal size={17} /></button></div>
        <div className="quick-templates">{state.templates.slice(0, 4).map((template) => <button key={template.id} onClick={() => onCompose(template)}><span className="template-glyph"><Mail size={16} /></span><div><strong>{template.name}</strong><small>{template.subject}</small></div><ArrowRight size={15} /></button>)}</div>
      </section>
    </div>
  </div>
}

function Compose({ state, seed, onState, notify, onSettings }: { state: AppState; seed: Partial<Template> | null; onState: (s: AppState) => void; notify: (k: 'success' | 'error', m: string) => void; onSettings: () => void }) {
  const [from, setFrom] = useState(state.settings.defaultFrom)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(seed?.subject || '')
  const [html, setHtml] = useState(seed?.html || '<h1>你好</h1>\n<p>在这里写下你的邮件内容。</p>')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [sending, setSending] = useState(false)

  useEffect(() => { setSubject(seed?.subject || ''); if (seed?.html) setHtml(seed.html) }, [seed])
  const recipients = to.split(',').map((value) => value.trim()).filter(Boolean)
  const fromError = validateFromAddress(from)
  const canSend = Boolean(from && !fromError && recipients.length && subject && html && state.settings.hasApiKey)

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const response = await window.resendDesk.sendEmail({ from, to: recipients, subject, html, replyTo: state.settings.replyTo })
      onState(response.state)
      notify('success', `邮件已交给 Resend，ID: ${response.result.id}`)
      setTo(''); setSubject('')
    } catch (error) { notify('error', friendlyError(error)) }
    finally { setSending(false) }
  }

  const saveTemplate = async () => {
    try {
      const next = await window.resendDesk.saveTemplate({ name: subject || '未命名模板', subject, html })
      onState(next); notify('success', '模板已保存')
    } catch (error) { notify('error', friendlyError(error)) }
  }

  return <div className="compose-layout">
    <section className="composer">
      {!state.settings.hasApiKey && <div className="inline-warning"><CircleAlert size={16} /><span>发送前需要连接 Resend API。</span><button onClick={onSettings}>前往设置</button></div>}
      <div className="compose-fields">
        <label className={fromError ? 'invalid' : ''}><span>发件人</span><div className="compose-input"><input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="团队名称 <hello@yourdomain.com>" />{fromError && <small>{fromError}</small>}</div></label>
        <label><span>收件人</span><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com，多个地址用逗号分隔" /></label>
        <label><span>主题</span><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="邮件主题" /></label>
      </div>
      <div className="editor-toolbar"><div className="segmented"><button className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>HTML</button><button className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>预览</button></div><div className="editor-meta"><Code2 size={14} />支持完整 HTML</div></div>
      <div className="editor-area">{mode === 'edit' ? <textarea value={html} onChange={(e) => setHtml(e.target.value)} spellCheck={false} /> : <iframe title="邮件预览" sandbox="" srcDoc={buildPreviewDocument(html)} />}</div>
      <footer className="compose-footer"><div><button className="secondary" onClick={saveTemplate}><FileText size={15} />保存为模板</button><span>{html.length} 字符</span></div><button className="primary send-button" disabled={!canSend || sending} onClick={send}>{sending ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}{sending ? '正在发送' : '发送邮件'}</button></footer>
    </section>
    <aside className="compose-aside"><h3>发送检查</h3><CheckItem done={Boolean(from)} text="发件人地址" /><CheckItem done={recipients.length > 0} text={`${recipients.length || 0} 位收件人`} /><CheckItem done={Boolean(subject)} text="邮件主题" /><CheckItem done={state.settings.hasApiKey} text="API 连接" /><div className="aside-note"><Sparkles size={16} /><p>建议先发送到自己的邮箱，检查移动端显示和垃圾邮件表现。</p></div></aside>
  </div>
}

function CheckItem({ done, text }: { done: boolean; text: string }) { return <div className={`check-item ${done ? 'done' : ''}`}><span>{done && <Check size={12} />}</span>{text}</div> }

function Templates({ state, onState, onUse, notify }: { state: AppState; onState: (s: AppState) => void; onUse: (t: Template) => void; notify: (k: 'success' | 'error', m: string) => void }) {
  const [query, setQuery] = useState('')
  const filtered = state.templates.filter((item) => `${item.name} ${item.subject}`.toLowerCase().includes(query.toLowerCase()))
  const remove = async (id: string) => { try { onState(await window.resendDesk.deleteTemplate(id)); notify('success', '模板已删除') } catch (e) { notify('error', friendlyError(e)) } }
  return <div className="page"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索模板" /></div><span>{filtered.length} 个模板</span></div>
    <div className="template-grid">{filtered.map((item) => <article className="template-card" key={item.id}><div className="template-preview" dangerouslySetInnerHTML={{ __html: item.html }} /><div className="template-info"><div><h3>{item.name}</h3><p>{item.subject}</p><small>更新于 {formatTime(item.updatedAt)}</small></div><div className="card-actions"><button className="icon-button flat" title="删除" onClick={() => remove(item.id)}><Trash2 size={15} /></button><button className="secondary small" onClick={() => onUse(item)}>使用模板</button></div></div></article>)}</div>
    {!filtered.length && <Empty icon={FileText} title="没有匹配的模板" body="换个关键词，或从邮件编辑器保存一个新模板。" />}
  </div>
}

function Contacts({ state, onState, notify }: { state: AppState; onState: (s: AppState) => void; notify: (k: 'success' | 'error', m: string) => void }) {
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({ name: '', email: '', tag: '' })
  const filtered = state.contacts.filter((item) => `${item.name} ${item.email} ${item.tag}`.toLowerCase().includes(query.toLowerCase()))
  const save = async () => { if (!form.email) return; try { onState(await window.resendDesk.saveContact(form)); setForm({ name: '', email: '', tag: '' }); setShowForm(false); notify('success', '联系人已保存') } catch (e) { notify('error', friendlyError(e)) } }
  const remove = async (id: string) => { try { onState(await window.resendDesk.deleteContact(id)); notify('success', '联系人已删除') } catch (e) { notify('error', friendlyError(e)) } }
  return <div className="page"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索姓名、邮箱或标签" /></div><button className="primary small" onClick={() => setShowForm(true)}><UserPlus size={16} />添加联系人</button></div>
    <section className="table-panel"><div className="table-head"><span>联系人</span><span>标签</span><span>邮箱</span><span /></div>{filtered.map((contact) => <div className="contact-row" key={contact.id}><div className="contact-name"><span>{(contact.name || contact.email).slice(0, 1).toUpperCase()}</span><strong>{contact.name || '未命名'}</strong></div><div><span className="tag">{contact.tag || '未分类'}</span></div><div className="email-cell">{contact.email}<button title="复制邮箱" onClick={() => { navigator.clipboard.writeText(contact.email); notify('success', '邮箱已复制') }}><Copy size={13} /></button></div><button className="icon-button flat" title="删除" onClick={() => remove(contact.id)}><Trash2 size={15} /></button></div>)}</section>
    {!filtered.length && <Empty icon={ContactRound} title="没有联系人" body="添加常用收件人，写邮件时会更方便。" action="添加联系人" onAction={() => setShowForm(true)} />}
    {showForm && <Modal title="添加联系人" onClose={() => setShowForm(false)}><div className="form-stack"><label>姓名<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="可选" /></label><label>邮箱<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" /></label><label>标签<input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="例如 Customer" /></label><div className="modal-actions"><button className="secondary" onClick={() => setShowForm(false)}>取消</button><button className="primary" disabled={!form.email} onClick={save}>保存联系人</button></div></div></Modal>}
  </div>
}

function Activity({ state, notify }: { state: AppState; notify: (k: 'success' | 'error', m: string) => void }) {
  const [syncing, setSyncing] = useState(false)
  const sync = async () => { setSyncing(true); try { const result = await window.resendDesk.refreshEmails(); notify('success', `已从 Resend 读取 ${result.data?.length || 0} 条记录`) } catch (e) { notify('error', friendlyError(e)) } finally { setSyncing(false) } }
  return <div className="page"><div className="list-toolbar"><div className="filter-button"><span className="status-dot connected" />全部状态<ChevronDown size={14} /></div><button className="secondary small" onClick={sync} disabled={syncing}><RefreshCw size={15} className={syncing ? 'spin' : ''} />同步 Resend</button></div>
    <section className="panel activity-page-panel"><div className="activity-table-head"><span>状态</span><span>邮件</span><span>收件人</span><span>时间</span></div>{state.activity.map((item) => <ActivityRow key={item.id} item={item} table />)}{!state.activity.length && <Empty icon={Clock3} title="暂无发送记录" body="从本客户端成功发送的邮件会记录在这里。" />}</section>
  </div>
}

function ActivityRow({ item, table = false }: { item: Activity; table?: boolean }) {
  if (table) return <div className="activity-table-row"><span><span className="status-badge"><Check size={11} />{item.status === 'sent' ? '已发送' : item.status}</span></span><span><strong>{item.subject}</strong><small>{item.id}</small></span><span>{item.to}</span><span>{formatTime(item.createdAt)}</span></div>
  return <div className="activity-row"><span className="mail-icon"><Mail size={15} /></span><div><strong>{item.subject}</strong><small>发送至 {item.to}</small></div><span className="status-badge"><Check size={11} />已发送</span><time>{formatTime(item.createdAt)}</time></div>
}

function SettingsView({ state, onState, notify }: { state: AppState; onState: (s: AppState) => void; notify: (k: 'success' | 'error', m: string) => void }) {
  const [apiKey, setApiKey] = useState('')
  const [defaultFrom, setDefaultFrom] = useState(state.settings.defaultFrom)
  const [replyTo, setReplyTo] = useState(state.settings.replyTo)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const test = async () => { setTesting(true); try { const result = await window.resendDesk.testConnection(apiKey || undefined); notify('success', result.access === 'sending_only' ? '连接成功，当前密钥为仅发送权限' : `连接成功，发现 ${result.domainCount} 个域名`) } catch (e) { notify('error', friendlyError(e)) } finally { setTesting(false) } }
  const save = async () => { setSaving(true); try { onState(await window.resendDesk.saveSettings({ apiKey: apiKey || undefined, defaultFrom, replyTo })); setApiKey(''); notify('success', '设置已保存') } catch (e) { notify('error', friendlyError(e)) } finally { setSaving(false) } }
  const remove = async () => { try { onState(await window.resendDesk.saveSettings({ removeApiKey: true, defaultFrom, replyTo })); notify('success', 'API Key 已移除') } catch (e) { notify('error', friendlyError(e)) } }
  return <div className="settings-page"><section className="settings-section"><div className="section-intro"><h2>Resend 连接</h2><p>连接信息只保存在当前设备。API Key 使用操作系统提供的安全存储进行加密。</p></div><div className="settings-form"><label><span>API Key</span><div className="input-with-status"><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={state.settings.hasApiKey ? '已保存 ••••••••••••••••' : 're_...'} />{state.settings.hasApiKey && <span className="saved-label"><Check size={12} />已保存</span>}</div><small>建议创建仅用于本客户端的 API Key。</small></label><div className="inline-actions"><button className="secondary" onClick={test} disabled={testing || (!apiKey && !state.settings.hasApiKey)}>{testing && <RefreshCw className="spin" size={15} />}测试连接</button>{state.settings.hasApiKey && <button className="danger-text" onClick={remove}>移除密钥</button>}</div></div></section>
    <section className="settings-section"><div className="section-intro"><h2>发送默认值</h2><p>新建邮件时自动填入这些信息，仍可在发送前修改。</p></div><div className="settings-form"><label><span>默认发件人</span><input value={defaultFrom} onChange={(e) => setDefaultFrom(e.target.value)} placeholder="团队名称 <hello@yourdomain.com>" /></label><label><span>默认 Reply-To</span><input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="support@yourdomain.com" /></label></div></section>
    <div className="settings-save"><button className="primary" onClick={save} disabled={saving}>{saving ? '正在保存' : '保存更改'}</button></div>
  </div>
}

function Empty({ icon: Icon, title, body, compact, action, onAction }: { icon: typeof Mail; title: string; body: string; compact?: boolean; action?: string; onAction?: () => void }) {
  return <div className={`empty ${compact ? 'compact' : ''}`}><span><Icon size={20} /></span><h3>{title}</h3><p>{body}</p>{action && <button className="text-button" onClick={onAction}>{action}<ArrowRight size={14} /></button>}</div>
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(e) => e.stopPropagation()}><div className="modal-header"><h2>{title}</h2><button className="icon-button flat" onClick={onClose} aria-label="关闭"><X size={17} /></button></div>{children}</div></div>
}

export default App
