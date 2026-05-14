'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Image from 'next/image'
import React from 'react'

interface AuthCardProps {
  children: React.ReactNode
  initial?: { opacity: number; y: number; scale: number }
  animate?: { opacity: number; y: number; scale: number }
  exit?: { opacity: number; y: number; scale: number }
  className?: string
}

export const AuthCard = ({
  children,
  initial = { opacity: 0, y: 20, scale: 0.95 },
  animate = { opacity: 1, y: 0, scale: 1 },
  exit = { opacity: 0, y: -20, scale: 0.95 },
  className,
}: AuthCardProps) => {
  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      className={cn(
        'relative z-10 w-full max-w-[400px] font-sans  h-[390px]',
        className
      )}
    >
      <div className="relative bg-[#00080F] rounded-[30px] p-6 overflow-hidden flex h-full flex-col">
        <div className="absolute inset-0 rounded-[30px] overflow-hidden">
          <Image
            src="/bg_card.png"
            alt=""
            fill
            className="object-cover object-center mix-blend-screen"
            priority
          />
        </div>
        {children}
      </div>
    </motion.div>
  )
}
