
# Copilot Instructions for this Repository

Purpose
- Help AI coding agents become productive quickly by describing this repo's architecture, key workflows, and discovered conventions.

**Big Picture**
- This is a Next.js frontend using the App Router with **Turbopack** as the default bundler and Firebase for Auth + Firestore (see `package.json` scripts: `dev`, `build`, `deploy`).
- Firebase is initialized in `src/firebaseClient.js`. This project does not use local Firebase emulators—unit tests mock Firebase modules instead.

**Key Files & Components**
- `src/firebaseClient.js`: Firebase init, emulator connection, and auth helper exports (`auth`, `db`, `signInWithGoogle`, `signOutUser`, `useEmulator`).
- `firebase.json`: Emulator ports and hosting config (note: `hosting.public` is `dist`, which may not match Next.js build output).
- `src/app/layout.jsx`: Root layout (document shell). Note: site language is set to `zh-Hant` in the root layout.
- `src/app/page.jsx`: Home page (includes a link to `/test-list`).
- `src/app/test-list/page.jsx`: Client component that renders the `test` Firestore collection.
- `src/app/test-list/layout.jsx`: Nested layout (must not render `<html>`/`<body>`).
- `src/styles/globals.css`: Global styles.
- `src/firebaseClient.js`: Firebase setup (Auth + Firestore).
- `scripts/add-test-data.js`: Script used to populate the `test` collection with sample student data.
- `__tests__/`: Vitest unit tests (including `__tests__/test-list.test.jsx`).
- `e2e/`: Playwright E2E tests (including `e2e/test-list.spec.js`).
- `next.config.cjs`: Webpack fallback configuration (aliased `undici: false`).

**How to Run / Dev Workflows**
- Install dependencies: `npm install`
- Dev server (Turbopack): `npm run dev` (recommended—fast startup with HMR)
  - Fallback: `npm run dev:webpack` (uses webpack)
- MCP server (Firebase MCP):
  - Start locally with: `npm run mcp:start` (defined in `package.json`) or `npx -y firebase-tools@latest mcp`
  - Optionally specify project directory: `npm run mcp:start:with-dir` (`--dir .`)
- E2E (Playwright):
  - Install browsers: `npx playwright install` or `npm run playwright:install`
  - Run tests: `npx playwright test` (or `npm run test:e2e`). Playwright's config starts/reuses the dev server and writes HTML/JSON reports to `test-results/`.
  - View HTML report: `npx playwright show-report test-results` (serves report locally)
- Unit tests: `npm run test` (Vitest); tests mock `firebase/*` modules to avoid browser-only APIs.
- Run all tests: `npm run test:all` (runs both unit and E2E tests)
- **All test results are centralized in the `test-results/` directory** (HTML and JSON reports for both Vitest and Playwright).

**Turbopack & Webpack Configuration**
- Default bundler: **Turbopack** (`next dev --turbo`) for fast incremental compilation and HMR.
  - Turbopack is the recommended dev experience; webpack fallback exists for compatibility.
- Webpack fallback config is available in `next.config.cjs` and aliases `undici: false` to avoid bundling server-only modules in client builds.

**Environment & Emulators**
- Environment variables use `NEXT_PUBLIC_` prefixes for client exposure (see `src/firebaseClient.js` for exact keys).
- This repo does not use Firebase emulators in CI or local development by default. Unit tests mock Firebase imports rather than relying on emulators.

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
- The codebase uses the Next.js App Router. Place route files under `src/app/` and use "use client" for client-only components.
- Root layout (`src/app/layout.jsx`) provides the document shell (`<html>`/`<body>`). Nested layouts (e.g. `src/app/test-list/layout.jsx`) must not render `<html>` or `<body>`—return fragments or normal elements only.
- The root `lang` attribute is set to `zh-Hant` in `src/app/layout.jsx` to reflect Traditional Chinese site language.
- When moving files, update relative imports and tests accordingly.

**When Editing Code**
- Prefer updating `src/firebaseClient.js` for Firebase-related behavior; keep emulator-toggle logic intact to allow local dev without project credentials.
- For tests, follow existing mocking strategy (`vi.mock`) instead of changing runtime init behavior.

**Files to Inspect for Context**
- `package.json`: Scripts and dependencies (note new `mcp:start` scripts and test scripts)
- `src/firebaseClient.js`: Firebase init and emulator logic
- `firebase.json` / `.firebaserc`: Project settings and hosting
- `next.config.cjs`: Webpack fallback config
- `__tests__/test-list.test.jsx`: Unit test for the Test list component
- `e2e/test-list.spec.js`: Playwright E2E test for `/test-list`
- `scripts/add-test-data.js`: Helper script used to add sample data to Firestore

**Recent Work (Latest Update)**
- Added `/test-list` page and test data script (`scripts/add-test-data.js`).
- Added unit test `__tests__/test-list.test.jsx` and Playwright E2E `e2e/test-list.spec.js`.
- Added `npm run mcp:start` and `.mcprc` to aid MCP client integrations and editor configs.
- Root layout `src/app/layout.jsx` updated to set `<html lang="zh-Hant">`.

If anything above is unclear or you want instructions to be more prescriptive (example PR templates, local debugging steps, or CI changes), tell me which section to expand.