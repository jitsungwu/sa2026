# Branching & Pull Request Workflow

Repository policy (applies to all contributors):

- **Never push directly to `main`.** All work must happen on a feature/fix/chore branch.
- **Branch naming:** use `feature/<short-description>`, `fix/<short-description>`, or `chore/<short-description>`.
- **Push workflow:**
  1. Create a branch locally: `git checkout -b feature/your-change`
  2. Commit locally and push: `git push -u origin feature/your-change`
  3. Open a Pull Request (PR) targeting `main` and include the linked Issue (if any).
- **PR requirements:**
  - Clear title and description; reference related Issue(s).
  - Include tests or verification steps for functional changes.
  - Request at least one reviewer before merging.
- **Merging:** Use the GitHub PR UI to merge after approvals. Do not fast-forward or otherwise push merges directly from local clones without a PR.
- **Emergency changes:** If an urgent fix must land on `main`, open a PR with an emergency label and get explicit approval from a maintainer first.

This file documents the current agreed workflow; follow it for all future changes.
