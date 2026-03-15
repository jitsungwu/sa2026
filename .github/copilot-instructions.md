
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
