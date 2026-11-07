
import { useEffect, useState } from 'react'
import { formatEther, formatUnits } from 'ethers'

import {
  connectWallet,
  getLocalAccounts,
  getWalletDetails,
  getWriteContract,
  depositEth,
  withdrawEth,
  getWalletTransactions,
  getWalletAnalytics,
  getTokenDetails,
  getWalletTokenBalance,
  approveToken,
  depositToken,
  withdrawToken,
  getTokenAnalytics,
} from '../services/blockchain'

import {
  TOKEN_ADDRESS,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
  ZERO_ADDRESS,
  CONTRACT_ADDRESS,
  LOCAL_CHAIN_ID,
  LOCAL_CHAIN_NAME,
  LOCAL_RPC_URL,
} from '../contracts/config'

type DashboardTab = 'overview' | 'assets' | 'transactions' | 'analytics' | 'send' | 'settings'

type WalletDetails = {
  owner: string
  balance: bigint
  isActive: boolean
  exists: boolean
}

type WalletTransaction = {
  account: string
  asset: string
  amount: bigint
  transactionType: string
  timestamp: number
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTransactionAmount(transaction: WalletTransaction) {
  if (transaction.asset.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return `${formatEther(transaction.amount)} ETH`
  }

  if (
    TOKEN_ADDRESS &&
    transaction.asset.toLowerCase() === TOKEN_ADDRESS.toLowerCase()
  ) {
    return `${formatUnits(transaction.amount, TOKEN_DECIMALS)} ${TOKEN_SYMBOL}`
  }

  return `${transaction.amount.toString()} base units (${shortenAddress(transaction.asset)})`
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [walletAddress, setWalletAddress] = useState('')
  const [localAccounts, setLocalAccounts] = useState<string[]>([])
  const [selectedAccount, setSelectedAccount] = useState("")
  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [creatingWallet, setCreatingWallet] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [processingTransaction, setProcessingTransaction] = useState(false)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [analytics, setAnalytics] = useState<{
    totalDeposits: bigint
    totalWithdrawals: bigint
    depositCount: number
    withdrawalCount: number
  } | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  // ERC-20 Learning Token state
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null)
  const [tokenMetadata, setTokenMetadata] = useState<{
    name: string
    symbol: string
    decimals: number
    address: string
  } | null>(null)
  const [tokenDepositAmount, setTokenDepositAmount] = useState('')
  const [tokenWithdrawAmount, setTokenWithdrawAmount] = useState('')
  const [tokenAnalytics, setTokenAnalytics] = useState<{
    totalDeposits: bigint
    totalWithdrawals: bigint
    depositCount: number
    withdrawalCount: number
  } | null>(null)

  useEffect(() => {
    let mounted = true

    getLocalAccounts()
      .then((accounts) => {
        if (mounted) {
          setLocalAccounts(accounts)
          if (accounts.length > 0) setSelectedAccount(accounts[0])
        }
      })
      .catch(() => {
        if (mounted) setError("Unable to load local test accounts.")
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    if (!TOKEN_ADDRESS) return

    getTokenDetails()
      .then((details) => {
        if (mounted) setTokenMetadata(details)
      })
      .catch((err) => {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Learning Token details."
          )
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  async function refreshWalletDetails(address: string) {
    const details = await getWalletDetails(address)
    setWalletDetails(details)

    if (details.exists && TOKEN_ADDRESS) {
      try {
        const balance = await getWalletTokenBalance(address)
        setTokenBalance(balance)
      } catch {
        setTokenBalance(null)
      }
    } else {
      setTokenBalance(null)
    }
  }

  async function handleConnectWallet() {
    setConnecting(true)
    setError('')
    setSuccess('')

    try {
      const wallet = await connectWallet(selectedAccount)
      setWalletAddress(wallet.address)
      await refreshWalletDetails(wallet.address)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to connect wallet.',
      )
    } finally {
      setConnecting(false)
    }
  }

  async function handleDepositEth() {
    if (!depositAmount || !Number.isFinite(Number(depositAmount)) || Number(depositAmount) <= 0) {
      setError('Enter a valid ETH deposit amount.')
      return
    }

    setProcessingTransaction(true)
    setError('')
    setSuccess('')

    try {
      await depositEth(depositAmount, walletAddress)
      await refreshWalletDetails(walletAddress)
      setDepositAmount('')
      setSuccess('ETH deposit completed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ETH deposit failed.')
    } finally {
      setProcessingTransaction(false)
    }
  }

  async function handleWithdrawEth() {
    if (!withdrawAmount || !Number.isFinite(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      setError('Enter a valid ETH withdrawal amount.')
      return
    }

    setProcessingTransaction(true)
    setError('')
    setSuccess('')

    try {
      await withdrawEth(withdrawAmount, walletAddress)
      await refreshWalletDetails(walletAddress)
      setWithdrawAmount('')
      setSuccess('ETH withdrawal completed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ETH withdrawal failed.')
    } finally {
      setProcessingTransaction(false)
    }
  }

  async function handleDepositToken() {
    if (!walletAddress || !TOKEN_ADDRESS) {
      setError("Connect a wallet and configure the Learning Token first.")
      return
    }

    if (
      !tokenDepositAmount ||
      !Number.isFinite(Number(tokenDepositAmount)) ||
      Number(tokenDepositAmount) <= 0
    ) {
      setError("Enter a valid LTK deposit amount.")
      return
    }

    setProcessingTransaction(true)
    setError("")
    setSuccess("")

    try {
      setSuccess("Approving the exact LTK deposit amount...")

      await approveToken(tokenDepositAmount, walletAddress)

      setSuccess("Approval confirmed. Processing LTK deposit...")

      await depositToken(tokenDepositAmount, walletAddress)

      await refreshWalletDetails(walletAddress)
      setTokenDepositAmount("")
      setSuccess("LTK deposit completed successfully.")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "LTK deposit failed."
      )
    } finally {
      setProcessingTransaction(false)
    }
  }

  async function handleWithdrawToken() {
    if (!walletAddress || !TOKEN_ADDRESS) {
      setError("Connect a wallet and configure the Learning Token first.")
      return
    }

    if (
      !tokenWithdrawAmount ||
      !Number.isFinite(Number(tokenWithdrawAmount)) ||
      Number(tokenWithdrawAmount) <= 0
    ) {
      setError("Enter a valid LTK withdrawal amount.")
      return
    }

    setProcessingTransaction(true)
    setError("")
    setSuccess("")

    try {
      await withdrawToken(tokenWithdrawAmount, walletAddress)

      await refreshWalletDetails(walletAddress)
      setTokenWithdrawAmount("")
      setSuccess("LTK withdrawal completed successfully.")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "LTK withdrawal failed."
      )
    } finally {
      setProcessingTransaction(false)
    }
  }

  async function loadTransactions() {
    if (!walletAddress) return

    setLoadingTransactions(true)
    setError('')

    try {
      const records = await getWalletTransactions(walletAddress)
      setTransactions(records)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load transaction history.'
      )
    } finally {
      setLoadingTransactions(false)
    }
  }

  async function loadAnalytics() {
    if (!walletAddress) return

    setLoadingAnalytics(true)
    setError("")

    try {
      const [ethResult, tokenResult] = await Promise.all([
        getWalletAnalytics(walletAddress, ZERO_ADDRESS),
        getTokenAnalytics(walletAddress),
      ])

      setAnalytics(ethResult)
      setTokenAnalytics(tokenResult)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load wallet analytics."
      )
    } finally {
      setLoadingAnalytics(false)
    }
  }

  async function handleCreateWallet() {
    setCreatingWallet(true)
    setError('')
    setSuccess('')

    try {
      const contract = await getWriteContract(walletAddress)
      const transaction = await contract.createWallet()

      setSuccess('Wallet creation transaction submitted. Waiting for confirmation...')

      await transaction.wait()

      await refreshWalletDetails(walletAddress)
      setSuccess('Your Blockvault wallet has been created successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to create wallet.',
      )
    } finally {
      setCreatingWallet(false)
    }
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">B</span>
          <span>BLOCKVAULT</span>
        </div>

        <nav>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'assets', label: 'My Assets' },
            { id: 'transactions', label: 'Transactions' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'send', label: 'Send & Receive' },
            { id: 'settings', label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              className={
                activeTab === item.id ? 'nav-item active' : 'nav-item'
              }
              onClick={() => {
                const tab = item.id as DashboardTab
                setActiveTab(tab)
                if (tab === 'transactions') void loadTransactions()
                if (tab === 'analytics') void loadAnalytics()
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>LOCAL TEST NETWORK</span>
          <small>Chain ID: 31337</small>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <h1>My Wallet</h1>
            <p>Manage your digital assets securely.</p>
          </div>

          <div className="wallet-controls">
            <select
              aria-label="Select local test account"
              value={selectedAccount}
              onChange={(event) => {
                setSelectedAccount(event.target.value)

                // Clear data belonging to the previously selected account.
                setWalletAddress("")
                setWalletDetails(null)
                setTokenBalance(null)
                setTransactions([])
                setAnalytics(null)
                setTokenAnalytics(null)

                // Clear pending form values and messages.
                setDepositAmount("")
                setWithdrawAmount("")
                setTokenDepositAmount("")
                setTokenWithdrawAmount("")
                setError("")
                setSuccess("")
              }}
              disabled={connecting || processingTransaction}
            >
              {localAccounts.map((account, index) => (
                <option key={account} value={account}>
                  Test Account {index + 1} - {shortenAddress(account)}
                </option>
              ))}
            </select>
            <div className="network-status">
              <span className="status-dot" />
              Hardhat Local
            </div>

            {walletAddress ? (
              <button className="connect-button connected" type="button">
                {shortenAddress(walletAddress)}
              </button>
            ) : (
              <button
                className="connect-button"
                type="button"
                onClick={handleConnectWallet}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" role="status">
            {success}
          </div>
        )}

        <section className="welcome">
          <div>
            <p>BLOCKVAULT WALLET</p>
            <h2>Your assets. Your control.</h2>
            <span>
              A multi-asset Ethereum wallet running on a local test network.
            </span>
          </div>
        </section>

        <section className="content-panel">
          {activeTab === 'overview' && (
            <div>
              <h2>Wallet Overview</h2>

              {!walletAddress ? (
                <p>Connect your browser wallet to get started.</p>
              ) : (
                <>
                  <p>Connected account</p>
                  <strong>{walletAddress}</strong>

                  {walletDetails?.exists ? (
                    <div className="wallet-summary">
                      <div className="balance-card">
                        <span>Blockvault ETH Balance</span>
                        <h3>
                          {formatEther(walletDetails.balance)} ETH
                        </h3>
                      </div>

                      <div className="balance-card">
                        <span>{tokenMetadata?.name || 'Learning Token'}</span>
                        <h3>
                          {tokenBalance !== null
                            ? `${formatUnits(tokenBalance, tokenMetadata?.decimals ?? TOKEN_DECIMALS)} ${tokenMetadata?.symbol || TOKEN_SYMBOL}`
                            : 'Balance unavailable'}
                        </h3>
                        <p>Internal Blockvault token balance</p>
                      </div>

                      <div className="balance-card">
                        <span>Wallet Status</span>
                        <h3>
                          {walletDetails.isActive ? 'Active' : 'Inactive'}
                        </h3>
                      </div>

                    </div>
                  ) : (
                    <div>
                      <p>You have connected your account but have not created a Blockvault wallet yet.</p>

                      <button
                        className="connect-button"
                        onClick={handleCreateWallet}
                        disabled={creatingWallet}
                      >
                        {creatingWallet ? 'Creating Wallet...' : 'Create Blockvault Wallet'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'assets' && (
            <div>
              <h2>My Assets</h2>

              {!walletAddress ? (
                <p>Connect an account to view its assets.</p>
              ) : !walletDetails?.exists ? (
                <p>This account has not created a Blockvault wallet yet.</p>
              ) : (
                <>
                  <div className="wallet-summary">
                    <div className="balance-card">
                      <span>Ethereum</span>
                      <h3>{formatEther(walletDetails.balance)} ETH</h3>
                      <p>Blockvault wallet balance</p>
                    </div>

                    <div className="balance-card">
                      <span>{tokenMetadata?.name || 'Learning Token'}</span>
                      <h3>
                        {tokenBalance !== null
                          ? `${formatUnits(tokenBalance, tokenMetadata?.decimals ?? TOKEN_DECIMALS)} ${tokenMetadata?.symbol || TOKEN_SYMBOL}`
                          : 'Balance unavailable'}
                      </h3>
                      <p>Internal Blockvault token balance</p>
                    </div>
                  </div>

                  <div className="wallet-summary">
                      <div className="balance-card">
                        <h3>Deposit ETH</h3>
                        <input
                          type="number"
                          min="0"
                          step="0.000001"
                          placeholder="Amount in ETH"
                          value={depositAmount}
                          onChange={(event) => setDepositAmount(event.target.value)}
                        />
                        <button
                          className="connect-button"
                          type="button"
                          onClick={handleDepositEth}
                          disabled={processingTransaction}
                        >
                          {processingTransaction ? 'Processing...' : 'Deposit ETH'}
                        </button>
                      </div>

                      <div className="balance-card">
                        <h3>Withdraw ETH</h3>
                        <input
                          type="number"
                          min="0"
                          step="0.000001"
                          placeholder="Amount in ETH"
                          value={withdrawAmount}
                          onChange={(event) => setWithdrawAmount(event.target.value)}
                        />
                        <button
                          className="connect-button"
                          type="button"
                          onClick={handleWithdrawEth}
                          disabled={processingTransaction}
                        >
                          {processingTransaction ? 'Processing...' : 'Withdraw ETH'}
                        </button>
                      </div>
                  </div>

                  <div className="wallet-summary">
                    <div className="balance-card">
                      <h3>Deposit {tokenMetadata?.symbol || TOKEN_SYMBOL}</h3>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={`Amount in ${tokenMetadata?.symbol || TOKEN_SYMBOL}`}
                        value={tokenDepositAmount}
                        onChange={(event) => setTokenDepositAmount(event.target.value)}
                        disabled={processingTransaction}
                      />
                      <button
                        className="connect-button"
                        type="button"
                        onClick={handleDepositToken}
                        disabled={processingTransaction || !tokenMetadata}
                      >
                        {processingTransaction ? 'Processing...' : `Deposit ${tokenMetadata?.symbol || TOKEN_SYMBOL}`}
                      </button>
                      <p>Requires token approval before deposit.</p>
                    </div>

                    <div className="balance-card">
                      <h3>Withdraw {tokenMetadata?.symbol || TOKEN_SYMBOL}</h3>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder={`Amount in ${tokenMetadata?.symbol || TOKEN_SYMBOL}`}
                        value={tokenWithdrawAmount}
                        onChange={(event) => setTokenWithdrawAmount(event.target.value)}
                        disabled={processingTransaction}
                      />
                      <button
                        className="connect-button"
                        type="button"
                        onClick={handleWithdrawToken}
                        disabled={processingTransaction || !tokenMetadata}
                      >
                        {processingTransaction ? 'Processing...' : `Withdraw ${tokenMetadata?.symbol || TOKEN_SYMBOL}`}
                      </button>
                      <p>Withdraw tokens from your internal Blockvault balance.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <h2>Transaction History</h2>

              {loadingTransactions ? (
                <p>Loading transaction history...</p>
              ) : transactions.length === 0 ? (
                <p>No transactions found.</p>
              ) : (
                <div className="transaction-list">
                  {transactions.map((transaction, index) => (
                    <div className="balance-card" key={`${transaction.timestamp}-${index}`}>
                      <h3>
                        {transaction.transactionType.replace(
                          'TOKEN_',
                          `${TOKEN_SYMBOL.toUpperCase()} `
                        ).replace('ETH_', 'ETH ')}
                      </h3>
                      <p>
                        Asset: {transaction.asset.toLowerCase() === ZERO_ADDRESS.toLowerCase()
                          ? 'ETH'
                          : TOKEN_ADDRESS && transaction.asset.toLowerCase() === TOKEN_ADDRESS.toLowerCase()
                            ? TOKEN_SYMBOL
                            : shortenAddress(transaction.asset)}
                      </p>
                      <p>
                        Amount: {formatTransactionAmount(transaction)}
                      </p>
                      <p>
                        Date: {new Date(transaction.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2>Wallet Analytics</h2>

              {!walletAddress ? (
                <p>Connect an account to view its analytics.</p>
              ) : !walletDetails?.exists ? (
                <p>Create a Blockvault wallet to begin recording analytics.</p>
              ) : loadingAnalytics ? (
                <p>Loading wallet analytics...</p>
              ) : analytics && tokenAnalytics ? (
                <>
                  <h3>Ethereum Analytics</h3>
                  <div className="wallet-summary">
                    <div className="balance-card">
                      <span>Total ETH Deposited</span>
                      <h3>{formatEther(analytics.totalDeposits)} ETH</h3>
                    </div>
                    <div className="balance-card">
                      <span>Total ETH Withdrawn</span>
                      <h3>{formatEther(analytics.totalWithdrawals)} ETH</h3>
                    </div>
                    <div className="balance-card">
                      <span>ETH Deposit Transactions</span>
                      <h3>{analytics.depositCount}</h3>
                    </div>
                    <div className="balance-card">
                      <span>ETH Withdrawal Transactions</span>
                      <h3>{analytics.withdrawalCount}</h3>
                    </div>
                  </div>

                  <h3>Learning Token Analytics</h3>
                  <div className="wallet-summary">
                    <div className="balance-card">
                      <span>Total {TOKEN_SYMBOL} Deposited</span>
                      <h3>
                        {formatUnits(tokenAnalytics.totalDeposits, TOKEN_DECIMALS)} {TOKEN_SYMBOL}
                      </h3>
                    </div>
                    <div className="balance-card">
                      <span>Total {TOKEN_SYMBOL} Withdrawn</span>
                      <h3>
                        {formatUnits(tokenAnalytics.totalWithdrawals, TOKEN_DECIMALS)} {TOKEN_SYMBOL}
                      </h3>
                    </div>
                    <div className="balance-card">
                      <span>{TOKEN_SYMBOL} Deposit Transactions</span>
                      <h3>{tokenAnalytics.depositCount}</h3>
                    </div>
                    <div className="balance-card">
                      <span>{TOKEN_SYMBOL} Withdrawal Transactions</span>
                      <h3>{tokenAnalytics.withdrawalCount}</h3>
                    </div>
                  </div>

                  <div className="analytics-chart-grid">
                    <div className="balance-card analytics-chart">
                      <h3>Deposits vs Withdrawals</h3>
                      <p>Live local wallet analytics</p>

                      <div className="chart-row">
                        <span>ETH Deposits</span>
                        <div className="chart-track">
                          <div className="chart-bar deposit-bar" style={{ width: `${Math.max(0, Number(formatEther(analytics.totalDeposits)) / Math.max(Number(formatEther(analytics.totalDeposits)), Number(formatEther(analytics.totalWithdrawals)), 0.000001) * 100)}%` }} />
                        </div>
                        <strong>{Number(formatEther(analytics.totalDeposits)).toFixed(2)}</strong>
                      </div>

                      <div className="chart-row">
                        <span>ETH Withdrawals</span>
                        <div className="chart-track">
                          <div className="chart-bar withdrawal-bar" style={{ width: `${Math.max(0, Number(formatEther(analytics.totalWithdrawals)) / Math.max(Number(formatEther(analytics.totalDeposits)), Number(formatEther(analytics.totalWithdrawals)), 0.000001) * 100)}%` }} />
                        </div>
                        <strong>{Number(formatEther(analytics.totalWithdrawals)).toFixed(2)}</strong>
                      </div>

                      <div className="chart-row">
                        <span>LTK Deposits</span>
                        <div className="chart-track">
                          <div className="chart-bar deposit-bar" style={{ width: `${Math.max(0, Number(formatUnits(tokenAnalytics.totalDeposits, TOKEN_DECIMALS)) / Math.max(Number(formatUnits(tokenAnalytics.totalDeposits, TOKEN_DECIMALS)), Number(formatUnits(tokenAnalytics.totalWithdrawals, TOKEN_DECIMALS)), 0.000001) * 100)}%` }} />
                        </div>
                        <strong>{Number(formatUnits(tokenAnalytics.totalDeposits, TOKEN_DECIMALS)).toFixed(2)}</strong>
                      </div>

                      <div className="chart-row">
                        <span>LTK Withdrawals</span>
                        <div className="chart-track">
                          <div className="chart-bar withdrawal-bar" style={{ width: `${Math.max(0, Number(formatUnits(tokenAnalytics.totalWithdrawals, TOKEN_DECIMALS)) / Math.max(Number(formatUnits(tokenAnalytics.totalDeposits, TOKEN_DECIMALS)), Number(formatUnits(tokenAnalytics.totalWithdrawals, TOKEN_DECIMALS)), 0.000001) * 100)}%` }} />
                        </div>
                        <strong>{Number(formatUnits(tokenAnalytics.totalWithdrawals, TOKEN_DECIMALS)).toFixed(2)}</strong>
                      </div>
                      <small>ETH and LTK are displayed in their own units.</small>
                    </div>

                    <div className="balance-card analytics-chart">
                      <h3>Transaction Activity</h3>
                      <p>Live local transaction counts</p>

                      <div className="chart-row">
                        <span>Deposits</span>
                        <div className="chart-track">
                          <div className="chart-bar deposit-bar" style={{ width: `${(analytics.depositCount + tokenAnalytics.depositCount) / Math.max(analytics.depositCount + tokenAnalytics.depositCount, analytics.withdrawalCount + tokenAnalytics.withdrawalCount, 1) * 100}%` }} />
                        </div>
                        <strong>{analytics.depositCount + tokenAnalytics.depositCount}</strong>
                      </div>

                      <div className="chart-row">
                        <span>Withdrawals</span>
                        <div className="chart-track">
                          <div className="chart-bar withdrawal-bar" style={{ width: `${(analytics.withdrawalCount + tokenAnalytics.withdrawalCount) / Math.max(analytics.depositCount + tokenAnalytics.depositCount, analytics.withdrawalCount + tokenAnalytics.withdrawalCount, 1) * 100}%` }} />
                        </div>
                        <strong>{analytics.withdrawalCount + tokenAnalytics.withdrawalCount}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-chart-grid">
                    <div className="balance-card analytics-chart">
                      <h3>Transaction Distribution</h3>
                      <div
                        className="donut-chart"
                        style={{
                          background: `conic-gradient(#36d6c3 0% ${((analytics.depositCount + tokenAnalytics.depositCount) / Math.max(analytics.depositCount + tokenAnalytics.depositCount + analytics.withdrawalCount + tokenAnalytics.withdrawalCount, 1)) * 100}%, #5688ff ${((analytics.depositCount + tokenAnalytics.depositCount) / Math.max(analytics.depositCount + tokenAnalytics.depositCount + analytics.withdrawalCount + tokenAnalytics.withdrawalCount, 1)) * 100}% 100%)`
                        }}
                      >
                        <div className="donut-hole">
                          <strong>{analytics.depositCount + tokenAnalytics.depositCount + analytics.withdrawalCount + tokenAnalytics.withdrawalCount}</strong>
                          <span>Transactions</span>
                        </div>
                      </div>
                      <p><span className="legend-dot deposit-dot" /> Deposits: {analytics.depositCount + tokenAnalytics.depositCount}</p>
                      <p><span className="legend-dot withdrawal-dot" /> Withdrawals: {analytics.withdrawalCount + tokenAnalytics.withdrawalCount}</p>
                    </div>

                    <div className="balance-card analytics-chart">
                      <h3>Asset Activity Comparison</h3>
                      <p>Transaction counts by asset</p>
                      <div className="chart-row">
                        <span>ETH</span>
                        <div className="chart-track">
                          <div className="chart-bar deposit-bar" style={{ width: `${(analytics.depositCount + analytics.withdrawalCount) / Math.max(analytics.depositCount + analytics.withdrawalCount, tokenAnalytics.depositCount + tokenAnalytics.withdrawalCount, 1) * 100}%` }} />
                        </div>
                        <strong>{analytics.depositCount + analytics.withdrawalCount}</strong>
                      </div>
                      <div className="chart-row">
                        <span>LTK</span>
                        <div className="chart-track">
                          <div className="chart-bar withdrawal-bar" style={{ width: `${(tokenAnalytics.depositCount + tokenAnalytics.withdrawalCount) / Math.max(analytics.depositCount + analytics.withdrawalCount, tokenAnalytics.depositCount + tokenAnalytics.withdrawalCount, 1) * 100}%` }} />
                        </div>
                        <strong>{tokenAnalytics.depositCount + tokenAnalytics.withdrawalCount}</strong>
                      </div>
                      <small>Based on recorded local wallet transactions.</small>
                    </div>
                  </div>
                </>
              ) : (
                <p>Analytics are not available yet.</p>
              )}
            </div>
          )}

          {activeTab === 'send' && (
            <div>
              <h2>Send & Receive</h2>
              <p>
                Blockvault currently supports deposits and withdrawals.
                Transfers between Blockvault wallets are not yet implemented.
              </p>
              <div className="balance-card">
                <h3>Receive Assets</h3>
                <p>
                  Select your connected local account and use the deposit
                  controls in My Assets to add ETH or supported tokens.
                </p>
              </div>
              <div className="balance-card">
                <h3>Send Assets</h3>
                <p>
                  Internal wallet-to-wallet transfers are not currently
                  supported by the Blockvault smart contract.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2>Settings</h2>

              <h3>Network Configuration</h3>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Network</span>
                  <h3>{LOCAL_CHAIN_NAME}</h3>
                </div>
                <div className="balance-card">
                  <span>Chain ID</span>
                  <h3>{LOCAL_CHAIN_ID}</h3>
                </div>
                <div className="balance-card">
                  <span>RPC Endpoint</span>
                  <p>{LOCAL_RPC_URL}</p>
                </div>
              </div>

              <h3>Contract Configuration</h3>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Blockvault Wallet Contract</span>
                  <p>{CONTRACT_ADDRESS}</p>
                </div>
                <div className="balance-card">
                  <span>Learning Token Contract</span>
                  <p>{TOKEN_ADDRESS || 'Not configured'}</p>
                </div>
                <div className="balance-card">
                  <span>Token</span>
                  <p>
                    {tokenMetadata
                      ? `${tokenMetadata.name} (${tokenMetadata.symbol})`
                      : 'Loading token details...'}
                  </p>
                </div>
                <div className="balance-card">
                  <span>Connected Account</span>
                  <p>{walletAddress || 'Not connected'}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

