import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RepoConfig } from '../types/config'

const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()

// Mock fs module
vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: mockReadFile,
      writeFile: mockWriteFile
    }
  },
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile
  }
}))

// Mock path module
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args: string[]) => args.join('/'))
  },
  join: vi.fn((...args: string[]) => args.join('/'))
}))

let getConfig: typeof import('./config').getConfig
let saveConfig: typeof import('./config').saveConfig
let addRepo: typeof import('./config').addRepo
let removeRepo: typeof import('./config').removeRepo
let toggleFavorite: typeof import('./config').toggleFavorite

describe('config', () => {
  const mockConfigPath = '/app/data/repos-tracked.json'

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env.APP_DATA_PATH = '/app/data'

    const mod = await import('./config')
    getConfig = mod.getConfig
    saveConfig = mod.saveConfig
    addRepo = mod.addRepo
    removeRepo = mod.removeRepo
    toggleFavorite = mod.toggleFavorite
  })

  describe('getConfig', () => {
    it('should read and parse config file', async () => {
      const mockConfig = {
        version: 1,
        paths: { bareRoot: '~/Source/git-root', worktreeRoot: '~/Source' },
        repos: []
      }

      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig))

      const config = await getConfig()

      expect(config).toEqual(mockConfig)
      expect(mockReadFile).toHaveBeenCalledWith(mockConfigPath, 'utf-8')
    })

    it('should return default config when file does not exist', async () => {
      const error = new Error('File not found') as any
      error.code = 'ENOENT'
      mockReadFile.mockRejectedValue(error)

      const config = await getConfig()

      expect(config.version).toBe(1)
      expect(config.paths.bareRoot).toBe('~/Source/git-root')
      expect(config.repos).toEqual([])
      expect(mockWriteFile).toHaveBeenCalled()
    })
  })

  describe('saveConfig', () => {
    it('should write config to file', async () => {
      const mockConfig = {
        version: 1,
        paths: { bareRoot: '~/Source/git-root', worktreeRoot: '~/Source' },
        repos: []
      }

      await saveConfig(mockConfig)

      expect(mockWriteFile).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(mockConfig, null, 2),
        'utf-8'
      )
    })
  })

  describe('addRepo', () => {
    it('should add new repo', async () => {
      const existingConfig = {
        version: 1,
        paths: { bareRoot: '~/Source/git-root', worktreeRoot: '~/Source' },
        repos: []
      }

      const newRepo: RepoConfig = {
        fullName: 'test/repo',
        defaultBranch: 'main',
        favorite: false
      }

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockWriteFile.mockResolvedValue(undefined)

      const config = await addRepo(newRepo)

      expect(config.repos).toHaveLength(1)
      expect(config.repos[0]).toEqual(newRepo)
    })

    it('should update existing repo', async () => {
      const existingRepo: RepoConfig = {
        fullName: 'test/repo',
        defaultBranch: 'main',
        favorite: false
      }

      const existingConfig = {
        version: 1,
        paths: { bareRoot: '~/Source/git-root', worktreeRoot: '~/Source' },
        repos: [existingRepo]
      }

      const updatedRepo: RepoConfig = {
        fullName: 'test/repo',
        defaultBranch: 'main',
        favorite: true
      }

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockWriteFile.mockResolvedValue(undefined)

      const config = await addRepo(updatedRepo)

      expect(config.repos).toHaveLength(1)
      expect(config.repos[0].favorite).toBe(true)
    })
  })

  describe('removeRepo', () => {
    it('should remove repo by fullName', async () => {
      const repo1: RepoConfig = {
        fullName: 'test/repo1',
        defaultBranch: 'main',
        favorite: false
      }

      const repo2: RepoConfig = {
        fullName: 'test/repo2',
        defaultBranch: 'main',
        favorite: false
      }

      const existingConfig = {
        version: 1,
        paths: { bareRoot: '~/Source/git-root', worktreeRoot: '~/Source' },
        repos: [repo1, repo2]
      }

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockWriteFile.mockResolvedValue(undefined)

      const config = await removeRepo('test/repo1')

      expect(config.repos).toHaveLength(1)
      expect(config.repos[0].fullName).toBe('test/repo2')
    })
  })

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      const repo: RepoConfig = {
        fullName: 'test/repo',
        defaultBranch: 'main',
        favorite: false
      }

      const existingConfig = {
        version: 1,
        paths: { bareRoot: '~/Source/git-root', worktreeRoot: '~/Source' },
        repos: [repo]
      }

      mockReadFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockWriteFile.mockResolvedValue(undefined)

      const config = await toggleFavorite('test/repo')

      expect(config.repos[0].favorite).toBe(true)
    })
  })
})
