'use client'

import React, { useState } from 'react'
import Head from 'next/head'
import AccessGate from '@/components/AccessGate'
import SwapView from '@/components/SwapView'
import Header from '@/components/Header'
import { AppView } from '@/types'

function SwapPageContent() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.TRADE)
  const [showDeposit, setShowDeposit] = useState(false)

  return (
    <>
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onDepositClick={() => setShowDeposit(true)}
      />
      <main className="flex-1 overflow-auto">
        <SwapView />
      </main>
    </>
  )
}

export default function SwapPage() {
  return (
    <AccessGate>
      <SwapPageContent />
    </AccessGate>
  )
}
