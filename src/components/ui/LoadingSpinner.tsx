'use client'

import { motion } from 'framer-motion'

export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-white/50/20 border-t-brand-gold rounded-full"
      />
    </div>
  )
}
