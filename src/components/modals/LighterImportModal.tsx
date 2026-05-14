import React, { useState, useEffect } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';
import { importLighterCredentials } from '../../services/api';

interface LighterImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const LighterImportModal = ({ isOpen, onClose, onSuccess }: LighterImportModalProps) => {
    const { primaryWallet } = useDynamicContext();
    const [walletAddress, setWalletAddress] = useState('');
    const [apiPublicKey, setApiPublicKey] = useState('');
    const [apiPrivateKey, setApiPrivateKey] = useState('');
    const [accountIndex, setAccountIndex] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (primaryWallet?.address) {
                setWalletAddress(primaryWallet.address);
            }
            // Reset fields
            setApiPublicKey('');
            setApiPrivateKey('');
            setAccountIndex('');
            setError('');
            setSuccess('');
            setLoading(false);
        }
    }, [isOpen, primaryWallet]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!walletAddress || !apiPublicKey || !apiPrivateKey || !accountIndex) {
            setError('Please fill in all required fields');
            return;
        }

        const parsedAccountIndex = parseInt(accountIndex, 10);
        if (isNaN(parsedAccountIndex)) {
            setError('Account index must be a valid number');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const payload = {
                walletIdOrAddress: walletAddress,
                apiPublicKey,
                apiPrivateKey,
                accountIndex: parsedAccountIndex
            };

            // Get auth token from Dynamic SDK (stored in localStorage)
            const token = getAuthToken();

            const response = await importLighterCredentials(payload, token ?? undefined);

            if (response.success) {
                setSuccess('Credentials imported successfully!');
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 1500);
            } else {
                setError(response.error || response.message || 'Failed to import credentials');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#14192F] border border-white/10 rounded-2xl p-6 w-[450px] flex flex-col gap-4 shadow-2xl">
                <h2 className="text-white text-lg font-medium">Import Lighter Credentials</h2>
                <p className="text-[#8E8E8E] text-xs">
                    Import your Lighter API keys. You can find your account index in the Lighter app.
                </p>

                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[#8E8E8E] text-xs">Wallet Address</label>
                        <input
                            type="text"
                            value={walletAddress}
                            onChange={(e) => setWalletAddress(e.target.value)}
                            className="bg-bg-input text-white text-sm w-full outline-none px-3 py-2 rounded-lg border border-white/10"
                            placeholder="0x..."
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[#8E8E8E] text-xs">Account Index</label>
                        <input
                            type="number"
                            value={accountIndex}
                            onChange={(e) => setAccountIndex(e.target.value)}
                            className="bg-bg-input text-white text-sm w-full outline-none px-3 py-2 rounded-lg border border-white/10"
                            placeholder="e.g. 316225"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[#8E8E8E] text-xs">API Public Key</label>
                        <input
                            type="text"
                            value={apiPublicKey}
                            onChange={(e) => setApiPublicKey(e.target.value)}
                            className="bg-bg-input text-white text-sm w-full outline-none px-3 py-2 rounded-lg border border-white/10"
                            placeholder="Public Key"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[#8E8E8E] text-xs">API Private Key</label>
                        <input
                            type="password"
                            value={apiPrivateKey}
                            onChange={(e) => setApiPrivateKey(e.target.value)}
                            className="bg-bg-input text-white text-sm w-full outline-none px-3 py-2 rounded-lg border border-border"
                            placeholder="Private Key"
                        />
                    </div>
                </div>

                {error && <div className="text-brand-red text-xs text-center">{error}</div>}
                {success && <div className="text-brand-green text-xs text-center">{success}</div>}

                <div className="flex gap-3 mt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-[#8E8E8E] hover:text-white hover:bg-white/5 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-brand-gold text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg"
                    >
                        {loading ? 'Importing...' : 'Import Keys'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LighterImportModal;

