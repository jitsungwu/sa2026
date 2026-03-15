# Next.js (App Router) + Firebase + Turbopack Scaffold

Quick scaffold for a Next.js frontend with Firebase (Auth + Firestore) and **Turbopack** bundler.

## Quick Start

1. **Setup Environment**
   - Copy `.env.example` to `.env.local` and replace with your Firebase project values
   - Environment variables use `NEXT_PUBLIC_*` prefix for client-side exposure

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run dev server (with Turbopack)**
   ```bash
   npm run dev          # Turbopack (default, fast)
   npm run dev:webpack  # Fallback to webpack if needed
   ```
   - Server will start at `http://localhost:3000`
   - HMR (Hot Module Replacement) enabled with Turbopack (~490ms first start)

4. **Build & Deploy**
   ```bash
   npm run build
   npm run start       # Production server
   npm run deploy      # Firebase Hosting deployment
   ```

## Project Structure

- `src/firebaseClient.js` — Firebase initialization, Auth helpers, emulator toggle
- `src/app/` — Next.js App Router pages & layout
- `src/styles/` — Global CSS
- `__tests__/` — Unit tests (Vitest, Firebase modules mocked)
- `e2e/` — E2E tests (Playwright)
- `firebase.json` — Firebase & emulator config
- `next.config.js` — Turbopack-aware config with webpack alias fallback

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Bundler**: Turbopack (default) + webpack fallback
- **Backend**: Firebase 11.0.0 (Auth + Firestore)
- **Testing**: Vitest (unit) + Playwright (E2E)

## Key Features

- ✓ **Turbopack** with HMR for fast dev loop (~490ms startup)
- ✓ Firebase Authentication (Email/Password, Google, Magic Link ready)
- ✓ Firestore real-time integration with `onSnapshot`
- ✓ React Strict Mode enabled
- ✓ No Firebase emulators required in CI — unit tests mock Firebase modules
- ✓ Playwright E2E tests with live dev server

## Testing

```bash
npm run test           # Unit tests (Vitest)
npm run test:watch     # Watch mode
npm run test:e2e       # E2E tests (requires dev server running on :3000)
npm run test:unit      # Alias for unit tests
```

## Turbopack vs Webpack

**Turbopack (default)**
- Faster startup and incremental compilation (Rust-based)
- Better HMR UX with faster file watching
- Optimizes dev experience for rapid iteration

**Webpack (fallback)**
- Mature ecosystem, used in production builds
- More customizable plugin/loader ecosystem
- Accessible via `npm run dev:webpack`

The `webpack` function in `next.config.js` is preserved for:
- Webpack-based fallback `npm run dev:webpack` 
- Custom module aliasing (e.g., `undici: false` to avoid browser bundling)
- Future production configurability

## Important Notes

- **Turbopack HMR**: Successfully tested — file changes hot-reload without page refresh
- **Firebase Version**: ^11.0.0 (ensures latest Auth & Firestore features)
- **Node Version**: Recommend Node 20.19.0+ (current: 20.17.0)
- **No Emulators**: This project mocks Firebase in tests via `vi.mock()` — no local emulator container needed
- **Environment Setup**: See `.env.example` for required `NEXT_PUBLIC_FIREBASE_*` keys

## Development Workflow

1. Start dev server: `npm run dev` (Turbopack enabled by default)
2. Edit files in `src/` — HMR applies changes instantly
3. Run tests: `npm run test` (unit) or `npm run test:e2e` (E2E)
4. Build: `npm run build` → `npm run start` for production preview
5. Deploy: `npm run deploy` to Firebase Hosting

## MCP Usage (Recommended for agent uploads)

This project supports using a local MCP (Model Context Protocol) server to safely allow AI agents or editor integrations to modify and push repository files.

Quick start (local):

```bash
# Start the Firebase MCP server (runs locally and exposes an agent endpoint)
npm run mcp:start

# After MCP is running, instruct your agent/editor to use the MCP server to push commits.
# Example agent payloads typically specify: file paths, commit message, branch (default: main).
```

Security notes:
- MCP provides an auditable channel for remote agents — prefer MCP over sharing personal tokens.
- If MCP is unavailable, use `gh auth login` to authenticate the `gh` CLI and push changes manually.

如果你偏好中文說明：

```bash
# 啟動本機 MCP 伺服器
npm run mcp:start

# 啟動後，請透過支援 MCP 的代理或編輯器插件提交檔案（包含檔案路徑、commit 訊息與目標分支）。
```

Why use MCP:
- Avoid exposing personal PATs or SSH keys in ad-hoc scripts.
- Operations via MCP are easier to audit and restrict.
