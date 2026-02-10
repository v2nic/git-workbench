import React, { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DropdownMenu({ trigger, children, className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={clsx(
          'absolute right-0 top-full mt-1 w-48 bg-background border rounded-md shadow-lg z-50',
          'py-1',
          className
        )}>
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownMenuItemProps {
  onClick: () => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function DropdownMenuItem({ onClick, children, className, disabled = false }: DropdownMenuItemProps) {
  return (
    <button
      onClick={() => {
        if (!disabled) {
          onClick()
        }
      }}
      disabled={disabled}
      className={clsx(
        'w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}

interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return (
    <div className={clsx('h-px bg-muted my-1', className)} />
  )
}
