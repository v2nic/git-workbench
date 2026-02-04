import { promises as fs } from 'fs'
import path from 'path'
import { Config, RepoConfig } from '@/types/config'

const CONFIG_PATH = path.join(process.env.APP_DATA_PATH || path.join(process.cwd(), 'data'), 'repos-tracked.json')

const DEFAULT_CONFIG: Config = {
  version: 1,
  paths: {
    bareRoot: '~/Source/git-root',
    worktreeRoot: '~/Source'
  },
  repos: []
}

export async function getConfig(): Promise<Config> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await saveConfig(DEFAULT_CONFIG)
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
