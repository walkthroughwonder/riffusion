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

## What **I** could not verify from inside this session

Plugin slash commands and hooks only register at Claude Code startup, so the
current session cannot invoke `/setup`, `/extract`, etc. The rest of the smoke
test has to be run from a fresh session.

## Smoke-test procedure — run in a new Claude Code session

1. **Start a fresh Claude Code session** (so `SessionStart` fires and the new
   plugin is discovered). Watch for the ARIA session-start banner.
2. Type `/` and confirm these commands appear:
   `/ask`, `/audit-config`, `/audit-knowledge`, `/backlog`, `/clip`, `/codemap`,
   `/context`, `/extract`, `/help`, `/index`, `/intake`, `/rules`, `/setup`,
   `/stats`, `/wrapup`.
3. Run **`/setup`** — when it asks for a knowledge folder, answer
   `~/aria-knowledge-vault` (per the agreed plan, the vault lives **outside**
   the riffusion repo). Expected result: `~/.claude/aria-knowledge.local.md`
   is created, and `~/aria-knowledge-vault/` is populated with the `template/`
   scaffolding (`OVERVIEW.md`, `approaches/`, `decisions/`, `rules/`, etc.).
4. Do some real work, then run **`/extract`**. Expected result: new markdown
   file(s) appear under the staging/intake area of the vault.
5. Run **`/audit-knowledge`** to promote or reject the staged items; promoted
   entries should move into the indexed sections.
6. Optional: try `/codemap`, `/context`, `/stats`, `/rules` for extra coverage.

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
- [ ] `/setup` run in a fresh session *(pending — requires session restart)*
- [ ] `/extract` + `/audit-knowledge` smoke test *(pending — requires `/setup` first)*
