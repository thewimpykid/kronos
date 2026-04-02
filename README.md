# Kronos

A local-first screen time tracker for Windows. Kronos runs silently in the background, recording which apps and websites you use throughout the day — entirely on your own machine. No accounts, no cloud, no data ever leaves your device.

---

## Features

- **Automatic tracking** — detects the active foreground window every 1.5 seconds using the Win32 API
- **Website tracking** — reads the active browser tab URL directly from Chrome, Edge, Firefox, Brave, and others via Windows UI Automation (no extension required)
- **Idle detection** — pauses tracking after 5 minutes of no mouse or keyboard input; resumes the moment you return
- **Focus sessions** — block specific apps and websites for a set duration; minimizes them automatically if you open them
- **Daily limits** — set a time budget per app or site; get a system notification when you hit it
- **Hydration reminders** — optional notifications on a configurable interval; tracks glasses logged per day
- **Timeline view** — hourly breakdown of screen time for the current day
- **All data stored locally** — a single SQLite file in your app data folder; nothing is transmitted anywhere

---

## Platform Support

| Feature | Windows | macOS |
|---|---|---|
| App & website tracking | ✅ | ⏳ Planned |
| Idle detection | ✅ | ⏳ Planned |
| Focus session blocking | ✅ | ⏳ Planned |
| Limits & notifications | ✅ | ✅ |
| Hydration reminders | ✅ | ✅ |
| Dashboard, Timeline, Websites | ✅ | ✅ |

macOS: the app builds and runs, but active window tracking is not yet implemented. All other UI and reminder features work.

---

## Requirements

