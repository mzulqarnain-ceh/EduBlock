import os
import sys

# Add current dir to pythonpath
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.blockchain_service import blockchain

print("Connecting to Sepolia via Alchemy...")
if blockchain.connect():
    print("Checking balance...")
    balance_wei = blockchain.w3.eth.get_balance(blockchain.account.address)
    balance_eth = blockchain.w3.from_wei(balance_wei, 'ether')
    print(f"Balance for {blockchain.account.address}: {balance_eth} ETH")
    
    if balance_eth > 0:
        print("Deploying contract to Sepolia... (this may take a minute)")
        address = blockchain.deploy_contract()
        if address:
            print(f"DEPLOYMENT SUCCESS! Contract Address: {address}")
        else:
            print("Deployment failed.")
    else:
        print("INSUFFICIENT FUNDS. Balance is 0.")
else:
    print("Failed to connect.")
