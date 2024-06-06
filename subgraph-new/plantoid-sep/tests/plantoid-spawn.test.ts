import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address } from "@graphprotocol/graph-ts"
import { PlantoidSpawned } from "../generated/schema"
import { PlantoidSpawned as PlantoidSpawnedEvent } from "../generated/PlantoidSpawn/PlantoidSpawn"
import { handlePlantoidSpawned } from "../src/plantoid-spawn"
import { createPlantoidSpawnedEvent } from "./plantoid-spawn-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let plantoid = Address.fromString(
      "0x0000000000000000000000000000000000000001"
    )
    let newPlantoidSpawnedEvent = createPlantoidSpawnedEvent(plantoid)
    handlePlantoidSpawned(newPlantoidSpawnedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("PlantoidSpawned created and stored", () => {
    assert.entityCount("PlantoidSpawned", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "PlantoidSpawned",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "plantoid",
      "0x0000000000000000000000000000000000000001"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
