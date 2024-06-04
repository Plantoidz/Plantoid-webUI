import { store, Bytes, log, BigInt } from '@graphprotocol/graph-ts'
import {
    GraceStarted,
    NewPlantoid,
    ProposalAccepted,
    ProposalStarted,
    ProposalSubmitted,
    ProposalVetoed,
    Revealed,
    RoundInvalidated,
    Transfer,
    Voted,
    VotingStarted,
} from '../generated/templates/Plantoid/Plantoid'
import { MetadataRevealed } from '../generated/PlantoidMetadata/PlantoidMetadata'
import { PlantoidSpawned } from '../generated/PlantoidSpawn/PlantoidSpawn'
import { Seed, SeedMetadata, Holder, Proposal, PlantoidInstance, Vote, Round, PlantoidMetadata } from '../generated/schema'
import { Plantoid } from '../generated/templates'




export function handleNewPlantoid(event: PlantoidSpawned): void {
    // Start indexing the exchange; `event.params.exchange` is the
    // address of the new exchange contract
    Plantoid.create(event.params.plantoid)
    let newAddress = event.params.plantoid.toHex()
    let newPlantoid = new PlantoidInstance(newAddress)
    newPlantoid.save()
}

export function handlePlantoidInitialized(event: NewPlantoid): void {
    let plantoidInstance = PlantoidInstance.load(event.address.toHexString())
    if (!plantoidInstance) log.warning('Invalid instance', [])
    else {
        plantoidInstance.oracle = event.params.oracle
        plantoidInstance.save()
    }
}

let ZERO_ADDRESS_STRING = '0x0000000000000000000000000000000000000000'

let ZERO_ADDRESS: Bytes = Bytes.fromHexString(ZERO_ADDRESS_STRING) as Bytes
let ZERO = BigInt.fromI32(0)
let ONE = BigInt.fromI32(1)

function setCharAt(str: string, index: any, char: string): string {
    if (index > str.length - 1) return str
    return str.substring(0, index) + char + str.substring(index + 1)
}
function normalize(strValue: string): string {
    if (strValue.length === 1 && strValue.charCodeAt(0) === 0) {
        return ''
    } else {
        for (let i = 0; i < strValue.length; i++) {
            if (strValue.charCodeAt(i) === 0) {
                strValue = setCharAt(strValue, i, '\ufffd') // graph-node db does not support string with '\u0000'
            }
        }
        return strValue
    }
}

export function handleSeedTransfer(event: Transfer): void {
    // let contract = Plantoid.bind(event.address)
    let from = event.params.from.toHex()
    let to = event.params.to.toHex()
    let id = event.address.toHexString() + '_' + event.params.tokenId.toHexString()
    let plantoidAddress = event.address.toHexString()

    if (from != ZERO_ADDRESS_STRING) {
        let sender = Holder.load(from)
        if (sender !== null) {
            sender.seedCount = sender.seedCount.minus(ONE)
        }
    }

    if (to != ZERO_ADDRESS_STRING) {
        let newOwner = Holder.load(to)
        if (newOwner === null) {
            newOwner = new Holder(to)
            newOwner.seedCount = ZERO
            newOwner.address = event.params.to
            newOwner.createdAt = event.block.timestamp
        }

        let seed = Seed.load(id)
        if (seed == null) {
            seed = new Seed(id)
            seed.tokenId = event.params.tokenId
            seed.createdAt = event.block.timestamp
            seed.holder = to
            seed.revealed = false
            seed.uri = ''
            seed.plantoid = plantoidAddress
            // let metadataURI = contract.try_tokenURI(id)
            // if (!metadataURI.reverted) {
            //     seed.uri = normalize(metadataURI.value)
            // }
        }

        seed.holder = newOwner.id
        seed.save()

        newOwner.seedCount = newOwner.seedCount.plus(ONE)
        newOwner.save()
    } else {
        store.remove('Seed', id)
    }
}

// export function handleMetadataReveal(event: MetadataRevealed): void {
//     log.info('Handling metadata', [])
//     let plantoidAddress = event.params.plantoid
//     let plantoid = PlantoidMetadata.load(plantoidAddress.toHexString())
//     if (plantoid == null) {
//         plantoid = new PlantoidMetadata(plantoidAddress.toHexString())
//         plantoid.address = plantoidAddress
//         plantoid.save()
//     }
//     let seedId = plantoidAddress.toHexString() + '_' + event.params.tokenId.toHexString()
//     let seed = SeedMetadata.load(seedId)
//     if (seed == null) {
//         seed = new SeedMetadata(seedId)
//         seed.tokenId = event.params.tokenId
//         seed.createdAt = event.block.timestamp
//         seed.plantoid = plantoidAddress.toHexString()
//         // let metadataURI = contract.try_tokenURI(id)
//         // if (!metadataURI.reverted) {
//         //     seed.uri = normalize(metadataURI.value)
//         // }
//     }
//     seed.revealedSignature = event.params.signature
//     seed.revealedUri = event.params.tokenUri
//     seed.save()
// }

