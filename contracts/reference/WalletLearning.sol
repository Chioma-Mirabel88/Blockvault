// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WalletLearning {
    address public contractOwner;

    bool private locked;

    modifier nonReentrant() {
        require(!locked, "Re-entrant call detected");
        locked = true;
        _;
        locked = false;
    }

    struct Wallet {
        address owner;
        uint256 balance;
        bool isActive;
    }

    mapping(address => Wallet) public wallets;
    address[] public walletAddresses;

    struct Transaction {
        address account;
        uint256 amount;
        string transactionType;
        uint256 timestamp;
    }

    Transaction[] public transactions;

    event WalletCreated(address indexed owner);
    event DepositMade(address indexed account, uint256 amount, uint256 timestamp);
    event WithdrawalMade(address indexed account, uint256 amount, uint256 timestamp);

    constructor() {
        contractOwner = msg.sender;
    }

    function createWallet() public {
        require(wallets[msg.sender].owner == address(0), "Wallet already exists");

        wallets[msg.sender] = Wallet({
            owner: msg.sender,
            balance: 0,
            isActive: true
        });

        walletAddresses.push(msg.sender);
        emit WalletCreated(msg.sender);
    }

    function deposit() public payable {
        require(wallets[msg.sender].owner != address(0), "Wallet does not exist");
        require(wallets[msg.sender].isActive, "Wallet is inactive");
        require(msg.value > 0, "Deposit amount must be greater than zero");

        wallets[msg.sender].balance += msg.value;

        transactions.push(Transaction({
            account: msg.sender,
            amount: msg.value,
            transactionType: "DEPOSIT",
            timestamp: block.timestamp
        }));

        emit DepositMade(msg.sender, msg.value, block.timestamp);
    }

    function withdraw(uint256 amount) public nonReentrant {
        require(wallets[msg.sender].owner != address(0), "Wallet does not exist");
        require(wallets[msg.sender].isActive, "Wallet is inactive");
        require(amount > 0, "Withdrawal amount must be greater than zero");
        require(wallets[msg.sender].balance >= amount, "Insufficient wallet balance");

        wallets[msg.sender].balance -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "ETH transfer failed");

        transactions.push(Transaction({
            account: msg.sender,
            amount: amount,
            transactionType: "WITHDRAWAL",
            timestamp: block.timestamp
        }));

        emit WithdrawalMade(msg.sender, amount, block.timestamp);
    }

    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getWalletTransactions(address user)
        public
        view
        returns (Transaction[] memory)
    {
        uint256 count = 0;

        for (uint256 i = 0; i < transactions.length; i++) {
            if (transactions[i].account == user) {
                count++;
            }
        }

        Transaction[] memory userTransactions = new Transaction[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < transactions.length; i++) {
            if (transactions[i].account == user) {
                userTransactions[index] = transactions[i];
                index++;
            }
        }

        return userTransactions;
    }

    function getWalletAnalytics(address user)
        public
        view
        returns (
            uint256 totalDeposits,
            uint256 totalWithdrawals,
            uint256 depositCount,
            uint256 withdrawalCount
        )
    {
        for (uint256 i = 0; i < transactions.length; i++) {
            if (transactions[i].account == user) {
                if (
                    keccak256(bytes(transactions[i].transactionType)) ==
                    keccak256(bytes("DEPOSIT"))
                ) {
                    totalDeposits += transactions[i].amount;
                    depositCount++;
                } else if (
                    keccak256(bytes(transactions[i].transactionType)) ==
                    keccak256(bytes("WITHDRAWAL"))
                ) {
                    totalWithdrawals += transactions[i].amount;
                    withdrawalCount++;
                }
            }
        }
    }
}
