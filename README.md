# Blockvault — Ethereum Multi-Asset Wallet

## 1. Project Overview

Blockvault is an educational Ethereum multi-asset wallet built with Solidity and Hardhat 3. It provides a central smart contract through which multiple users can create individual wallets, deposit and withdraw ETH and supported ERC-20 tokens, view transaction histories, and access wallet analytics.

The project demonstrates smart-contract development concepts including access control, reentrancy protection, emergency pausing, safe token transfers, and asset-liability accounting.

**Development scope:** This project is intended for local development and testing with simulated blockchain accounts and test assets. It has not undergone a formal independent security audit and is not production-ready.

## 2. Project Objectives

- Implement a multi-user wallet system.
- Support ETH and approved ERC-20 tokens.
- Maintain separate balances for individual users.
- Track total ETH and token liabilities.
- Store and retrieve transaction history.
- Provide wallet transaction analytics.
- Implement administrative and emergency controls.
- Demonstrate secure smart-contract development practices.

## 3. Core Features

### Wallet Management
- Create an individual wallet for each user address.
- Prevent duplicate wallet creation.
- Allow the contract owner to activate or deactivate wallets.

### ETH Management
- Deposit ETH into an individual wallet.
- Withdraw available ETH.
- Maintain individual balances and total ETH liabilities.
- Permit withdrawals from deactivated wallets.

### ERC-20 Token Management
- Allow the owner to approve or disable supported tokens.
- Deposit and withdraw supported ERC-20 tokens.
- Maintain separate balances and liabilities for each token.
- Use OpenZeppelin SafeERC20 for token transfers.
- Validate exact transfer amounts to prevent accounting inconsistencies with fee-on-transfer tokens.

### Transaction History
- Store transactions in a Solidity array.
- Record account, asset, amount, transaction type, and timestamp.
- Retrieve transactions belonging to a particular wallet using loops.

### Wallet Analytics
- Calculate ETH and token deposit totals.
- Calculate ETH and token withdrawal totals.
- Count transactions by type and asset.

### Administrative Controls
- Restrict administrative operations to the contract owner.
- Activate and deactivate wallets.
- Manage supported tokens.
- Pause and resume wallet operations.

## 4. Smart Contract Architecture

The main implementation is `contracts/BlockvaultWallet.sol`.

It uses these OpenZeppelin components:

| Component | Purpose |
|---|---|
| Ownable | Restricts administrative functions to the owner |
| ReentrancyGuard | Protects sensitive external-transfer operations |
| Pausable | Provides emergency pause and resume functionality |
| IERC20 | Defines the ERC-20 interface |
| SafeERC20 | Provides safer ERC-20 transfer handling |

### Accounting

The contract maintains:

- `wallets`: wallet ownership, ETH balance, and active status.
- `tokenBalances`: individual user balances for each token.
- `totalEthLiabilities`: total ETH owed to wallet owners.
- `totalTokenLiabilities`: total recorded liabilities for each token.
- `transactions`: array containing transaction records.

Withdrawals use checks-effects-interactions. The contract also checks actual asset balances against recorded liabilities.

## 5. Technology Stack

- Solidity 0.8.34
- Hardhat 3
- TypeScript
- ethers.js 6
- Mocha
- Chai
- OpenZeppelin Contracts 5
- Node.js and npm

## 6. Project Structure

```text
Blockvault/
├── contracts/
│   ├── BlockvaultWallet.sol
│   ├── MockERC20.sol
│   ├── ReentrantReceiver.sol
│   ├── RejectEtherReceiver.sol
│   ├── FeeOnTransferToken.sol
│   ├── FailingERC20.sol
│   ├── Counter.sol
│   ├── Counter.t.sol
│   ├── interfaces/
│   │   └── IERC20.sol
│   └── reference/
│       ├── WalletLearning.sol
│       └── TestToken.sol
├── test/
│   ├── BlockvaultWallet.ts
│   └── Counter.ts
├── scripts/
│   └── send-op-tx.ts
├── hardhat.config.ts
├── package.json
├── package-lock.json
└── README.md
```

The `reference` directory preserves the original learning contracts. Helper contracts support local testing.

## 7. Installation and Setup

### Requirements
- Node.js
- npm
- Ubuntu, Linux, macOS, or Windows with WSL

### Install dependencies

```bash
npm install
```

## 8. Running Tests

Run the complete test suite:

```bash
npm test
```

Run Solidity tests only:

```bash
npx hardhat test solidity
```

Run Mocha tests only:

```bash
npx hardhat test mocha
```

The tests cover wallet creation, administration, ETH operations, token operations, transaction history, analytics, emergency pausing, accounting, failed transfers, and reentrancy protection.

### Recorded Test Results

The latest recorded test run produced:

- Solidity tests: 3 passing.
- Mocha tests: 67 passing.
- Total: **70 passing, 0 failing**.

## 9. Code Coverage

Generate a coverage report:

```bash
npx hardhat --coverage test
```

The previously recorded coverage run reported 100% line and statement coverage for the active `BlockvaultWallet.sol` implementation.

Coverage measures executed code. It does not prove that a contract is free of security vulnerabilities.

## 10. Security Considerations

The implementation includes:

- Owner-based access control.
- Reentrancy protection.
- Emergency pause and resume controls.
- Safe ERC-20 transfer handling.
- Checks-effects-interactions for withdrawals.
- Exact-transfer validation.
- Separate user balances and asset liabilities.
- Automated tests for failed transfers and reentrancy attempts.

### Dependency Audit Status

The production dependency audit was checked using:

```bash
npm audit --omit=dev
```

Result: **0 reported vulnerabilities**.

The full development dependency audit reported 18 outstanding advisories: 5 moderate and 13 high. These involve development-tool dependencies including glob, minimatch, and zod.

A non-forced `npm audit fix` did not resolve these findings. Potentially breaking upgrades were not applied because compatibility with the existing Hardhat toolchain must first be verified.

### Known Limitations

- Transaction history is stored in an array and retrieved using loops. Retrieval costs may increase as the history grows.
- The contract owner must carefully vet tokens before approving them.
- Fee-on-transfer tokens are rejected by exact-transfer validation.
- Direct token transfers to the contract are not automatically credited to users.
- The project has not undergone a formal independent smart-contract security audit.
- Automated tests and code coverage do not guarantee security.

## 11. Development and Testing Scope

The current project scope uses local Hardhat simulation and mock assets. No real funds or production wallet credentials are required.

## 12. Future Improvements

- Develop a web-based wallet dashboard.
- Integrate a browser wallet using local test accounts.
- Improve transaction-history querying.
- Expand token compatibility testing.
- Review and update development dependencies.
- Conduct further independent security reviews.

## 13. Disclaimer

Blockvault is an educational software engineering project intended to demonstrate Ethereum smart-contract development and testing. It is not financial advice, an audited custody service, or a recommendation to deposit real assets.
