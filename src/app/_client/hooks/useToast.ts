import { useState, useCallback } from 'react'
import { ToastType } from '@/app/_client/components/ui/Toast'

interface ToastMessage {
  id: string
  message: string
  type: ToastType
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((message: string) => {
    addToast(message, 'success')
  }, [addToast])

  const error = useCallback((message: string) => {
    addToast(message, 'error')
  }, [addToast])

  const info = useCallback((message: string) => {
    addToast(message, 'info')
  }, [addToast])

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info
  }
}
