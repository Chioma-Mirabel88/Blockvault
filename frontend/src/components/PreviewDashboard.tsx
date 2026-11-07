import { useState } from 'react'

type Tab = 'overview' | 'assets' | 'transactions' | 'analytics' | 'send' | 'settings'

const sampleTransactions = [
  { id: 1, type: 'ETH Deposit', asset: 'ETH', amount: '2.00 ETH', date: 'Sample record' },
  { id: 2, type: 'ETH Withdrawal', asset: 'ETH', amount: '0.50 ETH', date: 'Sample record' },
  { id: 3, type: 'Token Deposit', asset: 'LTK', amount: '150.00 LTK', date: 'Sample record' },
]

// All preview analytics are calculated from this sample dataset.
const getAssetStats = (asset: string) => {
  const transactions = sampleTransactions.filter(
    (transaction) => transaction.asset === asset
  )

  const deposits = transactions.filter((transaction) =>
    transaction.type.toLowerCase().includes('deposit')
  )

  const withdrawals = transactions.filter((transaction) =>
    transaction.type.toLowerCase().includes('withdrawal')
  )

  const getTotal = (items: typeof transactions) =>
    items.reduce(
      (total, transaction) => total + Number.parseFloat(transaction.amount),
      0
    )

  return {
    depositCount: deposits.length,
    withdrawalCount: withdrawals.length,
    totalDeposited: getTotal(deposits),
    totalWithdrawn: getTotal(withdrawals),
  }
}

const ethStats = getAssetStats('ETH')
const ltkStats = getAssetStats('LTK')

const totalDeposits = ethStats.depositCount + ltkStats.depositCount
const totalWithdrawals = ethStats.withdrawalCount + ltkStats.withdrawalCount
const totalTransactions = sampleTransactions.length
const totalActivity = totalDeposits + totalWithdrawals

const formatAmount = (amount: number, asset: string) =>
  `${amount.toFixed(2)} ${asset}`

const getBarWidth = (value: number, maximum: number) =>
  maximum > 0 ? `${(value / maximum) * 100}%` : '0%'

