'use client'

import { cn } from '@/lib/utils'
import React from 'react'

interface AuthButtonProps {
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  className?: string
  variant?: 'blue' | 'white'
}

export const AuthButton = ({
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  children,
  className = '',
  variant = 'blue',
}: AuthButtonProps) => {
  const variantStyles = {
    blue: 'bg-[#1E40C6] text-white shadow-[0_0_20px_rgba(30,64,198,0.3)] hover:shadow-[0_0_30px_rgba(30,64,198,0.5)]',
    white:
      'bg-white text-[#1E40C6] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]',
  }

  const gradientStyles = {
    blue: 'via-white/30',
    white: 'via-[#1E40C6]/20',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'group relative w-full h-14 font-bold rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100',
        variantStyles[variant],
        className
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000',
          gradientStyles[variant]
        )}
      />
      <span className="relative flex items-center justify-center gap-3">
        {children}
      </span>
    </button>
  )
}
