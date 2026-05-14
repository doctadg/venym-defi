'use client'

import { CheckIcon, XMarkIcon } from '@/components/Icons'
import { AuthButton } from '@/components/ui/AuthButton'
import { AuthCard } from '@/components/ui/AuthCard'
import { AuthPageLayout } from '@/components/ui/AuthPageLayout'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useUserContext } from '@/contexts/UserContext'
import {
  checkUsernameAvailability,
  redeemAccessCode,
  setUsername as setUsernameApi,
} from '@/services/api'
import {
  getAuthToken,
  useDynamicContext,
  useIsLoggedIn,
} from '@dynamic-labs/sdk-react-core'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const STORAGE_KEY = 'tide_access_granted'
const MASTER_ACCESS_CODE = 'TIDE26!'

interface AccessGateProps {
  children: React.ReactNode
}

const AccessGate = ({ children }: AccessGateProps) => {
  const { setShowAuthFlow } = useDynamicContext()
  const isLoggedIn = useIsLoggedIn()
  const { user, setUser } = useUserContext()

  // Access code state
  const [localAccessGranted, setLocalAccessGranted] = useState<boolean | null>(
    null
  )
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  // Username state
  const [username, setUsername] = useState('')
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  )
  const [usernameChecking, setUsernameChecking] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setLocalAccessGranted(stored === 'true')
  }, [])

  // Redeem pending access code when user is authenticated
  useEffect(() => {
    const redeemPendingAccessCode = async () => {
      if (!isLoggedIn) return

      const pendingCode = localStorage.getItem('tide_pending_access_code')
      if (!pendingCode) return

      try {
        const authToken = getAuthToken()
        const result = await redeemAccessCode(
          pendingCode,
          authToken ?? undefined
        )
        if (result.success) {
          localStorage.removeItem('tide_pending_access_code')
          console.log('Access code redeemed successfully')
        }
      } catch (error) {
        console.error('Failed to redeem access code:', error)
      }
    }

    redeemPendingAccessCode()
  }, [isLoggedIn])

  // Check username availability with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (username.length >= 3) {
        setUsernameChecking(true)
        try {
          const result = await checkUsernameAvailability(username)
          setUsernameAvailable(result.available)
        } catch {
          setUsernameAvailable(false)
        } finally {
          setUsernameChecking(false)
        }
      } else {
        setUsernameAvailable(null)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [username])

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setCodeLoading(true)
    setCodeError('')

    const upperCode = code.toUpperCase().trim()

    // Check master code first
    if (upperCode === MASTER_ACCESS_CODE) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setLocalAccessGranted(true)
      setCodeLoading(false)
      return
    }

    try {
      // First, try to validate as an access code
      const accessRes = await fetch(`/api/access-codes/validate/${upperCode}`)
      const accessData = await accessRes.json()

      if (accessData.valid) {
        // It's a valid one-time access code - store it for redemption after login
        localStorage.setItem(STORAGE_KEY, 'true')
        localStorage.setItem('tide_pending_access_code', upperCode)
        setLocalAccessGranted(true)
        setCodeLoading(false)
        return
      }

      // If not an access code, try referral code validation (GET with URL param)
      const refRes = await fetch(
        `/api/leaderboard/referral/validate/${upperCode}`
      )
      const refData = await refRes.json()

      if (refRes.ok && refData.valid) {
        localStorage.setItem(STORAGE_KEY, 'true')
        localStorage.setItem('tide_pending_code', upperCode)
        setLocalAccessGranted(true)
      } else {
        setCodeError('Invalid access code')
      }
    } catch (error) {
      console.error('Error validating code:', error)
      setCodeError('Failed to validate code. Please try again.')
    } finally {
      setCodeLoading(false)
    }
  }

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !usernameAvailable) return

    setUsernameLoading(true)
    try {
      const authToken = getAuthToken()
      const result = await setUsernameApi(username, authToken ?? undefined)

      if (result.success && result.data) {
        toast.success(`Welcome, ${username}!`)
        setUser(result.data)
      } else {
        toast.error(result.error || 'Failed to set username')
      }
    } catch {
      toast.error('Failed to set username. Please try again.')
    } finally {
      setUsernameLoading(false)
    }
  }

  // Loading state
  if (localAccessGranted === null) {
    return <LoadingSpinner />
  }

  const hasServerAccessCode = user?.referred_by != null
  const hasAccessCode = localAccessGranted || hasServerAccessCode
  const needsUsername = user && !user.username

  // All gates passed - allow through
  if (hasAccessCode && isLoggedIn && !needsUsername) {
    return <>{children}</>
  }

  return (
    <AuthPageLayout>
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          <AuthCard key="connect">
            <div className="relative z-10 flex flex-col items-start h-full justify-between">
              <span className="text-2xl font-bold text-[#e4e4e7] mb-6">Venym</span>
              <div className="w-full gap-2 flex flex-col items-center justify-center">
                <p className="text-[#e4e4e7] text-3xl font-bold font-sans leading-tight text-center">
                  Trade Perps. One Wallet. Best Execution.
                </p>
                <p className="text-white/70 mb-5 text-base font-sans text-center">
                  Automatically route perps across top DEXs for better pricing.
                </p>
              </div>
              <div className="w-full">
                <AuthButton
                  onClick={() => setShowAuthFlow(true)}
                  className="w-full"
                >
                  Continue with Wallet
                </AuthButton>
                <Link href="/waitlist" className="block w-full mt-3">
                  <AuthButton variant="white" className="w-full">
                    Join the waitlist
                  </AuthButton>
                </Link>
              </div>
            </div>
          </AuthCard>
        ) : !hasAccessCode ? (
          <AuthCard key="access">
            <div className="relative z-10 flex flex-col items-start h-full justify-between">
              <span className="text-2xl font-bold text-[#e4e4e7] mb-6">Venym</span>
              <div className="w-full gap-2 flex flex-col items-center justify-center">
                <p className="text-[#e4e4e7] text-3xl font-bold font-sans leading-tight text-center">
                  Invite Only
                </p>
                <p className="text-white/70 mb-5 text-base font-sans text-center">
                  Venym is currently in closed alpha. Please enter your access
                  code to proceed.
                </p>
              </div>
            </div>
            <form onSubmit={handleCodeSubmit} className="w-full space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setCodeError('')
                  }}
                  placeholder="ENTER CODE"
                  className="w-full bg-[#050505]/80 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-xl font-mono tracking-[0.2em] focus:outline-none focus:border-white/50/50 transition-all placeholder:text-white/10 shadow-inner"
                  maxLength={20}
                  autoFocus
                />
                <div className="absolute inset-0 rounded-xl bg-white/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
              </div>

              {codeError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-brand-red text-sm font-medium"
                >
                  {codeError}
                </motion.p>
              )}
              <div className="flex justify-center pt-2">
                <AuthButton
                  type="submit"
                  disabled={codeLoading || !code.trim()}
                  loading={codeLoading}
                >
                  {codeLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Unlock Terminal
                      <svg
                        className="w-4 h-4 transition-transform group-hover:translate-x-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </AuthButton>
              </div>
            </form>
            <p className="mt-8 text-white/40 text-sm">
              Don&apos;t have a code?{' '}
              <Link
                href="/waitlist"
                className="text-white/60 hover:text-white/80 cursor-pointer hover:underline transition-colors"
              >
                Join the waitlist
              </Link>
            </p>
          </AuthCard>
        ) : needsUsername ? (
          /* Step 3: Set Username */
          <AuthCard key="username" className="h-[420px]">
            <div className="relative z-10 flex flex-col items-start h-full justify-between">
              <span className="text-2xl font-bold text-[#e4e4e7] mb-6">Venym</span>
              <div className="w-full gap-2 flex flex-col items-center justify-center">
                <p className="text-[#e4e4e7] text-3xl font-bold font-sans leading-tight text-center">
                  Choose Your Username
                </p>
                <p className="text-white/70 mb-5 text-base font-sans text-center">
                  Set a unique username for your account. This will also be your
                  permanent referral code.
                </p>
              </div>
            </div>
            <form onSubmit={handleUsernameSubmit} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))
                  }
                  placeholder="Username"
                  className={`w-full bg-[#050505]/80 border rounded-xl px-4 py-4 text-white text-lg focus:outline-none transition-all shadow-inner ${usernameAvailable === true
                      ? 'border-brand-green/50'
                      : usernameAvailable === false
                        ? 'border-brand-red/50'
                        : 'border-white/10 focus:border-white/50/50'
                    }`}
                  maxLength={20}
                  autoFocus
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {usernameChecking && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {!usernameChecking && usernameAvailable === true && (
                    <CheckIcon className="w-4 h-4 text-brand-green" />
                  )}
                  {!usernameChecking && usernameAvailable === false && (
                    <XMarkIcon className="w-4 h-4 text-brand-red" />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 px-1 text-left">
                <p
                  className={`text-[10px] ${username.length >= 3 ? 'text-[#8E8E8E]' : 'text-brand-red'
                    }`}
                >
                  • 3-20 characters
                </p>
                <p className="text-[10px] text-[#8E8E8E]">
                  • Alphanumeric only
                </p>
                {usernameAvailable === false && (
                  <p className="text-[10px] text-brand-red font-medium">
                    • Username already taken
                  </p>
                )}
              </div>
              <div className="flex justify-center pt-2">
                <AuthButton
                  type="submit"
                  disabled={
                    usernameLoading || !usernameAvailable || username.length < 3
                  }
                  loading={usernameLoading}
                >
                  {usernameLoading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Finalize Account'
                  )}
                </AuthButton>
              </div>
            </form>
          </AuthCard>
        ) : null}
      </AnimatePresence>
    </AuthPageLayout>
  )
}

export default AccessGate
