Contributing Guidelines — Frontend Design
=======================================

Thank you for contributing! This file contains specific guidelines for frontend design changes so contributions remain consistent and easy to review.

Design Tokens
-------------
- All global color tokens live in `src/styles/globals.css` in the `:root` block. Prefer updating or adding variables there rather than hard-coding colors.
- Example variables:
  - `--color-primary` (header/footer)
  - `--color-accent` (question/action)
  - `--color-secondary` (acceptance)
  - `--color-register` (success)
  - `--color-bg`, `--color-surface`, `--color-text`, `--color-text-dark`

Style Rules
-----------
- Use semantic class names (e.g. `.hero`, `.table-wrap`, `.btn-primary`) and avoid inline styles in components.
- Keep styles in `src/styles/globals.css` for site-wide patterns. Component-local styles can be added if necessary but prefer reusing global classes.

Accessibility
-------------
- Ensure keyboard focus styles are present (`:focus-visible`) and meet contrast requirements for text on background.
- Use descriptive `aria-*` attributes where components require additional semantics.

Responsive
----------
- Use the existing breakpoints in `globals.css` (1024, 768, 480) for layout adjustments.

Preview & Tests
---------------
- Start dev server:
  ```bash
  npm run dev
  ```
- Run unit tests (Vitest):
  ```bash
  npm run test
  ```
- Run E2E tests (Playwright):
  ```bash
  npx playwright test
  ```

Commit & PR checklist
---------------------
- Add a clear commit message describing the UI change (e.g., `feat(ui): update header style and design tokens`).
- Ensure unit and E2E tests pass locally before opening a PR.
- Include screenshots or short GIFs for any visual changes in the PR description.

If you need help or want a design review, open a draft PR and request a review from the frontend team.
