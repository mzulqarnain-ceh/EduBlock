import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export const useWallet = () => {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState(null);

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts',
                });

                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const network = await provider.getNetwork();

                setAccount(accounts[0]);
                setProvider(provider);
                setSigner(signer);
                setChainId(network.chainId);

                return accounts[0];
            } catch (error) {
                console.error('Error connecting wallet:', error);
                throw error;
            }
        } else {
            throw new Error('MetaMask is not installed');
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setProvider(null);
        setSigner(null);
        setChainId(null);
    };

    useEffect(() => {
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                } else {
                    disconnectWallet();
                }
            });

            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });
        }

        return () => {
            if (typeof window.ethereum !== 'undefined') {
                window.ethereum.removeAllListeners('accountsChanged');
                window.ethereum.removeAllListeners('chainChanged');
            }
        };
    }, []);

    return {
        account,
        provider,
        signer,
        chainId,
        connectWallet,
        disconnectWallet,
    };
};

export const useBlockchain = () => {
    const { provider, signer } = useWallet();

    const verifyCertificate = async (certificateId) => {
        if (!provider) {
            throw new Error('Wallet not connected');
        }

        try {
            // TODO: Replace with actual smart contract interaction
            // const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            // const result = await contract.verifyCertificate(certificateId);

            // Mock verification for now
            return {
                valid: true,
                studentName: 'John Doe',
                courseName: 'Blockchain Development',
                issueDate: '2025-01-15',
                institution: 'Tech University',
                grade: 'A+',
                hash: certificateId,
            };
        } catch (error) {
            console.error('Error verifying certificate:', error);
            throw error;
        }
    };

    const issueCertificate = async (certificateData) => {
        if (!signer) {
            throw new Error('Wallet not connected');
        }

        try {
            // TODO: Replace with actual smart contract interaction
            // const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
            // const tx = await contract.issueCertificate(certificateData);
            // await tx.wait();

            // Mock transaction for now
            await new Promise((resolve) => setTimeout(resolve, 2000));

            return {
                success: true,
                txHash: '0x' + Math.random().toString(16).substring(2),
            };
        } catch (error) {
            console.error('Error issuing certificate:', error);
            throw error;
        }
    };

    return {
        verifyCertificate,
        issueCertificate,
    };
};
