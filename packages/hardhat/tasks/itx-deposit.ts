import '@nomiclabs/hardhat-web3'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'

task('itx-deposit', 'ITX: Deposit founds to ITX')
    .addOptionalParam<string>('amount', 'Amount to deposit to ITX for your address', '1')
    .setAction(async (taskArgs, { ethers,network}) => {
        console.log('Supported networks are: mainnet, ropsten, rinkeby, kovan, goerli')
        console.log('Depositing ITX gas on: ', network.name)

        const itx = new ethers.providers.InfuraProvider(
            network.name,
            process.env.INFURA_API_KEY
        )
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, itx) // TODO try to get from mnemonic also

        const tx = await signer.sendTransaction({
            // ITX deposit contract (same address for all public Ethereum networks)
            to: '0x015C7C7A7D65bbdb117C573007219107BD7486f9',
            value: ethers.utils.parseUnits(taskArgs.amount, 'ether'),
            maxFeePerGas: ethers.utils.parseUnits('700', 'gwei'),
            maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
        })
        console.log('Waiting for transaction to be mined: ', tx.hash)

        await tx.wait()

        console.log('Transaction mined it takes approximately 10 blocks to be shown on infura relay')
    })
