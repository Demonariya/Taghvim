# Taghvim (تقویم) — v0.0.1

Cross-platform Persian (Jalali / Solar Hijri) calendar built with **Tauri 2**, **Rust**, **React 19**, **TypeScript**, **Vite 8**, and **Tailwind CSS 4**, targeting **Windows Desktop** (NSIS installer + portable `.exe`) and **Android** (universal APK for `arm64-v8a`, `armeabi-v7a`, and `x86_64`).

---

## Architecture: `shared` / `android` / `windows` Separation

The codebase enforces strict target isolation across Rust, TypeScript, Tauri configuration, capabilities, and CI/CD pipelines so neither platform compiles or bundles the other's native dependencies or desktop/mobile runtime code.

### 1. Rust Backend (`src-tauri/src/`)

| Layer | Location | Responsibilities |
| :--- | :--- | :--- |
| **`shared`** | `src-tauri/src/shared/` | Pure Jalali/Gregorian/Hijri calendar conversion & fallback holidays (`calendar.rs`), thread-safe JSON notes & settings persistence (`notes.rs`), `time.ir` scraper with 24h disk cache (`scraper.rs`), cross-platform Tauri commands (`commands.rs`), and persistent startup stage diagnostics (`diagnostics.rs`). |
| **`android`** | `src-tauri/src/android/` | Direct NDK `liblog` FFI (`__android_log_write` under tag `TaghvimRust`), Android crash & panic hook (`android_rust_crash.log`), Android-safe storage directory resolution (`app_data_dir` -> `app_cache_dir` -> `temp_dir`), and mobile plugin setup (`log`, `notification`). |
| **`windows`** | `src-tauri/src/windows/` | Windows crash hook (`%TEMP%\taghvim_crash.log` & `%APPDATA%\com.taghvim.calendar\crash.log`), desktop window commands (`commands.rs`), dynamic `fontdue` tray icon renderer & `#/tray` popup (`tray_icon.rs`), background reminder watcher (`reminders.rs`), autostart, and `Ctrl+Alt+J` global shortcut. |

- **`src-tauri/Cargo.toml`**: Desktop-only crates (`tauri` `tray-icon` + `image-png` features, `tauri-plugin-autostart`, `tauri-plugin-global-shortcut`, `fontdue`) live exclusively under `[target.'cfg(target_os = "windows")'.dependencies]`.
- **Tauri Configs & Capabilities**:
  - `src-tauri/tauri.conf.json`: Shared metadata, CSP, bundle icons, and notification plugin.
  - `src-tauri/tauri.windows.conf.json`: Windows `beforeBuildCommand` (`npm run build:windows`), `390x780` frameless window, NSIS/WebView2 bootstrapper config, `autostart` and `global-shortcut` plugins.
  - `src-tauri/tauri.android.conf.json`: Android `beforeBuildCommand` (`npm run build:android`), clean main window, `minSdkVersion: 24`.
  - `src-tauri/capabilities/desktop.json` (`platforms: ["windows"]`) and `src-tauri/capabilities/mobile.json` (`platforms: ["android"]`).

### 2. Frontend (`src/`)

| Layer | Location | Responsibilities |
| :--- | :--- | :--- |
| **`shared`** | `src/shared/` | `types/calendar.ts`, `utils/persianDate.ts` (+ unit tests), `services/calendarGrid.ts`, `services/storageService.ts` (Tauri IPC + browser fallback), `services/diagnostics.ts`, and `hooks/useTaghvimApp.ts`. |
| **`components`** | `src/components/` | Pure UI views (`Header`, `MonthGrid`, `DayCell`, `BottomActionBar`, `DayDetailModal`, `DateConverter`, `NotesReminders`, `SettingsModal`, `ErrorBoundary`) importing only from `src/shared/`. |
| **`android`** | `src/platform/android/` | `AndroidShell.tsx`, `AndroidSettingsSection.tsx`, `adapter.ts` (WebView version check & notification permissions), and `android.css` (safe-area insets, `48px` touch targets, bottom sheets). |
| **`windows`** | `src/platform/windows/` | `WindowsShell.tsx`, `WindowsSettingsSection.tsx`, `TitleBar.tsx`, `TrayPopupView.tsx`, and `adapter.ts` (window controls, autostart sync, tray events). |
| **Platform Selector** | `src/platform/index.ts` | Uses Vite `--mode android` / `--mode windows` at build time so each platform build excludes the other shell, with UA fallback during local web development. |

