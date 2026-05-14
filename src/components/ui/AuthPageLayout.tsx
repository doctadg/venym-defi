'use client'

import { motion } from 'framer-motion'
import React, { useEffect } from 'react'

interface AuthPageLayoutProps {
  children: React.ReactNode
}

const BackgroundGlows = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
        x: [0, 50, 0],
        y: [0, -30, 0],
      }}
      transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[radial-gradient(circle,_rgba(30,64,198,0.2)_0%,_transparent_70%)] blur-[100px]"
    />
    <motion.div
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.2, 0.4, 0.2],
        x: [0, -40, 0],
        y: [0, 60, 0],
      }}
      transition={{
        duration: 18,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: 2,
      }}
      className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[radial-gradient(circle,_rgba(86,192,166,0.15)_0%,_transparent_70%)] blur-[100px]"
    />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
  </div>
)

export const AuthPageLayout = ({ children }: AuthPageLayoutProps) => {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = '/bg.jpg'
    link.as = 'image'
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  return (
    <div
      className="relative min-h-screen bg-[#050505] flex items-center justify-center p-4 overflow-hidden font-sans"
      style={{
        backgroundImage: "url('/bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-[#050505]/80" />
      <BackgroundGlows />
      {children}
    </div>
  )
}

export { BackgroundGlows }
