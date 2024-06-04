import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

export default async function signWhitelist(
    name: string,
    chainId: number,
    contractAddress: string,
    whitelistKey: SignerWithAddress,
    mintingAddress: string,
    nonce: number
) {
    // Domain data should match whats specified in the DOMAIN_SEPARATOR constructed in the contract
    // https://github.com/msfeldstein/EIP712-whitelisting/blob/main/contracts/EIP712Whitelisting.sol#L33-L43
    const domain = {
        name,
        version: '1',
        chainId,
        verifyingContract: contractAddress,
    }

    // The types should match the TYPEHASH specified in the contract
    // https://github.com/msfeldstein/EIP712-whitelisting/blob/main/contracts/EIP712Whitelisting.sol#L27-L28
    const types = {
        Minter: [
            { name: 'wallet', type: 'address' },
            { name: 'nonce', type: 'uint256' },
        ],
    }

    const sig = await whitelistKey._signTypedData(domain, types, {
        wallet: mintingAddress,
        nonce,
    })

    return sig
}