export default function PreviewDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  return (
    <main className="dashboard preview-dashboard">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">B</span>
          <span>BLOCKVAULT</span>
        </div>

        <nav aria-label="Preview navigation">
          {([
            ['overview', 'Overview'],
            ['assets', 'My Assets'],
            ['transactions', 'Transactions'],
            ['analytics', 'Analytics'],
            ['send', 'Send & Receive'],
            ['settings', 'Settings'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              className={activeTab === id ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>PUBLIC PREVIEW</span>
          <small>Read-only demonstration</small>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <h1>Blockvault Preview</h1>
            <p>Explore the multi-asset wallet dashboard.</p>
          </div>
          <span className="preview-status">PREVIEW MODE</span>
        </header>

        <div className="preview-notice" role="status">
          <strong>DEMO PREVIEW — SAMPLE DATA</strong>
          <p>
            This is a read-only presentation. Figures and transactions shown
            here are illustrative and are not live blockchain records.
            Live wallet operations will be demonstrated separately.
          </p>
        </div>

        <section className="welcome">
          <div>
            <p>BLOCKVAULT WALLET</p>
            <h2>Your assets. Your control.</h2>
            <span>
              An Ethereum-based multi-asset wallet for managing digital assets,
              transaction history and wallet activity.
            </span>
          </div>
        </section>

        <section className="content-panel">
          {activeTab === 'overview' && (
            <div>
              <h2>Wallet Overview</h2>
              <p>Illustrative dashboard figures for presentation purposes.</p>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Sample ETH Balance</span>
                  <h3>1.50 ETH</h3>
                </div>
                <div className="balance-card">
                  <span>Wallet Status</span>
                  <h3>Active (Example)</h3>
                </div>
                <div className="balance-card">
                  <span>Supported Asset Types</span>
                  <h3>ETH &amp; ERC-20</h3>
                </div>
                <div className="balance-card">
                  <span>Transaction Records</span>
                  <h3>{totalTransactions} Examples</h3>
                </div>
              </div>
              <p className="preview-footnote">
                Wallet connection and transaction execution are disabled in this preview.
              </p>
            </div>
          )}

          {activeTab === 'assets' && (
            <div>
              <h2>My Assets</h2>
              <p>Example asset balances. These are not actual holdings.</p>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Ethereum</span>
                  <h3>1.50 ETH</h3>
                  <p>Illustrative wallet balance</p>
                </div>
                <div className="balance-card">
                  <span>Learning Token (LTK)</span>
                  <h3>{formatAmount(ltkStats.totalDeposited - ltkStats.totalWithdrawn, 'LTK')}</h3>
                  <p>Illustrative ERC-20 token balance</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <h2>Transaction History</h2>
              <p>Example transaction records showing the supported activity types.</p>

              <div className="preview-transactions-table">
                <table>
                  <thead>
                    <tr>
                      <th>Transaction</th>
                      <th>Asset</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="preview-transaction-type">
                          {transaction.type}
                        </td>
                        <td>{transaction.asset}</td>
                        <td className="preview-transaction-amount">
                          {transaction.amount}
                        </td>
                        <td>{transaction.date}</td>
                        <td>
                          <span className="preview-sample-status">
                            Sample
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="preview-footnote">
                These are illustrative records, not live blockchain transactions.
              </p>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2>Wallet Analytics</h2>
              <p>Illustrative activity summary. All figures are sample data.</p>

              <h3>Ethereum Analytics</h3>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Total ETH Deposited</span>
                  <h3>{formatAmount(ethStats.totalDeposited, 'ETH')}</h3>
                </div>
                <div className="balance-card">
                  <span>Total ETH Withdrawn</span>
                  <h3>{formatAmount(ethStats.totalWithdrawn, 'ETH')}</h3>
                </div>
                <div className="balance-card">
                  <span>ETH Deposit Transactions</span>
                  <h3>{ethStats.depositCount}</h3>
                </div>
                <div className="balance-card">
                  <span>ETH Withdrawal Transactions</span>
                  <h3>{ethStats.withdrawalCount}</h3>
                </div>
              </div>

              <h3>Learning Token Analytics</h3>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Total LTK Deposited</span>
                  <h3>{formatAmount(ltkStats.totalDeposited, 'LTK')}</h3>
                </div>
                <div className="balance-card">
                  <span>Total LTK Withdrawn</span>
                  <h3>{formatAmount(ltkStats.totalWithdrawn, 'LTK')}</h3>
                </div>
                <div className="balance-card">
                  <span>LTK Deposit Transactions</span>
                  <h3>{ltkStats.depositCount}</h3>
                </div>
                <div className="balance-card">
                  <span>LTK Withdrawal Transactions</span>
                  <h3>{ltkStats.withdrawalCount}</h3>
                </div>
              </div>

              <div className="analytics-chart-grid">
                <div className="balance-card analytics-chart">
                  <h3>Deposits vs Withdrawals</h3>
                  <p>Illustrative asset activity</p>
                  <div className="chart-row">
                    <span>ETH Deposits</span>
                    <div className="chart-track"><div className="chart-bar deposit-bar" style={{ width: getBarWidth(ethStats.totalDeposited, Math.max(ethStats.totalDeposited, ethStats.totalWithdrawn)) }} /></div>
                    <strong>{ethStats.totalDeposited.toFixed(2)}</strong>
                  </div>
                  <div className="chart-row">
                    <span>ETH Withdrawals</span>
                    <div className="chart-track"><div className="chart-bar withdrawal-bar" style={{ width: getBarWidth(ethStats.totalWithdrawn, Math.max(ethStats.totalDeposited, ethStats.totalWithdrawn)) }} /></div>
                    <strong>{ethStats.totalWithdrawn.toFixed(2)}</strong>
                  </div>
                  <div className="chart-row">
                    <span>LTK Deposits</span>
                    <div className="chart-track"><div className="chart-bar deposit-bar" style={{ width: getBarWidth(ltkStats.totalDeposited, Math.max(ltkStats.totalDeposited, ltkStats.totalWithdrawn)) }} /></div>
                    <strong>{ltkStats.totalDeposited.toFixed(2)}</strong>
                  </div>
                  <div className="chart-row">
                    <span>LTK Withdrawals</span>
                    <div className="chart-track"><div className="chart-bar withdrawal-bar" style={{ width: getBarWidth(ltkStats.totalWithdrawn, Math.max(ltkStats.totalDeposited, ltkStats.totalWithdrawn)) }} /></div>
                    <strong>{ltkStats.totalWithdrawn.toFixed(2)}</strong>
                  </div>
                  <small>ETH and LTK use separate units; compare activity within each asset.</small>
                </div>

                <div className="balance-card analytics-chart">
                  <h3>Transaction Activity</h3>
                  <p>Illustrative transaction counts</p>
                  <div className="chart-row">
                    <span>Deposits</span>
                    <div className="chart-track"><div className="chart-bar deposit-bar" style={{ width: getBarWidth(totalDeposits, totalActivity) }} /></div>
                    <strong>{totalDeposits}</strong>
                  </div>
                  <div className="chart-row">
                    <span>Withdrawals</span>
                    <div className="chart-track"><div className="chart-bar withdrawal-bar" style={{ width: getBarWidth(totalWithdrawals, totalActivity) }} /></div>
                    <strong>{totalWithdrawals}</strong>
                  </div>
                  <small>Based on the three sample transaction records.</small>
                </div>
              </div>

              <div className="analytics-chart-grid">
                <div className="balance-card analytics-chart">
                  <h3>Transaction Distribution</h3>
                  <div className="donut-chart preview-donut">
                    <div className="donut-hole">
                      <strong>{totalTransactions}</strong>
                      <span>Samples</span>
                    </div>
                  </div>
                  <p><span className="legend-dot deposit-dot" /> Deposits: {totalDeposits}</p>
                  <p><span className="legend-dot withdrawal-dot" /> Withdrawals: {totalWithdrawals}</p>
                  <small>Illustrative sample transaction counts.</small>
                </div>

                <div className="balance-card analytics-chart">
                  <h3>Asset Activity Comparison</h3>
                  <p>Transaction counts by asset</p>
                  <div className="chart-row">
                    <span>ETH</span>
                    <div className="chart-track"><div className="chart-bar deposit-bar" style={{ width: '100%' }} /></div>
                    <strong>2</strong>
                  </div>
                  <div className="chart-row">
                    <span>LTK</span>
                    <div className="chart-track"><div className="chart-bar withdrawal-bar" style={{ width: '50%' }} /></div>
                    <strong>1</strong>
                  </div>
                  <small>Based on the three illustrative preview records.</small>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'send' && (
            <div>
              <h2>Send &amp; Receive</h2>
              <p>
                Blockvault supports deposits and withdrawals in its local
                demonstration environment. Internal transfers between
                Blockvault wallets are not currently implemented.
              </p>

              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Receive Assets</span>
                  <h3>Deposits</h3>
                  <p>
                    In the functional local demo, ETH and supported tokens
                    can be deposited into an existing Blockvault wallet.
                  </p>
                </div>

                <div className="balance-card">
                  <span>Withdraw Assets</span>
                  <h3>Withdrawals</h3>
                  <p>
                    The local demo supports withdrawing available ETH and
                    supported tokens from a Blockvault wallet.
                  </p>
                </div>

                <div className="balance-card">
                  <span>Internal Transfers</span>
                  <h3>Not Available</h3>
                  <p>
                    Wallet-to-wallet transfers are not implemented in
                    the current smart contract.
                  </p>
                </div>
              </div>

              <p className="preview-footnote">
                This public preview does not execute deposits, withdrawals
                or transfers.
              </p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2>Settings</h2>
              <p>
                Illustrative configuration for the Blockvault local
                demonstration environment.
              </p>

              <h3>Network Configuration</h3>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Network</span>
                  <h3>Hardhat Local</h3>
                  <p>Illustrative configuration</p>
                </div>

                <div className="balance-card">
                  <span>Chain ID</span>
                  <h3>31337</h3>
                  <p>Local development network</p>
                </div>

                <div className="balance-card">
                  <span>RPC Connection</span>
                  <h3>Disabled</h3>
                  <p>No live blockchain connection in this preview</p>
                </div>
              </div>

              <h3>Preview Configuration</h3>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Wallet Contract</span>
                  <h3>Not Connected</h3>
                  <p>Sample presentation only</p>
                </div>

                <div className="balance-card">
                  <span>Token</span>
                  <h3>Learning Token (LTK)</h3>
                  <p>Illustrative ERC-20 asset</p>
                </div>

                <div className="balance-card">
                  <span>Account Status</span>
                  <h3>Read-only</h3>
                  <p>No wallet connection or signing enabled</p>
                </div>
              </div>
            </div>
          )}
        </section>

        <footer className="preview-footer">
          Blockvault educational project · Public read-only preview · No live transactions
        </footer>
      </section>
    </main>
  )
}
