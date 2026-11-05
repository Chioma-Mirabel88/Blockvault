
import { useState } from 'react'
import { formatEther } from 'ethers'
import {
  connectWallet,
  getWalletDetails,
  getWriteContract,
  depositEth,
  withdrawEth,
  getWalletTransactions,
} from '../services/blockchain'

type DashboardTab = 'overview' | 'assets' | 'transactions' | 'analytics'

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

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [walletAddress, setWalletAddress] = useState('')
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

  async function refreshWalletDetails(address: string) {
    const details = await getWalletDetails(address)
    setWalletDetails(details)
  }

  async function handleConnectWallet() {
    setConnecting(true)
    setError('')
    setSuccess('')

    try {
      const wallet = await connectWallet()
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
      await depositEth(depositAmount)
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
      await withdrawEth(withdrawAmount)
      await refreshWalletDetails(walletAddress)
      setWithdrawAmount('')
      setSuccess('ETH withdrawal completed successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ETH withdrawal failed.')
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

  async function handleCreateWallet() {
    setCreatingWallet(true)
    setError('')
    setSuccess('')

    try {
      const contract = await getWriteContract()
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
                        <span>Wallet Status</span>
                        <h3>
                          {walletDetails.isActive ? 'Active' : 'Inactive'}
                        </h3>
                      </div>

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
              <p>Your ETH and supported token balances will appear here.</p>
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
                      <h3>{transaction.transactionType.replace('_', ' ')}</h3>
                      <p>
                        Asset: {transaction.asset === '0x0000000000000000000000000000000000000000'
                          ? 'ETH'
                          : transaction.asset}
                      </p>
                      <p>
                        Amount: {formatEther(transaction.amount)} ETH
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
              <p>Your wallet activity and transaction summaries will appear here.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

