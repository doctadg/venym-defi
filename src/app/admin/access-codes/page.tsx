'use client'

import { useDynamicContext, useIsLoggedIn, getAuthToken } from '@dynamic-labs/sdk-react-core'
import React, { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import Link from 'next/link'

// Admin wallet addresses
const ADMIN_WALLETS = [
    '0x8ad8e63ff2d8979bfb7df85da78fda0564e1a0d0',
    '0xdaf8cb6d61848081967f426c62e111d0eaa79dd4',
    '0xc939ff91dfa67544aaeeab16489e5d63dca650e8',
    '0xf8c193f7ac41338961a6a50405583f04f337e2e0',
]

interface AccessCode {
    id: string
    code: string
    isUsed: boolean
    usedBy: string | null
    usedAt: string | null
    createdAt: string
    createdBy: string | null
    note: string | null
}

interface WaitlistUser {
    walletAddress: string
    username: string | null
    waitlistedAt: string | null
}

export default function AdminAccessCodesPage() {
    const { setShowAuthFlow, primaryWallet } = useDynamicContext()
    const isLoggedIn = useIsLoggedIn()

    // Tab state
    const [activeTab, setActiveTab] = useState<'codes' | 'waitlist'>('codes')

    // Access codes state
    const [codes, setCodes] = useState<AccessCode[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [generateCount, setGenerateCount] = useState(1)
    const [generateNote, setGenerateNote] = useState('')
    const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all')

    // Waitlist state
    const [waitlistUsers, setWaitlistUsers] = useState<WaitlistUser[]>([])
    const [waitlistLoading, setWaitlistLoading] = useState(false)
    const [grantingWallet, setGrantingWallet] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const isAdmin = primaryWallet?.address && ADMIN_WALLETS.includes(primaryWallet.address.toLowerCase())

    // Fetch codes on load
    useEffect(() => {
        if (isAdmin) {
            fetchCodes()
        } else {
            setLoading(false)
        }
    }, [isAdmin])

    // Fetch waitlist when tab changes
    useEffect(() => {
        if (isAdmin && activeTab === 'waitlist') {
            fetchWaitlist()
        }
    }, [isAdmin, activeTab])

    const fetchCodes = async () => {
        setLoading(true)
        try {
            const token = getAuthToken()
            const usedParam = filter === 'all' ? '' : `?used=${filter === 'used'}`
            const res = await fetch(`/api/access-codes/list${usedParam}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                setCodes(data.codes)
            } else {
                toast.error('Failed to fetch codes')
            }
        } catch {
            toast.error('Failed to fetch codes')
        } finally {
            setLoading(false)
        }
    }

    const fetchWaitlist = useCallback(async () => {
        setWaitlistLoading(true)
        try {
            const token = getAuthToken()
            const res = await fetch('/api/access-codes/waitlist', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const data = await res.json()
            if (data.success) {
                setWaitlistUsers(data.users)
            } else {
                toast.error('Failed to fetch waitlist')
            }
        } catch {
            toast.error('Failed to fetch waitlist')
        } finally {
            setWaitlistLoading(false)
        }
    }, [])

    const generateCodes = async () => {
        setGenerating(true)
        try {
            const token = getAuthToken()
            const res = await fetch('/api/access-codes/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    count: generateCount,
                    note: generateNote || undefined,
                    createdBy: primaryWallet?.address,
                })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Generated ${data.count} code(s)`)
                setGenerateNote('')
                fetchCodes()
            } else {
                toast.error('Failed to generate codes')
            }
        } catch {
            toast.error('Failed to generate codes')
        } finally {
            setGenerating(false)
        }
    }

    const deleteCode = async (code: string) => {
        if (!confirm(`Delete code ${code}?`)) return

        try {
            const token = getAuthToken()
            const res = await fetch('/api/access-codes/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ codes: [code] })
            })
            const data = await res.json()
            if (data.success) {
                toast.success('Code deleted')
                fetchCodes()
            } else {
                toast.error('Failed to delete code')
            }
        } catch {
            toast.error('Failed to delete code')
        }
    }

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code)
        toast.success('Copied to clipboard')
    }

    const exportToCSV = () => {
        const filteredCodes = codes.filter(c => filter === 'all' || (filter === 'used' ? c.isUsed : !c.isUsed))

        const headers = ['Code', 'Status', 'Note', 'Used By', 'Used At', 'Created At', 'Created By']
        const rows = filteredCodes.map(c => [
            c.code,
            c.isUsed ? 'Used' : 'Available',
            c.note || '',
            c.usedBy || '',
            c.usedAt ? new Date(c.usedAt).toISOString() : '',
            new Date(c.createdAt).toISOString(),
            c.createdBy || ''
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `access-codes-${filter}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(`Exported ${filteredCodes.length} codes to CSV`)
    }

    const exportToTxt = () => {
        const filteredCodes = codes.filter(c => filter === 'all' || (filter === 'used' ? c.isUsed : !c.isUsed))
        const txtContent = filteredCodes.map(c => c.code).join('\n')

        const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `access-codes-${filter}-${new Date().toISOString().split('T')[0]}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success(`Exported ${filteredCodes.length} codes to TXT`)
    }

    const grantAccess = async (walletAddresses: string[]) => {
        try {
            const token = getAuthToken()
            const res = await fetch('/api/access-codes/grant-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ walletAddresses })
            })
            const data = await res.json()
            if (data.success) {
                toast.success(`Granted access to ${data.granted} user(s)`)
                fetchWaitlist()
            } else {
                toast.error('Failed to grant access')
            }
        } catch {
            toast.error('Failed to grant access')
        }
    }

    const handleGrantSingle = async (wallet: string) => {
        setGrantingWallet(wallet)
        await grantAccess([wallet])
        setGrantingWallet(null)
    }


    // Not logged in
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Admin Access Required</h1>
                    <p className="text-white/60 mb-6">Connect your admin wallet to manage access codes.</p>
                    <button
                        onClick={() => setShowAuthFlow(true)}
                        className="px-6 py-3 bg-white/90 text-white font-bold rounded-xl hover:scale-105 transition-transform"
                    >
                        Connect Wallet
                    </button>
                </div>
            </div>
        )
    }

    // Not admin
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
                <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
                    <p className="text-white/60 mb-4">This wallet is not authorized to manage access codes.</p>
                    <p className="text-white/40 text-sm font-mono mb-6">{primaryWallet?.address}</p>
                    <Link href="/" className="text-white hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        )
    }

    const unusedCodes = codes.filter(c => !c.isUsed)
    const usedCodes = codes.filter(c => c.isUsed)

    return (
        <div className="min-h-screen bg-[#050505] p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                        <p className="text-white/60 mt-1">Manage access codes and waitlist</p>
                    </div>
                    <Link href="/" className="text-white/60 hover:text-white transition-colors">
                        ← Back
                    </Link>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab('codes')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'codes'
                            ? 'bg-white/90 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Access Codes
                    </button>
                    <button
                        onClick={() => setActiveTab('waitlist')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-colors ${activeTab === 'waitlist'
                            ? 'bg-white/90 text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        Waitlist
                        {waitlistUsers.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-white/10 rounded-full text-xs">
                                {waitlistUsers.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ===== ACCESS CODES TAB ===== */}
                {activeTab === 'codes' && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                                <p className="text-white/40 text-sm">Total Codes</p>
                                <p className="text-2xl font-bold text-white">{codes.length}</p>
                            </div>
                            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                                <p className="text-white/40 text-sm">Available</p>
                                <p className="text-2xl font-bold text-green-400">{unusedCodes.length}</p>
                            </div>
                            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                                <p className="text-white/40 text-sm">Used</p>
                                <p className="text-2xl font-bold text-white/60">{usedCodes.length}</p>
                            </div>
                        </div>

                        {/* Generate Section */}
                        <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-xl p-6 mb-8">
                            <h2 className="text-lg font-bold text-white mb-4">Generate New Codes</h2>
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="block text-white/60 text-sm mb-2">Count</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={generateCount}
                                        onChange={(e) => setGenerateCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                        className="w-24 bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-white/50/50"
                                    />
                                </div>
                                <div className="flex-1 min-w-[200px]">
                                    <label className="block text-white/60 text-sm mb-2">Note (optional)</label>
                                    <input
                                        type="text"
                                        value={generateNote}
                                        onChange={(e) => setGenerateNote(e.target.value)}
                                        placeholder="e.g. Beta testers batch 1"
                                        className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-white/50/50"
                                    />
                                </div>
                                <button
                                    onClick={generateCodes}
                                    disabled={generating}
                                    className="px-6 py-2 bg-white/90 text-white font-bold rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {generating ? 'Generating...' : `Generate ${generateCount} Code${generateCount > 1 ? 's' : ''}`}
                                </button>
                            </div>
                        </div>

                        {/* Filter Tabs */}
                        <div className="flex gap-2 mb-4">
                            {(['all', 'unused', 'used'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => { setFilter(f); }}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === f
                                        ? 'bg-white/90 text-white'
                                        : 'bg-white/5 text-white/60 hover:bg-white/10'
                                        }`}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                            <div className="ml-auto flex gap-2">
                                <button
                                    onClick={exportToTxt}
                                    disabled={codes.length === 0}
                                    className="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    Export List
                                </button>
                                <button
                                    onClick={exportToCSV}
                                    disabled={codes.length === 0}
                                    className="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                    Export CSV
                                </button>
                                <button
                                    onClick={fetchCodes}
                                    className="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {/* Codes Table */}
                        <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                            {loading ? (
                                <div className="p-8 text-center text-white/40">Loading...</div>
                            ) : codes.length === 0 ? (
                                <div className="p-8 text-center text-white/40">No codes found</div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Code</th>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Status</th>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Note</th>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Used By</th>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Created</th>
                                            <th className="text-right text-white/60 text-sm font-medium px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codes
                                            .filter(c => filter === 'all' || (filter === 'used' ? c.isUsed : !c.isUsed))
                                            .map((code) => (
                                                <tr key={code.id} className="border-t border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-white font-medium">{code.code}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {code.isUsed ? (
                                                            <span className="px-2 py-1 bg-white/10 text-white/40 rounded text-xs">Used</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Available</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-white/60 text-sm">{code.note || '-'}</td>
                                                    <td className="px-4 py-3 text-white/40 text-xs font-mono">
                                                        {code.usedBy ? `${code.usedBy.slice(0, 6)}...${code.usedBy.slice(-4)}` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-white/40 text-sm">
                                                        {new Date(code.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => copyCode(code.code)}
                                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 rounded text-sm transition-colors"
                                                            >
                                                                Copy
                                                            </button>
                                                            {!code.isUsed && (
                                                                <button
                                                                    onClick={() => deleteCode(code.code)}
                                                                    className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-sm transition-colors"
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {/* ===== WAITLIST TAB ===== */}
                {activeTab === 'waitlist' && (
                    <>
                        {/* Waitlist Stats and Search */}
                        <div className="grid grid-cols-1 gap-4 mb-4">
                            <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <p className="text-white/40 text-sm">Pending Users</p>
                                    <p className="text-2xl font-bold text-white">{waitlistUsers.length}</p>
                                </div>
                                <div className="flex flex-1 max-w-md w-full gap-2 mt-4 sm:mt-0 ml-0 sm:ml-auto">
                                    <input
                                        type="text"
                                        placeholder="Search wallet address..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 bg-[#050505] border border-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-white/50/50"
                                    />
                                    <button
                                        onClick={fetchWaitlist}
                                        className="px-4 py-2 bg-white/5 text-white/60 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                                    >
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Waitlist Table */}
                        <div className="bg-[#121212]/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                            {waitlistLoading ? (
                                <div className="p-8 text-center text-white/40">Loading...</div>
                            ) : waitlistUsers.length === 0 ? (
                                <div className="p-8 text-center text-white/40">No users on the waitlist</div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Wallet</th>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Username</th>
                                            <th className="text-left text-white/60 text-sm font-medium px-4 py-3">Joined Waitlist</th>
                                            <th className="text-right text-white/60 text-sm font-medium px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waitlistUsers
                                            .filter(user => user.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()))
                                            .map((user) => (
                                                <tr key={user.walletAddress} className="border-t border-white/5 hover:bg-white/5">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-white text-sm">
                                                            {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(user.walletAddress)
                                                                toast.success('Copied wallet address')
                                                            }}
                                                            className="ml-2 text-white/30 hover:text-white/60 text-xs transition-colors"
                                                        >
                                                            Copy
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-white/60 text-sm">
                                                        {user.username || <span className="text-white/30 italic">No username</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-white/40 text-sm">
                                                        {user.waitlistedAt
                                                            ? new Date(parseInt(user.waitlistedAt)).toLocaleDateString()
                                                            : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleGrantSingle(user.walletAddress)}
                                                            disabled={grantingWallet === user.walletAddress}
                                                            className="px-4 py-1.5 bg-green-500/20 text-green-400 font-medium rounded text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
                                                        >
                                                            {grantingWallet === user.walletAddress ? 'Granting...' : 'Grant Access'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
