import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from './route'
import { getConfig, updateConfig } from '@/lib/config'

// Mock the config module
vi.mock('@/lib/config', () => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn()
}))

const mockGetConfig = vi.mocked(getConfig)
const mockUpdateConfig = vi.mocked(updateConfig)

describe('/api/config', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('should return config successfully', async () => {
      const mockConfig = {
        version: 1,
        paths: {
          bareRoot: '~/Source/git-root',
          worktreeRoot: '~/Source'
        },
        repos: []
      }
      
      mockGetConfig.mockResolvedValue(mockConfig)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockConfig)
      expect(mockGetConfig).toHaveBeenCalledTimes(1)
    })

    it('should handle errors', async () => {
      mockGetConfig.mockRejectedValue(new Error('Config not found'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to get configuration' })
    })
  })

  describe('PATCH', () => {
    it('should update config successfully', async () => {
      const mockConfig = {
        version: 1,
        paths: {
          bareRoot: '~/Source/git-root',
          worktreeRoot: '~/Source'
        },
        repos: []
      }

      const updates = {
        paths: {
          bareRoot: '~/New/git-root'
        }
      }

      const updatedConfig = { ...mockConfig, ...updates }
      
      mockUpdateConfig.mockResolvedValue(updatedConfig)

      const mockRequest = {
        json: vi.fn().mockResolvedValue(updates)
      } as any

      const response = await PATCH(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(updatedConfig)
      expect(mockUpdateConfig).toHaveBeenCalledWith(updates)
    })

    it('should handle errors', async () => {
      mockUpdateConfig.mockRejectedValue(new Error('Update failed'))

      const mockRequest = {
        json: vi.fn().mockResolvedValue({})
      } as any

      const response = await PATCH(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Failed to update configuration' })
    })
  })
})