### Windows

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 or later | [nodejs.org](https://nodejs.org) — LTS recommended |
| Git | Any recent | [git-scm.com](https://git-scm.com) |
| Visual Studio Build Tools | 2019 or later | Required to compile `better-sqlite3` (the native SQLite binding) |

**Installing Visual Studio Build Tools:**

1. Download from [visualstudio.microsoft.com/visual-cpp-build-tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Run the installer
3. Select **Desktop development with C++** workload
4. Install — this takes a few minutes

If you already have Visual Studio (any edition) with the C++ workload, you're set.

### macOS

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 or later | [nodejs.org](https://nodejs.org) or `brew install node` |
| Git | Any recent | Pre-installed on macOS, or `brew install git` |
| Xcode Command Line Tools | Any | Run `xcode-select --install` |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/thewimpykid/kronos.git
cd kronos
```

### 2. Install dependencies

```bash
npm install
```

This automatically rebuilds `better-sqlite3` for your installed Electron version (via the `postinstall` script). If it fails, see [Troubleshooting](#troubleshooting).

### 3. Run in development mode

```bash
npm run dev
```

The app opens as an Electron window. A tray icon appears in your system tray (bottom-right on Windows). Closing the window hides it to the tray — right-click the tray icon to quit.

---

## Building the Installer

Produces a Windows NSIS installer (`dist/Kronos Setup 1.0.0.exe`) and a standalone unpacked build (`dist/win-unpacked/Kronos.exe`).

### Windows

You need **Developer Mode** enabled to allow the build tool to create symlinks, or run the terminal as Administrator.

**Enable Developer Mode:**
Settings → System → For developers → Developer Mode → On

Then:

```bash
npm run dist
```

The installer will be at `dist/Kronos Setup 1.0.0.exe`.

If you just want to run the app without an installer:

```bash
npm run build
```

Then launch `out/` — or use `npm run dev` for the full dev experience.

### macOS

```bash
npm run dist
```

Produces a `.dmg` in `dist/`. Note that macOS tracking features are not yet functional (see [Platform Support](#platform-support)).

---

## Project Structure

```
kronos/
├── src/
│   ├── main/                   # Electron main process (Node.js)
│   │   ├── index.ts            # App entry point — window, tray, lifecycle
│   │   ├── tracker.ts          # Active window polling via PowerShell/Win32
│   │   ├── db.ts               # SQLite schema and query helpers
│   │   ├── ipc-handlers.ts     # IPC bridge between main and renderer
│   │   ├── focus-session.ts    # Focus mode — blocks apps and sites
│   │   ├── water-reminder.ts   # Hydration notification timer
│   │   ├── overlay.ts          # Always-on-top block notification window
│   │   └── appicon.ts          # Programmatic icon generator (no binary assets)
│   ├── preload/
│   │   ├── index.ts            # contextBridge for the main renderer
│   │   └── overlay.ts          # contextBridge for the overlay window
│   └── renderer/
│       ├── src/
│       │   ├── App.tsx          # Root component and navigation
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Websites.tsx
│       │   │   ├── Timeline.tsx
│       │   │   ├── Focus.tsx
│       │   │   ├── Water.tsx
│       │   │   └── Limits.tsx
│       │   └── lib/
│       │       ├── api.ts       # Typed wrappers around the IPC bridge
│       │       └── appnames.ts  # Process name → friendly name mapping
│       ├── index.html
│       └── overlay.html        # Standalone overlay window
├── scripts/
│   └── generate-icons.mjs      # Generates build/icon.ico at build time
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```

---

## How Tracking Works

**App tracking** — A persistent PowerShell subprocess runs in the background and calls `GetForegroundWindow` every 1.5 seconds via Win32 P/Invoke. When the foreground window changes, it emits a tab-separated line: `pid\tprocessName\twindowTitle\turl`. Node.js reads this on stdout and opens/closes database sessions accordingly.

**Website tracking** — When the foreground process is a known browser (Chrome, Edge, Firefox, Brave, etc.), the PowerShell script uses `System.Windows.Automation.AutomationElement` to read the value of the address bar control. This works without a browser extension.

**Idle detection** — The same subprocess calls `GetLastInputInfo` to measure time since the last mouse or keyboard event. When idle time exceeds 5 minutes, it emits `IDLE` once. The Node.js side closes any open sessions so idle time does not accumulate in your totals. Sessions reopen when you return.

**Data storage** — Everything is written to a single SQLite file at:
- Windows: `%APPDATA%\kronos\kronos.db`
- macOS: `~/Library/Application Support/kronos/kronos.db`

---

## Troubleshooting

### `better-sqlite3` fails to install or throws an ABI mismatch error

The native module must be compiled against the same Node.js ABI that Electron uses internally.

```bash
npm run rebuild
```

If that fails, make sure Visual Studio Build Tools with the C++ workload is installed (Windows), or Xcode Command Line Tools (macOS).

### The app opens but no data appears after switching windows

- Check that the PowerShell execution policy is not set to `Restricted`. The tracker script runs with `-ExecutionPolicy Bypass` which should override this, but some corporate group policies block it entirely.
- Confirm the app is not sandboxed (e.g., running from inside a zip archive or a restricted folder).

### Notifications show "Electron" instead of "Kronos"

This usually means the app was launched via `node` directly rather than through Electron, or the `appUserModelId` was not set before the first notification. Running via `npm run dev` or the built installer should show the correct name.

### `npm run dist` fails with "Cannot create symbolic link"

Enable **Developer Mode** in Windows Settings (Settings → System → For developers), or run the terminal as Administrator. See [Building the Installer](#building-the-installer).

### The tray icon appears blank

Happens occasionally if the icon is created before the display is fully initialized. Restarting the app resolves it.

---

## Development Notes

- The overlay window (`overlay.html`) is a second `BrowserWindow` with `alwaysOnTop: true` and `focusable: false`. It appears whenever a blocked app or site gains focus during a focus session and auto-dismisses after 3.5 seconds.
- App sessions with a null `end_time` in the database (from a previous crash or forced quit) are zeroed out on startup to prevent inflated totals.
- The app icon is generated programmatically at build time (`scripts/generate-icons.mjs`) using only Node.js built-ins — no image editing tools or binary assets are needed in the repository.

---

## License

MIT
