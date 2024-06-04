import { randomBytes } from 'crypto'

export const getChainID = (chain: string) => {
    switch (chain) {
    case 'mainnet':
        return 1
    case 'kovan':
        return 42
    case 'rinkeby':
        return 4
    case 'goerli':
        return 5
    case 'ropsten':
        return 3
    case 'matic':
        return 137
    case 'sepolia':
        return 11155111
    default:
        throw new Error('You need to set correct network')
    }
}

export const generateNonce = async () => {
    const buffer = await randomBytes(4)
    return Number('0x' + buffer.toString('hex'))
}
