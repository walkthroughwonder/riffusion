# ARIA Knowledge — install + smoke test

Testing the **ARIA Knowledge** Claude Code plugin
([Product Hunt launch](https://www.producthunt.com/products/aria-knowledge?launch=aria-knowledge),
[github.com/mikeprasad/aria-knowledge](https://github.com/mikeprasad/aria-knowledge)).

This file is the only artifact committed to this branch; the plugin itself is
installed outside the riffusion repo, at the user level.

## What ARIA Knowledge is

A Claude Code plugin that:

- Adds slash commands for capturing, indexing, and recalling knowledge across
  sessions (markdown-based, Obsidian-compatible).
- Registers `SessionStart`, `PreToolUse`, `PostToolUse`, `PreCompact`,
  `PostCompact`, and `TaskCreated` hooks that nudge Claude to follow a
  decision-framework ("Rule 22") and surface relevant saved knowledge.

## Install steps actually run

```bash
# 1. Clone upstream
mkdir -p ~/src
git clone https://github.com/mikeprasad/aria-knowledge.git ~/src/aria-knowledge
# Pinned commit: a2e9c16c36ce42d5d9a0cf7b9c420bd1c78d4f38

# 2. Install the plugin globally
mkdir -p ~/.claude/plugins
cp -r ~/src/aria-knowledge/plugin ~/.claude/plugins/aria-knowledge
```

Install scope: **global** (`~/.claude/plugins/aria-knowledge/`) — available to
every Claude Code project, not just riffusion.

## What landed on disk

```
~/.claude/plugins/aria-knowledge/
├── .claude-plugin/plugin.json      # manifest (version 2.8.4)
├── bin/                            # 9 hook scripts (session-start-check.sh, pre/post-edit-check.sh, pre/post-compact-check.sh, pre-explore-codemap-check.sh, task-context-check.sh, digest-transcript.sh, config.sh)
├── skills/                         # 15 slash-command skills
│   ├── ask/
│   ├── audit-config/
│   ├── audit-knowledge/
│   ├── backlog/
│   ├── clip/
│   ├── codemap/
│   ├── context/
│   ├── extract/
│   ├── help/
│   ├── index/
│   ├── intake/
│   ├── rules/
│   ├── setup/
│   ├── stats/
│   └── wrapup/
└── template/                       # scaffolding copied into the vault by /setup
    ├── LOCAL.md, OVERVIEW.md, README.md
    └── approaches/ archive/ decisions/ guides/ intake/ logs/ projects/ references/ rules/
```

Manifest declares these hooks:

| Event        | Matcher       | Script                              |
|--------------|---------------|-------------------------------------|
| SessionStart | —             | `session-start-check.sh`            |
| PreToolUse   | `Edit\|Write` | `pre-edit-check.sh`                 |
| PreToolUse   | `Glob\|Grep`  | `pre-explore-codemap-check.sh`      |
| PostToolUse  | `Edit\|Write` | `post-edit-check.sh`                |
| PreCompact   | —             | `pre-compact-check.sh`              |
| PostCompact  | —             | `post-compact-check.sh`             |
| TaskCreated  | —             | `task-context-check.sh`             |

`plugin.json` note worth flagging: *"All skills except `/setup` require
`~/.claude/aria-knowledge.local.md` to exist. If missing when any skill is
invoked, stop and tell the user to run `/setup`."*

## Smoke test — executed manually

Plugin slash commands and hooks only register at Claude Code startup, so the
current session couldn't invoke `/setup`, `/extract`, or `/audit-knowledge`
via slash commands. Instead, each skill's `SKILL.md` was replayed by hand.
Results below.

### /setup (manual replay of `skills/setup/SKILL.md`)

- Fresh mode (no prior config).
- Created `~/aria-knowledge-vault/` and copied every directory and file from
  `~/.claude/plugins/aria-knowledge/template/` into it: `OVERVIEW.md`,
  `README.md`, `LOCAL.md`, and `intake/`, `logs/`, `rules/`, `approaches/`,
  `decisions/`, `guides/`, `references/`, `archive/`, `projects/` trees with
  their seed files (`*-backlog.md`, `working-rules.md`,
  `change-decision-framework.md`, `knowledge-audit-log.md`, etc.).
- `explanatory-output-style` plugin not installed → `explanatory_plugin: false`.
- All cadences and advanced settings kept at defaults.
- Wrote `~/.claude/aria-knowledge.local.md` in the exact format mandated by
  the SKILL.md ("values unquoted, empty values `key:` with nothing after,
  no blank lines in frontmatter, etc.").
- Round-trip verified by sourcing the plugin's own parser
  (`bin/config.sh`) in a subshell — every key parsed back to the intended
  value, `KT_CONFIGURED=true`, no `KT_CONFIG_ERROR`.

### /extract (manual replay of `skills/extract/SKILL.md`)

Scanned this conversation for uncaptured knowledge and appended to the four
intake backlogs:

| Backlog | Entries appended |
|---|---|
| `intake/insights-backlog.md`   | 1 (Claude Code plugin anatomy + hook timing) |
| `intake/decisions-backlog.md`  | 2 (install scope, vault location) |
| `intake/extraction-backlog.md` | 4 (2 feedback, 1 project context, 1 reference) |
| `intake/ideas-backlog.md`      | 2 (README install-path clarity, /doctor dry-run mode) |

Each followed the SKILL.md-specified entry format (`### YYYY-MM-DD — [project]
— [context]` headers, typed sub-fields).

### /audit-knowledge (manual replay of `skills/audit-knowledge/SKILL.md`)

Invoked as user-requested ("do what you think is best"), so ran the full
audit. Auditor curated conservatively — kept only items with cross-session
reuse value, cleared one-off config and ephemeral context.

Promotions to the vault:

| Target file | Source |
|---|---|
| `approaches/claude-code-plugin-anatomy.md` | Insights backlog (1 entry) |
| `guides/workflow-preferences.md`           | Extraction backlog (2 feedback entries) |
| `references/aria-knowledge.md`             | Extraction backlog (1 reference entry) |

Clearings:
- Both decisions (install scope, vault location) — one-off config, not ADR-worthy.
- Project-context extraction entry — ephemeral to this test.

Ideas: both deferred (legitimate upstream UX observations but no active
tracker to route them to yet — the user may file them against
`github.com/mikeprasad/aria-knowledge/issues` later).

Logged as a structured "Last Audit" entry in
`~/aria-knowledge-vault/logs/knowledge-audit-log.md`.

### Verification that the simulation matches real hook behavior

Sourcing `~/.claude/plugins/aria-knowledge/bin/config.sh` returned:

```
CONFIGURED=true
KF=/root/aria-knowledge-vault
KN_CADENCE=3  CFG_CADENCE=14  EXPL=false  AUTO_CAP=true
PROJ_ENABLED=false
```

That's what the SessionStart / PreToolUse hooks will see when the next fresh
Claude Code session starts. No `KT_CONFIG_ERROR`.

### What is still unverified

The bash hook scripts themselves (`session-start-check.sh`,
`pre-edit-check.sh`, `pre-explore-codemap-check.sh`, etc.) have not been
executed end-to-end with real Claude Code tool-use payloads — they only run
once the plugin is picked up at session start. The next time a Claude Code
session launches with this config, we'll know whether the session-start
banner fires, whether the Rule-22 enforcement nudge appears on Edit/Write,
and whether `/extract` / `/audit-knowledge` as real slash commands feel any
different from the manual replay.

## Uninstall

```bash
rm -rf ~/.claude/plugins/aria-knowledge
rm -f  ~/.claude/aria-knowledge.local.md
rm -rf ~/aria-knowledge-vault   # only if you want to discard captured knowledge
rm -rf ~/src/aria-knowledge     # the clone
```

## Status

- [x] Upstream cloned (`a2e9c16`)
- [x] Plugin copied into `~/.claude/plugins/aria-knowledge/`
- [x] Manifest / hooks / skills inventoried
- [x] `/setup` replayed manually from `SKILL.md` — config written + round-trip verified
- [x] `/extract` replayed — 9 entries appended to 4 intake backlogs
- [x] `/audit-knowledge` replayed — 3 knowledge files promoted, 3 entries cleared, 2 ideas deferred, audit logged
- [ ] Hooks observed firing in a live session *(requires a fresh Claude Code session to verify SessionStart / PreToolUse behavior)*
