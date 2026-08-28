# CLAUDE.md

## Architecture rules

- Directory boundaries: the admin layer may call the core/domain layer. The core
  layer must never call the admin or REST layer. No REST controller renders HTML.
- Before writing a new helper, grep this plugin's shared helper location and
  `plugpress-sdk`. If something within 80% of what you need exists, extend it —
  don't add a variant.
- Every hook callback is a thin wrapper. Business logic goes in a class method
  that is callable and testable without WordPress loaded.
- No new top-level class without a stated reason it isn't a method on an existing
  one.
- No feature flags, config options, or abstraction layers for hypothetical future
  needs. Build the concrete case.
- Max ~300 lines per class. Hitting it is a signal to split, not to reformat.

## Session workflow

This repo is tracked on the [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3) org board (plugpressco, project #3).

- **Start of session:** read `STATUS.md` — "Last session" says what happened, "Next up" says what's queued.
- **During the session:** keep the board honest — move cards across Status (Todo → In Progress → Done), and set Tier (`build` / `slow-burn` / `maintain`) and Work Type (`bug` / `feature` / `support` / `marketing` / `interrupt`) on anything new.
- **End of session:** update `STATUS.md` — replace "Last session" with what actually happened this session, and refresh "Next up" for whoever (or whatever) picks this up next.
