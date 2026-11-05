
import { network } from "hardhat";

const connection = await network.create("blockvaultLocal");
const { ethers } = connection;

const recipient = "0xFA4afa49294cD30Cf06728a91DA66f94F7Df6A6f";

const [funder] = await ethers.getSigners();

console.log("Funding Blockvault MetaMask account...");
console.log("From:", await funder.getAddress());
console.log("To:", recipient);
console.log("Amount: 1,000 test ETH");

const tx = await funder.sendTransaction({
  to: recipient,
  value: ethers.parseEther("1000"),
});

await tx.wait();

console.log("Successfully sent 1,000 test ETH.");
console.log("Transaction hash:", tx.hash);

