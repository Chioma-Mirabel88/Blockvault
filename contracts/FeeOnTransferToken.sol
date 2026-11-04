
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract FeeOnTransferToken is ERC20 {
    uint256 public feeBasisPoints;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        uint256 fee
    ) ERC20(tokenName, tokenSymbol) {
        require(fee <= 10_000, "Fee cannot exceed 100%");

        feeBasisPoints = fee;

        _mint(msg.sender, initialSupply);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        // Do not charge fees when minting or burning.
        if (from == address(0) || to == address(0) || feeBasisPoints == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 fee = (value * feeBasisPoints) / 10_000;
        uint256 amountAfterFee = value - fee;

        // Transfer the amount after deducting the fee.
        super._update(from, to, amountAfterFee);

        // Burn the deducted fee.
        if (fee > 0) {
            super._update(from, address(0), fee);
        }
    }
}
