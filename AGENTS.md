## Agent skills

### Issue tracker

Local markdown files under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.

## Coding guardrails

- **Think before coding**: state assumptions explicitly before editing; surface ambiguities or simpler alternatives instead of guessing silently.
- **Simplicity first**: write the minimum code that solves the request; avoid speculative abstractions, unused options, or unrequested features.
- **Surgical changes**: edit only lines directly tied to the request; match surrounding style and remove only imports/variables/functions made unused by your own edit.
- **Goal-driven verification**: convert tasks into concrete checks and run `pnpm build` (`tsc -b && vite build`) and `pnpm test -- --run` before reporting done.
