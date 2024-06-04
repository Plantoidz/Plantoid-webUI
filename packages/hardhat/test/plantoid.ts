import { ethers } from 'hardhat'
import { solidity } from 'ethereum-waffle'
import { use, expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { Plantoid } from '../typechain/Plantoid'
import { PlantoidSpawn } from '../typechain/PlantoidSpawn'
import { PlantoidMetadata } from '../typechain/PlantoidMetadata'
import { Wallet } from '@ethersproject/wallet'
import { ContractFactory, ContractTransaction } from '@ethersproject/contracts'
import { BaseProvider } from '@ethersproject/providers'

use(solidity)

async function blockTime() {
    const block = await ethers.provider.getBlock('latest')
    return block.timestamp
}

const errorMessages = {
    belowThreshold: 'ThresholdNotReached()',
    notInVoting: 'NotInVoting()',
    alreadyVoted: 'AlreadyVoted()',
    notOwner: 'NotOwner()',
    cannotSpawn: 'CannotSpawn()',
    notArtist: 'NotArtist()',
    invalidProposal: 'InvalidProposal()',
    vetoed: 'Vetoed()',
    notMinted: 'NotMinted()',
    alreadyRevealed: 'AlreadyRevealed()',
    cannotAdvance: 'CannotAdvance()',
    cannotVeto: 'CannotVeto()',
    stillProposing: 'StillProposing()',
    nothingToWithdraw: 'NothingToWithdraw()',
}

export const fastForwardTime = async (seconds: number) => {
    await ethers.provider.send('evm_increaseTime', [seconds])
    await ethers.provider.send('evm_mine', [])
}
const zeroAddress = '0x0000000000000000000000000000000000000000'

const testKey = '0xdd631135f3a99e4d747d763ab5ead2f2340a69d2a90fab05e20104731365fde3'

const config = {
    depositThreshold: ethers.utils.parseEther('0.001'),
    threshold: ethers.utils.parseEther('1'),
    name: 'Plantoid',
    prereveal: 'preveal',
    symbol: 'LIFE',
    proposalPeriod: 1000,
    votingPeriod: 1000,
    gracePeriod: 500,
}

describe('Plantoid NFT', function () {
    let plantoidInstance: Plantoid
    let plantoidSpawn: PlantoidSpawn
    let plantoidAsApplicant: Plantoid
    let plantoidAsSupporter: Plantoid
    let plantoidAsOracle: Plantoid
    let plantoidAsArtist: Plantoid

    let plantoidMetadataOracle: PlantoidMetadata

    let plantoidOracle: Wallet
    let firstCreator: SignerWithAddress
    let applicant: SignerWithAddress
    let supporter: SignerWithAddress
    let secondCreator: SignerWithAddress

    let Plantoid: ContractFactory
    let PlantoidSpawn: ContractFactory
    let PlantoidMetadataOracle: ContractFactory

    let provider: BaseProvider

    let accounts: SignerWithAddress[]

    let initAction: any

    this.beforeAll(async function () {
        const adminAbstract = new ethers.Wallet(testKey)
        provider = ethers.provider
        plantoidOracle = await adminAbstract.connect(provider)
        ;[firstCreator, applicant, supporter, secondCreator] = await ethers.getSigners()
        await firstCreator.sendTransaction({ to: plantoidOracle.address, value: ethers.utils.parseEther('1') })
        accounts = await ethers.getSigners()
        Plantoid = await ethers.getContractFactory('Plantoid')
        PlantoidSpawn = await ethers.getContractFactory('PlantoidSpawn')
        const plantoidAbstract = (await Plantoid.deploy()) as Plantoid
        plantoidSpawn = (await PlantoidSpawn.deploy(plantoidAbstract.address)) as PlantoidSpawn
        initAction = plantoidAbstract.interface.encodeFunctionData('init', [
            plantoidOracle.address,
            firstCreator.address,
            zeroAddress,
            config.name,
            config.symbol,
            config.prereveal,
            ethers.utils.defaultAbiCoder.encode(
                ['uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
                [config.depositThreshold, config.threshold, config.proposalPeriod, config.votingPeriod, config.gracePeriod]
            ),
        ])
        PlantoidMetadataOracle = await ethers.getContractFactory('PlantoidMetadata')
        plantoidMetadataOracle = (await PlantoidMetadataOracle.deploy()) as PlantoidMetadata
        await plantoidMetadataOracle.transferOwnership(plantoidOracle.address)
    })

    beforeEach(async function () {
        const salt = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['uint256'], [Math.round(Math.random() * 100000)]))
        await plantoidSpawn.spawnPlantoid(salt, initAction)
        const plantoid = await plantoidSpawn.plantoidAddress(firstCreator.address, salt)
        plantoidInstance = (await Plantoid.attach(plantoid.addr)) as Plantoid

        plantoidAsSupporter = plantoidInstance.connect(supporter)
        plantoidAsApplicant = plantoidInstance.connect(applicant)
        plantoidAsOracle = plantoidInstance.connect(plantoidOracle)
        plantoidAsArtist = plantoidInstance.connect(firstCreator)
    })

    describe('constructor', function () {
        it('verify deployment parameters', async function () {
            expect(await plantoidInstance.artist()).to.equal(firstCreator.address)
            expect(await plantoidInstance.plantoidAddress()).to.equal(plantoidOracle.address)
            expect(await plantoidMetadataOracle.owner()).to.equal(plantoidOracle.address)
        })

        describe('donation', function () {
            it('Allows supporter to donate ETH', async function () {
                const balanceBefore = await provider.getBalance(plantoidInstance.address)
                await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
                const balanceAfter = await provider.getBalance(plantoidInstance.address)
                expect(balanceBefore).to.equal(0)
                expect(balanceAfter).to.equal(ethers.utils.parseEther('1'))
            })

            it('Mints an NFT on donation', async function () {
                await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
                expect(await plantoidInstance.balanceOf(supporter.address)).to.equal(1)
                expect(await plantoidInstance.ownerOf(1)).to.equal(supporter.address)
            })

            it('Does not mint NFT if donation is below threshold', async function () {
                await supporter.sendTransaction({ to: plantoidInstance.address, value: config.depositThreshold.sub(1) })
                expect(await plantoidInstance.balanceOf(supporter.address)).to.equal(0)
            })

            it('Mints an NFT with prereveal uri', async function () {
                await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
                expect(await plantoidInstance.tokenURI(1)).to.equal(config.prereveal)
            })

            it('Emits an incrementing tokenid on deposits', async function () {
                const tx = await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
                const receipt = await ethers.provider.getTransactionReceipt(tx.hash)
                const depositAbi = ['event Deposit(uint256 amount, address sender, uint256 indexed tokenId)']
                let iface = new ethers.utils.Interface(depositAbi)
                let log = iface.parseLog(receipt.logs[0])
                expect(log.args.tokenId).to.equal(1)
                const tx2 = await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
                const receipt2 = await ethers.provider.getTransactionReceipt(tx2.hash)
                let log2 = iface.parseLog(receipt2.logs[0])
                expect(log2.args.tokenId).to.equal(2)
            })
        })
    })

    describe('setting metadata', function () {
        it('Allows supporter to set metadata with signature from plantoid oracle', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
            const tokenId = 1
            const testUri = 'test'
            const msgHash = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(['uint256', 'string', 'address'], [tokenId, testUri, plantoidInstance.address])
            )
            const sig = await plantoidOracle.signMessage(msgHash)
            await plantoidAsSupporter.revealContent(tokenId, testUri, sig)
            expect(await plantoidInstance.tokenURI(1)).to.equal('test')
            expect(await plantoidInstance.revealed(1)).to.equal(true)
        })
        it('Fails if nft not minted', async function () {
            const tokenId = 1
            const testUri = 'test'
            const msgHash = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(['uint256', 'string', 'address'], [tokenId, testUri, plantoidInstance.address])
            )
            const sig = await plantoidOracle.signMessage(msgHash)
            await expect(plantoidAsSupporter.revealContent(tokenId, testUri, sig)).to.be.revertedWith(errorMessages.notMinted)
        })
        it('Fails if already revealed', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
            const tokenId = 1
            const testUri = 'test'
            const msgHash = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(['uint256', 'string', 'address'], [tokenId, testUri, plantoidInstance.address])
            )
            const sig = await plantoidOracle.signMessage(msgHash)
            await plantoidAsSupporter.revealContent(tokenId, testUri, sig)
            await expect(plantoidAsSupporter.revealContent(tokenId, testUri, sig)).to.be.revertedWith(errorMessages.alreadyRevealed)
        })
        it('Fails if not signed by oracle', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('1') })
            const tokenId = 1
            const testUri = 'test'
            const msgHash = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(['uint256', 'string', 'address'], [tokenId, testUri, plantoidInstance.address])
            )
            const sig = await supporter.signMessage(msgHash)
            await expect(plantoidAsSupporter.revealContent(tokenId, testUri, sig)).to.be.revertedWith('Not signer')
        })
        it('Allows oracle to set prereveal URI', async function () {
            await plantoidAsOracle.setPrerevealURI('test2')
            expect(await plantoidInstance.prerevealUri()).to.equal('test2')
        })
        it('Does not allow anyone else to set prereveal URI', async function () {
            await expect(plantoidAsSupporter.setPrerevealURI('test2')).to.be.revertedWith('Ownable: caller is not the owner')
        })
    })

    describe('proposals, voting', function () {
        it('Allows people to submit prop if threshold is reached', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('3') })
            await plantoidAsApplicant.startProposals()
            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(0)
            expect(currentRoundState._state).to.equal(1)
            await plantoidAsApplicant.submitProposal('test.com')
            const currentRound = await plantoidAsApplicant.rounds(0)
            expect(currentRound.proposalCount).to.equal(1)
            const proposal = await plantoidAsApplicant.viewProposals(0, 0)
            expect(proposal.uri).to.equal('test.com')
            expect(proposal.proposer).to.equal(applicant.address)
        })

        it('Does not allow proposals to start until threshold reached', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.depositThreshold.sub(1) })
            await expect(plantoidAsApplicant.startProposals()).to.be.revertedWith(errorMessages.belowThreshold)
        })

        it('Does not allow advance round to be called before proposals started', async function () {
            await expect(plantoidAsApplicant.advanceRound()).to.be.revertedWith(errorMessages.cannotAdvance)
        })

        it('Start proposals moves funds to escrow', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold.mul(2) })
            await plantoidAsApplicant.startProposals()
            expect(await plantoidAsApplicant.escrow()).to.equal(config.threshold)
        })

        it('Cannot start proposals multiple times', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold.mul(2) })
            await plantoidAsApplicant.startProposals()
            await expect(plantoidAsApplicant.startProposals()).to.be.revertedWith(errorMessages.stillProposing)
        })

        it('Starts voting when proposal period over', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(0)
            expect(currentRoundState._state).to.equal(2)
        })

        it('Cannot start voting until proposal period over', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold.mul(2) })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')

            await expect(plantoidAsApplicant.advanceRound()).to.be.revertedWith(errorMessages.cannotAdvance)
        })

        it('Advance invalidates round if no proposals received', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(5)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)

            expect(await plantoidAsApplicant.escrow()).to.equal(0)
        })

        it('Allows round to move to grace once voting over', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(0)
            expect(currentRoundState._state).to.equal(3)
        })

        it('Cannot advance to grace until voting over', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)

            await expect(plantoidAsApplicant.advanceRound()).to.be.revertedWith(errorMessages.cannotAdvance)
        })

        it('Settles invalid immediately if no votes', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(5)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)
        })

        it('Does not allow advanceround to be called after grace', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await expect(plantoidAsApplicant.advanceRound()).to.be.revertedWith(errorMessages.cannotAdvance)
        })

        it('Allows round to move to be settled after grace', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsApplicant.settleRound()

            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(4)
            const lastRound = await plantoidAsApplicant.rounds(0)
            expect(lastRound.winningProposal).to.equal(0)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)
        })

        it('Does not allow artist to veto during proposals', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')
            await expect(plantoidAsArtist.vetoProposal(0)).to.be.revertedWith(errorMessages.cannotVeto)
        })

        it('Allows artist to veto during voting', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)

            await plantoidAsArtist.vetoProposal(0)
            const proposal = await plantoidAsApplicant.viewProposals(0, 0)
            expect(proposal.vetoed).to.equal(true)
        })

        it('Allows artist to veto during grace', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await plantoidAsArtist.vetoProposal(0)
            const proposal = await plantoidAsApplicant.viewProposals(0, 0)
            expect(proposal.vetoed).to.equal(true)
        })

        it('Does not allow anyone else to veto', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await expect(plantoidAsSupporter.vetoProposal(0)).to.be.revertedWith(errorMessages.notArtist)
            const proposal = await plantoidAsApplicant.viewProposals(0, 0)
            expect(proposal.vetoed).to.equal(false)
        })

        it('Settles invalid if tie', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await applicant.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await plantoidAsApplicant.submitVote(1)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsApplicant.settleRound()

            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(5)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)
        })

        it('Settles invalid if all vetoed', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await applicant.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await plantoidAsApplicant.submitVote(1)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()
            await plantoidAsArtist.vetoProposal(0)
            await plantoidAsArtist.vetoProposal(1)

            await fastForwardTime(config.gracePeriod)

            await plantoidAsApplicant.settleRound()

            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(5)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)
        })

        it('Settles invalid if only vote with proposal vetoed', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await applicant.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()
            await plantoidAsArtist.vetoProposal(0)

            await fastForwardTime(config.gracePeriod)

            await plantoidAsApplicant.settleRound()

            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(5)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)
        })

        it('Settles valid if non vetoed proposal has votes', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await applicant.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await plantoidAsApplicant.submitVote(1)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()
            await plantoidAsArtist.vetoProposal(0)

            await fastForwardTime(config.gracePeriod)

            await plantoidAsApplicant.settleRound()

            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(4)
            const lastRound = await plantoidAsApplicant.rounds(0)
            expect(lastRound.winningProposal).to.equal(1)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)
        })

        it('Transfers percentages when first generation', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)
            // const artistBalanceBefore = await provider.getBalance(firstCreator.address)
            // const applicantBalanceBefore = await provider.getBalance(applicant.address)
            const artistBalanceBefore = await plantoidInstance.withdrawableBalances(firstCreator.address)
            const applicantBalanceBefore = await plantoidInstance.withdrawableBalances(applicant.address)

            await plantoidAsSupporter.settleRound()

            // const artistBalanceAfter = await provider.getBalance(firstCreator.address)
            // const applicantBalanceAfter = await provider.getBalance(applicant.address)
            const artistBalanceAfter = await plantoidInstance.withdrawableBalances(firstCreator.address)
            const applicantBalanceAfter = await plantoidInstance.withdrawableBalances(applicant.address)

            // console.log({
            //     artistBalanceBefore: ethers.utils.formatEther(artistBalanceBefore),
            //     artistBalanceAfter: ethers.utils.formatEther(artistBalanceAfter),
            //     applicantBalanceBefore: ethers.utils.formatEther(applicantBalanceBefore),
            //     applicantBalanceAfter: ethers.utils.formatEther(applicantBalanceAfter),
            // })

            expect(artistBalanceAfter.sub(artistBalanceBefore)).to.equal(config.threshold.div(10))
            expect(applicantBalanceAfter.sub(applicantBalanceBefore)).to.equal(config.threshold.mul(9).div(10))
        })

        // Allows parties to withdraw
        it('Allows parties to withdraw', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold.mul(2) })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            const artistBalanceBefore = await provider.getBalance(firstCreator.address)
            const applicantBalanceBefore = await provider.getBalance(applicant.address)
            const escrowBefore = await plantoidInstance.escrow()

            await plantoidAsSupporter.withdrawFor(firstCreator.address)
            await plantoidAsSupporter.withdrawFor(applicant.address)

            const artistBalanceAfter = await provider.getBalance(firstCreator.address)
            const applicantBalanceAfter = await provider.getBalance(applicant.address)
            const escrowAfter = await plantoidInstance.escrow()

            expect(artistBalanceAfter.sub(artistBalanceBefore)).to.equal(config.threshold.div(10))
            expect(applicantBalanceAfter.sub(applicantBalanceBefore)).to.equal(config.threshold.mul(9).div(10))
            expect(escrowBefore.sub(escrowAfter)).to.equal(config.threshold)

            await expect(plantoidAsSupporter.withdrawFor(supporter.address)).to.be.revertedWith(errorMessages.nothingToWithdraw)
        })

        // Allows new round to start before spawn if threshold met
        it('Allows new round to start before withdrawl if threshold still met', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold.mul(2) })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            await plantoidAsApplicant.startProposals()
            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(1)
        })

        it('Does not allow new round to start using escrowed funds', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            await expect(plantoidAsApplicant.startProposals()).to.be.revertedWith(errorMessages.belowThreshold)
            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)
        })

        it('Winner can spawn once', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            await plantoidAsApplicant.spawn(
                0,
                plantoidAsOracle.address,
                ethers.utils.parseEther('0.01'),
                ethers.utils.parseEther('2'),
                config.proposalPeriod,
                config.votingPeriod,
                config.gracePeriod,
                'Plantoid2',
                'P2',
                'prereveal2'
            )

            const salt = await plantoidAsApplicant.salts(0)
            const newPlantoidAddress = await plantoidSpawn.plantoidAddress(plantoidInstance.address, salt)
            expect(newPlantoidAddress.exists).to.equal(true)
        })
        it('Winner cannot spawn multiple times', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            await plantoidAsApplicant.spawn(
                0,
                plantoidAsOracle.address,
                ethers.utils.parseEther('0.01'),
                ethers.utils.parseEther('2'),
                config.proposalPeriod,
                config.votingPeriod,
                config.gracePeriod,
                'Plantoid2',
                'P2',
                'prereveal2'
            )
            await expect(
                plantoidAsApplicant.spawn(
                    0,
                    plantoidAsOracle.address,
                    ethers.utils.parseEther('0.01'),
                    ethers.utils.parseEther('2'),
                    config.proposalPeriod,
                    config.votingPeriod,
                    config.gracePeriod,
                    'Plantoid2',
                    'P2',
                    'prereveal2'
                )
            ).to.be.revertedWith(errorMessages.cannotSpawn)
        })
        it('Non winners cannot spawn', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            await expect(
                plantoidAsSupporter.spawn(
                    0,
                    plantoidAsOracle.address,
                    ethers.utils.parseEther('0.01'),
                    ethers.utils.parseEther('2'),
                    config.proposalPeriod,
                    config.votingPeriod,
                    config.gracePeriod,
                    'Plantoid2',
                    'P2',
                    'prereveal2'
                )
            ).to.be.revertedWith(errorMessages.cannotSpawn)
        })

        it('Cannot spawn if settled invalid', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()
            const lastRoundState = await plantoidAsApplicant.roundState(0)
            expect(lastRoundState).to.equal(5)
            const lastRound = await plantoidAsApplicant.rounds(0)

            const currentRoundState = await plantoidAsApplicant.currentRoundState()
            expect(currentRoundState._round).to.equal(1)
            expect(currentRoundState._state).to.equal(0)

            await expect(
                plantoidAsApplicant.spawn(
                    0,
                    plantoidAsOracle.address,
                    ethers.utils.parseEther('0.01'),
                    ethers.utils.parseEther('2'),
                    config.proposalPeriod,
                    config.votingPeriod,
                    config.gracePeriod,
                    'Plantoid2',
                    'P2',
                    'prereveal2'
                )
            ).to.be.revertedWith(errorMessages.cannotSpawn)
        })

        it('Transfers percentages properly in second generation', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            await plantoidAsApplicant.spawn(
                0,
                plantoidAsOracle.address,
                ethers.utils.parseEther('0.01'),
                ethers.utils.parseEther('2'),
                config.proposalPeriod,
                config.votingPeriod,
                config.gracePeriod,
                'Plantoid2',
                'P2',
                'prereveal2'
            )

            const salt = await plantoidAsApplicant.salts(0)
            const newPlantoidAddress = await plantoidSpawn.plantoidAddress(plantoidInstance.address, salt)
            expect(newPlantoidAddress.exists).to.equal(true)

            const newThreshold = ethers.utils.parseEther('2')

            const newPlantoidInstance = (await Plantoid.attach(newPlantoidAddress.addr)) as Plantoid
            const newPlantoidAsApplicant = newPlantoidInstance.connect(secondCreator)
            const newPlantoidAsSupporter = newPlantoidInstance.connect(supporter)

            await supporter.sendTransaction({ to: newPlantoidInstance.address, value: ethers.utils.parseEther('2') })
            await newPlantoidAsApplicant.startProposals()
            await newPlantoidAsApplicant.submitProposal('test.com')
            await newPlantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await newPlantoidAsApplicant.advanceRound()

            await newPlantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await newPlantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            const firstPlantoidBalanceBefore = await newPlantoidInstance.withdrawableBalances(plantoidInstance.address)
            const artistBalanceBefore = await newPlantoidInstance.withdrawableBalances(applicant.address)
            const applicantBalanceBefore = await newPlantoidInstance.withdrawableBalances(secondCreator.address)

            await newPlantoidAsSupporter.settleRound()

            const firstPlantoidBalanceAfter = await newPlantoidInstance.withdrawableBalances(plantoidInstance.address)
            const artistBalanceAfter = await newPlantoidInstance.withdrawableBalances(applicant.address)
            const applicantBalanceAfter = await newPlantoidInstance.withdrawableBalances(secondCreator.address)

            expect(artistBalanceAfter.sub(artistBalanceBefore)).to.equal(newThreshold.div(10))
            expect(firstPlantoidBalanceAfter.sub(firstPlantoidBalanceBefore)).to.equal(newThreshold.div(10))
            expect(applicantBalanceAfter.sub(applicantBalanceBefore)).to.equal(newThreshold.mul(8).div(10))
        })

        it('Allows parties to withdraw second gen', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await plantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await plantoidAsSupporter.settleRound()

            await plantoidAsApplicant.spawn(
                0,
                plantoidAsOracle.address,
                ethers.utils.parseEther('0.01'),
                ethers.utils.parseEther('2'),
                config.proposalPeriod,
                config.votingPeriod,
                config.gracePeriod,
                'Plantoid2',
                'P2',
                'prereveal2'
            )

            const salt = await plantoidAsApplicant.salts(0)
            const newPlantoidAddress = await plantoidSpawn.plantoidAddress(plantoidInstance.address, salt)
            expect(newPlantoidAddress.exists).to.equal(true)

            const newThreshold = ethers.utils.parseEther('2')

            const newPlantoidInstance = (await Plantoid.attach(newPlantoidAddress.addr)) as Plantoid
            const newPlantoidAsApplicant = newPlantoidInstance.connect(secondCreator)
            const newPlantoidAsSupporter = newPlantoidInstance.connect(supporter)

            await supporter.sendTransaction({ to: newPlantoidInstance.address, value: ethers.utils.parseEther('2') })
            await newPlantoidAsApplicant.startProposals()
            await newPlantoidAsApplicant.submitProposal('test.com')
            await newPlantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await newPlantoidAsApplicant.advanceRound()

            await newPlantoidAsSupporter.submitVote(0)
            await fastForwardTime(config.votingPeriod)

            await newPlantoidAsApplicant.advanceRound()

            await fastForwardTime(config.gracePeriod)

            await newPlantoidAsSupporter.settleRound()

            const artistBalanceBefore = await provider.getBalance(applicant.address)
            const applicantBalanceBefore = await provider.getBalance(secondCreator.address)
            const firstPlantoidBalanceBefore = await provider.getBalance(plantoidInstance.address)

            await newPlantoidAsSupporter.withdrawFor(applicant.address)
            await newPlantoidAsSupporter.withdrawFor(secondCreator.address)
            await newPlantoidAsSupporter.withdrawFor(plantoidInstance.address)

            const artistBalanceAfter = await provider.getBalance(applicant.address)
            const applicantBalanceAfter = await provider.getBalance(secondCreator.address)
            const firstPlantoidBalanceAfter = await provider.getBalance(plantoidInstance.address)

            expect(artistBalanceAfter.sub(artistBalanceBefore)).to.equal(newThreshold.div(10))
            expect(applicantBalanceAfter.sub(applicantBalanceBefore)).to.equal(newThreshold.mul(8).div(10))
            expect(firstPlantoidBalanceAfter.sub(firstPlantoidBalanceBefore)).to.equal(newThreshold.div(10))

            await expect(newPlantoidAsSupporter.withdrawFor(supporter.address)).to.be.revertedWith(errorMessages.nothingToWithdraw)
        })

        it('Returns the total votes in a round', async function () {
            await supporter.sendTransaction({ to: plantoidInstance.address, value: config.threshold })
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('0.01') })
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('0.01') })
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('0.01') })
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('0.01') })
            await supporter.sendTransaction({ to: plantoidInstance.address, value: ethers.utils.parseEther('0.01') })
            await plantoidAsApplicant.startProposals()
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')
            await plantoidAsApplicant.submitProposal('test.com')

            await fastForwardTime(config.proposalPeriod)
            await plantoidAsApplicant.advanceRound()

            await plantoidAsSupporter.submitVote(0)
            const roundState = await plantoidInstance.rounds(0)

            expect(roundState.totalVotes).to.equal(6)
        })
    })

    describe('Metadata Oracle', function () {
        it('Allows anyone to post metadata with valid signature', async function () {
            const msgHash = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(['uint256', 'string', 'address'], [1, 'test', plantoidInstance.address])
            )
            const sig = await plantoidOracle.signMessage(msgHash)
            const plantoidOracleAsSupporter = plantoidMetadataOracle.connect(supporter)
            await plantoidOracleAsSupporter.revealMetadata(plantoidInstance.address, 1, 'test', sig)
        })
        it('Fails if not signed by oracle', async function () {
            const tokenId = 1
            const testUri = 'test'
            const msgHash = ethers.utils.arrayify(
                ethers.utils.solidityKeccak256(['uint256', 'string', 'address'], [tokenId, testUri, plantoidInstance.address])
            )
            const sig = await supporter.signMessage(msgHash)
            await expect(plantoidMetadataOracle.revealMetadata(plantoidInstance.address, tokenId, testUri, sig)).to.be.revertedWith('Not signer')
        })
    })
    // Plantoid metadata
    // Anyone can submit reveal with valid signature
    // Cannot reveal with invalid signature
})
