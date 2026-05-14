import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { ChevronDown } from '../Icons'
import { useTour, TourType } from '../../contexts/TourContext'
import { AppView } from '../../types'

interface UserDropdownProps {
  onViewChange?: (view: AppView) => void
}

const UserDropdown = ({ onViewChange }: UserDropdownProps) => {
  const { handleLogOut, user } = useDynamicContext()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isTourSubmenuOpen, setIsTourSubmenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { startTour } = useTour()

  const handleStartTour = (type: TourType) => {
    startTour(type)
    setIsUserMenuOpen(false)
    setIsTourSubmenuOpen(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const shortenAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const displayAddress =
    user?.verifiedCredentials?.[0]?.address || user?.email || 'User'

  return (
    <div className="relative" ref={userMenuRef}>
      <div
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center justify-center px-3 py-2 bg-[#1e2544] border border-border rounded-lg gap-2 cursor-pointer hover:bg-[#1e40c6]/40 transition-colors select-none"
      >
        {/* Placeholder Avatar - could be replaced with user avatar if available */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 bg-[url('https://i.pravatar.cc/150?u=a042581f4e29026704d')] bg-cover" />
        <span className="text-white font-geist text-xs font-medium hidden sm:block">
          {shortenAddress(displayAddress)}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-[#8E8E8E] transition-transform ${
            isUserMenuOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Dropdown Content */}
      {isUserMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[#1e2544] border border-border rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-white text-sm font-medium">My Account</p>
            <p className="text-[#666] text-xs mt-0.5" title={displayAddress}>
              {shortenAddress(displayAddress)}
            </p>
          </div>
          <button
            onClick={() => {
              onViewChange?.(AppView.SETTINGS)
              setIsUserMenuOpen(false)
            }}
            className="flex w-full items-center px-4 py-3 text-sm text-[#BBBBBB] hover:bg-[#3b5fd4]/15 transition-colors text-left"
          >
            Settings
          </button>
          <button className="flex w-full items-center px-4 py-3 text-sm text-[#BBBBBB] hover:bg-[#3b5fd4]/15 transition-colors text-left">
            Trade History
          </button>
          <button className="flex w-full items-center px-4 py-3 text-sm text-[#BBBBBB] hover:bg-[#3b5fd4]/15 transition-colors text-left">
            Preferences
          </button>

          {/* Tour Submenu */}
          <div className="relative">
            <button
              onClick={() => setIsTourSubmenuOpen(!isTourSubmenuOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm text-[#BBBBBB] hover:bg-[#3b5fd4]/15 transition-colors text-left"
            >
              <span>Take Tour</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${isTourSubmenuOpen ? 'rotate-90' : ''}`}
              />
            </button>

            {isTourSubmenuOpen && (
              <div className="bg-[#161b33] border-t border-b border-border/50">
                <button
                  onClick={() => handleStartTour('onboarding')}
                  className="flex w-full items-center px-6 py-2.5 text-sm text-[#BBBBBB] hover:bg-[#3b5fd4]/15 transition-colors text-left"
                >
                  Platform Overview
                </button>
                <button
                  onClick={() => handleStartTour('hyperliquid')}
                  className="flex w-full items-center px-6 py-2.5 text-sm text-[#BBBBBB] hover:bg-[#3b5fd4]/15 transition-colors text-left"
                >
                  Hyperliquid Setup
                </button>
                <button
                  onClick={() => handleStartTour('lighter')}
                  className="flex w-full items-center px-6 py-2.5 text-sm text-[#BBBBBB] hover:bg-[#3b5fd4]/15 transition-colors text-left"
                >
                  Lighter Setup
                </button>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-border my-1" />
          <button
            onClick={handleLogOut}
            className="flex w-full items-center px-4 py-3 text-sm text-brand-red hover:bg-[#3b5fd4]/15 transition-colors text-left"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

export default UserDropdown
