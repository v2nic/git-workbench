This is a Next.js application that allows users to manage their git worktrees, issues, and pull requests.
The goal is for this to be central to the developer workflow, allowing to work on multiple worktrees simultaneously.
Users can clone a GitHub repository by providing the repository URL.
Git repositories are bare-cloned into a "git-root" directory: `$git-root/repo-name.git`
Git worktrees are created from the bare repositories and checked out into a "source" directory: `$source/repo-name/worktree-name`
Users can open their configured editor from any worktree.
Branch Management: Create, delete, and manage branches across repositories
Users can create a new git repository.
Users can clone an existing GitHub repository.
Users can favorite repositories to quickly access them.
Creating a new worktree can automatically create a new branch.
Users can see the state of their worktrees and branches to determine if they have uncommitted changes or unpushed commits.
The webapp has main views:
- Favorites: List of favorite repositories
- Repositories: List of all repositories
- Worktrees: List of all worktrees
- Branches: List of all branches
- Issues: List of all issues
- Pull Requests: List of all pull requests
When navigating from a repository to the worktrees, branches, issues, or pull requests views, the corresponding view is filtered to show only items for that repository.
Remote Management: Manage multiple git remotes and upstream tracking
