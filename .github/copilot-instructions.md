
# Copilot Instructions for this Repository

Purpose
- Help AI coding agents become productive quickly by describing this repo's architecture, key workflows, and discovered conventions.

**Big Picture**
- This is a Next.js frontend using the App Router with **Turbopack** as the default bundler and Firebase for Auth + Firestore (see `package.json` scripts: `dev`, `build`, `deploy`).
- Firebase is initialized in `src/firebaseClient.js`. This project does not use local Firebase emulators—unit tests mock Firebase modules instead.

**Key Files & Components**
- `src/firebaseClient.js`: Firebase init, auth helpers, and Firestore exports (`auth`, `db`, `signInWithGoogle`, `signOutUser`, `useEmulator`).
- `firebase.json`: Firebase hosting and Firestore config (note: `hosting.public` is `dist`).
- `.firebaserc`: Firebase project configuration.
- `src/app/layout.jsx`: Root layout (document shell). Note: site language is set to `zh-Hant`.
- `src/app/page.jsx`: Home page (includes a link to `/test-list`).
- `src/app/test-list.jsx`: Client component that renders the `test` Firestore collection (shared component).
- `src/app/test-list/page.jsx`: Route page that wraps `test-list.jsx`.
- `src/app/test-list/layout.jsx`: Nested layout (must not render `<html>`/`<body>`).
- `src/styles/globals.css`: Global styles.
- `scripts/add-test-data.js`: Node.js script to populate the `test` Firestore collection with sample student data.
- `__tests__/`: Vitest unit tests (including `__tests__/firebaseClient.test.js`, `__tests__/App.test.jsx`, `__tests__/test-list.test.jsx`).
- `e2e/`: Playwright E2E tests (including `e2e/example.spec.js`, `e2e/test-list.spec.js`).
- `next.config.cjs`: Webpack fallback configuration (aliased `undici: false` to avoid server-only modules in client builds).
- `.mcprc`: MCP server configuration for Firebase MCP integration.
- `FIREBASE_MCP_SETUP.md`: Firebase MCP server setup and configuration guide.

**How to Run / Dev Workflows**
- Install dependencies: `npm install`
- Dev server (Turbopack): `npm run dev` (recommended—fast startup with HMR at ~490ms on first start)
  - Fallback: `npm run dev:webpack` (uses webpack instead of Turbopack)
- MCP server (Firebase MCP):
  - Start locally with: `npm run mcp:start` or `npx -y firebase-tools@latest mcp`
  - Optionally specify project directory: `npm run mcp:start:with-dir` (uses `--dir .`)
- E2E (Playwright):
  - Install browsers: `npx playwright install` or `npm run playwright:install`
  - Run tests: `npm run test:e2e` (or `npx playwright test`). Playwright's config starts/reuses the dev server and writes HTML/JSON reports to `test-results/`.
  - View HTML report: `npx playwright show-report test-results` (serves report locally)
- Unit tests: `npm run test` (Vitest); tests mock `firebase/*` modules to avoid browser-only APIs.
  - Watch mode: `npm run test:watch`
  - Unit only: `npm run test:unit`
- Run all tests: `npm run test:all` (runs both unit and E2E tests sequentially)
- Build: `npm run build` (Next.js build output to `.next/`)
- Production server: `npm run start` (requires `npm run build` first)
- Deploy to Firebase Hosting: `npm run deploy`
- **All test results are centralized in the `test-results/` directory** (HTML and JSON reports for both Vitest and Playwright).

**Turbopack & Webpack Configuration**
- Default bundler: **Turbopack** (`next dev --turbo`) for fast incremental compilation and HMR.
  - Turbopack is the recommended dev experience; webpack fallback exists for compatibility.
- Webpack fallback config is available in `next.config.cjs` and aliases `undici: false` to avoid bundling server-only modules in client builds.

**Environment & Emulators**
- Environment variables use `NEXT_PUBLIC_` prefixes for client exposure (see `src/firebaseClient.js` for exact keys).
  - Copy `.env.example` to `.env.local` and populate with your Firebase project credentials.
  - Example keys: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, etc.
