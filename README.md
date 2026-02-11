# Git Workbench

<div align="center">

**A powerful web-based Git repository management interface for developers**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

</div>

Git Workbench is a modern web application that streamlines Git repository management with an intuitive interface for worktree operations, GitHub integration, and repository organization. Perfect for developers managing multiple repositories and branches.

---

## ✨ Key Features

### 🗂️ **Repository Management**
- **Centralized Repository Tracking**: Track all your Git repositories in one place with a clean JSON configuration
- **Smart Discovery**: Automatically discovers repositories in your configured directories
- **Repository Creation**: Create new repositories with cute auto-generated names (e.g., "happy-purple-dragon")
- **Clone & Track**: Clone repositories from GitHub and automatically add them to your tracked list
- **Publish Repositories**: Easily publish local repositories to GitHub

### 🌳 **Advanced Worktree Management**
- **Create Worktrees**: Generate worktrees from any branch or commit with custom names
- **Branch-Based Creation**: Create worktrees directly from existing branches
- **Smart Branch Detection**: Automatically identifies associated branches for each worktree
- **Safe Deletion**: Remove worktrees with confirmation and safety checks
- **Real-time Status**: See clean, dirty, or conflicted states at a glance

### 🔗 **Deep GitHub Integration**
- **Pull Request Tracking**: View PRs across all repositories with status indicators
- **Branch-to-PR Mapping**: Automatically link worktrees to their corresponding pull requests
- **GitHub Authentication**: Secure integration using GitHub CLI (`gh`)
- **Repository Search**: Search and discover GitHub repositories
- **PR Navigation**: Jump directly to worktrees for specific PRs

### ⭐ **Favorites & Organization**
- **Favorites System**: Mark frequently used repositories as favorites for quick access
- **Smart Filtering**: Filter worktrees, branches, and PRs by repository
- **Search Functionality**: Quick search across repositories and worktrees
- **Tabbed Interface**: Organized views for repositories, favorites, worktrees, branches, and PRs

### 🛠️ **Editor Integration**
- **Multi-Editor Support**: Works with VS Code, Windsurf, Cursor, and custom editors
- **Configurable Schemes**: Support for custom URL schemes and commands
- **One-Click Opening**: Open worktrees directly in your preferred editor
- **Icon Customization**: Choose appropriate icons for different editors

### 📊 **Real-Time Information**
- **Git Status Display**: See staged, modified, and untracked files instantly
- **Branch Information**: Track current branch and available branches
- **Repository Health**: Monitor repository status and synchronization
- **Live Updates**: Real-time refreshes using SWR for optimal performance

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Next.js 14** with App Router for modern React development
- **TypeScript** for type safety and better developer experience
- **Tailwind CSS** with custom design system for beautiful UI
- **Lucide React** for consistent and modern icons
- **SWR** for efficient data fetching and caching

### Backend & API
- **Next.js API Routes** for RESTful endpoints
- **Git Operations** using native Git commands
- **GitHub CLI Integration** for GitHub API access
- **JSON Configuration** for simple and portable setup

### Testing & Quality
- **Vitest** with React Testing Library for comprehensive testing
- **ESLint** for code quality and consistency
- **TypeScript** for static type checking
- **Docker** for containerized deployment

### Deployment
- **Docker Compose** for easy setup and deployment
- **Alpine Linux** for lightweight and secure containers
- **Volume Mounting** for persistent data and configuration
- **Environment Configuration** for flexible deployment

## 🚀 Quick Start

### 🐳 Using Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/v2nic/git-workbench.git
   cd git-workbench
   ```

2. **Configure your paths**:
   Edit `docker-compose.yml` to mount your source directories:
   ```yaml
   volumes:
     - /path/to/your/source:/home/node/Source
     - /path/to/your/git-root:/home/node/Source/git-root
   ```

3. **Start the application**:
   ```bash
   docker compose up -d
   ```

4. **Open your browser** and navigate to `http://localhost:2624`

### 💻 Local Development

1. **Prerequisites**:
   - Node.js 18+ 
   - Git
   - GitHub CLI (`gh`) for GitHub integration

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to `http://localhost:2624`

---

## ⚙️ Configuration

The application uses a JSON configuration file to track repositories and settings. The configuration is stored at `/app/data/repos-tracked.json` inside the container (or in your local `data/` directory during development).

### 📝 Basic Configuration Structure

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

### 🛠️ Editor Configuration

Configure your preferred editor for opening worktrees:

#### VS Code (Default)
```json
{
  "editor": {
    "name": "VS Code",
    "scheme": "vscode",
    "icon": "Code"
  }
}
```

#### Windsurf
```json
{
  "editor": {
    "name": "Windsurf", 
    "scheme": "windsurf",
    "icon": "FolderOpen"
  }
}
```

#### Cursor
```json
{
  "editor": {
    "name": "Cursor",
    "scheme": "cursor", 
    "icon": "Cpu"
  }
}
```

#### Custom Command
```json
{
  "editor": {
    "name": "Custom Editor",
    "openCommand": "my-editor://open/{path}"
  }
}
```

