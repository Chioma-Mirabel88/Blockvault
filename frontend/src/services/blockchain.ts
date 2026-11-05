
import { Contract, JsonRpcProvider, parseEther } from 'ethers'
import contractArtifact from '../contracts/BlockvaultWallet.json'

import {
  CONTRACT_ADDRESS,
  LOCAL_CHAIN_ID,
  LOCAL_RPC_URL,
} from '../contracts/config'

const ABI = contractArtifact.abi

// Local Hardhat development account.
// This account is for local testing only.
const LOCAL_DEV_ACCOUNT =
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

// Connect to the local Hardhat blockchain.
const provider = new JsonRpcProvider(
  LOCAL_RPC_URL,
  LOCAL_CHAIN_ID
)

export function getReadProvider() {
  return provider
}

// Connect using an unlocked Hardhat development account.
export async function connectWallet() {
  const network = await provider.getNetwork()

  if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
    throw new Error(
      'Please start the Blockvault Hardhat Local network (Chain ID 31337).'
    )
  }

  const signer = await provider.getSigner(LOCAL_DEV_ACCOUNT)
  const address = await signer.getAddress()

  return { provider, signer, address }
}

// Read-only contract connection.
export function getReadContract() {
  return new Contract(CONTRACT_ADDRESS, ABI, provider)
}

// Transaction-enabled contract connection.
export async function getWriteContract() {
  const { signer } = await connectWallet()

  return new Contract(CONTRACT_ADDRESS, ABI, signer)
}

// Retrieve a user's Blockvault wallet details.
export async function getWalletDetails(address: string) {
  const contract = getReadContract()

  const wallet = await contract.wallets(address)

  return {
    owner: wallet.owner as string,
    balance: wallet.balance as bigint,
    isActive: wallet.isActive as boolean,
    exists:
      wallet.owner !==
      '0x0000000000000000000000000000000000000000',
  }
}



// Deposit simulated ETH into the user's Blockvault wallet.
export async function depositEth(amount: string) {
  const contract = await getWriteContract()

  const transaction = await contract.deposit({
    value: parseEther(amount),
  })

  return await transaction.wait()
}

// Withdraw simulated ETH from the user's Blockvault wallet.
export async function withdrawEth(amount: string) {
  const contract = await getWriteContract()

  const transaction = await contract.withdraw(parseEther(amount))

  return await transaction.wait()
}


// Retrieve transaction history from the Solidity transaction array.
export async function getWalletTransactions(address: string) {
  const contract = getReadContract()

  const transactions = await contract.getWalletTransactions(address)

  return transactions.map((transaction: {
    account: string
    asset: string
    amount: bigint
    transactionType: string
    timestamp: bigint
  }) => ({
    account: transaction.account,
    asset: transaction.asset,
    amount: transaction.amount,
    transactionType: transaction.transactionType,
    timestamp: Number(transaction.timestamp),
  }))
}
