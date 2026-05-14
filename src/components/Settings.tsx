'use client'

import ExchangeSettingsSection from './settings/ExchangeSettingsSection'

const Settings = () => {
  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Header */}
        <h1 className="text-white text-2xl font-bold font-sans mb-8">Settings</h1>

        {/* Exchanges Section */}
        <div className="bg-bg-panel border border-border rounded-2xl p-6">
          <ExchangeSettingsSection />
        </div>
      </div>
    </div>
  )
}

export default Settings
