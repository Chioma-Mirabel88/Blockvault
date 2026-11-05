import { useState } from 'react'

type Tab = 'overview' | 'assets' | 'transactions' | 'analytics'

const sampleTransactions = [
  { id: 1, type: 'ETH Deposit', asset: 'ETH', amount: '2.00 ETH', date: 'Sample record' },
  { id: 2, type: 'ETH Withdrawal', asset: 'ETH', amount: '0.50 ETH', date: 'Sample record' },
  { id: 3, type: 'Token Deposit', asset: 'LTK', amount: '150.00 LTK', date: 'Sample record' },
]

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
                  <h3>3 Examples</h3>
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
                  <h3>150.00 LTK</h3>
                  <p>Illustrative ERC-20 token balance</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <h2>Transaction History</h2>
              <p>Example transaction records showing the supported activity types.</p>
              <div className="transaction-list">
                {sampleTransactions.map((transaction) => (
                  <div className="balance-card" key={transaction.id}>
                    <h3>{transaction.type}</h3>
                    <p>Asset: {transaction.asset}</p>
                    <p>Amount: {transaction.amount}</p>
                    <p>{transaction.date} — illustrative only</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2>Wallet Analytics</h2>
              <p>Illustrative ETH activity summary.</p>
              <div className="wallet-summary">
                <div className="balance-card">
                  <span>Total ETH Deposited</span>
                  <h3>2.00 ETH</h3>
                </div>
                <div className="balance-card">
                  <span>Total ETH Withdrawn</span>
                  <h3>0.50 ETH</h3>
                </div>
                <div className="balance-card">
                  <span>Deposit Transactions</span>
                  <h3>1</h3>
                </div>
                <div className="balance-card">
                  <span>Withdrawal Transactions</span>
                  <h3>1</h3>
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
