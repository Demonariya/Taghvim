# Taghvim (تقویم) — v0.0.1

Windows desktop Persian (Jalali / Solar Hijri) calendar built with **Tauri 2**, **Rust**, **React 19**, **TypeScript**, **Vite 8**, and **Tailwind CSS 4**.

---

## Features

- **Jalali, Gregorian & Hijri Calendar**: Full Persian calendar grid with secondary Gregorian and Hijri dates, RTL layout, and `Digikala New` typography.
- **Official Events (`time.ir`) + Offline Fallback**: Scrapes monthly Iranian events from `time.ir` with a 24-hour disk cache and built-in statutory holiday fallback.
- **Three-Way Date Converter**: Instant conversion between Jalali, Gregorian, and Lunar Hijri dates.
- **Notes & Desktop Notifications**: Persistent local notes/reminders checked in the background every 30 seconds with native Windows toast notifications.
- **Dynamic Windows System Tray**: Renders today's Jalali day number dynamically via `fontdue` on the tray icon, updates at midnight, includes a quick tray popup (`#/tray`), global toggle shortcut (`Ctrl+Alt+J`), and Windows autostart support.

---

## Project Architecture

### Rust Backend (`src-tauri/src/`)

- `shared/`: Cross-platform calendar math (`calendar.rs`), JSON notes and settings persistence (`notes.rs`), `time.ir` scraper and 24h cache (`scraper.rs`), Tauri commands (`commands.rs`), and startup diagnostics (`diagnostics.rs`).
- `windows/`: Windows panic/crash hook (`%TEMP%\taghvim_crash.log` and `%APPDATA%\com.taghvim.calendar\crash.log`), desktop window controls (`commands.rs`), `fontdue` tray icon renderer and `#/tray` popup (`tray_icon.rs`), background reminder watcher (`reminders.rs`), autostart, and global shortcut (`mod.rs`).

### Frontend (`src/`)

- `src/shared/`: Types (`types/calendar.ts`), date helpers & unit tests (`utils/persianDate.ts`, `utils/persianDate.test.ts`), calendar grid builder & converter (`services/calendarGrid.ts`), Tauri IPC + browser fallback storage (`services/storageService.ts`), diagnostics (`services/diagnostics.ts`), and app state hook (`hooks/useTaghvimApp.ts`).
- `src/components/`: UI views (`Header`, `MonthGrid`, `DayCell`, `BottomActionBar`, `DayDetailModal`, `DateConverter`, `NotesReminders`, `SettingsModal`, `ErrorBoundary`).
- `src/platform/windows/`: Desktop shell (`WindowsShell.tsx`), custom frameless title bar (`TitleBar.tsx`), tray popup (`TrayPopupView.tsx`), Windows settings (`WindowsSettingsSection.tsx`), and native desktop bridge (`adapter.ts`).

---

## Windows Development & Build

### Prerequisites (Windows x64)

- **Node.js 20+** and **npm** (uses committed `package-lock.json` only)
- **Rust stable** (`x86_64-pc-windows-msvc`) with `clippy`
- **Microsoft Visual Studio C++ Build Tools** (MSVC v143 + Windows SDK)
- **Microsoft Edge WebView2 Runtime** (bundled via NSIS `embedBootstrapper` for end users)

### Commands

```bash
# Install exact dependencies
npm ci

# Typecheck and run frontend unit tests
npx tsc --noEmit
npm test

# Start local development server or full Tauri desktop dev mode
npm run dev
npm run tauri dev

# Run Rust tests and Clippy checks
cargo test --manifest-path src-tauri/Cargo.toml --lib
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

# Build production Windows executable & NSIS installer
npm run build
npm run tauri build -- --bundles nsis --ignore-version-mismatches
```

### Build Outputs & CI/CD

- **GitHub Actions Workflow**: `.github/workflows/build-windows.yml` runs preflight checks (lockfile, `icon.ico` multi-resolution check, font check, version alignment), TypeScript typecheck, unit tests, `npm run build`, `cargo test`, `cargo clippy -- -D warnings`, builds the NSIS installer, packages `Taghvim_<version>_x64-portable.exe`, and attaches both artifacts to the draft GitHub release.
- **Diagnostics**: Startup crash logs on Windows are written to `%TEMP%\taghvim_crash.log` and `%APPDATA%\com.taghvim.calendar\crash.log`, alongside `startup_diagnostics.json` in `%APPDATA%\com.taghvim.calendar\`.
