import React from 'react'
import { Button } from './ui/Button'
import { X } from 'lucide-react'

interface FilterBannerProps {
  filterValue?: string
  filterType: 'pull requests' | 'worktrees' | 'branches'
  onClearFilter?: () => void
  className?: string
}

export function FilterBanner({
  filterValue,
  filterType,
  onClearFilter,
  className = ''
}: FilterBannerProps) {
  if (!filterValue) return null

  return (
    <div className={`bg-blue-50 border-b border-blue-200 px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-blue-800">
          Showing {filterType} for: <strong className="text-blue-900">{filterValue}</strong>
        </span>
        {onClearFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilter}
            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100"
          >
            <X className="w-4 h-4 mr-1" />
            Clear Filter
          </Button>
        )}
      </div>
    </div>
  )
}
