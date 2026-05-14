
export const DEPOSIT_CONTRACTS = {
    ethereum: {
        address: "0x604dd02d620633ae427888d41bfd15e38483736e",
        chainId: 1,
        networkName: "Ethereum",
        explorerUrl: "https://etherscan.io/tx/",
    },
    arbitrum: {
        address: "0x9E36CB86a159d479cEd94Fa05036f235Ac40E1d5",
        chainId: 42161,
        networkName: "Arbitrum One",
        explorerUrl: "https://arbiscan.io/tx/",
    },
    bnb: {
        address: "0x128463a60784c4d3f46c23af3f65ed859ba87974",
        chainId: 56,
        networkName: "BNB Chain",
        explorerUrl: "https://bscscan.com/tx/",
    },
    solana: {
        programId: "EhUtRgu9iEbZXXRpEvDj6n1wnQRjMi2SERDo3c6bmN2c",
        chainId: 101,
        networkName: "Solana",
        explorerUrl: "https://solscan.io/tx/",
        solVault: "5bXxj9Qa4hj15DHvzTgVy7z2VkEGNWFVQojfbUKAiGpE",
        admin: "3WS5gZL6gqqkxuKp1cFPsd2tvbrkwjGEJbLRZ2uiY5x2",
        programs: {
            tokenProgram: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            associatedTokenProgram: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
            systemProgram: "11111111111111111111111111111111",
        },
    },
    sepolia: {
        address: "0x604dd02d620633ae427888d41bfd15e38483736e", // Placeholder
        chainId: 11155111,
        networkName: "Sepolia",
        explorerUrl: "https://sepolia.etherscan.io/tx/",
    },
    arbitrumSepolia: {
        address: "0x9E36CB86a159d479cEd94Fa05036f235Ac40E1d5", // Placeholder
        chainId: 421614,
        networkName: "Arbitrum Sepolia",
        explorerUrl: "https://sepolia.arbiscan.io/tx/",
    },
} as const;

export const HYPERLIQUID_DEPOSIT_CONTRACTS = {
    arbitrum: {
        address: "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7",
        chainId: 42161,
        networkName: "Arbitrum One",
        explorerUrl: "https://arbiscan.io/tx/",
    },
    arbitrumSepolia: {
        address: "0xa1a0440560739054305013054505060a0c000000", // Placeholder
        chainId: 421614,
        networkName: "Arbitrum Sepolia",
        explorerUrl: "https://sepolia.arbiscan.io/tx/",
    }
} as const;

export const ERC20_ABI = [
    {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "transfer",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },],
        outputs: [{ name: "", type: "bool" }],
    },
] as const;

export const DEPOSIT_CONTRACT_ABI = [
    {
        inputs: [
            { internalType: "address", name: "currency", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "uint256", name: "broker", type: "uint256" },
        ],
        name: "deposit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "broker", type: "uint256" }],
        name: "depositNative",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "currency", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "uint256", name: "broker", type: "uint256" },
        ],
        name: "depositV2",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "currency", type: "address" }],
        name: "balance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "paused",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "fees",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const TOKEN_CONFIG = {
    ethereum: {
        USDT: {
            address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            decimals: 6,
            symbol: "USDT",
        },
        USDC: {
            address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
            decimals: 6,
            symbol: "USDC",
        },
        ETH: {
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            symbol: "ETH",
        },
    },
    arbitrum: {
        USDT: {
            address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
            decimals: 6,
            symbol: "USDT",
        },
        USDC: {
            address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            decimals: 6,
            symbol: "USDC",
        },
        ETH: {
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            symbol: "ETH",
        },
    },
    bnb: {
        USDT: {
            address: "0x55d398326f99059fF775485246999027B3197955",
            decimals: 18,
            symbol: "USDT",
        },
        USDC: {
            address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
            decimals: 18,
            symbol: "USDC",
        },
        BNB: {
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            symbol: "BNB",
        },
    },
    sepolia: {
        USDT: { address: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", decimals: 6, symbol: "USDT" },
        USDC: { address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6, symbol: "USDC" },
        ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18, symbol: "ETH" },
    },
    arbitrumSepolia: {
        USDT: { address: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06", decimals: 6, symbol: "USDT" }, // Placeholder
        USDC: { address: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", decimals: 6, symbol: "USDC" },
        ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18, symbol: "ETH" },
    },
    solana: {
        USDC: {
            mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            decimals: 6,
            symbol: "USDC",
            tokenVault: "8MW41tFAUMEAw7b9RSoQkB9QottxmKwALcy6FAw3caTM",
            tokenVaultAuthority: "7LXYHBkwLjojcg4Xh3MxoqjcmKWegWXTffPj8ymtvf1G",
            bank: "J44aHPnvJgMGPETFR8LkfmYpveiHTQCKjnwwWAFbv3KQ",
        },
        USDT: {
            mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
            decimals: 6,
            symbol: "USDT",
            tokenVault: "3oEw1xjhLvKS5k4CqFGcEPhKHEa3tkz5xK6wJcTGFqES",
            tokenVaultAuthority: "2kzXy9ZRPKSBLQH3QQRX9wiHzdJes78wdwdsck9q3vPv",
            bank: "At2UJcLiStb6PPhgFMcwovkBecwjocAWEAaDm9gcPoGF",
        },
        SOL: {
            mint: "So11111111111111111111111111111111111111112",
            decimals: 9,
            symbol: "SOL",
            tokenVault: null, // Native SOL goes to solVault
        },
    },
} as const;
