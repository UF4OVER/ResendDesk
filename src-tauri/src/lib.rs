use chrono::Utc;
use keyring::Entry;
use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const RESEND_API: &str = "https://api.resend.com";
const KEYRING_SERVICE: &str = "com.uf4over.resenddesk";
const KEYRING_USER: &str = "resend-api-key";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Settings {
    #[serde(default)]
    has_api_key: bool,
    #[serde(default)]
    default_from: String,
    #[serde(default)]
    reply_to: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Template {
    id: String,
    name: String,
    subject: String,
    html: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Contact {
    id: String,
    name: String,
    email: String,
    tag: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Activity {
    id: String,
    to: String,
    subject: String,
    status: String,
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppState {
    #[serde(default)]
    settings: Settings,
    #[serde(default)]
    templates: Vec<Template>,
    #[serde(default)]
    contacts: Vec<Contact>,
    #[serde(default)]
    activity: Vec<Activity>,
}

impl Default for AppState {
    fn default() -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            settings: Settings::default(),
            templates: vec![
                Template {
                    id: "welcome".into(),
                    name: "欢迎邮件".into(),
                    subject: "欢迎加入 {{company}}".into(),
                    html: "<h1>欢迎，{{name}}</h1><p>很高兴你加入 {{company}}。</p>".into(),
                    updated_at: now.clone(),
                },
                Template {
                    id: "receipt".into(),
                    name: "付款收据".into(),
                    subject: "你的付款收据".into(),
                    html: "<h1>付款成功</h1><p>我们已收到你的付款，金额为 {{amount}}。</p>".into(),
                    updated_at: now,
                },
            ],
            contacts: vec![
                Contact {
                    id: "c1".into(),
                    name: "Lin Chen".into(),
                    email: "lin@example.com".into(),
                    tag: "Product".into(),
                },
                Contact {
                    id: "c2".into(),
                    name: "Maya Liu".into(),
                    email: "maya@example.com".into(),
                    tag: "Customer".into(),
                },
            ],
            activity: Vec::new(),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsInput {
    api_key: Option<String>,
    #[serde(default)]
    remove_api_key: bool,
    default_from: String,
    reply_to: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SendEmailInput {
    from: String,
    to: Vec<String>,
    subject: String,
    html: String,
    reply_to: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TemplateInput {
    id: Option<String>,
    name: Option<String>,
    subject: Option<String>,
    html: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ContactInput {
    id: Option<String>,
    name: Option<String>,
    email: Option<String>,
    tag: Option<String>,
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("resend-desk.json"))
        .map_err(|error| error.to_string())
}

fn credential_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|error| error.to_string())
}

fn get_api_key() -> Option<String> {
    credential_entry().ok()?.get_password().ok()
}

fn load_state(app: &AppHandle) -> Result<AppState, String> {
    let path = state_path(app)?;
    let mut state = match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => AppState::default(),
    };
    state.settings.has_api_key = get_api_key().is_some();
    Ok(state)
}

fn write_state(app: &AppHandle, state: &AppState) -> Result<(), String> {
    let path = state_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let contents = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    fs::write(path, contents).map_err(|error| error.to_string())
}

fn validate_from_address(value: &str) -> Result<(), String> {
    let from = value.trim();
    let email = |candidate: &str| {
        let parts: Vec<&str> = candidate.split('@').collect();
        parts.len() == 2
            && !parts[0].is_empty()
            && parts[1].contains('.')
            && !candidate.chars().any(char::is_whitespace)
    };
    let address = if let (Some(start), Some(end)) = (from.rfind('<'), from.rfind('>')) {
        if end != from.len() - 1 || start == 0 {
            return Err(
                "发件人格式无效，请使用 name@example.com 或 Name <name@example.com>".into(),
            );
        }
        &from[start + 1..end]
    } else {
        from
    };
    if !email(address) {
        return Err("发件人格式无效，请使用 name@example.com 或 Name <name@example.com>".into());
    }
    let domain = address
        .rsplit('@')
        .next()
        .unwrap_or_default()
        .to_ascii_lowercase();
    if matches!(
        domain.as_str(),
        "example.com" | "example.org" | "example.net"
    ) {
        return Err(
            "example.com 是示例地址，不能用于真实发送。请使用 Resend 中已验证的发件域名".into(),
        );
    }
    Ok(())
}

async fn resend_request(
    method: Method,
    endpoint: &str,
    body: Option<Value>,
    override_key: Option<String>,
) -> Result<Value, String> {
    let key = override_key
        .filter(|value| !value.trim().is_empty())
        .or_else(get_api_key)
        .ok_or_else(|| "请先在设置中添加 Resend API Key".to_string())?;
    let client = Client::new();
    let mut request = client
        .request(method, format!("{RESEND_API}{endpoint}"))
        .bearer_auth(key)
        .header("Content-Type", "application/json");
    if let Some(body) = body {
        request = request.json(&body);
    }
    let response = request.send().await.map_err(|error| error.to_string())?;
    let status = response.status();
    let data: Value = response.json().await.unwrap_or_else(|_| json!({}));
    if !status.is_success() {
        return Err(data
            .get("message")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| format!("Resend API 请求失败 ({status})")));
    }
    Ok(data)
}

#[tauri::command]
fn get_state(app: AppHandle) -> Result<AppState, String> {
    load_state(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, input: SettingsInput) -> Result<AppState, String> {
    let mut state = load_state(&app)?;
    let entry = credential_entry()?;
    if input.remove_api_key {
        let _ = entry.delete_credential();
    } else if let Some(key) = input.api_key.filter(|value| !value.trim().is_empty()) {
        entry
            .set_password(key.trim())
            .map_err(|error| error.to_string())?;
    }
    state.settings.default_from = input.default_from.trim().to_string();
    state.settings.reply_to = input.reply_to.trim().to_string();
    state.settings.has_api_key = get_api_key().is_some();
    write_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
async fn test_connection(api_key: Option<String>) -> Result<Value, String> {
    match resend_request(Method::GET, "/domains", None, api_key).await {
        Ok(data) => Ok(json!({
            "ok": true,
            "access": "full",
            "domainCount": data.get("data").and_then(Value::as_array).map_or(0, Vec::len)
        })),
        Err(message) if message.to_ascii_lowercase().contains("only send emails") => Ok(json!({
            "ok": true,
            "access": "sending_only",
            "domainCount": 0
        })),
        Err(message) => Err(message),
    }
}

#[tauri::command]
async fn send_email(app: AppHandle, payload: SendEmailInput) -> Result<Value, String> {
    validate_from_address(&payload.from)?;
    let mut body = json!({
        "from": payload.from,
        "to": payload.to,
        "subject": payload.subject,
        "html": payload.html
    });
    if let Some(reply_to) = payload.reply_to.filter(|value| !value.trim().is_empty()) {
        body["reply_to"] = json!(reply_to);
    }
    let result = resend_request(Method::POST, "/emails", Some(body), None).await?;
    let id = result
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let mut state = load_state(&app)?;
    state.activity.insert(
        0,
        Activity {
            id: id.clone(),
            to: payload.to.join(", "),
            subject: payload.subject,
            status: "sent".into(),
            created_at: Utc::now().to_rfc3339(),
        },
    );
    state.activity.truncate(100);
    write_state(&app, &state)?;
    Ok(json!({ "result": { "id": id }, "state": state }))
}

#[tauri::command]
async fn list_emails() -> Result<Value, String> {
    resend_request(Method::GET, "/emails", None, None).await
}

#[tauri::command]
fn save_template(app: AppHandle, template: TemplateInput) -> Result<AppState, String> {
    let mut state = load_state(&app)?;
    let id = template.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let item = Template {
        id: id.clone(),
        name: template.name.unwrap_or_else(|| "未命名模板".into()),
        subject: template.subject.unwrap_or_default(),
        html: template.html.unwrap_or_default(),
        updated_at: Utc::now().to_rfc3339(),
    };
    state.templates.retain(|entry| entry.id != id);
    state.templates.insert(0, item);
    write_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
fn delete_template(app: AppHandle, id: String) -> Result<AppState, String> {
    let mut state = load_state(&app)?;
    state.templates.retain(|entry| entry.id != id);
    write_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
fn save_contact(app: AppHandle, contact: ContactInput) -> Result<AppState, String> {
    let mut state = load_state(&app)?;
    let id = contact.id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let item = Contact {
        id: id.clone(),
        name: contact.name.unwrap_or_default(),
        email: contact.email.unwrap_or_default(),
        tag: contact.tag.unwrap_or_default(),
    };
    state.contacts.retain(|entry| entry.id != id);
    state.contacts.insert(0, item);
    write_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
fn delete_contact(app: AppHandle, id: String) -> Result<AppState, String> {
    let mut state = load_state(&app)?;
    state.contacts.retain(|entry| entry.id != id);
    write_state(&app, &state)?;
    Ok(state)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_state,
            save_settings,
            test_connection,
            send_email,
            list_emails,
            save_template,
            delete_template,
            save_contact,
            delete_contact
        ])
        .run(tauri::generate_context!())
        .expect("error while running Resend Desk");
}

#[cfg(test)]
mod tests {
    use super::validate_from_address;

    #[test]
    fn accepts_supported_from_formats() {
        assert!(validate_from_address("hello@verified.dev").is_ok());
        assert!(validate_from_address("Resend Desk <hello@verified.dev>").is_ok());
    }

    #[test]
    fn rejects_placeholders_and_invalid_addresses() {
        assert!(validate_from_address("hello@example.com").is_err());
        assert!(validate_from_address("not-an-email").is_err());
        assert!(validate_from_address("<hello@verified.dev>").is_err());
    }
}
