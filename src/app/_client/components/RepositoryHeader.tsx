import React from 'react'
import { RepositoryFilterButton } from './RepositoryFilterButton'
import { Button } from './ui/Button'
import clsx from 'clsx'

interface RepositoryHeaderProps {
  repositoryName: string
  itemCount?: number
  showFilterButton?: boolean
  isFilterActive?: boolean
  onToggleFilter?: (repoName: string) => void
  onClearFilter?: () => void
  actionButton?: {
    label: string
    onClick: () => void
    icon?: React.ReactNode
    variant?: 'primary' | 'secondary' | 'ghost'
  }
}

export function RepositoryHeader({
  repositoryName,
  itemCount,
  showFilterButton = false,
  isFilterActive = false,
  onToggleFilter,
  onClearFilter,
  actionButton
}: RepositoryHeaderProps) {
  return (
    <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {showFilterButton && onToggleFilter && (
          <RepositoryFilterButton
            repositoryName={repositoryName}
            isActive={isFilterActive}
            onToggleFilter={(repoName) => {
              if (isFilterActive) {
                onClearFilter?.()
              } else {
                onToggleFilter(repoName)
              }
            }}
          />
        )}
        <h3 className="font-medium text-sm text-muted-foreground">
          {repositoryName}
          {itemCount !== undefined && (
            <span className="ml-1">
              ({itemCount})
            </span>
          )}
        </h3>
      </div>
      
      {actionButton && (
        <Button
          variant={actionButton.variant || 'primary'}
          size="sm"
          onClick={actionButton.onClick}
        >
          {actionButton.icon}
          {actionButton.label}
        </Button>
      )}
    </div>
  )
}
