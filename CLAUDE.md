# CLAUDE.md
## Session workflow

This repo is tracked on the [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3) org board (plugpressco, project #3).

- **Start of session:** read `STATUS.md` — "Last session" says what happened, "Next up" says what's queued.
- **During the session:** keep the board honest — move cards across Status (Todo → In Progress → Done), and set Tier (`build` / `slow-burn` / `maintain`) and Work Type (`bug` / `feature` / `support` / `marketing` / `interrupt`) on anything new.
- **End of session:** update `STATUS.md` — replace "Last session" with what actually happened this session, and refresh "Next up" for whoever (or whatever) picks this up next.

---

# GitHub Workflow — Agent Rules

## Definition of Done

A task is **not** done when the code works. It is done when **all** of these are true:

1. Every change is committed (no dirty working tree, no untracked source files)
2. The branch is **pushed to `origin`**
3. A PR exists, linked to the issue with a closing keyword
4. CI is green (or the failure is reported to me)
5. The merge policy below has been followed

**Never end a turn with unpushed commits or uncommitted changes.** If you stop
mid-task for any reason, commit and push what exists first, then tell me where
you stopped.

If a push or PR step fails (auth error, protected branch, no remote, network),
say so **explicitly in your final message** with the exact error. Do not stop
silently and do not pretend the work shipped.

---

## The Loop

Every unit of work starts from a GitHub issue. No issue, no branch.

### 1. Pick up the issue

```bash
gh issue view <N>                    # read the full issue + comments
gh issue edit <N> --add-label "in-progress"
```

If the issue is vague, ambiguous, or missing acceptance criteria — **ask me
before writing code**. Do not guess at scope.

### 2. Create the branch

Use `gh issue develop` so GitHub links the branch to the issue automatically:

```bash
gh issue develop <N> --base main --name feat/<N>-short-slug --checkout
```

Branch naming:

| Type | Prefix | Example |
|---|---|---|
| Feature | `feat/` | `feat/142-instant-indexing` |
| Bug fix | `fix/` | `fix/151-aioseo-pro-conflict` |
| Refactor | `refactor/` | `refactor/160-settings-api` |
| Docs / readme | `docs/` | `docs/163-readme-changelog` |
| Chore / deps | `chore/` | `chore/165-bump-wp-tested` |

Always branch from an up-to-date `main`:

```bash
git checkout main && git pull --ff-only origin main
```

### 3. Commit as you go

Commit at each logical checkpoint — not one giant commit at the end.
Conventional Commits format, one concern per commit:

```
feat(indexing): add IndexNow submission on post publish

Refs #142
```

```
fix(compat): guard against AIOSEO Pro sitemap filter

Closes #151
```

Rules:
- Subject line ≤ 72 chars, imperative mood, lowercase after the colon
- Reference the issue in **every** commit body (`Refs #N`)
- Never commit: `vendor/`, `node_modules/`, build output, `.env`, local WP
  config, `.DS_Store`. If they show up, fix `.gitignore` in the same PR.
- Never commit commented-out dead code or debug `error_log()` / `var_dump()`

### 4. Push — always

```bash
git push -u origin HEAD
```

Push after the **first** commit, not at the end. Then keep pushing after each
subsequent commit. I want to be able to see the branch on GitHub at any moment.

### 5. Open the PR

Open it as soon as the branch is pushed — draft is fine if work continues.

```bash
gh pr create --base main --draft --title "feat: instant indexing (#142)" --body-file .git/PR_BODY.md
```

PR body must follow this template:

```markdown
Closes #142

## What
One paragraph: what this changes, in plain language.

## Why
Link back to the problem in the issue.

## How
- Key implementation decisions
- Anything non-obvious a future reader would trip on

## Testing
- [ ] Tested on WP 7.0, PHP 8.2
- [ ] Tested with the plugin's known conflict list
- [ ] No PHP notices/warnings with WP_DEBUG on
- [ ] Checked free vs pro gating still correct

## Screenshots
(admin UI changes only)
```

`Closes #N` is mandatory — it auto-closes the issue on merge and keeps the
board accurate. Use `Refs #N` only when the PR genuinely does not finish the
issue.

When work is complete: `gh pr ready <N>`.

### 6. Verify before merge

```bash
gh pr checks --watch
```

CI runs on every push to a PR. Wait for it.

If CI fails, fix it on the same branch and push again. Never merge red.

### 7. Merge policy — **A, solo fast mode**

Once CI is green and the PR description is complete, merge it yourself:

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull --ff-only origin main
```

Exception — **stop and ask me first** if the PR touches:
licensing/activation, payment or Freemius/Creem code, database schema or
migrations, uninstall routines, anything that ships to WordPress.org, a version
bump, or more than ~400 changed lines.

### 8. Close the loop

After merge:

```bash
gh issue edit <N> --remove-label "in-progress"
git branch -d feat/<N>-short-slug
```

Confirm the issue actually closed. If the board has a Status field, move the
card to Done. This repo is tracked on the [PlugPress HQ](https://github.com/orgs/plugpressco/projects/3)
org board (plugpressco, project #3).

---

## Issue Hygiene

- **One issue = one PR = one branch.** If you discover unrelated work mid-task,
  open a new issue for it (`gh issue create`) and link it — do not scope-creep
  the current PR.
- Post a short progress comment on the issue when a task spans multiple
  sessions: what's done, what's left, branch name.
- If the issue turns out to be wrong (not reproducible, already fixed, bad
  premise), say so and ask before closing.

---

## WordPress Plugin Specifics

Any PR that changes user-facing behaviour must also update, in the same PR:

- `readme.txt` — `== Changelog ==` entry under the new version
- **Do not bump the plugin header `Version:` or the version constant on your own.**
  Version bumps need my explicit OK, every time. If a PR needs one, write the
  changelog entry against the intended version, say so in the PR body, and ask.
  Unreleased plugins stay at `1.0.0`.
- `Stable tag` only when we're actually releasing (ask me)
- `Tested up to:` if I've verified against a newer WP

Coding standards for this repo:

- **WordPress Coding Standards (WPCS)** for PHP — *not* the ET/Divi `et-phpcs`
  ruleset, which is only for Divi/Elegant Themes products
- No `composer lint` script in this repo — if you touch PHP, at minimum keep the
  style consistent with the surrounding file
- All output escaped (`esc_html`, `esc_attr`, `wp_kses_post`), all input
  sanitized, nonces + capability checks on every write path
- Prefix every global function, class, hook, option, and transient
- Never break backward compat on public hooks/filters without flagging it in the
  PR body under a `## Breaking` heading

---

## Hard Stops

Stop and ask me before:

- Force-pushing anything (`--force`, `--force-with-lease`)
- Rewriting history on a branch that already has a PR
- Pushing directly to `main`
- Deleting branches you didn't create
- Committing anything that looks like a credential, API key, or license key
- Merging a PR that touches the hard-stop surfaces listed in Merge policy A

---

## Final Message Format

End every task with:

```
Branch:  feat/142-instant-indexing (pushed)
PR:      https://github.com/plugpressco/mailyard/pull/57
CI:      green
Issue:   #142 — will auto-close on merge
Status:  merged / awaiting your review / blocked on X
```

If any line above would say "not pushed" or "no PR", go back and finish it.
