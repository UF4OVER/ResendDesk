# Resend Desk CI and local build notes

## Current release policy

- GitHub Actions builds Windows installers and the Android arm64 APK.
- Linux `.deb`, `.rpm`, and `.AppImage` packages are not built.
- Android APKs can still be built locally with the same SDK, NDK, Rust target, and signing key documented below.

## GitHub Actions

Workflow:

```text
.github/workflows/build-release.yml
```

Triggers:

- Manual run from the GitHub Actions page.
- Pushing a tag matching `v*`.

Windows matrix:

| Architecture | Rust target |
| --- | --- |
| x64 | `x86_64-pc-windows-msvc` |
| x86 | `i686-pc-windows-msvc` |
| ARM64 | `aarch64-pc-windows-msvc` |

Windows build command:

```powershell
npm run tauri -- build --target <target> --bundles nsis
```

Artifacts:

```text
src-tauri/target/<target>/release/bundle/nsis/*.exe
```

Android job:

- Builds an arm64 release APK on `ubuntu-latest`.
- Runs `npm run tauri -- android init` because `src-tauri/gen/` is not committed.
- Signs the APK before uploading it as an artifact.
- Verifies the signed APK does not contain `127.0.0.1:5173` or `devUrl`.

Required GitHub Actions secrets for APK signing:

| Secret | Description |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded `.jks` keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Signing key alias |
| `ANDROID_KEY_PASSWORD` | Signing key password |

Create `ANDROID_KEYSTORE_BASE64` locally from the release keystore:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\AndroidSDK\codex-keystores\resenddesk-release.jks"))
```

## Local Windows build

```powershell
npm ci
npm run tauri:build
```

Output:

```text
src-tauri/target/release/bundle/nsis/
```

## Local Android setup

SDK location used on this machine:

```text
D:\AndroidSDK
```

Installed components:

- Android command line tools: `D:\AndroidSDK\cmdline-tools\latest`
- Platform tools
- Build tools `36.1.0`
- Platform `android-36`
- NDK `29.0.14206865`
- CMake `3.22.1`

Rust targets:

```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

Use the Visual Studio 2022 Build Tools developer environment before Android builds:

```powershell
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=x64 -host_arch=x64
```

Required environment:

```powershell
set ANDROID_HOME=D:\AndroidSDK
set ANDROID_SDK_ROOT=D:\AndroidSDK
set NDK_HOME=D:\AndroidSDK\ndk\29.0.14206865
set PATH=D:\AndroidSDK\codex-bin;D:\Program Files\nodejs;D:\AndroidSDK\cmdline-tools\latest\bin;D:\AndroidSDK\platform-tools;D:\AndroidSDK\cmake\3.22.1\bin;%PATH%
```

`D:\AndroidSDK\codex-bin\npm.bat` is a small wrapper for Tauri/Gradle tooling that expects `npm.bat`:

```bat
@echo off
"D:\Program Files\nodejs\npm.cmd" %*
```

## Local Android build

Production Android builds must enable Tauri's custom protocol. Keep this in `src-tauri\Cargo.toml`:

```toml
[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
```

The Android-specific config removes the desktop dev server URL from the compiled Android context:

```text
src-tauri\tauri.android.conf.json
```

Initialize or refresh the Android project:

```powershell
npx tauri android init
```

Launcher icons are generated from:

```text
public\app-icon.png
```

Build arm64 release APK:

```powershell
cd /d E:\PROJECT_WEB\Resenddesk\src-tauri\gen\android
gradlew.bat assembleUniversalRelease -PabiList=arm64-v8a -ParchList=arm64 -PtargetList=aarch64 --no-daemon
```

If `tauri android android-studio-script` fails with a local JSON-RPC connection refused error, build the Rust library manually first:

```powershell
cd /d E:\PROJECT_WEB\Resenddesk\src-tauri
set CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER=D:\AndroidSDK\ndk\29.0.14206865\toolchains\llvm\prebuilt\windows-x86_64\bin\aarch64-linux-android34-clang.cmd
cargo clean -p resend-desk --target aarch64-linux-android
cargo build --target aarch64-linux-android --release --features custom-protocol
```

Then rebuild the Android package while skipping the Rust task:

```powershell
cd /d E:\PROJECT_WEB\Resenddesk\src-tauri\gen\android
gradlew.bat assembleUniversalRelease -x :app:rustBuildArm64Release -PabiList=arm64-v8a -ParchList=arm64 -PtargetList=aarch64 --no-daemon
```

Before signing, verify the release library and APK do not contain the dev server URL:

```powershell
rg -a "127\.0\.0\.1:5173" src-tauri\target\aarch64-linux-android\release\libresend_desk_lib.so
rg -a "127\.0\.0\.1:5173|devUrl" dist\apk\resenddesk-v0.3.1-arm64-release-signed.apk
```

Unsigned APK:

```text
src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk
```

## Local Android signing

Keystore:

```text
D:\AndroidSDK\codex-keystores\resenddesk-release.jks
```

Sign:

```powershell
zipalign.exe -p -f 4 app-universal-release-unsigned.apk resenddesk-v0.3.1-arm64-release-aligned.apk
apksigner.bat sign --ks D:\AndroidSDK\codex-keystores\resenddesk-release.jks --ks-key-alias resenddesk --out resenddesk-v0.3.1-arm64-release-signed.apk resenddesk-v0.3.1-arm64-release-aligned.apk
apksigner.bat verify --verbose --print-certs resenddesk-v0.3.1-arm64-release-signed.apk
```

Final local output:

```text
E:\PROJECT_WEB\Resenddesk\dist\apk\resenddesk-v0.3.1-arm64-release-signed.apk
```
