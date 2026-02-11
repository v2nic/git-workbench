import { promises as fs } from 'fs'
import path from 'path'
import { Config, RepoConfig, EditorConfig } from '@/types/config'
import { expandPath } from '@/lib/git'

const CONFIG_PATH = path.join(process.env.APP_DATA_PATH || path.join(process.cwd(), 'data'), 'repos-tracked.json')

const DEFAULT_CONFIG: Config = {
  version: 1,
  paths: {
    bareRoot: '~/Source/git-root',
    worktreeRoot: '~/Source'
  },
  editor: {
    name: 'VS Code',
    scheme: 'vscode',
    icon: 'Code'
  },
  repos: []
}

export async function getConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    const config = JSON.parse(data)
    const resolvedConfig = await resolveWithDefaults(config)
    await ensureDirectoriesExist(resolvedConfig)
    return resolvedConfig
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await saveConfig(DEFAULT_CONFIG)
      await ensureDirectoriesExist(DEFAULT_CONFIG)
      return DEFAULT_CONFIG
    }
    throw error
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export async function updateConfig(updates: Partial<Config>): Promise<Config> {
  const config = await getConfig()
  const updatedConfig = { ...config, ...updates }
  await saveConfig(updatedConfig)
  return updatedConfig
}

export async function addRepo(repo: RepoConfig): Promise<Config> {
  const config = await getConfig()
  
  const existingIndex = config.repos.findIndex(r => 
    (r.fullName && r.fullName === repo.fullName) || 
    (r.repoName && r.repoName === repo.repoName)
  )
  
  if (existingIndex >= 0) {
    config.repos[existingIndex] = repo
  } else {
    config.repos.push(repo)
  }
  
  await saveConfig(config)
  return config
}

export async function removeRepo(fullNameOrName: string): Promise<Config> {
  const config = await getConfig()
  config.repos = config.repos.filter(r => 
    r.fullName !== fullNameOrName && r.repoName !== fullNameOrName
  )
  await saveConfig(config)
  return config
}

export async function toggleFavorite(fullNameOrName: string): Promise<Config> {
  const config = await getConfig()
  const repo = config.repos.find(r => 
    r.fullName === fullNameOrName || r.repoName === fullNameOrName
  )
  
  if (repo) {
    repo.favorite = !repo.favorite
    await saveConfig(config)
  }
  
  return config
}

export async function resolveWithDefaults(config: Config): Promise<Config> {
  if (!config.editor) {
    config.editor = DEFAULT_CONFIG.editor
  }
  return config
}

async function ensureDirectoriesExist(config: Config): Promise<void> {
  const directories = [
    expandPath(config.paths.bareRoot),
    expandPath(config.paths.worktreeRoot)
  ]
  
  for (const dir of directories) {
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
      console.log(`Created directory: ${dir}`)
    }
  }
}
