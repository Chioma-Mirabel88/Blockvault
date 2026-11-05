import { network } from "hardhat";

const connection = await network.create("blockvaultLocal");

const { ethers } = connection;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying BlockvaultWallet locally...");
  console.log("Deployer:", await deployer.getAddress());

  const walletFactory = await ethers.getContractFactory(
    "BlockvaultWallet"
  );

  const wallet = await walletFactory.deploy();

  await wallet.waitForDeployment();

  const contractAddress = await wallet.getAddress();

  console.log("BlockvaultWallet deployed successfully.");
  console.log("Contract address:", contractAddress);
  console.log("Network: Blockvault Local");
  console.log("Chain ID: 31337");
}

await main();
