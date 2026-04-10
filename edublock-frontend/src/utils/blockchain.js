/**
 * Blockchain Explorer Utility
 * Provides URLs for viewing transactions on various blockchain explorers
 */

// Supported networks configuration
const NETWORKS = {
    ethereum: {
        mainnet: 'https://etherscan.io',
        sepolia: 'https://sepolia.etherscan.io',
        goerli: 'https://goerli.etherscan.io',
    },
    polygon: {
        mainnet: 'https://polygonscan.com',
        mumbai: 'https://mumbai.polygonscan.com',
    },
    bsc: {
        mainnet: 'https://bscscan.com',
        testnet: 'https://testnet.bscscan.com',
    },
};

// Default network - change this based on your deployment
const DEFAULT_NETWORK = 'ethereum';
const DEFAULT_CHAIN = 'sepolia'; // Use 'mainnet' for production

/**
 * Get the transaction URL for a given transaction hash
 * @param {string} txHash - The transaction hash
 * @param {string} network - The network (ethereum, polygon, bsc)
 * @param {string} chain - The chain (mainnet, sepolia, mumbai, etc.)
 * @returns {string} The explorer URL for the transaction
 */
export const getTransactionUrl = (txHash, network = DEFAULT_NETWORK, chain = DEFAULT_CHAIN) => {
    const baseUrl = NETWORKS[network]?.[chain] || NETWORKS.ethereum.sepolia;
    return `${baseUrl}/tx/${txHash}`;
};

/**
 * Get the address URL for a given wallet/contract address
 * @param {string} address - The wallet or contract address
 * @param {string} network - The network
 * @param {string} chain - The chain
 * @returns {string} The explorer URL for the address
 */
export const getAddressUrl = (address, network = DEFAULT_NETWORK, chain = DEFAULT_CHAIN) => {
    const baseUrl = NETWORKS[network]?.[chain] || NETWORKS.ethereum.sepolia;
    return `${baseUrl}/address/${address}`;
};

/**
 * Open transaction in blockchain explorer (new tab)
 * @param {string} txHash - The transaction hash
 */
export const openTransactionInExplorer = (txHash) => {
    const url = getTransactionUrl(txHash);
    window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Get short version of hash for display
 * @param {string} hash - The full hash
 * @param {number} startChars - Characters to show at start
 * @param {number} endChars - Characters to show at end
 * @returns {string} Shortened hash like "0x1234...abcd"
 */
export const shortenHash = (hash, startChars = 6, endChars = 4) => {
    if (!hash || hash.length < startChars + endChars) return hash;
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
};

/**
 * Validate if a string is a valid transaction hash
 * @param {string} hash - The hash to validate
 * @returns {boolean} True if valid hash format
 */
export const isValidTxHash = (hash) => {
    if (!hash) return false;
    // Ethereum tx hash: 66 characters (0x + 64 hex chars)
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

/**
 * Get network display name
 * @param {string} network - Network key
 * @param {string} chain - Chain key
 * @returns {string} Human readable network name
 */
export const getNetworkDisplayName = (network = DEFAULT_NETWORK, chain = DEFAULT_CHAIN) => {
    const names = {
        'ethereum-mainnet': 'Ethereum Mainnet',
        'ethereum-sepolia': 'Sepolia Testnet',
        'ethereum-goerli': 'Goerli Testnet',
        'polygon-mainnet': 'Polygon Mainnet',
        'polygon-mumbai': 'Polygon Mumbai',
        'bsc-mainnet': 'BNB Chain',
        'bsc-testnet': 'BNB Testnet',
    };
    return names[`${network}-${chain}`] || 'Unknown Network';
};

export default {
    getTransactionUrl,
    getAddressUrl,
    openTransactionInExplorer,
    shortenHash,
    isValidTxHash,
    getNetworkDisplayName,
    NETWORKS,
    DEFAULT_NETWORK,
    DEFAULT_CHAIN,
};
