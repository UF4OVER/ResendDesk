# Resend Desk

Resend Desk 是一个面向 Resend 的 Windows 桌面客户端。它保留 Resend API 的可控性，同时提供邮件编写、HTML 预览、模板、联系人、发送记录和账户设置界面。

项目使用 **Tauri 2 + Rust + React + TypeScript**。Rust 后端负责 Resend API 请求、本地数据读写和 API Key 安全存储，前端不直接接触密钥。

## 功能

- Resend API Key 连接测试
- 支持仅发送权限的受限 API Key
- HTML 邮件编辑与沙箱预览
- 发件人格式和示例域名校验
- 邮件模板管理
- 本地联系人管理
- 最近发送记录
- 浅色与暗色主题
- Windows Credential Manager 安全保存 API Key
- 自定义应用和安装程序图标

## 技术栈

- Tauri 2
- Rust 2021
- React 19
- TypeScript
- Vite
- Reqwest
- Windows Credential Manager (`keyring`)

## 开发环境

需要安装：

- Node.js 20 或更高版本
- Rust stable
- Microsoft C++ Build Tools
- WebView2 Runtime

安装依赖：

```powershell
npm install
```

启动桌面开发环境：

```powershell
npm run tauri:dev
```

仅启动浏览器演示模式：

```powershell
npm run dev
```

浏览器模式使用本地模拟数据，不会调用真实 Resend API。

## 构建

构建 Windows NSIS 安装程序：

```powershell
npm run tauri:build
```

构建产物位于：

```text
src-tauri/target/release/bundle/nsis/
```

## 数据与安全

- API Key 保存到 Windows Credential Manager，服务名为 `com.uf4over.resenddesk`。
- 模板、联系人、设置和本地发送记录保存到 Tauri 应用数据目录。
- 前端通过 Tauri commands 调用 Rust 后端，不会读取 API Key 明文。
- 邮件预览运行在隔离 iframe 中，预览链接不会导航到宿主应用。

## Resend 配置

1. 在 Resend 控制台创建 API Key。
2. 在 Resend Desk 的“设置”页面填写 API Key。
3. 填写已在 Resend 验证的默认发件地址。
4. 测试连接后即可发送邮件。

发件人支持以下格式：

```text
name@example.com
Name <name@example.com>
```

`example.com`、`example.org` 和 `example.net` 仅作为示例域名，客户端会阻止使用这些地址进行真实发送。

## 项目结构

```text
src/                 React 前端
public/              前端静态资源
src-tauri/src/       Rust 后端
src-tauri/icons/     Windows 应用图标
src-tauri/tauri.conf.json
```

## License

本仓库暂未声明开源许可证。未经许可，请勿重新分发。
