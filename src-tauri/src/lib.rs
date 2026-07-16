use chrono::Utc;
#[cfg(windows)]
use keyring::Entry;
use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{cmp::Ordering, fs, path::PathBuf, process::Command};
use tauri::{AppHandle, Manager};
use uuid::Uuid;
#[cfg(windows)]
use winreg::{enums::*, RegKey};

const RESEND_API: &str = "https://api.resend.com";
const GITHUB_LATEST_RELEASE: &str =
    "https://api.github.com/repos/UF4OVER/ResendDesk/releases/latest";
#[cfg(windows)]
const KEYRING_SERVICE: &str = "com.uf4over.resenddesk";
#[cfg(windows)]
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
    #[serde(default)]
    ui_font: String,
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TemplateImport {
    id: Option<String>,
    name: String,
    subject: String,
    html: String,
    updated_at: Option<String>,
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
    #[serde(default)]
    from: Option<String>,
    #[serde(default)]
    html: Option<String>,
    #[serde(default)]
    reply_to: Option<String>,
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
    #[serde(default)]
    ui_font: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct VersionCheck {
    current_version: String,
    latest_version: String,
    update_available: bool,
    release_url: Option<String>,
    checked_at: String,
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

#[cfg(not(windows))]
fn local_api_key_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("resend-desk-api-key"))
        .map_err(|error| error.to_string())
}

#[cfg(windows)]
fn credential_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|error| error.to_string())
}

#[cfg(windows)]
fn get_api_key(_app: &AppHandle) -> Option<String> {
    credential_entry().ok()?.get_password().ok()
}

#[cfg(not(windows))]
fn get_api_key(app: &AppHandle) -> Option<String> {
    fs::read_to_string(local_api_key_path(app).ok()?)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

#[cfg(windows)]
fn set_api_key(_app: &AppHandle, key: &str) -> Result<(), String> {
    credential_entry()?
        .set_password(key.trim())
        .map_err(|error| error.to_string())
}

#[cfg(not(windows))]
fn set_api_key(app: &AppHandle, key: &str) -> Result<(), String> {
    let path = local_api_key_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, key.trim()).map_err(|error| error.to_string())
}

#[cfg(windows)]
fn delete_api_key(_app: &AppHandle) {
    if let Ok(entry) = credential_entry() {
        let _ = entry.delete_credential();
    }
}

#[cfg(not(windows))]
fn delete_api_key(app: &AppHandle) {
    if let Ok(path) = local_api_key_path(app) {
        let _ = fs::remove_file(path);
    }
}

fn load_state(app: &AppHandle) -> Result<AppState, String> {
    let path = state_path(app)?;
    let mut state = match fs::read_to_string(path) {
        Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
        Err(_) => AppState::default(),
    };
    state.settings.has_api_key = get_api_key(app).is_some();
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

fn compare_versions(current: &str, latest: &str) -> Ordering {
    let normalize = |value: &str| {
        value
            .trim()
            .trim_start_matches(['v', 'V'])
            .split(['.', '-', '+'])
            .map(|part| part.parse::<u64>().unwrap_or(0))
            .collect::<Vec<_>>()
    };
    let current_parts = normalize(current);
    let latest_parts = normalize(latest);
    let width = current_parts.len().max(latest_parts.len());
    for index in 0..width {
        let left = current_parts.get(index).copied().unwrap_or(0);
        let right = latest_parts.get(index).copied().unwrap_or(0);
        match left.cmp(&right) {
            Ordering::Equal => {}
            order => return order,
        }
    }
    Ordering::Equal
}

async fn resend_request(
    app: &AppHandle,
    method: Method,
    endpoint: &str,
    body: Option<Value>,
    override_key: Option<String>,
) -> Result<Value, String> {
    let key = override_key
        .filter(|value| !value.trim().is_empty())
        .or_else(|| get_api_key(app))
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
    if input.remove_api_key {
        delete_api_key(&app);
    } else if let Some(key) = input.api_key.filter(|value| !value.trim().is_empty()) {
        set_api_key(&app, key.trim())?;
    }
    state.settings.default_from = input.default_from.trim().to_string();
    state.settings.reply_to = input.reply_to.trim().to_string();
    state.settings.ui_font = input.ui_font.trim().to_string();
    state.settings.has_api_key = get_api_key(&app).is_some();
    write_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
fn export_templates(contents: String, default_file_name: String) -> Result<Option<String>, String> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-STA",
            "-Command",
            r#"
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Title = 'Export templates'
$dialog.Filter = 'JSON files (*.json)|*.json|All files (*.*)|*.*'
$dialog.FileName = $args[0]
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
  Write-Output $dialog.FileName
}
"#,
        ])
        .arg(default_file_name)
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        return Ok(None);
    }
    fs::write(&path, contents).map_err(|error| error.to_string())?;
    Ok(Some(path))
}

