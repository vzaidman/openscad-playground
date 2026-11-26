# Commit and pull request workflow

- Prefix fork-only commit subjects with `[NO-PR]`. This includes local ignore rules and changes to this file. Keep these commits out of upstream pull requests.
- Prefix all other commit subjects with `[PR-WIP]` for future upstream pull requests.
- Prefer amending the commit that owns a change, including follow-up fixes and review feedback. For an older commit, use a fixup and autosquash. Create a separate commit when the change stands on its own.
- Keep all fork edits to `AGENTS.md` in one `[NO-PR]` commit. When syncing the fork, rebase onto the latest `upstream/main`, with `[PR-WIP]` commits first and `[NO-PR]` commits at the tip. Use an explicit `--force-with-lease` when pushing rewritten branches.
- Commit every requested project change to the fork’s `main` and push it to `origin` once verified. This includes code, documentation, and workflow rules.
- Treat the entire fork as public, including `[NO-PR]` commits. Keep code, identifiers, examples, tests, filenames, branch names, commit messages, and PRs general-purpose. Keep private CAD files, dimensions, presets, and descriptions of the user’s work outside tracked files. Before pushing, inspect all outgoing commits and their diffs for private details.
- When a requested change fixes a problem that also affects upstream users, propose an upstream pull request to the user.
- When the user asks to review a change on the fork first, pin a review base branch in the fork to the chosen upstream `main` commit. Cherry-pick just the proposed commits onto a feature branch from that base. Open a draft PR between those two branches in the fork and send the user the link.
- When the user asks to upstream a change, open a draft PR against `openscad/openscad-playground:main` with just the requested commits. If the user reviewed a version on the fork, use the exact commit they approved. Cherry-pick any missing changes onto the fork’s `main`, push, and send the user the upstream draft PR link.
