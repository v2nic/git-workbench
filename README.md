# Repo Worktree UI

A TypeScript React web application (Next.js) that reads a local JSON config of tracked repositories, lets you favorite repositories, and provides worktree management plus GitHub PR/status info.

## Features

- **Repository Management**: Track and organize your Git repositories
- **Worktree Management**: Create, delete, and manage Git worktrees
- **GitHub Integration**: View pull requests and repository information
- **Favorites System**: Mark frequently used repositories as favorites
- **Real-time Status**: See staged, modified, and untracked files at a glance
- **Windsurf Integration**: Open worktrees directly in Windsurf

## Architecture

- **Frontend**: Next.js 14 with App Router, React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Data Fetching**: SWR for client-side caching and deduplication
- **Testing**: Vitest with React Testing Library
- **Containerization**: Docker with Docker Compose

## Quick Start

### Using Docker Compose (Recommended)

1. Clone the repository and navigate to the project:
   ```bash
   cd repo-worktree-ui
   ```

2. Start the application:
   ```bash
   docker compose up -d
   ```

3. Open your browser and navigate to `http://localhost:4498`

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Configuration

The application uses a JSON configuration file stored at `/app/data/repos-tracked.json` (inside the container) to track repositories and settings.

### Editor Configuration

The application supports any editor through configurable URL schemes. Add an `editor` section to your configuration:

#### Default Configuration (VS Code)
```json
{
  "version": 1,
  "paths": {
    "bareRoot": "~/Source/git-root",
    "worktreeRoot": "~/Source"
  },
  "editor": {
    "name": "VS Code",
    "scheme": "vscode",
    "icon": "Code"
  },
  "repos": [...]
}
```

#### Editor Examples

**Windsurf:**
```json
{
  "editor": {
    "name": "Windsurf", 
    "scheme": "windsurf",
    "icon": "FolderOpen"
  }
}
```

**Cursor:**
```json
{
  "editor": {
    "name": "Cursor",
    "scheme": "cursor", 
    "icon": "Cpu"
  }
}
```

**Custom Command:**
```json
{
  "editor": {
    "name": "Custom Editor",
    "openCommand": "my-editor://open/{path}"
  }
}
```

#### Configuration Options

- `name`: Display name for UI elements
- `scheme`: URL scheme (e.g., `vscode`, `windsurf`, `cursor`)
- `icon`: Lucide icon name for buttons (supported: `Code`, `Folder`, `FolderOpen`, `Cpu`, `Terminal`, `FileText`, `Edit3`, `PenTool`)
- `openCommand`: Custom command template with `{path}` placeholder

The application will automatically use the configured editor and icon when clicking "Open" buttons on worktrees.

### Example Configuration

```json
{
  "version": 1,
  "paths": {
    "bareRoot": "~/Source/git-root",
    "worktreeRoot": "~/Source"
  },
  "editor": {
    "name": "VS Code",
    "scheme": "vscode",
    "icon": "Code"
  },
  "repos": [
    {
      "fullName": "username/repository",
      "sshUrl": "git@github.com:username/repository.git",
      "httpsUrl": "https://github.com/username/repository.git",
      "defaultBranch": "main",
      "favorite": true
    }
  ]
}
```

## API Endpoints

### Configuration
- `GET /api/config` - Get current configuration
- `PATCH /api/config` - Update configuration
- `POST /api/config/favorite` - Toggle repository favorite status

### Repositories
- `GET /api/repos` - List all repositories (tracked + discovered)

### Worktrees
- `GET /api/worktrees` - List all worktrees with status
- `POST /api/worktrees/create` - Create new worktree
- `POST /api/worktrees/create-from-branch` - Create worktree from existing branch
- `POST /api/worktrees/create-from-main` - Create worktree from main branch
- `POST /api/worktrees/delete` - Delete worktree

### GitHub Integration
- `GET /api/github/auth/status` - Check GitHub authentication status
- `GET /api/github/search-repos?q=<query>` - Search GitHub repositories
- `GET /api/github/pr?repo=<repo>&branch=<branch>` - Get pull requests for branch

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI

### Testing

The project includes comprehensive tests using Vitest and React Testing Library:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Docker Development

```bash
# Build the Docker image
docker compose build

# View logs
docker compose logs -f

# Execute commands in container
docker compose exec ghwt npm run lint

# Stop and remove containers
docker compose down
```

## Port Information

The application uses port **4498**, which was chosen using the telephone keypad standard for "GHWT" (Git Worktree):
- G = 4
- H = 4  
- W = 9
- T = 8

## Environment Variables

- `SOURCE_BASE_PATH` - Base path for source repositories (default: `/home/node/Source`)
- `NODE_ENV` - Node environment (default: `production`)
- `APP_DATA_PATH` - Path for application data (default: `/app/data`)

## GitHub Authentication

The application uses the GitHub CLI (`gh`) for GitHub integration. To authenticate:

1. Ensure you have Docker installed and running
2. Execute into the container:
   ```bash
   docker compose exec ghwt gh auth login
   ```
3. Follow the authentication flow

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.
