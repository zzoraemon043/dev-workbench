# Contributing to Dev Workbench

Thanks for taking the time to contribute! This guide gets you from zero to a merged pull request.

## Ground rules

- **Everything runs in the browser.** Pull requests that add a backend, a third-party API call, analytics, or remote fonts will not be merged. If a feature needs the network, the user must initiate it explicitly (like the Socket Console).
- **Keep the core pure.** Logic belongs in `src/lib` as framework-free TypeScript with unit tests. Components in `src/tools` should mostly wire that logic to the UI.
- **Code explains itself.** Prefer precise names and strict types over comments. Comment only non-obvious algorithms or deliberate workarounds — no step-by-step narration, no boilerplate JSDoc.
- Be kind. Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

```bash
git clone https://github.com/zzoraemon043/dev-workbench.git
cd dev-workbench
npm install
npm run dev
```

Requires Node.js 22.13+ (`nvm use` picks it up from `.nvmrc`).

Before pushing, make sure all checks pass — CI runs exactly these:

```bash
npm run lint
npm test
npm run build
```

## Project layout

| Path | What lives there |
|---|---|
| `src/lib/` | Pure TypeScript core. Every module has a sibling `*.test.ts`. |
| `src/tools/<tool>/` | One folder per tool. The default export is the tool's root component. |
| `src/tools/registry.ts` | The single list of tools. Navigation, palette and shortcuts derive from it. |
| `src/components/` | Shared design-system components (`Panel`, `Button`, `CodeEditor`, …). |
| `src/store/` | Zustand stores. Per-tool state lives in `workbench.ts`. |
| `src/hooks/` | Cross-cutting hooks: hotkeys, theme, smart paste, share links. |

## Adding a new tool

1. Write the logic in `src/lib/<your-tool>/` with tests.
2. Add the tool's persisted state shape and defaults in `src/store/workbench.ts`, and list which fields are safe to put in share links in `SHAREABLE_FIELDS` (never secrets).
3. Create `src/tools/<your-tool>/<YourTool>.tsx` composed from the components in `src/components/`.
4. Register it in `src/tools/registry.ts` with a name, tagline, icon and keywords.
5. Optionally teach `src/lib/detect.ts` to recognize pasted content for your tool.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(regex): add sticky flag explanation
fix(jwt): handle tokens with padding characters
docs: clarify self-hosting under a sub-path
```

## Pull requests

- Keep PRs focused — one feature or fix per PR.
- Include screenshots or a short clip for UI changes, in both light and dark mode.
- Add or update tests for any logic change.
- Fill in the pull request template; it doubles as the review checklist.

## Reporting bugs and requesting features

Use the [issue templates](https://github.com/zzoraemon043/dev-workbench/issues/new/choose). For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
