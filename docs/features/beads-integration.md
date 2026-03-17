# Beads Integration

## Overview

Beads (https://github.com/steveyegge/beads) is a lightweight issue tracker with first-class dependency support. Git Workbench integrates with Beads to automatically manage issue tracking in Git repositories and worktrees.

## Problem

Beads ties its database to the main Git repository directory. Running `bd init` from within a worktree fails with:

```
Error: cannot run 'bd init' from within a git worktree

Git worktrees share the .beads database from the main repository.
```

This makes it cumbersome to manage Beads across many repositories and worktrees.

## Solution

Git Workbench automates Beads lifecycle management so developers never have to think about it:

- **Base initialization**: When a new repository is created or cloned, Beads is initialized in the bare repository directory (`$git-root/repo-name.git/.beads`).
- **Worktree awareness**: When a new worktree is created, Git Workbench ensures Beads is already initialized in the parent bare repository (since worktrees share the `.beads` directory).
- **Startup guard**: If Beads is enabled in configuration but `bd` is not installed, Git Workbench refuses to start and logs an error explaining how to install Beads.
- **Shared database by default**: All worktrees for a repository share a single Beads database (the one in the bare repository). This is the Beads-recommended behavior. Sharing can be disabled per-repository or globally.
- **Worktree creation toggle**: The Create Worktree dialog includes a "Share beads with main repo" toggle, defaulting to the resolved config value for that repository.

## Configuration

Beads support is **disabled by default**.

### Global enablement

Add to `data/repos-tracked.json`:

```json
{
  "beads": {
    "enabled": true
  }
}
```

When enabled globally, every repository gets Beads base initialization automatically.

### Shared database between worktrees

By default, all worktrees share the Beads database from the main bare repository. This is the recommended Beads behavior — `bd init` cannot run inside a worktree, and worktrees are expected to share the parent repo's `.beads` directory.

To disable sharing (each worktree gets its own independent `.beads` database):

```json
{
  "beads": {
    "enabled": true,
    "shareBetweenWorktrees": false
  }
}
```

The `shareBetweenWorktrees` option is **`true` by default** and can be set at both the global level and per-repository level. Per-repository overrides take precedence over the global setting.

### Per-repository enablement

Add the `beads` field to a repo entry:

```json
{
  "repos": [
    {
      "repoName": "my-repo",
      "defaultBranch": "main",
      "favorite": false,
      "beads": {
        "enabled": true
      }
    }
  ]
}
```

Only repositories with `beads.enabled: true` (or when global is enabled) get automatic Beads initialization.

### Per-repository sharing override

Override the global `shareBetweenWorktrees` for a specific repository:

```json
{
  "beads": {
    "enabled": true,
    "shareBetweenWorktrees": true
  },
  "repos": [
    {
      "repoName": "standalone-project",
      "defaultBranch": "main",
      "favorite": false,
      "beads": {
        "enabled": true,
        "shareBetweenWorktrees": false
      }
    }
  ]
}
```

In this example, global sharing is enabled, but `standalone-project` opts out — each of its worktrees gets its own Beads database.

### Full example

```json
{
  "version": 1,
  "paths": {
    "bareRoot": "~/Source/git-root",
    "worktreeRoot": "~/Source"
  },
  "editor": {
    "name": "Windsurf",
    "scheme": "windsurf",
    "icon": "FolderOpen"
  },
  "beads": {
    "enabled": false,
    "shareBetweenWorktrees": true
  },
  "repos": [
    {
      "fullName": "org/project-a",
      "repoName": "project-a",
      "sshUrl": "git@github.com:org/project-a.git",
      "defaultBranch": "main",
      "favorite": false,
      "beads": {
        "enabled": true
      }
    },
    {
      "fullName": "org/project-b",
      "repoName": "project-b",
      "sshUrl": "git@github.com:org/project-b.git",
      "defaultBranch": "main",
      "favorite": false
    },
    {
      "fullName": "org/project-c",
      "repoName": "project-c",
      "sshUrl": "git@github.com:org/project-c.git",
      "defaultBranch": "main",
      "favorite": false,
      "beads": {
        "enabled": true,
        "shareBetweenWorktrees": false
      }
    }
  ]
}
```

In this example:

- `project-a` — Beads enabled, inherits global `shareBetweenWorktrees: true` (shared database)
- `project-b` — No `beads` field, global `beads.enabled` is `false`, so Beads is skipped entirely
- `project-c` — Beads enabled, per-repo override sets `shareBetweenWorktrees: false` (independent databases per worktree)

## Behavior

### When Beads is enabled

| Action | Behavior |
|---|---|
| New repository created via UI | Runs `bd init --prefix <repo-name> -q` in the bare repository directory |
| Repository cloned from GitHub | Runs `bd init` after clone completes |
| New worktree created (shared) | Checks if bare repository has `.beads` directory; if not, runs `bd init` there first. Worktree uses the shared database from the bare repo (no per-worktree init) |
| New worktree created (not shared) | Runs `bd init --prefix <repo-name>-<branch-name> -q` in the worktree directory, creating an independent Beads database |
| Create Worktree dialog opened | "Share beads with main repo" toggle defaults to the resolved value for the repository (repo override → global → `true`) |
| App startup / config load | Validates that `bd` is installed; throws error with install instructions if missing |

### When Beads is disabled (default)

No Beads commands are executed. The application behaves exactly as before this feature was added.

### Shared vs independent databases

**Shared (default, `shareBetweenWorktrees: true`)**

All worktrees for a repository share a single `.beads` database located in the bare repository (`$git-root/repo-name.git/.beads`). This is the Beads-recommended behavior. Worktrees do not get their own `.beads` directory — they operate on the shared database.

**Independent (`shareBetweenWorktrees: false`)**

Each worktree gets its own `.beads` database in its working directory. `bd init` runs per worktree with a unique prefix (`<repo-name>-<worktree-name>`). Use this when worktrees should track completely independent issue sets.

### Init failure behavior

If `bd init` fails during repository or worktree creation, the creation itself does **not** fail. Beads initialization errors are logged as warnings. This ensures that Beads issues never block core Git Workbench functionality.

## Worktree Creation Toggle

The Create Worktree dialog (`CreateWorktreeModal`) includes a boolean toggle:

**Label**: "Share beads with main repo"

### Default value resolution

When the dialog opens, the toggle defaults to the resolved value for the target repository:

1. **Per-repo override**: If `repo.beads.shareBetweenWorktrees` is explicitly set, use that value.
2. **Global config**: If `config.beads.shareBetweenWorktrees` is explicitly set, use that value.
3. **System default**: `true` (share beads database).

### User override

The user can flip the toggle before submitting. The chosen value is sent to the API alongside the worktree creation request. If Beads is not enabled for the repository, the toggle is hidden.

### API contract

All worktree creation endpoints accept an optional `shareBeads` boolean:

```json
{
  "repo": "org/project-a",
  "newBranchName": "feature-x",
  "worktreeName": "feature-x",
  "shareBeads": true
}
```

When `shareBeads` is `true` (or omitted and sharing is the resolved default):

- Ensure bare repo has `.beads` initialized.
- Worktree does not get its own `.beads` directory.

When `shareBeads` is `false`:

- Initialize `.beads` in the worktree directory with a unique prefix.

## Implementation

### Files changed

- `src/types/config.ts` — Added `BeadsConfig` interface (with `enabled` and `shareBetweenWorktrees`), optional `beads` fields on `Config` and `RepoConfig`
- `src/lib/config.ts` — Added default `beads.enabled: false` and `beads.shareBetweenWorktrees: true`, startup validation
- `src/lib/beads.ts` — Core Beads helper module (new file), including `resolveShareBeads` resolution logic
- `src/app/api/repos/create/route.ts` — Calls `ensureBeadsInitializedForRepo` after bare repo creation
- `src/app/api/clone/route.ts` — Calls `ensureBeadsInitializedForRepo` after clone
- `src/app/api/worktrees/create/route.ts` — Accepts `shareBeads` param, calls `ensureBeadsInitializedForRepo` or `ensureBeadsInitializedForWorktree` based on sharing
- `src/app/api/worktrees/route.ts` (POST) — Accepts `shareBeads` param, same sharing logic
- `src/app/api/worktrees/create-from-branch/route.ts` — Accepts `shareBeads` param, same sharing logic
- `src/app/api/worktrees/create-from-main/route.ts` — Accepts `shareBeads` param, same sharing logic
- `src/app/_client/components/CreateWorktreeModal.tsx` — Added "Share beads with main repo" toggle, defaulting from resolved config
- `README.md` — Documented Beads configuration and behavior

### Key module: `src/lib/beads.ts`

```typescript
// Check if a specific repo has beads enabled
isRepoBeadsEnabled(config, repoConfig)

// Check if any beads config exists (global or any repo)
isAnyBeadsEnabled(config)

// Resolve shareBetweenWorktrees for a repo:
//   repo.beads.shareBetweenWorktrees →
//   config.beads.shareBetweenWorktrees →
//   true (default)
resolveShareBeads(config, repoConfig)

// Check if `bd` CLI is installed
isBdInstalled()

// Throw if beads enabled but `bd` missing
ensureBdInstalledIfEnabled(config)

// Check if .beads directory exists in git dir
isBeadsInitialized(gitDir)

// Run bd init in the bare repo if enabled and not already initialized
// Used when sharing is on — worktrees don't get their own .beads
ensureBeadsInitializedForRepo({ config, repoConfig, repoName, gitDir })

// Run bd init in the worktree directory with a unique prefix
// Used when sharing is off — each worktree gets its own .beads
ensureBeadsInitializedForWorktree({ config, repoConfig, repoName, worktreeName, worktreePath })
```

### Prefix handling

Beads uses a prefix for issue IDs. The prefix defaults to the sanitized repository name (alphanumeric, hyphens, underscores only). For example, `my-cool-project` stays as-is, while `org/my-project` becomes `org-my-project`.

## Requirements

- [Beads CLI](https://github.com/steveyegge/beads) must be installed (`bd` in PATH)
- Running [Dolt SQL server](https://github.com/dolthub/dolt) for Beads database operations (default: `127.0.0.1:3307`)

## References

- [Beads GitHub](https://github.com/steveyegge/beads)
- [Beads Worktree Docs](https://github.com/steveyegge/beads/blob/main/docs/WORKTREES.md)
