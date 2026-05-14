'use client'

import { motion } from 'framer-motion'

export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center font-replica">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-brand-gold/20 border-t-brand-gold rounded-full"
      />
    </div>
  )
}
