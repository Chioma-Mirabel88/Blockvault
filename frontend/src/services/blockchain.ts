
import { Contract, JsonRpcProvider, parseEther, parseUnits } from 'ethers'
import contractArtifact from '../contracts/BlockvaultWallet.json'

import {
  CONTRACT_ADDRESS,
  TOKEN_ADDRESS,
  TOKEN_DECIMALS,
  LOCAL_CHAIN_ID,
  LOCAL_RPC_URL,
} from '../contracts/config'

import tokenABI from '../contracts/MockERC20.abi.json'

const ABI = contractArtifact.abi

// Connect to the local Hardhat blockchain.
const provider = new JsonRpcProvider(
  LOCAL_RPC_URL,
  LOCAL_CHAIN_ID
)

export function getReadProvider() {
  return provider
}

// Retrieve available local Hardhat test accounts.
export async function getLocalAccounts() {
  const accounts = await provider.listAccounts()
  return accounts.map((account) => account.address)
}

// Connect using a selected unlocked Hardhat test account.
export async function connectWallet(accountAddress: string) {
  const network = await provider.getNetwork()

  if (Number(network.chainId) !== LOCAL_CHAIN_ID) {
    throw new Error(
      'Please start the Blockvault Hardhat Local network (Chain ID 31337).'
    )
  }

  const signer = await provider.getSigner(accountAddress)
  const address = await signer.getAddress()

  return { provider, signer, address }
}

// Read-only contract connection.
export function getReadContract() {
  return new Contract(CONTRACT_ADDRESS, ABI, provider)
}

// Transaction-enabled contract connection.
export async function getWriteContract(accountAddress: string) {
  const { signer } = await connectWallet(accountAddress)

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
export async function depositEth(amount: string, accountAddress: string) {
  const contract = await getWriteContract(accountAddress)

  const transaction = await contract.deposit({
    value: parseEther(amount),
  })

  return await transaction.wait()
}

// Withdraw simulated ETH from the user's Blockvault wallet.
export async function withdrawEth(amount: string, accountAddress: string) {
  const contract = await getWriteContract(accountAddress)

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


// Retrieve analytics for a user and asset from the Solidity contract.
export async function getWalletAnalytics(user: string, asset: string) {
  const contract = getReadContract()
  const result = await contract.getWalletAnalytics(user, asset)
  return {
    totalDeposits: result[0] as bigint,
    totalWithdrawals: result[1] as bigint,
    depositCount: Number(result[2]),
    withdrawalCount: Number(result[3]),
  }
}


/* ============================================
   ERC-20 TOKEN OPERATIONS
   ============================================ */

// Read-only connection to the configured Learning Token.
export function getReadTokenContract() {
  if (!TOKEN_ADDRESS) {
    throw new Error("Learning Token address is not configured.")
  }

  return new Contract(TOKEN_ADDRESS, tokenABI, provider)
}

// Retrieve token metadata.
export async function getTokenDetails() {
  const token = getReadTokenContract()

  const [name, symbol, decimals] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
  ])

  return {
    address: TOKEN_ADDRESS,
    name: name as string,
    symbol: symbol as string,
    decimals: Number(decimals),
  }
}

// Retrieve a user's internal Blockvault token balance.
export async function getWalletTokenBalance(address: string) {
  if (!TOKEN_ADDRESS) {
    throw new Error("Learning Token address is not configured.")
  }

  const contract = getReadContract()
  return await contract.getWalletTokenBalance(address, TOKEN_ADDRESS) as bigint
}

// Check how many tokens the wallet contract is approved to spend.
export async function getTokenAllowance(accountAddress: string) {
  const token = getReadTokenContract()
  return await token.allowance(
    accountAddress,
    CONTRACT_ADDRESS
  ) as bigint
}

// Approve only the exact amount required for the deposit.
export async function approveToken(
  amount: string,
  accountAddress: string
) {
  const { signer } = await connectWallet(accountAddress)
  const token = new Contract(TOKEN_ADDRESS, tokenABI, signer)

  const transaction = await token.approve(
    CONTRACT_ADDRESS,
    parseUnits(amount, TOKEN_DECIMALS)
  )

  return await transaction.wait()
}

// Deposit approved ERC-20 tokens into the Blockvault wallet.
export async function depositToken(
  amount: string,
  accountAddress: string
) {
  const contract = await getWriteContract(accountAddress)

  const transaction = await contract.depositToken(
    TOKEN_ADDRESS,
    parseUnits(amount, TOKEN_DECIMALS)
  )

  return await transaction.wait()
}

// Withdraw ERC-20 tokens from the Blockvault wallet.
export async function withdrawToken(
  amount: string,
  accountAddress: string
) {
  const contract = await getWriteContract(accountAddress)

  const transaction = await contract.withdrawToken(
    TOKEN_ADDRESS,
    parseUnits(amount, TOKEN_DECIMALS)
  )

  return await transaction.wait()
}

// Retrieve Learning Token analytics from the wallet contract.
export async function getTokenAnalytics(user: string) {
  return await getWalletAnalytics(user, TOKEN_ADDRESS)
}
