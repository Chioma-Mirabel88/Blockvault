
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract BlockvaultWallet is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // 1. DATA STRUCTURES
    // ============================================

    struct Wallet {
        address owner;
        uint256 balance;
        bool isActive;
    }

    struct Transaction {
        address account;
        address asset;
        uint256 amount;
        string transactionType;
        uint256 timestamp;
    }

    // ============================================
    // 2. STATE VARIABLES
    // ============================================

    mapping(address => Wallet) public wallets;

    address[] public walletAddresses;

    // User => Token => Balance
    mapping(address => mapping(address => uint256))
        public tokenBalances;

    // Supported ERC-20 tokens
    mapping(address => bool) public supportedTokens;

    // Total liabilities owed to users
    uint256 public totalEthLiabilities;

    // Token => Total liabilities
    mapping(address => uint256) public totalTokenLiabilities;

    // Transaction history (arrays retained as required)
    Transaction[] public transactions;

    // ============================================
    // 3. EVENTS
    // ============================================

    event WalletCreated(address indexed user);

    event WalletStatusUpdated(
        address indexed user,
        bool isActive
    );

    event DepositMade(
        address indexed account,
        uint256 amount,
        uint256 timestamp
    );

    event WithdrawalMade(
        address indexed account,
        uint256 amount,
        uint256 timestamp
    );

    event TokenSupported(
        address indexed token,
        bool supported
    );

    event TokenDeposited(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    event TokenWithdrawn(
        address indexed account,
        address indexed token,
        uint256 amount
    );

    // ============================================
    // 4. CONSTRUCTOR AND MODIFIERS
    // ============================================

    constructor() Ownable(msg.sender) {}

    modifier walletExists(address user) {
        require(
            wallets[user].owner != address(0),
            "Wallet does not exist"
        );
        _;
    }

    modifier walletIsActive(address user) {
        require(
            wallets[user].isActive,
            "Wallet is inactive"
        );
        _;
    }

    // ============================================
    // 5. WALLET MANAGEMENT
    // ============================================

    function createWallet()
        external
        whenNotPaused
    {
        require(
            wallets[msg.sender].owner == address(0),
            "Wallet already exists"
        );

        wallets[msg.sender] = Wallet({
            owner: msg.sender,
            balance: 0,
            isActive: true
        });

        walletAddresses.push(msg.sender);

        emit WalletCreated(msg.sender);
    }

    function setWalletStatus(
        address user,
        bool isActive
    )
        external
        onlyOwner
        walletExists(user)
    {
        wallets[user].isActive = isActive;

        emit WalletStatusUpdated(user, isActive);
    }

    function getWalletCount()
        external
        view
        returns (uint256)
    {
        return walletAddresses.length;
    }

    function getWalletAt(uint256 index)
        external
        view
        returns (address)
    {
        return walletAddresses[index];
    }

    // ============================================
    // 6. ETH DEPOSITS
    // ============================================

    function deposit()
        external
        payable
        whenNotPaused
        walletExists(msg.sender)
        walletIsActive(msg.sender)
    {
        require(
            msg.value > 0,
            "Deposit amount must be greater than zero"
        );

        wallets[msg.sender].balance += msg.value;

        totalEthLiabilities += msg.value;

        transactions.push(
            Transaction({
                account: msg.sender,
                asset: address(0),
                amount: msg.value,
                transactionType: "ETH_DEPOSIT",
                timestamp: block.timestamp
            })
        );

        emit DepositMade(
            msg.sender,
            msg.value,
            block.timestamp
        );
    }

    // ============================================
    // 7. ETH WITHDRAWALS
    // ============================================

    function withdraw(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        walletExists(msg.sender)
    {
        require(
            amount > 0,
            "Withdrawal amount must be greater than zero"
        );

        require(
            wallets[msg.sender].balance >= amount,
            "Insufficient wallet balance"
        );

        // Checks-Effects-Interactions:
        // Update accounting before external transfer.

        wallets[msg.sender].balance -= amount;

        totalEthLiabilities -= amount;

        (bool success, ) = payable(msg.sender).call{
            value: amount
        }("");

        require(
            success,
            "ETH transfer failed"
        );

        transactions.push(
            Transaction({
                account: msg.sender,
                asset: address(0),
                amount: amount,
                transactionType: "ETH_WITHDRAWAL",
                timestamp: block.timestamp
            })
        );

        emit WithdrawalMade(
            msg.sender,
            amount,
            block.timestamp
        );
    }

    // ============================================
    // 8. TOKEN ADMINISTRATION
    // ============================================

    function setSupportedToken(
        address token,
        bool supported
    )
        external
        onlyOwner
    {
        require(
            token != address(0),
            "Invalid token address"
        );

        require(
            token.code.length > 0,
            "Address is not a contract"
        );

        supportedTokens[token] = supported;

        emit TokenSupported(token, supported);
    }

    // ============================================
    // 9. ERC-20 TOKEN DEPOSITS
    // ============================================

    function depositToken(
        address token,
        uint256 amount
    )
        external
        nonReentrant
        whenNotPaused
        walletExists(msg.sender)
        walletIsActive(msg.sender)
    {
        require(
            supportedTokens[token],
            "Token is not supported"
        );

        require(
            amount > 0,
            "Deposit amount must be greater than zero"
        );

        IERC20 tokenContract = IERC20(token);

        uint256 balanceBefore = tokenContract.balanceOf(
            address(this)
        );

        tokenContract.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        uint256 balanceAfter = tokenContract.balanceOf(
            address(this)
        );

        uint256 received = balanceAfter - balanceBefore;

        // Only exact-transfer tokens are supported.
        require(
            received == amount,
            "Unexpected token deposit amount"
        );

        tokenBalances[msg.sender][token] += received;

        totalTokenLiabilities[token] += received;

        transactions.push(
            Transaction({
                account: msg.sender,
                asset: token,
                amount: received,
                transactionType: "TOKEN_DEPOSIT",
                timestamp: block.timestamp
            })
        );

        emit TokenDeposited(
            msg.sender,
            token,
            received
        );
    }

    // ============================================
    // 10. ERC-20 TOKEN WITHDRAWALS
    // ============================================

    function withdrawToken(
        address token,
        uint256 amount
    )
        external
        nonReentrant
        whenNotPaused
        walletExists(msg.sender)
    {
        require(
            amount > 0,
            "Withdrawal amount must be greater than zero"
        );

        require(
            tokenBalances[msg.sender][token] >= amount,
            "Insufficient token balance"
        );

        IERC20 tokenContract = IERC20(token);

        uint256 contractBalanceBefore = tokenContract.balanceOf(
            address(this)
        );

        uint256 recipientBalanceBefore = tokenContract.balanceOf(
            msg.sender
        );

        // Update accounting before transferring tokens.

        tokenBalances[msg.sender][token] -= amount;

        totalTokenLiabilities[token] -= amount;

        tokenContract.safeTransfer(
            msg.sender,
            amount
        );

        uint256 contractBalanceAfter = tokenContract.balanceOf(
            address(this)
        );

        uint256 recipientBalanceAfter = tokenContract.balanceOf(
            msg.sender
        );

        // Reject tokens with unexpected transfer behaviour.

        require(
            contractBalanceBefore - contractBalanceAfter == amount,
            "Unexpected token debit"
        );

        require(
            recipientBalanceAfter - recipientBalanceBefore == amount,
            "Unexpected token receipt"
        );

        transactions.push(
            Transaction({
                account: msg.sender,
                asset: token,
                amount: amount,
                transactionType: "TOKEN_WITHDRAWAL",
                timestamp: block.timestamp
            })
        );

        emit TokenWithdrawn(
            msg.sender,
            token,
            amount
        );
    }

    // ============================================
    // 11. BALANCE TRACKING
    // ============================================

    function getContractBalance()
        external
        view
        returns (uint256)
    {
        return address(this).balance;
    }

    function getTokenContractBalance(address token)
        external
        view
        returns (uint256)
    {
        return IERC20(token).balanceOf(address(this));
    }

    function getWalletTokenBalance(
        address user,
        address token
    )
        external
        view
        returns (uint256)
    {
        return tokenBalances[user][token];
    }

    // ============================================
    // 12. TRANSACTION HISTORY
    // ============================================

    function getTransactionCount()
        external
        view
        returns (uint256)
    {
        return transactions.length;
    }

    function getWalletTransactions(address user)
        external
        view
        returns (Transaction[] memory)
    {
        uint256 count = 0;

        // First loop: count user transactions.

        for (
            uint256 i = 0;
            i < transactions.length;
            i++
        ) {
            if (transactions[i].account == user) {
                count++;
            }
        }

        // Allocate memory for matching transactions.

        Transaction[] memory userTransactions =
            new Transaction[](count);

        // Second loop: collect user transactions.

        uint256 index = 0;

        for (
            uint256 i = 0;
            i < transactions.length;
            i++
        ) {
            if (transactions[i].account == user) {
                userTransactions[index] = transactions[i];
                index++;
            }
        }

        return userTransactions;
    }

    // ============================================
    // 13. WALLET ANALYTICS
    // ============================================

    function getWalletAnalytics(
        address user,
        address asset
    )
        external
        view
        returns (
            uint256 totalDeposits,
            uint256 totalWithdrawals,
            uint256 depositCount,
            uint256 withdrawalCount
        )
    {
        bytes32 ethDeposit = keccak256(
            bytes("ETH_DEPOSIT")
        );

        bytes32 ethWithdrawal = keccak256(
            bytes("ETH_WITHDRAWAL")
        );

        bytes32 tokenDeposit = keccak256(
            bytes("TOKEN_DEPOSIT")
        );

        bytes32 tokenWithdrawal = keccak256(
            bytes("TOKEN_WITHDRAWAL")
        );

        for (
            uint256 i = 0;
            i < transactions.length;
            i++
        ) {
            Transaction storage transaction = transactions[i];

            if (
                transaction.account == user &&
                transaction.asset == asset
            ) {
                bytes32 transactionType = keccak256(
                    bytes(transaction.transactionType)
                );

                if (
                    transactionType == ethDeposit ||
                    transactionType == tokenDeposit
                ) {
                    totalDeposits += transaction.amount;
                    depositCount++;
                } else if (
                    transactionType == ethWithdrawal ||
                    transactionType == tokenWithdrawal
                ) {
                    totalWithdrawals += transaction.amount;
                    withdrawalCount++;
                }
            }
        }
    }

    // ============================================
    // 14. EMERGENCY ADMINISTRATION
    // ============================================

    function pause()
        external
        onlyOwner
    {
        _pause();
    }

    function unpause()
        external
        onlyOwner
    {
        _unpause();
    }
}
