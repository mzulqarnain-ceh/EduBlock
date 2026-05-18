"""
Blockchain Service — Connects to Ganache (local Ethereum) via Web3.py
Handles: contract deployment, degree minting, verification, and revocation.
"""
import json
import os
from pathlib import Path
from typing import Optional
from web3 import Web3
from app.config import get_settings

settings = get_settings()


class BlockchainService:
    """Service class for all blockchain interactions."""

    def __init__(self):
        self.w3: Optional[Web3] = None
        self.contract = None
        self.account = None
        self.private_key = None
        self._connected = False

    def connect(self) -> bool:
        """Connect to the blockchain node (Ganache)."""
        try:
            self.w3 = Web3(Web3.HTTPProvider(settings.BLOCKCHAIN_RPC_URL))

            if not self.w3.is_connected():
                print("❌ Cannot connect to blockchain node at", settings.BLOCKCHAIN_RPC_URL)
                return False

            # Set up deployer account
            if settings.DEPLOYER_PRIVATE_KEY:
                self.private_key = settings.DEPLOYER_PRIVATE_KEY
                self.account = self.w3.eth.account.from_key(self.private_key)
                print(f"✅ Blockchain connected! Account: {self.account.address}")
            else:
                # Use first Ganache account if no private key configured
                accounts = self.w3.eth.accounts
                if accounts:
                    self.account = type('Account', (), {'address': accounts[0]})()
                    # Ganache accounts don't need private key for eth.send_transaction
                    self.private_key = None
                    print(f"✅ Blockchain connected! Using Ganache account: {accounts[0]}")
                else:
                    print("❌ No accounts available on blockchain node")
                    return False

            self._connected = True

            # Load contract if address is configured
            if settings.CONTRACT_ADDRESS:
                self._load_contract(settings.CONTRACT_ADDRESS)

            return True
        except Exception as e:
            print(f"❌ Blockchain connection error: {e}")
            self._connected = False
            return False

    def _load_contract(self, address: str):
        """Load an already-deployed contract by address."""
        abi = self._get_abi()
        if abi:
            self.contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(address),
                abi=abi
            )
            print(f"✅ Contract loaded at: {address}")

    def _get_abi(self) -> Optional[list]:
        """Read the compiled ABI from disk."""
        abi_path = Path(__file__).parent.parent.parent / "contracts" / "compiled" / "EduBlockCertificate_abi.json"
        if abi_path.exists():
            with open(abi_path, "r") as f:
                return json.load(f)
        print("⚠️  ABI file not found. Compile the contract first.")
        return None

    def _get_bytecode(self) -> Optional[str]:
        """Read compiled bytecode from disk."""
        bc_path = Path(__file__).parent.parent.parent / "contracts" / "compiled" / "EduBlockCertificate_bytecode.json"
        if bc_path.exists():
            with open(bc_path, "r") as f:
                data = json.load(f)
                return data["bytecode"]
        print("⚠️  Bytecode file not found. Compile the contract first.")
        return None

    def deploy_contract(self) -> Optional[str]:
        """Deploy the smart contract to the blockchain. Returns contract address."""
        if not self._connected:
            if not self.connect():
                return None

        abi = self._get_abi()
        bytecode = self._get_bytecode()

        if not abi or not bytecode:
            print("❌ Cannot deploy: ABI or bytecode missing. Run compile_contract.py first.")
            return None

        try:
            contract_class = self.w3.eth.contract(abi=abi, bytecode=bytecode)

            if self.private_key:
                # Build and sign transaction (for production/configured private key)
                tx = contract_class.constructor().build_transaction({
                    "from": self.account.address,
                    "nonce": self.w3.eth.get_transaction_count(self.account.address),
                    "gas": 3000000,
                    "gasPrice": self.w3.eth.gas_price,
                })
                signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            else:
                # Ganache unlocked account mode
                tx_hash = contract_class.constructor().transact({"from": self.account.address})

            # Wait for deployment receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            contract_address = receipt.contractAddress

            # Load the deployed contract
            self.contract = self.w3.eth.contract(address=contract_address, abi=abi)
            print(f"✅ Contract deployed at: {contract_address}")
            print(f"   Tx Hash: {receipt.transactionHash.hex()}")
            print(f"   Gas Used: {receipt.gasUsed}")

            return contract_address

        except Exception as e:
            print(f"❌ Deployment error: {e}")
            return None

    def mint_degree(self, token_id: int, degree_hash: str) -> Optional[dict]:
        """
        Mint a degree certificate on the blockchain.
        Returns dict with tx_hash, block_number, gas_used, etc.
        """
        if not self.contract:
            print("[Warning] No contract loaded. Skipping blockchain mint.")
            return None

        try:
            # Convert hex string hash to bytes32
            if degree_hash.startswith("0x"):
                degree_hash = degree_hash[2:]
            degree_hash_bytes = bytes.fromhex(degree_hash)

            if self.private_key:
                # Signed transaction
                tx = self.contract.functions.mintDegree(
                    token_id, degree_hash_bytes
                ).build_transaction({
                    "from": self.account.address,
                    "nonce": self.w3.eth.get_transaction_count(self.account.address),
                    "gas": 200000,
                    "gasPrice": self.w3.eth.gas_price,
                })
                signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            else:
                # Ganache unlocked account
                tx_hash = self.contract.functions.mintDegree(
                    token_id, degree_hash_bytes
                ).transact({"from": self.account.address})

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

            raw_hash = receipt.transactionHash.hex()
            tx_hash_str = raw_hash if raw_hash.startswith("0x") else "0x" + raw_hash
            result = {
                "tx_hash": tx_hash_str,
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
                "status": "confirmed" if receipt.status == 1 else "failed",
                "from_address": self.account.address,
            }
            print(f"✅ Degree minted on blockchain! Token #{token_id}, Tx: {result['tx_hash'][:16]}...")
            return result

        except Exception as e:
            print(f"❌ Mint error: {e}")
            return None

    def verify_on_chain(self, degree_hash: str) -> Optional[dict]:
        """
        Verify if a degree hash exists on the blockchain.
        Returns dict with exists, isRevoked, tokenId.
        """
        if not self.contract:
            return None

        try:
            if degree_hash.startswith("0x"):
                degree_hash = degree_hash[2:]
            degree_hash_bytes = bytes.fromhex(degree_hash)

            exists, is_revoked, token_id = self.contract.functions.verifyDegree(
                degree_hash_bytes
            ).call()

            return {
                "exists": exists,
                "is_revoked": is_revoked,
                "token_id": token_id,
                "blockchain_verified": True,
            }
        except Exception as e:
            print(f"❌ Verify error: {e}")
            return None

    def revoke_on_chain(self, token_id: int) -> Optional[dict]:
        """Revoke a degree on the blockchain."""
        if not self.contract:
            return None

        try:
            if self.private_key:
                tx = self.contract.functions.revokeDegree(token_id).build_transaction({
                    "from": self.account.address,
                    "nonce": self.w3.eth.get_transaction_count(self.account.address),
                    "gas": 100000,
                    "gasPrice": self.w3.eth.gas_price,
                })
                signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
                tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            else:
                tx_hash = self.contract.functions.revokeDegree(token_id).transact(
                    {"from": self.account.address}
                )

            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            print(f"✅ Degree #{token_id} revoked on blockchain!")
            raw_hash = receipt.transactionHash.hex()
            tx_hash_str = raw_hash if raw_hash.startswith("0x") else "0x" + raw_hash
            return {
                "tx_hash": tx_hash_str,
                "block_number": receipt.blockNumber,
                "gas_used": receipt.gasUsed,
            }
        except Exception as e:
            print(f"❌ Revoke error: {e}")
            return None

    @property
    def is_connected(self) -> bool:
        return self._connected and self.w3 and self.w3.is_connected()


# Singleton instance
blockchain = BlockchainService()
