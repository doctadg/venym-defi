import { useIsLoggedIn } from '@dynamic-labs/sdk-react-core'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { AppView } from '../types'
import ConnectButton from './Auth/ConnectButton'
import UserDropdown from './Auth/UserDropdown'
import DexModeDropdown from './DexModeDropdown'

interface HeaderProps {
  currentView: AppView
  onViewChange: (view: AppView) => void
  onDepositClick: () => void
}

const NavButton = ({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-geist transition-colors ${active ? 'text-white font-medium' : 'text-[#8E8E8E] hover:text-[#BBBBBB]'
      }`}
  >
    {label}
  </button>
)

const LinkNavButton = ({
  label,
  active,
  href,
}: {
  label: string
  active: boolean
  href: string
}) => (
  <Link
    href={href}
    className={`px-4 py-2 text-sm font-geist transition-colors ${active ? 'text-white font-medium' : 'text-[#8E8E8E] hover:text-[#BBBBBB]'
      }`}
  >
    {label}
  </Link>
)

const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onDepositClick,
}) => {
  const isLoggedIn = useIsLoggedIn()
  const pathname = usePathname()

  const isPairTradingActive = pathname === '/pair-trading' || currentView === AppView.PAIR_TRADING
  const isTradeActive = pathname === '/' && currentView === AppView.TRADE && !isPairTradingActive

  return (
    <header className="w-full h-[72px] bg-bg px-4 border-b border-white/10 flex justify-between items-center sticky top-0 z-50">
      {/* Left Logo & Nav */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <img src="/tidebluefull.svg" alt="Tide" className="h-8 w-auto" />

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <LinkNavButton
            label="Trade"
            active={isTradeActive}
            href="/"
          />
          <LinkNavButton
            label="Pair Trading"
            active={isPairTradingActive}
            href="/pair-trading"
          />
          <NavButton
            label="Portfolio"
            active={currentView === AppView.PORTFOLIO}
            onClick={() => onViewChange(AppView.PORTFOLIO)}
          />
          <NavButton
            label="Points"
            active={currentView === AppView.POINTS}
            onClick={() => onViewChange(AppView.POINTS)}
          />
          <NavButton
            label="Leaderboard"
            active={currentView === AppView.LEADERBOARD}
            onClick={() => onViewChange(AppView.LEADERBOARD)}
          />
          <NavButton
            label="Referral"
            active={currentView === AppView.REFERRAL}
            onClick={() => onViewChange(AppView.REFERRAL)}
          />
        </nav>
      </div>

      {/* Right Actions Area */}
      <div className="flex items-center gap-6">
        {isLoggedIn && (
          <>
            <DexModeDropdown />

            <button
              id="deposit-button"
              onClick={onDepositClick}
              className="hidden md:flex items-center justify-center px-6 py-2 bg-[#0052FF] rounded-lg text-white font-geist text-sm hover:bg-[#0040cc] transition-colors shadow-[0_0_15px_rgba(0,82,255,0.3)]"
            >
              Deposit / Withdraw
            </button>
          </>
        )}

        {/* Auth Section */}
        {isLoggedIn ? <UserDropdown onViewChange={onViewChange} /> : <ConnectButton />}
      </div>
    </header>
  )
}

export default Header
