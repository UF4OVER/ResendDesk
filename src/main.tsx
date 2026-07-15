import React from 'react'
import ReactDOM from 'react-dom/client'
import { invoke } from '@tauri-apps/api/core'
import App from './App'
import './styles.css'

if (!window.resendDesk) {
  const isTauri = '__TAURI_INTERNALS__' in window
  if (isTauri) {
    window.resendDesk = {
      getState: () => invoke<AppState>('get_state'),
      saveSettings: (input) => invoke<AppState>('save_settings', { input }),
      testConnection: (apiKey) => invoke('test_connection', { apiKey }),
      sendEmail: (payload) => invoke('send_email', { payload }),
      refreshEmails: () => invoke('list_emails'),
      getUsage: () => invoke<RemoteUsage>('get_usage'),
      saveTemplate: (template) => invoke<AppState>('save_template', { template }),
      deleteTemplate: (id) => invoke<AppState>('delete_template', { id }),
      importTemplates: (templates) => invoke<AppState>('import_templates', { templates }),
      saveContact: (contact) => invoke<AppState>('save_contact', { contact }),
      deleteContact: (id) => invoke<AppState>('delete_contact', { id }),
    }
  } else {
  const now = new Date().toISOString()
  let demoState: AppState = {
    settings: { hasApiKey: false, defaultFrom: 'Resend Desk <hello@example.com>', replyTo: '' },
    templates: [
      { id: 'welcome', name: '欢迎邮件', subject: '欢迎加入 {{company}}', html: '<h1>欢迎，{{name}}</h1><p>很高兴你加入 {{company}}。</p>', updatedAt: now },
      { id: 'receipt', name: '付款收据', subject: '你的付款收据', html: '<h1>付款成功</h1><p>我们已收到你的付款，金额为 {{amount}}。</p>', updatedAt: now },
    ],
    contacts: [
      { id: 'c1', name: 'Lin Chen', email: 'lin@example.com', tag: 'Product' },
      { id: 'c2', name: 'Maya Liu', email: 'maya@example.com', tag: 'Customer' },
    ],
    activity: [],
  }
  window.resendDesk = {
    getState: async () => demoState,
    saveSettings: async (input) => (demoState = { ...demoState, settings: { hasApiKey: Boolean(input.apiKey) || demoState.settings.hasApiKey, defaultFrom: input.defaultFrom, replyTo: input.replyTo } }),
    testConnection: async () => ({ ok: true, access: 'full', domainCount: 1 }),
    sendEmail: async (payload) => {
      const id = `demo_${Date.now()}`
      demoState = { ...demoState, activity: [{ id, to: payload.to.join(', '), subject: payload.subject, status: 'sent', createdAt: new Date().toISOString() }, ...demoState.activity] }
      return { result: { id }, state: demoState }
    },
    refreshEmails: async () => ({ data: demoState.activity }),
    getUsage: async () => ({ dailyQuota: String(demoState.activity.length), monthlyQuota: String(demoState.activity.length), remoteCount: demoState.activity.length, checkedAt: new Date().toISOString() }),
    saveTemplate: async (template) => {
      const item = { id: template.id || `t_${Date.now()}`, name: template.name || '未命名模板', subject: template.subject || '', html: template.html || '', updatedAt: now }
      return (demoState = { ...demoState, templates: [item, ...demoState.templates.filter((entry) => entry.id !== item.id)] })
    },
    deleteTemplate: async (id) => (demoState = { ...demoState, templates: demoState.templates.filter((entry) => entry.id !== id) }),
    importTemplates: async (templates) => {
      const imported = templates.map((template, index) => ({
        id: template.id || `imported_${Date.now()}_${index}`,
        name: template.name || 'Imported template',
        subject: template.subject || '',
        html: template.html || '',
        updatedAt: template.updatedAt || new Date().toISOString(),
      }))
      demoState = { ...demoState, templates: [...imported, ...demoState.templates.filter((entry) => !imported.some((item) => item.id === entry.id))] }
      return demoState
    },
    saveContact: async (contact) => {
      const item = { id: contact.id || `c_${Date.now()}`, name: contact.name || '', email: contact.email || '', tag: contact.tag || '' }
      return (demoState = { ...demoState, contacts: [item, ...demoState.contacts] })
    },
    deleteContact: async (id) => (demoState = { ...demoState, contacts: demoState.contacts.filter((entry) => entry.id !== id) }),
  }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