### 3. Android Native Overlay (`src-tauri/android/` & `scripts/configure-android.mjs`)

- `src-tauri/android/MainActivity.kt`: Installs an uncaught exception handler writing to `TaghvimStartup` Logcat and `filesDir/android_crash.log`, logs SDK/ABI/WebView metadata, guards `enableEdgeToEdge()`, and displays a readable native error view on `UnsatisfiedLinkError` or startup failure instead of exiting silently.
- `src-tauri/android/proguard-rules.pro`: Keep rules for `app.tauri.**`, `com.plugin.**`, `com.taghvim.**`, `androidx.activity.**`, `androidx.webkit.**`, `kotlin.Metadata`, and JNI `native` methods.
- `scripts/configure-android.mjs`: Executed automatically after `tauri android init --ci` to patch `AndroidManifest.xml` (`INTERNET`, `ACCESS_NETWORK_STATE`, `POST_NOTIFICATIONS`, `android:roundIcon`, `android:extractNativeLibs="true"`), sync adaptive icons from `src-tauri/icons/android/`, remove the default green template background, install `MainActivity.kt` and `proguard-rules.pro`, and disable R8 release shrinking/obfuscation in both AGP 8 (`isMinifyEnabled = false`) and AGP 9 (`optimization { enable = false }`).

---

## Build & Release Instructions

### Prerequisites
- **Node.js 20+** and **npm** (do not delete `package-lock.json` or use `bun`/`pnpm`/`yarn`)
- **Rust stable** + `clippy`
- **Windows builds**: `x86_64-pc-windows-msvc` target + MSVC Build Tools + WebView2 Runtime
- **Android builds**: Java 17 (Temurin), Android SDK (`platform-tools`, `platforms;android-34+`, `build-tools`), Android NDK, and Rust targets `aarch64-linux-android`, `armv7-linux-androideabi`, `x86_64-linux-android`

### Local Commands

```bash
# Install exact dependencies
npm ci

# Typecheck and run calendar unit tests
npx tsc --noEmit
npm test

# Build frontend per target mode
npm run build:android
npm run build:windows

# Run Rust tests and platform-specific Clippy checks
cargo test --manifest-path src-tauri/Cargo.toml --lib
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings               # Windows host
cargo clippy --manifest-path src-tauri/Cargo.toml --target aarch64-linux-android --lib -- -D warnings

# Generate and configure Android Gradle project, then build APK
npm run tauri android init -- --ci
node scripts/configure-android.mjs
npm run tauri android build -- --apk --target aarch64 --target armv7 --target x86_64 --ignore-version-mismatches
```

### CI/CD Pipelines
- **Android**: `.github/workflows/build-android.yml` — runs preflight checks, TypeScript/test/Clippy checks, configures the Android project via `scripts/configure-android.mjs`, aligns (`zipalign`) before signing (`apksigner`), verifies ABIs/permissions/adaptive icon XML/Pillow pixel match, and includes a KVM-guarded emulator boot verification job (`verify-android-emulator`).
- **Windows**: `.github/workflows/build-windows.yml` — runs preflight checks (including multi-resolution `icon.ico`), TypeScript/test/Clippy checks, and produces both the NSIS installer and `Taghvim_0.0.1_x64-portable.exe`.

---

## Android Diagnostics & Debugging

1. **Logcat Filters**:
   ```bash
   adb logcat -s TaghvimStartup TaghvimRust AndroidRuntime Chromium
   ```
   - `TaghvimStartup`: Kotlin `MainActivity` lifecycle stages, `WebView.getCurrentWebViewPackage()`, and uncaught Java/Kotlin exceptions.
   - `TaghvimRust`: Direct NDK `liblog` output for Rust initialization stages and panic payloads.
2. **Persistent Crash & Stage Files** (inside app private files/data directory):
   - `android_crash.log` (Kotlin uncaught exceptions)
   - `android_rust_crash.log` (Rust panic payload & source location)
   - `startup_diagnostics.json` (ordered startup stages and warnings)
3. **In-App Diagnostics**:
   - `index.html` embeds an ES5-safe boot watchdog (`window.__TAGHVIM_BOOT__`) that shows a diagnostic screen if React fails to mount within 6 seconds or throws during module load.
   - Open **تنظیمات (Settings) -> گزارش عیب‌یابی راه‌اندازی اندروید** to inspect WebView major version, JS boot trace, and Rust startup stages live on-device.
