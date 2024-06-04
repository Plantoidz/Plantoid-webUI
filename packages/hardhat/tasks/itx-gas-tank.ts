import '@nomiclabs/hardhat-web3'
import { task } from 'hardhat/config'
import '@nomiclabs/hardhat-ethers'

task('itx-gas-tank', 'ITX: check ITX balance for your address')
    .setAction(async (taskArgs, { ethers,network}) => {
        console.log('Supported networks are: mainnet, ropsten, rinkeby, kovan, goerli')
        console.log('Checking ITX gas tank for ', network.name)

        const itx = new ethers.providers.InfuraProvider(
            network.name,
            process.env.INFURA_API_KEY
        )
        const accounts = await ethers.getSigners()
        const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, itx)
        console.log('Checking balance for: ', signer.address)
        const response = await itx.send('relay_getBalance', [signer.address])

        console.log(`Your current ITX balance is: ${response.balance}`)
    })
