/// <reference types="vite/client" />

type Settings = { hasApiKey: boolean; defaultFrom: string; replyTo: string }
type Template = { id: string; name: string; subject: string; html: string; updatedAt: string }
type Contact = { id: string; name: string; email: string; tag: string }
type Activity = { id: string; to: string; subject: string; status: string; createdAt: string }
type AppState = { settings: Settings; templates: Template[]; contacts: Contact[]; activity: Activity[] }

interface Window {
  resendDesk: {
    getState(): Promise<AppState>
    saveSettings(input: { apiKey?: string; removeApiKey?: boolean; defaultFrom: string; replyTo: string }): Promise<AppState>
    testConnection(apiKey?: string): Promise<{ ok: boolean; access: 'full' | 'sending_only'; domainCount: number }>
    sendEmail(payload: { from: string; to: string[]; subject: string; html: string; replyTo?: string }): Promise<{ result: { id: string }; state: AppState }>
    refreshEmails(): Promise<{ data?: unknown[] }>
    saveTemplate(template: Partial<Template>): Promise<AppState>
    deleteTemplate(id: string): Promise<AppState>
    saveContact(contact: Partial<Contact>): Promise<AppState>
    deleteContact(id: string): Promise<AppState>
  }
}
