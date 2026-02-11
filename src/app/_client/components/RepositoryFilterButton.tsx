import React from 'react'
import { Button } from './ui/Button'
import { Filter, FilterX } from 'lucide-react'
import clsx from 'clsx'

interface RepositoryFilterButtonProps {
  repositoryName: string
  isActive: boolean
  onToggleFilter: (repositoryName: string) => void
  className?: string
}

export function RepositoryFilterButton({
  repositoryName,
  isActive,
  onToggleFilter,
  className = ''
}: RepositoryFilterButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onToggleFilter(repositoryName)}
      title={isActive ? `Clear filter for ${repositoryName}` : `Filter by ${repositoryName}`}
      className={clsx(
        'text-muted-foreground hover:text-foreground',
        isActive && '!text-blue-600 dark:!text-blue-400 hover:!text-blue-700 dark:hover:!text-blue-300',
        className
      )}
    >
      {isActive ? (
        <FilterX className="w-4 h-4" />
      ) : (
        <Filter className="w-4 h-4" />
      )}
    </Button>
  )
}