- **This repo does not use Firebase emulators** in CI or local development by default.
  - Unit tests mock Firebase imports (via `vi.mock()`) instead of relying on emulator connectivity.
  - To use emulators in development, set `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` and start Firebase emulator suite separately.

**Testing & Mocking Patterns**
- Unit tests use `vitest` with `vi.mock(...)` to stub `firebase/*` modules (see `__tests__/firebaseClient.test.js`).
- Playwright E2E expects a running dev server. `playwright.config.js` includes a `webServer` entry that will start `npm run dev` and wait for the configured port.
- Test artifacts (HTML + JSON) are placed into `test-results/` for both unit and E2E runs.

**Dependencies**
- Next.js: 16.1.6 (App Router)
- Firebase: ^11.0.0 (Auth + Firestore)
- Vitest: ^4.0.18 (unit testing)
- Playwright: ^1.40.0 (E2E testing)
- Node: 20.17.0+ (recommend 20.19.0+ for dependency compatibility)

**Project-Specific Conventions & Gotchas**
- The codebase uses the Next.js App Router. Place route files under `src/app/` and use `"use client"` for client-only components.
- Root layout (`src/app/layout.jsx`) provides the document shell (`<html>`/`<body>`). Nested layouts (e.g. `src/app/test-list/layout.jsx`) must not render `<html>` or `<body>`—return fragments or normal elements only.
- The root `lang` attribute is set to `zh-Hant` in `src/app/layout.jsx` to reflect Traditional Chinese site language.
- When moving files, update relative imports and tests accordingly.

**When Editing Code**
- Prefer updating `src/firebaseClient.js` for Firebase-related behavior; keep emulator-toggle logic intact to allow local dev without project credentials.
- For tests, follow existing mocking strategy (`vi.mock`) instead of changing runtime init behavior.
- When adding new routes, place them in `src/app/` using Next.js App Router conventions (`page.jsx`, `layout.jsx`).
- Client components should use `"use client"` directive at the top of the file.
- For shared components (like `TestCollectionPage`), consider placing them in `src/app/` with a descriptive name and having route-specific wrappers import them.

**Repository**
- **GitHub**: [https://github.com/jitsungwu/sa2026](https://github.com/jitsungwu/sa2026)
- **Project Name**: sa2026
- **Visibility**: Public

**Recent Work (Latest Update)**
- 2026-03-15: Initialized project and pushed to GitHub (`jitsungwu/sa2026`).
- Added complete Next.js + Firebase + Turbopack scaffold with testing setup.
- Implemented `/test-list` page and route structure (`src/app/test-list/` directory with shared component pattern).
- Added unit tests (`__tests__/`) using Vitest with Firebase module mocking.
- Added E2E tests (`e2e/`) using Playwright with integrated dev server startup.
- Added `scripts/add-test-data.js` for populating Firestore `test` collection with sample student data.
- Configured MCP server support via `.mcprc` and `FIREBASE_MCP_SETUP.md`.
- Set root document language to Traditional Chinese (`zh-Hant`).

If anything above is unclear or you want instructions to be more prescriptive (example PR templates, local debugging steps, CI/CD setup, or contributing guidelines), tell me which section to expand.

**Repository Uploads (Use MCP)**
- **Policy**: 從現在起，請優先利用 MCP（Firebase MCP 伺服器）上傳或推送專案檔案到 GitHub，讓 AI 代理與編輯器整合可以更安全且可審計地執行變更。
- **How to start MCP locally**:

```bash
npm run mcp:start
# or, if you prefer explicit npx:
npx -y firebase-tools@latest mcp --dir .
```

- **Agent workflow**: 啟動 MCP 伺服器後，指示 AI 代理使用 MCP 工具將變更上傳至 GitHub，並提供：檔案路徑、commit 訊息、目標分支（預設 `main`）。
- **Why**: MCP 提供受控的遠端操作通道，避免在本地暴露個人 token 或 SSH 金鑰，並能讓操作可追蹤與審計。
- **Fallback**: 若 MCP 無法使用，可使用 `gh auth login` 或本機安全 token 方式，但請先與專案維護者確認流程與授權範圍。
