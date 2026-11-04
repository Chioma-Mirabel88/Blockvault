// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IBlockvaultReject {
    function createWallet() external;
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract RejectEtherReceiver {
    IBlockvaultReject public wallet;

    constructor(address walletAddress) {
        wallet = IBlockvaultReject(walletAddress);
    }

    function createWalletAndDeposit() external payable {
        wallet.createWallet();
        wallet.deposit{value: msg.value}();
    }

    function attemptWithdrawal(uint256 amount) external {
        wallet.withdraw(amount);
    }

    // Deliberately reject every incoming ETH transfer.
    receive() external payable {
        revert("ETH rejected");
    }
}
