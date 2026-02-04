import { describe, it, expect, vi, beforeEach } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { getConfig, saveConfig, addRepo, removeRepo, toggleFavorite } from './config'
import { RepoConfig } from '@/types/config'

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn()
  }
}))

// Mock path module
vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/'))
  }
}))

const mockFs = vi.mocked(fs)

describe('config', () => {
  const mockConfigPath = '/app/data/repos-tracked.json'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfig', () => {
    it('should read and parse config file', async () => {
      const mockConfig = {
        version: 1,
        paths: { bareRoot: '~/Source/git-root', worktreeRoot: '~/Source' },
        repos: []
      }

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig))

      const config = await getConfig()

      expect(config).toEqual(mockConfig)
      expect(mockFs.readFile).toHaveBeenCalledWith(mockConfigPath, 'utf-8')
    })

    it('should return default config when file does not exist', async () => {
      const error = new Error('File not found') as any
      error.code = 'ENOENT'
      mockFs.readFile.mockRejectedValue(error)

      const config = await getConfig()

      expect(config.version).toBe(1)
      expect(config.paths.bareRoot).toBe('~/Source/git-root')
      expect(config.repos).toEqual([])
      expect(mockFs.writeFile).toHaveBeenCalled()
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

      expect(mockFs.writeFile).toHaveBeenCalledWith(
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

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockFs.writeFile.mockResolvedValue()

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

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockFs.writeFile.mockResolvedValue()

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

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockFs.writeFile.mockResolvedValue()

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

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingConfig))
      mockFs.writeFile.mockResolvedValue()

      const config = await toggleFavorite('test/repo')

      expect(config.repos[0].favorite).toBe(true)
    })
  })
})
