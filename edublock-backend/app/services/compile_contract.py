"""
Compile the Solidity smart contract using py-solc-x.
Outputs ABI and Bytecode JSON files for deployment.
"""
import json
import os
from pathlib import Path

def compile_contract():
    """Compile EduBlockCertificate.sol and save ABI + bytecode."""
    from solcx import compile_standard, install_solc

    # Install Solidity compiler v0.8.19
    print("📦 Installing Solidity compiler v0.8.19...")
    install_solc("0.8.19")

    # Read the contract source
    contracts_dir = Path(__file__).parent.parent.parent / "contracts"
    contract_path = contracts_dir / "EduBlockCertificate.sol"

    with open(contract_path, "r") as f:
        contract_source = f.read()

    # Compile
    print("⚙️  Compiling EduBlockCertificate.sol...")
    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {
                "EduBlockCertificate.sol": {"content": contract_source}
            },
            "settings": {
                "outputSelection": {
                    "*": {
                        "*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
                    }
                }
            },
        },
        solc_version="0.8.19",
    )

    # Extract ABI and Bytecode
    contract_data = compiled["contracts"]["EduBlockCertificate.sol"]["EduBlockCertificate"]
    abi = contract_data["abi"]
    bytecode = contract_data["evm"]["bytecode"]["object"]

    # Save to files
    output_dir = contracts_dir / "compiled"
    output_dir.mkdir(exist_ok=True)

    abi_path = output_dir / "EduBlockCertificate_abi.json"
    bytecode_path = output_dir / "EduBlockCertificate_bytecode.json"

    with open(abi_path, "w") as f:
        json.dump(abi, f, indent=2)

    with open(bytecode_path, "w") as f:
        json.dump({"bytecode": bytecode}, f, indent=2)

    print(f"✅ ABI saved to: {abi_path}")
    print(f"✅ Bytecode saved to: {bytecode_path}")
    print(f"✅ Contract compiled successfully!")

    return abi, bytecode


if __name__ == "__main__":
    compile_contract()
