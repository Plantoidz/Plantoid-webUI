import '@nomiclabs/hardhat-web3'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'
import { getChainID } from './utils'

task('itx-demo', 'ITX: Deposit founds to ITX')
    .addOptionalParam<string>('amount', 'Amount to deposit to ITX for your address', '0.1')
    .setAction(async (taskArgs, { ethers,network}) => {
        console.log('Supported networks are: mainnet, ropsten, rinkeby, kovan, goerli')
        console.log('ITX on: ', network.name)
        const itx = new ethers.providers.InfuraProvider(
            network.name,
            process.env.INFURA_API_KEY
        )

        const iface = new ethers.utils.Interface(['function echo(string message)'])
        const data = iface.encodeFunctionData('echo', ['Hello world 3!  '])
        const tx = {
            to: '0x6663184b3521bF1896Ba6e1E776AB94c317204B6',
            data: data,
            gas: '800000',
            schedule: 'fast'
        }
        console.log(tx)

        const relayTransactionHash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['address', 'bytes', 'uint', 'uint', 'string'],
                [tx.to, tx.data, tx.gas, getChainID(network.name), tx.schedule] // Rinkeby chainId is 4
            )
        )

        const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, itx) // TODO try to get from mnemonic also
        const signature = await signer.signMessage(ethers.utils.arrayify(relayTransactionHash))

        const {relayTransaction} = await itx.send('relay_sendTransaction', [tx, signature])
        console.log(`ITX relay hash: ${relayTransaction}`)

        // const statusResponse = await itx.send("relay_getTransactionStatus", [relayTransaction.hash]);
        // console.log(statusResponse);
    })
