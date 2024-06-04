// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");

// const sleep = (ms) =>
//   new Promise((r) =>
//     setTimeout(() => {
//       console.log(`waited for ${(ms / 1000).toFixed(3)} seconds`);
//       r();
//     }, ms)
//   );
const zeroAddress = "0x0000000000000000000000000000000000000000";

const config = {
  plantoidOracleAddress: "0x7e6ce11beE2AB7F84eF0D1955CE1F546D897aB98",
  artistAddress: "0x2D3C242d2C074D523112093C67d1c01Bb27ca40D",
  parentAddress: zeroAddress,
  depositThreshold: ethers.utils.parseEther("0.001"),
  threshold: ethers.utils.parseEther("5"),
  name: "Plantoid 13",
  prereveal: "ipfs://QmXTzn3ZMvsYnfJKXcKQ2PVHH2YNbdUDED1GM2DEuMHmzH",
  symbol: "PLANTOID",
  proposalPeriod: 1209600, // 2 weeks
  votingPeriod: 604800,
  gracePeriod: 604800,
};

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  console.log({deployer})

  // const tx = await deploy("Plantoid", {
  //   from: deployer,
  //   args: [],
  //   log: true,
  //   waitConfirmations: 2,
  // });
  // const tx2 = await deploy("PlantoidSpawn", {
  //   from: deployer,
  //   args: [tx.receipt.contractAddress],
  //   log: true,
  //   waitConfirmations: 2,
  // });
  const tx3 = await deploy("PlantoidMetadata", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 2,
  });
  // const plantoid = await ethers.getContractAt(
  //   "Plantoid",
  //   tx.receipt.contractAddress
  // ); //<-- if you want to instantiate a version of a contract at a specific address!
  // const plantoidSpawn = await ethers.getContractAt(
  //   "PlantoidSpawn",
  //   tx2.receipt.contractAddress
  // ); //<-- if you want to instantiate a version of a contract at a specific address!
  // const plantoidMetadata = await ethers.getContractAt(
  //   "PlantoidMetadata",
  //   tx3.receipt.contractAddress
  // ); //<-- if you want to instantiate a version of a contract at a specific address!
  // await plantoidMetadata.transferOwnership(config.plantoidOracleAddress);
  // const initAction = plantoid.interface.encodeFunctionData("init", [
  //   config.plantoidOracleAddress,
  //   config.artistAddress,
  //   config.parentAddress,
  //   config.name,
  //   config.symbol,
  //   config.prereveal,
  //   ethers.utils.defaultAbiCoder.encode(
  //     ["uint256", "uint256", "uint256", "uint256", "uint256"],
  //     [
  //       config.depositThreshold,
  //       config.threshold,
  //       config.proposalPeriod,
  //       config.votingPeriod,
  //       config.gracePeriod,
  //     ]
  //   ),
  // ]);
  // const salt = ethers.utils.keccak256(
  //   ethers.utils.defaultAbiCoder.encode(["uint256"], [1])
  // );
  // console.log({ deployer });
  // await plantoidSpawn.spawnPlantoid(salt, initAction);
  // const plantoidAddress = await plantoidSpawn.plantoidAddress(deployer, salt);
  // const tx = await deploy("TipRelayer", {
  //   from: deployer,
  //   args: [
  //   ],
  //   log: true,
  //   waitConfirmations: 5,
  // });

  // console.log({ plantoidAddress });
  /*  await YourContract.setPurpose("Hello");
  
    To take ownership of yourContract using the ownable library uncomment next line and add the 
    address you want to be the owner. 
    // await yourContract.transferOwnership(YOUR_ADDRESS_HERE);

    //const yourContract = await ethers.getContractAt('YourContract', "0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A") //<-- if you want to instantiate a version of a contract at a specific address!
  */

  /*
  //If you want to send value to an address from the deployer
  const deployerWallet = ethers.provider.getSigner()
  await deployerWallet.sendTransaction({
    to: "0x34aA3F359A9D614239015126635CE7732c18fDF3",
    value: ethers.utils.parseEther("0.001")
  })
  */

  /*
  //If you want to send some ETH to a contract on deploy (make your constructor payable!)
  const yourContract = await deploy("YourContract", [], {
  value: ethers.utils.parseEther("0.05")
  });
  */

  /*
  //If you want to link a library into your contract:
  // reference: https://github.com/austintgriffith/scaffold-eth/blob/using-libraries-example/packages/hardhat/scripts/deploy.js#L19
  const yourContract = await deploy("YourContract", [], {}, {
   LibraryName: **LibraryAddress**
  });
  */

  // Verify from the command line by running `yarn verify`

  // You can also Verify your contracts with Etherscan here...
  // You don't want to verify on localhost
  // try {
  //   if (chainId !== localChainId) {
  //     await run("verify:verify", {
  //       address: YourContract.address,
  //       contract: "contracts/YourContract.sol:YourContract",
  //       constructorArguments: [],
  //     });
  //   }
  // } catch (error) {
  //   console.error(error);
  // }
};
module.exports.tags = ["Relayer"];