export function handleReveal(event: Revealed): void {
    log.info('Handling on chain reveal', [])
    let plantoidAddress = event.address
    let seedId = plantoidAddress.toHexString() + '_' + event.params.tokenId.toHexString()
    let seed = Seed.load(seedId)
    if (!seed) log.warning('invalid seed', [])
    else {
        seed.uri = event.params.uri
        seed.revealed = true
        seed.save()
    }
}

export function handleProposalSubmitted(event: ProposalSubmitted): void {
    let from = event.params.proposer.toHex()
    let uri = event.params.proposalUri
    let roundId = event.address.toHexString() + '_' + event.params.round.toHexString()
    let id = event.address.toHexString() + '_' + event.params.round.toHexString() + '_' + event.params.proposalId.toHexString()

    let proposer = Holder.load(from)
    if (proposer === null) {
        proposer = new Holder(from)
        proposer.address = event.params.proposer
        proposer.seedCount = ZERO
        proposer.createdAt = event.block.timestamp
    }

    proposer.save()

    let round = Round.load(roundId)
    if (!round) log.warning('Invalid vote round', [])
    else {
        let proposal = new Proposal(id)
        proposal.proposer = from
        proposal.voteCount = ZERO
        proposal.uri = uri
        proposal.round = roundId
        proposal.vetoed = false
        proposal.proposalId = event.params.proposalId

        proposal.save()
    }
}

export function handleVoted(event: Voted): void {
    let from = event.params.voter.toHex()
    let roundId = event.address.toHexString() + '_' + event.params.round.toHexString()
    let votes = event.params.votes
    let id = roundId + '_' + from

    let proposalId = event.address.toHexString() + '_' + event.params.round.toHexString() + '_' + event.params.choice.toHexString()

    let round = Round.load(roundId)
    if (!round) log.warning('Invalid vote round', [])
    else {
        let proposal = Proposal.load(proposalId)
        if (!proposal) log.warning('Invalid proposal round', [])
        else {
            round.totalVotes = round.totalVotes.plus(votes)
            round.save()

            proposal.voteCount = proposal.voteCount.plus(votes)
            proposal.save()

            let voter = Holder.load(from)
            if (voter === null) {
                voter = new Holder(from)
                voter.address = event.params.voter
                voter.seedCount = ZERO
                voter.createdAt = event.block.timestamp
            }

            voter.save()

            let vote = new Vote(id)
            vote.voter = from
            vote.round = roundId
            vote.proposal = proposalId
            vote.eligibleVotes = votes

            vote.save()
        }
    }
}

export function handleVetoed(event: ProposalVetoed): void {
    let proposalId = event.address.toHexString() + '_' + event.params.round.toHexString() + '_' + event.params.proposal.toHexString()
    let proposal = Proposal.load(proposalId)
    if (proposal === null) log.warning('Invalid proposal', [])
    else {
        proposal.vetoed = false

        proposal.save()
    }
}
export function handleProposalStarted(event: ProposalStarted): void {
    let roundId = event.address.toHexString() + '_' + event.params.round.toHexString()
    let end = event.params.end

    let round = Round.load(roundId)
    if (round === null) {
        round = new Round(roundId)
        round.totalVotes = ZERO
    }
    round.proposalEnd = end

    round.save()
}

export function handleVotingStarted(event: VotingStarted): void {
    let roundId = event.address.toHexString() + '_' + event.params.round.toHexString()
    let end = event.params.end

    let round = Round.load(roundId)
    if (!round) log.warning('Invalid round', [])
    else {
        round.votingEnd = end

        round.save()
    }
}

export function handleGraceStarted(event: GraceStarted): void {
    let roundId = event.address.toHexString() + '_' + event.params.round.toHexString()
    let end = event.params.end

    let round = Round.load(roundId)
    if (!round) log.warning('Invalid round', [])
    else {
        round.graceEnd = end

        round.save()
    }
}

export function handleProposalAccepted(event: ProposalAccepted): void {
    let roundId = event.address.toHexString() + '_' + event.params.round.toHexString()
    let acceptedProposal = event.address.toHexString() + '_' + event.params.round.toHexString() + '_' + event.params.proposal.toHexString()

    let round = Round.load(roundId)
    if (!round) log.warning('Invalid round', [])
    else {
        round.winningProposal = acceptedProposal

        round.save()
    }
}

export function handleRoundInvalidated(event: RoundInvalidated): void {
    let roundId = event.address.toHexString() + '_' + event.params.round.toHexString()

    let round = Round.load(roundId)
    if (!round) log.warning('Invalid round', [])
    else {
        round.invalidated = true

        round.save()
    }
}
