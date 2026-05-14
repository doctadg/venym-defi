import React, { useState } from 'react'
import { CheckIcon, CloseIcon, CopyIcon } from './Icons'

interface TelegramConnectModalProps {
  isOpen: boolean
  onClose: () => void
  code: string | null
  loading: boolean
}

const TelegramConnectModal: React.FC<TelegramConnectModalProps> = ({
  isOpen,
  onClose,
  code,
  loading,
}) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-gradient-to-b from-[#1a2332] to-[#0f1419] border border-[#2a3441] rounded-2xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
        >
          <CloseIcon className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-[#229ED9] to-[#1a7fb8] rounded-full flex items-center justify-center mb-4 shadow-lg shadow-[#229ED9]/20">
            <img
              src="/telegram_logo.png"
              alt="Telegram"
              className="w-10 h-10"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Connect Telegram Bot
          </h2>
          <p className="text-gray-400 text-sm max-w-[80%] leading-relaxed">
            Link your account to receive real-time notifications for your
            positions and trades.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#0f1419] to-[#0a0e17] rounded-xl p-6 border border-[#1e2834] shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold text-[#8b9dc3] uppercase tracking-wider w-full text-center">
                Your Link Code
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#1a2332] to-[#0f1419] rounded-xl p-5 border border-[#2a3441] shadow-lg">
              <code className="flex-1 text-3xl text-white font-bold font-mono text-center tracking-widest bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                {loading ? (
                  <span className="text-base text-[#229ED9] animate-pulse">
                    Generating...
                  </span>
                ) : (
                  <span className="text-white drop-shadow-lg">
                    {code || 'Error'}
                  </span>
                )}
              </code>
              <button
                onClick={handleCopy}
                disabled={!code || loading}
                className="p-3 hover:bg-[#229ED9]/20 rounded-lg transition-all text-gray-400 hover:text-[#229ED9] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy code"
              >
                {copied ? (
                  <CheckIcon className="w-5 h-5 text-[#10b981]" />
                ) : (
                  <CopyIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-300 text-center space-y-2">
            <p className="text-gray-400">1. Copy the code above</p>
            <p className="text-gray-400">
              2. Send it to{' '}
              <span className="text-[#229ED9] font-semibold hover:text-[#1a7fb8] transition-colors">
                @hyper002Bot
              </span>{' '}
              on Telegram
            </p>
          </div>

          <div className="pt-2">
            <a
              href="https://t.me/hyper002Bot"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-[#229ED9] to-[#1a7fb8] hover:from-[#1a7fb8] hover:to-[#229ED9] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#229ED9]/30 hover:shadow-[#229ED9]/50 transform hover:scale-[1.02]"
            >
              <img
                src="/telegram_logo.png"
                alt="Telegram"
                className="w-5 h-5"
              />
              <span>Open Telegram Bot</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TelegramConnectModal