#[tauri::command]
#[cfg(windows)]
fn list_system_fonts() -> Result<Vec<String>, String> {
    let mut families = Vec::new();
    let roots = [
        RegKey::predef(HKEY_LOCAL_MACHINE),
        RegKey::predef(HKEY_CURRENT_USER),
    ];
    for root in roots {
        if let Ok(fonts) =
            root.open_subkey("SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts")
        {
            for name in fonts.enum_values().filter_map(Result::ok).map(|(name, _)| name) {
                let family = name
                    .replace("(TrueType)", "")
                    .replace("(OpenType)", "")
                    .replace("(Type 1)", "")
                    .trim()
                    .to_string();
                if !family.is_empty() {
                    families.push(family);
                }
            }
        }
    }
    families.sort_by_key(|name| name.to_lowercase());
    families.dedup_by(|left, right| left.eq_ignore_ascii_case(right));
    Ok(families)
}

#[tauri::command]
#[cfg(not(windows))]
fn list_system_fonts() -> Result<Vec<String>, String> {
    Ok(vec![
        "Roboto".to_string(),
        "Noto Sans".to_string(),
        "sans-serif".to_string(),
        "serif".to_string(),
        "monospace".to_string(),
    ])
}

#[tauri::command]
async fn check_version() -> Result<VersionCheck, String> {
    let client = Client::new();
    let response = client
        .get(GITHUB_LATEST_RELEASE)
        .header("User-Agent", "Resend-Desk")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let data: Value = response.json().await.unwrap_or_else(|_| json!({}));
    if !status.is_success() {
        return Err(data
            .get("message")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| format!("GitHub 版本检查失败 ({status})")));
    }
    let latest_version = data
        .get("tag_name")
        .and_then(Value::as_str)
        .unwrap_or(env!("CARGO_PKG_VERSION"))
        .trim_start_matches(['v', 'V'])
        .to_string();
    let release_url = data
        .get("html_url")
        .and_then(Value::as_str)
        .map(str::to_string);
    Ok(VersionCheck {
        current_version: env!("CARGO_PKG_VERSION").to_string(),
        update_available: compare_versions(env!("CARGO_PKG_VERSION"), &latest_version)
            == Ordering::Less,
        latest_version,
        release_url,
        checked_at: Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
async fn test_connection(app: AppHandle, api_key: Option<String>) -> Result<Value, String> {
    match resend_request(&app, Method::GET, "/domains", None, api_key).await {
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
    let from = payload.from.clone();
    let to = payload.to.clone();
    let subject = payload.subject.clone();
    let html = payload.html.clone();
    let reply_to = payload.reply_to.clone().filter(|value| !value.trim().is_empty());
    let mut body = json!({
        "from": from,
        "to": to,
        "subject": subject,
        "html": html
    });
    if let Some(reply_to) = reply_to.clone() {
        body["reply_to"] = json!(reply_to);
    }
    let result = resend_request(&app, Method::POST, "/emails", Some(body), None).await?;
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
            from: Some(payload.from),
            html: Some(payload.html),
            reply_to,
        },
    );
    state.activity.truncate(100);
    write_state(&app, &state)?;
    Ok(json!({ "result": { "id": id }, "state": state }))
}

#[tauri::command]
async fn list_emails(app: AppHandle) -> Result<Value, String> {
    resend_request(&app, Method::GET, "/emails", None, None).await
}

#[tauri::command]
async fn get_usage(app: AppHandle) -> Result<Value, String> {
    let key = get_api_key(&app).ok_or_else(|| "请先在设置中添加 Resend API Key".to_string())?;
    let client = Client::new();
    let response = client
        .request(Method::GET, format!("{RESEND_API}/emails"))
        .bearer_auth(key)
        .header("Content-Type", "application/json")
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let headers = response.headers().clone();
    let data: Value = response.json().await.unwrap_or_else(|_| json!({}));
    if !status.is_success() {
        return Err(data
            .get("message")
            .and_then(Value::as_str)
            .map(str::to_string)
            .unwrap_or_else(|| format!("Resend API 请求失败 ({status})")));
    }

    let header_value = |name: &str| {
        headers
            .get(name)
            .and_then(|value| value.to_str().ok())
            .map(str::to_string)
    };
    let remote_count = data.get("data").and_then(Value::as_array).map_or(0, Vec::len);
    Ok(json!({
        "dailyQuota": header_value("x-resend-daily-quota"),
        "monthlyQuota": header_value("x-resend-monthly-quota"),
        "remoteCount": remote_count,
        "checkedAt": Utc::now().to_rfc3339()
    }))
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
fn import_templates(app: AppHandle, templates: Vec<TemplateImport>) -> Result<AppState, String> {
    let mut state = load_state(&app)?;
    for template in templates.into_iter().rev() {
        let id = template.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let item = Template {
            id: id.clone(),
            name: template.name,
            subject: template.subject,
            html: template.html,
            updated_at: template.updated_at.unwrap_or_else(|| Utc::now().to_rfc3339()),
        };
        state.templates.retain(|entry| entry.id != id);
        state.templates.insert(0, item);
    }
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
            export_templates,
            list_system_fonts,
            check_version,
            test_connection,
            send_email,
            list_emails,
            get_usage,
            save_template,
            delete_template,
            import_templates,
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
