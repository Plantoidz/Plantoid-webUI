import { newMockEvent } from "matchstick-as"
import { ethereum, Address } from "@graphprotocol/graph-ts"
import { PlantoidSpawned } from "../generated/PlantoidSpawn/PlantoidSpawn"

export function createPlantoidSpawnedEvent(plantoid: Address): PlantoidSpawned {
  let plantoidSpawnedEvent = changetype<PlantoidSpawned>(newMockEvent())

  plantoidSpawnedEvent.parameters = new Array()

  plantoidSpawnedEvent.parameters.push(
    new ethereum.EventParam("plantoid", ethereum.Value.fromAddress(plantoid))
  )

  return plantoidSpawnedEvent
}
