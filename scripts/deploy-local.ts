import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { network } from "hardhat";

const connection = await network.create("blockvaultLocal");
const { ethers } = connection;

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  console.log("=== BLOCKVAULT LOCAL DEPLOYMENT ===");
  console.log("Network: Blockvault Local");
  console.log("Chain ID: 31337");
  console.log("Deployer:", await deployer.getAddress());

  // 1. Deploy BlockvaultWallet
  console.log("\nDeploying BlockvaultWallet...");

  const walletFactory = await ethers.getContractFactory(
    "BlockvaultWallet"
  );

  const wallet = await walletFactory.deploy();
  await wallet.waitForDeployment();

  const walletAddress = await wallet.getAddress();

  console.log("BlockvaultWallet:", walletAddress);

  // 2. Deploy Learning Token
  console.log("\nDeploying Learning Token (LTK)...");

  const tokenFactory = await ethers.getContractFactory("MockERC20");

  const token = await tokenFactory.deploy(
    "Learning Token",
    "LTK",
    ethers.parseUnits("10000", 18)
  );

  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();

  console.log("Learning Token:", tokenAddress);

  // 3. Register LTK with BlockvaultWallet
  console.log("\nRegistering LTK as a supported token...");

  const registration = await wallet.setSupportedToken(
    tokenAddress,
    true
  );

  await registration.wait();

  console.log("LTK successfully registered.");

  // 4. Distribute demonstration tokens to four local accounts
  console.log("\nDistributing demonstration tokens...");

  const allocation = ethers.parseUnits("1000", 18);

  for (const account of signers.slice(1, 5)) {
    const address = await account.getAddress();
    const transfer = await token.transfer(address, allocation);
    await transfer.wait();

    console.log("Allocated 1,000 LTK to:", address);
  }

  // 5. Generate local frontend configuration
  const envContent = [
    `VITE_CONTRACT_ADDRESS=${walletAddress}`,
    `VITE_TOKEN_ADDRESS=${tokenAddress}`,
    "VITE_TOKEN_NAME=Learning Token",
    "VITE_TOKEN_SYMBOL=LTK",
    "VITE_TOKEN_DECIMALS=18",
    ""
  ].join("\n");

  await writeFile(
    resolve("frontend/.env.local"),
    envContent,
    "utf8"
  );

  console.log("\nFrontend configuration generated: frontend/.env.local");
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Wallet:", walletAddress);
  console.log("Token:", tokenAddress);
  console.log("Network: Hardhat Local");
  console.log("Chain ID: 31337");
}

await main();
