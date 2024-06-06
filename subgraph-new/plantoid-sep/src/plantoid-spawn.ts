import { PlantoidSpawned as PlantoidSpawnedEvent } from "../generated/PlantoidSpawn/PlantoidSpawn"
import { PlantoidSpawned } from "../generated/schema"

export function handlePlantoidSpawned(event: PlantoidSpawnedEvent): void {
  let entity = new PlantoidSpawned(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.plantoid = event.params.plantoid

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
