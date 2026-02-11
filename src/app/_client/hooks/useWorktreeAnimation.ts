import { useState, useEffect, useCallback, useRef } from 'react'

interface UseWorktreeAnimationProps {
  isHighlighted: boolean
}

interface UseWorktreeAnimationReturn {
  animationStage: number
  getAnimationClass: () => string
}

// Animation constants
const ANIMATION_DURATIONS = {
  STAGE_1: 1000,  // 1 second
  STAGE_2: 2000,  // 2 seconds
  STAGE_3: 3000,  // 3 seconds
  SETTLE: 500     // 0.5 seconds
} as const

export const useWorktreeAnimation = ({ isHighlighted }: UseWorktreeAnimationProps): UseWorktreeAnimationReturn => {
  const [animationStage, setAnimationStage] = useState(0)
  const animationTimersRef = useRef<NodeJS.Timeout[]>([])
  const isAnimatingRef = useRef(false)
  
  // Clear all animation timers
  const clearAnimationTimers = useCallback(() => {
    animationTimersRef.current.forEach(timer => clearTimeout(timer))
    animationTimersRef.current = []
  }, [])
  
  // Handle animation sequence when highlighted
  useEffect(() => {
    if (isHighlighted && !isAnimatingRef.current) {
      isAnimatingRef.current = true
      setAnimationStage(1)
      
      // Stage 1: 1 second pulse
      const timer1 = setTimeout(() => {
        setAnimationStage(2)
      }, ANIMATION_DURATIONS.STAGE_1)
      
      // Stage 2: 2 second pulse
      const timer2 = setTimeout(() => {
        setAnimationStage(3)
      }, ANIMATION_DURATIONS.STAGE_1 + ANIMATION_DURATIONS.STAGE_2)
      
      // Stage 3: 3 second pulse
      const timer3 = setTimeout(() => {
        setAnimationStage(4)
        isAnimatingRef.current = false
      }, ANIMATION_DURATIONS.STAGE_1 + ANIMATION_DURATIONS.STAGE_2 + ANIMATION_DURATIONS.STAGE_3)
      
      animationTimersRef.current = [timer1, timer2, timer3]
    } else if (!isHighlighted) {
      // Reset animation state when not highlighted
      clearAnimationTimers()
      setAnimationStage(0)
      isAnimatingRef.current = false
    }
    
    return clearAnimationTimers
  }, [isHighlighted, clearAnimationTimers])
  
  // Determine animation class based on stage (memoized for performance)
  const getAnimationClass = useCallback(() => {
    if (!isHighlighted) return ''
    switch (animationStage) {
      case 1: return 'animate-worktree-highlight-1'
      case 2: return 'animate-worktree-highlight-2'
      case 3: return 'animate-worktree-highlight-3'
      case 4: return 'animate-worktree-highlight-settle'
      default: return ''
    }
  }, [isHighlighted, animationStage])
  
  return {
    animationStage,
    getAnimationClass
  }
}