**Available Editor Options**:
- `name`: Display name for UI elements
- `scheme`: URL scheme (e.g., `vscode`, `windsurf`, `cursor`)
- `icon`: Lucide icon name (`Code`, `Folder`, `FolderOpen`, `Cpu`, `Terminal`, `FileText`, `Edit3`, `PenTool`)
- `openCommand`: Custom command template with `{path}` placeholder

---

## 🔌 API Reference

### Configuration Management
- `GET /api/config` - Retrieve current configuration
- `PATCH /api/config` - Update configuration settings
- `POST /api/config/favorite` - Toggle repository favorite status

### Repository Operations
- `GET /api/repos` - List all repositories (tracked + discovered)
- `POST /api/repos/create` - Create new repository
- `POST /api/repos/clone` - Clone repository from URL
- `POST /api/repos/track` - Add repository to tracking
- `POST /api/repos/publish` - Publish local repository to GitHub
- `DELETE /api/repos/delete` - Delete repository

### Worktree Management
- `GET /api/worktrees` - List all worktrees with status
- `POST /api/worktrees/create` - Create new worktree
- `POST /api/worktrees/create-from-branch` - Create worktree from existing branch
- `POST /api/worktrees/create-from-main` - Create worktree from main branch
- `DELETE /api/worktrees/delete` - Delete worktree

### Branch Operations
- `GET /api/branches` - List all branches across repositories
- `DELETE /api/branches/delete` - Delete branch

### GitHub Integration
- `GET /api/github/auth/status` - Check GitHub authentication status
- `GET /api/github/search-repos` - Search GitHub repositories
- `GET /api/github/pr` - Get pull requests for repository/branch
- `GET /api/pull-requests` - List all pull requests
- `GET /api/pull-requests/stream` - Stream pull request updates

### System
- `GET /api/health` - Health check endpoint
- `GET /api/user` - Get current user information

---

## 🛠️ Development

### 📜 Available Scripts

```bash
# Development
npm run dev              # Start development server on port 2624
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking

# Testing
npm test                 # Run all tests
npm run test:ui          # Run tests with UI
npm test -- --watch      # Run tests in watch mode
npm test -- --coverage   # Run tests with coverage
```

### 🧪 Testing

The project includes comprehensive tests using **Vitest** and **React Testing Library**:

```bash
# Run all tests
npm test

# Run tests in watch mode for development
npm test -- --watch

# Generate coverage report
npm test -- --coverage

# Run tests with visual UI
npm run test:ui
```

### 🐳 Docker Development

```bash
# Build the Docker image
docker compose build

# View application logs
docker compose logs -f

# Execute commands in the running container
docker compose exec git-workbench npm run lint

# Stop and remove containers
docker compose down

# Rebuild and start fresh
docker compose up --build
```

---

## 🔧 Advanced Configuration

### 🌍 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SOURCE_BASE_PATH` | `/home/node/Source` | Base path for source repositories |
| `NODE_ENV` | `production` | Node environment |
| `APP_DATA_PATH` | `/app/data` | Path for application data |

### 🔐 GitHub Authentication

For full GitHub integration, authenticate with GitHub CLI:

1. **Ensure Docker is running** and the container is started
2. **Execute into the container**:
   ```bash
   docker compose exec git-workbench gh auth login
   ```
3. **Follow the authentication flow** in your browser
4. **Verify authentication**:
   ```bash
   docker compose exec git-workbench gh auth status
   ```

### 📁 Port Information

The application uses port **2624**, chosen using the telephone keypad standard for "BNCH" (Bench):
- **B** = 2
- **N** = 6  
- **C** = 2
- **H** = 4

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### 🎯 Development Workflow

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/yourusername/git-workbench.git
   cd git-workbench
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Make your changes** and add tests for new functionality
6. **Ensure all tests pass**:
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```
7. **Build the application** to verify it works:
   ```bash
   npm run build
   ```
8. **Commit your changes** with descriptive messages
9. **Push to your fork** and create a Pull Request

### 📋 Code Style Guidelines

- Follow the existing TypeScript and React patterns
- Use descriptive variable and function names
- Add tests for new features and bug fixes
- Keep components small and focused
- Use Tailwind CSS for styling
- Follow ESLint configuration rules

### 🐛 Bug Reports

When reporting bugs, please include:
- **Environment details** (OS, Node.js version, Docker version)
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Screenshots** if applicable
- **Relevant logs** or error messages

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Next.js Team** - For the excellent React framework
- **Tailwind CSS** - For the utility-first CSS framework
- **GitHub CLI** - For seamless GitHub integration  
- **Vercel** - For hosting and deployment inspiration
- **Open Source Community** - For the amazing tools and libraries

---

## 📞 Support & Community

- 🐛 **Bug Reports**: [Create an Issue](https://github.com/yourusername/git-workbench/issues)
- 💡 **Feature Requests**: [Create an Issue](https://github.com/yourusername/git-workbench/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/git-workbench/discussions)
- 📧 **Email**: your-email@example.com

---

<div align="center">

**⭐ Star this repository if it helped you!**

Made with ❤️ by developers, for developers

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/git-workbench&type=Date)](https://star-history.com/#yourusername/git-workbench&Date)

</div>
