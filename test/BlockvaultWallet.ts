
import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("BlockvaultWallet", function () {
  let wallet: any;
  let token: any;

  let owner: any;
  let alice: any;
  let bob: any;

  const eth = (amount: string) => ethers.parseEther(amount);
  const tokens = (amount: string) =>
    ethers.parseUnits(amount, 18);

  async function deployWallet() {
    const signers = await ethers.getSigners();

    owner = signers[0];
    alice = signers[1];
    bob = signers[2];

    wallet = await ethers.deployContract("BlockvaultWallet");
    await wallet.waitForDeployment();
  }

  async function deployToken() {
    token = await ethers.deployContract("MockERC20", [
      "Learning Token",
      "LTK",
      tokens("10000"),
    ]);

    await token.waitForDeployment();

    await token.transfer(alice.address, tokens("1000"));
    await token.transfer(bob.address, tokens("1000"));

    await wallet.setSupportedToken(
      await token.getAddress(),
      true
    );
  }

  async function createAliceWallet() {
    await wallet.connect(alice).createWallet();
  }

  async function createBobWallet() {
    await wallet.connect(bob).createWallet();
  }

  async function prepareAliceTokenDeposit(amount: bigint) {
    await token.connect(alice).approve(
      await wallet.getAddress(),
      amount
    );

    await wallet.connect(alice).depositToken(
      await token.getAddress(),
      amount
    );
  }

  beforeEach(async function () {
    await deployWallet();
  });

  // ============================================
  // 1. DEPLOYMENT
  // ============================================

  describe("Deployment", function () {
    it("Should assign ownership to the deployer", async function () {
      expect(await wallet.owner()).to.equal(owner.address);
    });

    it("Should start with zero wallets", async function () {
      expect(await wallet.getWalletCount()).to.equal(0n);
    });

    it("Should start with zero ETH liabilities", async function () {
      expect(await wallet.totalEthLiabilities()).to.equal(0n);
    });
  });

  // ============================================
  // 2. WALLET CREATION
  // ============================================

  describe("Wallet Creation", function () {
    it("Should allow a user to create a wallet", async function () {
      await expect(
        wallet.connect(alice).createWallet()
      )
        .to.emit(wallet, "WalletCreated")
        .withArgs(alice.address);

      const userWallet = await wallet.wallets(alice.address);

      expect(userWallet[0]).to.equal(alice.address);
      expect(userWallet[1]).to.equal(0n);
      expect(userWallet[2]).to.equal(true);
    });

    it("Should prevent a user from creating multiple wallets", async function () {
      await createAliceWallet();

      await expect(
        wallet.connect(alice).createWallet()
      ).to.be.revertedWith("Wallet already exists");
    });

    it("Should maintain the correct wallet count", async function () {
      await createAliceWallet();
      await createBobWallet();

      expect(await wallet.getWalletCount()).to.equal(2n);
    });

    it("Should return wallet addresses by index", async function () {
      await createAliceWallet();
      await createBobWallet();

      expect(await wallet.getWalletAt(0)).to.equal(alice.address);
      expect(await wallet.getWalletAt(1)).to.equal(bob.address);
    });
  });

  // ============================================
  // 3. WALLET ADMINISTRATION
  // ============================================

  describe("Wallet Administration", function () {
    beforeEach(async function () {
      await createAliceWallet();
    });

    it("Should allow the owner to deactivate a wallet", async function () {
      await expect(
        wallet.setWalletStatus(alice.address, false)
      )
        .to.emit(wallet, "WalletStatusUpdated")
        .withArgs(alice.address, false);

      const userWallet = await wallet.wallets(alice.address);

      expect(userWallet[2]).to.equal(false);
    });

    it("Should allow the owner to reactivate a wallet", async function () {
      await wallet.setWalletStatus(alice.address, false);
      await wallet.setWalletStatus(alice.address, true);

      const userWallet = await wallet.wallets(alice.address);

      expect(userWallet[2]).to.equal(true);
    });

    it("Should prevent non-owners from changing wallet status", async function () {
      await expect(
        wallet.connect(alice).setWalletStatus(alice.address, false)
      ).to.be.revertedWithCustomError(
        wallet,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should reject status changes for wallets that do not exist", async function () {
      await expect(
        wallet.setWalletStatus(bob.address, false)
      ).to.be.revertedWith("Wallet does not exist");
    });
  });

  // ============================================
  // 4. ETH DEPOSITS
  // ============================================

  describe("ETH Deposits", function () {
    beforeEach(async function () {
      await createAliceWallet();
    });

    it("Should allow a user to deposit ETH", async function () {
      const amount = eth("2");

      await expect(
        wallet.connect(alice).deposit({ value: amount })
      ).to.emit(wallet, "DepositMade");

      const userWallet = await wallet.wallets(alice.address);

      expect(userWallet[1]).to.equal(amount);
      expect(await wallet.totalEthLiabilities()).to.equal(amount);
      expect(await wallet.getContractBalance()).to.equal(amount);
    });

    it("Should reject a zero ETH deposit", async function () {
      await expect(
        wallet.connect(alice).deposit({ value: 0n })
      ).to.be.revertedWith(
        "Deposit amount must be greater than zero"
      );
    });

    it("Should reject deposits from users without wallets", async function () {
      await expect(
        wallet.connect(bob).deposit({ value: eth("1") })
      ).to.be.revertedWith("Wallet does not exist");
    });

    it("Should reject deposits into inactive wallets", async function () {
      await wallet.setWalletStatus(alice.address, false);

      await expect(
        wallet.connect(alice).deposit({ value: eth("1") })
      ).to.be.revertedWith("Wallet is inactive");
    });

    it("Should keep separate ETH balances for different users", async function () {
      await createBobWallet();

      await wallet.connect(alice).deposit({
        value: eth("2"),
      });

      await wallet.connect(bob).deposit({
        value: eth("3"),
      });

      expect(
        (await wallet.wallets(alice.address))[1]
      ).to.equal(eth("2"));

      expect(
        (await wallet.wallets(bob.address))[1]
      ).to.equal(eth("3"));

      expect(await wallet.totalEthLiabilities()).to.equal(eth("5"));
    });
  });

  // ============================================
  // 5. ETH WITHDRAWALS
  // ============================================

  describe("ETH Withdrawals", function () {
    beforeEach(async function () {
      await createAliceWallet();

      await wallet.connect(alice).deposit({
        value: eth("5"),
      });
    });

    it("Should allow a user to withdraw ETH", async function () {
      const amount = eth("2");

      await expect(
        wallet.connect(alice).withdraw(amount)
      ).to.emit(wallet, "WithdrawalMade");

      const userWallet = await wallet.wallets(alice.address);

      expect(userWallet[1]).to.equal(eth("3"));
      expect(await wallet.totalEthLiabilities()).to.equal(eth("3"));
      expect(await wallet.getContractBalance()).to.equal(eth("3"));
    });

    it("Should reject zero withdrawals", async function () {
      await expect(
        wallet.connect(alice).withdraw(0n)
      ).to.be.revertedWith(
        "Withdrawal amount must be greater than zero"
      );
    });

    it("Should reject withdrawals exceeding the available balance", async function () {
      await expect(
        wallet.connect(alice).withdraw(eth("6"))
      ).to.be.revertedWith("Insufficient wallet balance");
    });

    it("Should prevent users without wallets from withdrawing", async function () {
      await expect(
        wallet.connect(bob).withdraw(eth("1"))
      ).to.be.revertedWith("Wallet does not exist");
    });

    it("Should allow withdrawals from inactive wallets", async function () {
      await wallet.setWalletStatus(alice.address, false);

      await wallet.connect(alice).withdraw(eth("2"));

      expect(
        (await wallet.wallets(alice.address))[1]
      ).to.equal(eth("3"));
    });

    it("Should preserve accounting after multiple withdrawals", async function () {
      await wallet.connect(alice).withdraw(eth("1"));
      await wallet.connect(alice).withdraw(eth("2"));

      expect(
        (await wallet.wallets(alice.address))[1]
      ).to.equal(eth("2"));

      expect(await wallet.totalEthLiabilities()).to.equal(eth("2"));
      expect(await wallet.getContractBalance()).to.equal(eth("2"));
    });
  });

  // ============================================
  // 6. TOKEN ADMINISTRATION
  // ============================================

  describe("Token Administration", function () {
    beforeEach(async function () {
      token = await ethers.deployContract("MockERC20", [
        "Learning Token",
        "LTK",
        tokens("10000"),
      ]);

      await token.waitForDeployment();
    });

    it("Should allow the owner to support an ERC-20 token", async function () {
      const tokenAddress = await token.getAddress();

      await expect(
        wallet.setSupportedToken(tokenAddress, true)
      )
        .to.emit(wallet, "TokenSupported")
        .withArgs(tokenAddress, true);

      expect(await wallet.supportedTokens(tokenAddress)).to.equal(true);
    });

    it("Should allow the owner to disable a supported token", async function () {
      const tokenAddress = await token.getAddress();

      await wallet.setSupportedToken(tokenAddress, true);
      await wallet.setSupportedToken(tokenAddress, false);

      expect(await wallet.supportedTokens(tokenAddress)).to.equal(false);
    });

    it("Should prevent non-owners from changing supported tokens", async function () {
      await expect(
        wallet.connect(alice).setSupportedToken(
          await token.getAddress(),
          true
        )
      ).to.be.revertedWithCustomError(
        wallet,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should reject the zero address as a token", async function () {
      await expect(
        wallet.setSupportedToken(ethers.ZeroAddress, true)
      ).to.be.revertedWith("Invalid token address");
    });

    it("Should reject addresses that are not contracts", async function () {
      await expect(
        wallet.setSupportedToken(alice.address, true)
      ).to.be.revertedWith("Address is not a contract");
    });
  });

  // ============================================
  // 7. ERC-20 TOKEN DEPOSITS
  // ============================================

  describe("Token Deposits", function () {
    beforeEach(async function () {
      await createAliceWallet();
      await deployToken();
    });

    it("Should reject token deposits without sufficient allowance", async function () {
      const amount = tokens("100");

      await expect(
        wallet.connect(alice).depositToken(
          await token.getAddress(),
          amount
        )
      ).to.be.revertedWithCustomError(
        token,
        "ERC20InsufficientAllowance"
      );

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(0n);

      expect(
        await wallet.totalTokenLiabilities(await token.getAddress())
      ).to.equal(0n);
    });

    it("Should reject deposits exceeding the user's token balance", async function () {
      const amount = tokens("1001");

      await token.connect(alice).approve(
        await wallet.getAddress(),
        amount
      );

      await expect(
        wallet.connect(alice).depositToken(
          await token.getAddress(),
          amount
        )
      ).to.be.revertedWithCustomError(
        token,
        "ERC20InsufficientBalance"
      );

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(0n);

      expect(
        await wallet.totalTokenLiabilities(await token.getAddress())
      ).to.equal(0n);
    });

    it("Should reject fee-on-transfer tokens and roll back accounting", async function () {
      const feeToken = await ethers.deployContract("FeeOnTransferToken", [
        "Fee Token",
        "FEE",
        tokens("10000"),
        200,
      ]);

      await feeToken.waitForDeployment();

      const feeTokenAddress = await feeToken.getAddress();
      const amount = tokens("100");

      await feeToken.transfer(alice.address, tokens("1000"));
      await wallet.setSupportedToken(feeTokenAddress, true);

      await feeToken.connect(alice).approve(
        await wallet.getAddress(),
        amount
      );

      const aliceBalanceBefore = await feeToken.balanceOf(alice.address);

      await expect(
        wallet.connect(alice).depositToken(feeTokenAddress, amount)
      ).to.be.revertedWith("Unexpected token deposit amount");

      expect(
        await feeToken.balanceOf(alice.address)
      ).to.equal(aliceBalanceBefore);

      expect(
        await feeToken.balanceOf(await wallet.getAddress())
      ).to.equal(0n);

      expect(
        await wallet.getWalletTokenBalance(alice.address, feeTokenAddress)
      ).to.equal(0n);

      expect(
        await wallet.totalTokenLiabilities(feeTokenAddress)
      ).to.equal(0n);

      expect(await wallet.getTransactionCount()).to.equal(0n);
    });

    it("Should allow a user to deposit supported tokens", async function () {
      const amount = tokens("100");

      await token.connect(alice).approve(
        await wallet.getAddress(),
        amount
      );

      await expect(
        wallet.connect(alice).depositToken(
          await token.getAddress(),
          amount
        )
      )
        .to.emit(wallet, "TokenDeposited")
        .withArgs(alice.address, await token.getAddress(), amount);

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(amount);

      expect(
        await wallet.totalTokenLiabilities(await token.getAddress())
      ).to.equal(amount);

      expect(
        await wallet.getTokenContractBalance(await token.getAddress())
      ).to.equal(amount);
    });

    it("Should reject deposits of unsupported tokens", async function () {
      const unsupportedToken = await ethers.deployContract("MockERC20", [
        "Unsupported Token",
        "UNT",
        tokens("1000"),
      ]);

      await expect(
        wallet.connect(alice).depositToken(
          await unsupportedToken.getAddress(),
          tokens("10")
        )
      ).to.be.revertedWith("Token is not supported");
    });

    it("Should reject zero token deposits", async function () {
      await expect(
        wallet.connect(alice).depositToken(
          await token.getAddress(),
          0n
        )
      ).to.be.revertedWith(
        "Deposit amount must be greater than zero"
      );
    });

    it("Should reject token deposits without a wallet", async function () {
      await expect(
        wallet.connect(bob).depositToken(
          await token.getAddress(),
          tokens("10")
        )
      ).to.be.revertedWith("Wallet does not exist");
    });

    it("Should reject deposits into inactive wallets", async function () {
      await wallet.setWalletStatus(alice.address, false);

      await expect(
        wallet.connect(alice).depositToken(
          await token.getAddress(),
          tokens("10")
        )
      ).to.be.revertedWith("Wallet is inactive");
    });

    it("Should keep token balances separate between users", async function () {
      await createBobWallet();

      await token.connect(alice).approve(
        await wallet.getAddress(),
        tokens("100")
      );

      await token.connect(bob).approve(
        await wallet.getAddress(),
        tokens("200")
      );

      await wallet.connect(alice).depositToken(
        await token.getAddress(),
        tokens("100")
      );

      await wallet.connect(bob).depositToken(
        await token.getAddress(),
        tokens("200")
      );

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(tokens("100"));

      expect(
        await wallet.getWalletTokenBalance(
          bob.address,
          await token.getAddress()
        )
      ).to.equal(tokens("200"));
    });
  });

  // ============================================
  // 8. ERC-20 TOKEN WITHDRAWALS
  // ============================================

  describe("Token Withdrawals", function () {
    beforeEach(async function () {
      await createAliceWallet();
      await deployToken();

      await prepareAliceTokenDeposit(tokens("100"));
    });

    it("Should allow a user to withdraw tokens", async function () {
      const amount = tokens("40");

      await expect(
        wallet.connect(alice).withdrawToken(
          await token.getAddress(),
          amount
        )
      )
        .to.emit(wallet, "TokenWithdrawn")
        .withArgs(alice.address, await token.getAddress(), amount);

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(tokens("60"));

      expect(
        await wallet.totalTokenLiabilities(await token.getAddress())
      ).to.equal(tokens("60"));

      expect(
        await wallet.getTokenContractBalance(await token.getAddress())
      ).to.equal(tokens("60"));
    });

    it("Should reject zero token withdrawals", async function () {
      await expect(
        wallet.connect(alice).withdrawToken(
          await token.getAddress(),
          0n
        )
      ).to.be.revertedWith(
        "Withdrawal amount must be greater than zero"
      );
    });

    it("Should reject withdrawals exceeding the token balance", async function () {
      await expect(
        wallet.connect(alice).withdrawToken(
          await token.getAddress(),
          tokens("150")
        )
      ).to.be.revertedWith("Insufficient token balance");
    });

    it("Should allow withdrawals from inactive wallets", async function () {
      await wallet.setWalletStatus(alice.address, false);

      await wallet.connect(alice).withdrawToken(
        await token.getAddress(),
        tokens("20")
      );

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(tokens("80"));
    });

    it("Should allow withdrawals after token support is disabled", async function () {
      await wallet.setSupportedToken(
        await token.getAddress(),
        false
      );

      await wallet.connect(alice).withdrawToken(
        await token.getAddress(),
        tokens("20")
      );

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(tokens("80"));
    });

    it("Should preserve accounting when an ERC-20 withdrawal fails", async function () {
      const failingToken = await ethers.deployContract("FailingERC20", [
        "Failing Token",
        "FLT",
        tokens("1000"),
      ]);

      await failingToken.waitForDeployment();

      const tokenAddress = await failingToken.getAddress();
      const amount = tokens("100");

      await failingToken.transfer(alice.address, amount);
      await wallet.setSupportedToken(tokenAddress, true);

      await failingToken.connect(alice).approve(
        await wallet.getAddress(),
        amount
      );

      // First deposit successfully while transfers are enabled.
      await wallet.connect(alice).depositToken(tokenAddress, amount);

      // Block transfers to simulate a failing token contract.
      await failingToken.setTransfersBlocked(true);

      const balanceBefore = await wallet.getWalletTokenBalance(
        alice.address,
        tokenAddress
      );
      const liabilitiesBefore = await wallet.totalTokenLiabilities(tokenAddress);
      const contractBalanceBefore = await wallet.getTokenContractBalance(tokenAddress);
      const transactionCountBefore = await wallet.getTransactionCount();
      const aliceTokenBalanceBefore = await failingToken.balanceOf(alice.address);

      await expect(
        wallet.connect(alice).withdrawToken(tokenAddress, tokens("40"))
      ).to.be.revertedWith("Token transfers blocked");

      // All accounting and token balances must remain unchanged.
      expect(
        await wallet.getWalletTokenBalance(alice.address, tokenAddress)
      ).to.equal(balanceBefore);

      expect(
        await wallet.totalTokenLiabilities(tokenAddress)
      ).to.equal(liabilitiesBefore);

      expect(
        await wallet.getTokenContractBalance(tokenAddress)
      ).to.equal(contractBalanceBefore);

      expect(
        await wallet.getTransactionCount()
      ).to.equal(transactionCountBefore);

      expect(
        await failingToken.balanceOf(alice.address)
      ).to.equal(aliceTokenBalanceBefore);
    });
  });

  // ============================================
  // 9. TRANSACTION HISTORY
  // ============================================

  describe("Transaction History", function () {
    it("Should record ETH deposits and withdrawals", async function () {
      await createAliceWallet();

      await wallet.connect(alice).deposit({
        value: eth("2"),
      });

      await wallet.connect(alice).withdraw(eth("1"));

      expect(await wallet.getTransactionCount()).to.equal(2n);

      const history = await wallet.getWalletTransactions(alice.address);

      expect(history.length).to.equal(2);
      expect(history[0][0]).to.equal(alice.address);
      expect(history[0][1]).to.equal(ethers.ZeroAddress);
      expect(history[0][2]).to.equal(eth("2"));
      expect(history[0][3]).to.equal("ETH_DEPOSIT");

      expect(history[1][3]).to.equal("ETH_WITHDRAWAL");
    });

    it("Should return only transactions belonging to the requested user", async function () {
      await createAliceWallet();
      await createBobWallet();

      await wallet.connect(alice).deposit({
        value: eth("2"),
      });

      await wallet.connect(bob).deposit({
        value: eth("3"),
      });

      const aliceHistory = await wallet.getWalletTransactions(
        alice.address
      );

      const bobHistory = await wallet.getWalletTransactions(
        bob.address
      );

      expect(aliceHistory.length).to.equal(1);
      expect(bobHistory.length).to.equal(1);

      expect(aliceHistory[0][0]).to.equal(alice.address);
      expect(bobHistory[0][0]).to.equal(bob.address);
    });

    it("Should return an empty history for a user without transactions", async function () {
      const history = await wallet.getWalletTransactions(alice.address);

      expect(history.length).to.equal(0);
    });

    it("Should record ERC-20 deposits and withdrawals", async function () {
      await createAliceWallet();
      await deployToken();

      await prepareAliceTokenDeposit(tokens("100"));

      await wallet.connect(alice).withdrawToken(
        await token.getAddress(),
        tokens("25")
      );

      const history = await wallet.getWalletTransactions(alice.address);

      expect(history.length).to.equal(2);
      expect(history[0][1]).to.equal(await token.getAddress());
      expect(history[0][3]).to.equal("TOKEN_DEPOSIT");
      expect(history[1][3]).to.equal("TOKEN_WITHDRAWAL");
    });
  });

  // ============================================
  // 10. WALLET ANALYTICS
  // ============================================

  describe("Wallet Analytics", function () {
    it("Should calculate ETH deposits and withdrawals correctly", async function () {
      await createAliceWallet();

      await wallet.connect(alice).deposit({
        value: eth("5"),
      });

      await wallet.connect(alice).deposit({
        value: eth("3"),
      });

      await wallet.connect(alice).withdraw(eth("2"));

      const analytics = await wallet.getWalletAnalytics(
        alice.address,
        ethers.ZeroAddress
      );

      expect(analytics[0]).to.equal(eth("8"));
      expect(analytics[1]).to.equal(eth("2"));
      expect(analytics[2]).to.equal(2n);
      expect(analytics[3]).to.equal(1n);
    });

    it("Should calculate token deposits and withdrawals correctly", async function () {
      await createAliceWallet();
      await deployToken();

      await prepareAliceTokenDeposit(tokens("100"));

      await prepareAliceTokenDeposit(tokens("50"));

      await wallet.connect(alice).withdrawToken(
        await token.getAddress(),
        tokens("30")
      );

      const analytics = await wallet.getWalletAnalytics(
        alice.address,
        await token.getAddress()
      );

      expect(analytics[0]).to.equal(tokens("150"));
      expect(analytics[1]).to.equal(tokens("30"));
      expect(analytics[2]).to.equal(2n);
      expect(analytics[3]).to.equal(1n);
    });

    it("Should not include another user's transactions", async function () {
      await createAliceWallet();
      await createBobWallet();

      await wallet.connect(alice).deposit({
        value: eth("2"),
      });

      await wallet.connect(bob).deposit({
        value: eth("5"),
      });

      const analytics = await wallet.getWalletAnalytics(
        alice.address,
        ethers.ZeroAddress
      );

      expect(analytics[0]).to.equal(eth("2"));
      expect(analytics[1]).to.equal(0n);
      expect(analytics[2]).to.equal(1n);
      expect(analytics[3]).to.equal(0n);
    });
  });

  // ============================================
  // 11. PAUSE AND UNPAUSE
  // ============================================

  describe("Emergency Pause", function () {
    beforeEach(async function () {
      await createAliceWallet();
    });

    it("Should allow the owner to pause the contract", async function () {
      await wallet.pause();

      expect(await wallet.paused()).to.equal(true);
    });

    it("Should allow the owner to unpause the contract", async function () {
      await wallet.pause();
      await wallet.unpause();

      expect(await wallet.paused()).to.equal(false);
    });

    it("Should prevent non-owners from pausing the contract", async function () {
      await expect(
        wallet.connect(alice).pause()
      ).to.be.revertedWithCustomError(
        wallet,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should prevent non-owners from unpausing the contract", async function () {
      await wallet.pause();

      await expect(
        wallet.connect(alice).unpause()
      ).to.be.revertedWithCustomError(
        wallet,
        "OwnableUnauthorizedAccount"
      );
    });

    it("Should prevent wallet creation while paused", async function () {
      await wallet.pause();

      await expect(
        wallet.connect(bob).createWallet()
      ).to.be.revertedWithCustomError(
        wallet,
        "EnforcedPause"
      );
    });

    it("Should prevent ETH deposits while paused", async function () {
      await wallet.pause();

      await expect(
        wallet.connect(alice).deposit({
          value: eth("1"),
        })
      ).to.be.revertedWithCustomError(
        wallet,
        "EnforcedPause"
      );
    });

    it("Should prevent ETH withdrawals while paused", async function () {
      await wallet.connect(alice).deposit({
        value: eth("2"),
      });

      await wallet.pause();

      await expect(
        wallet.connect(alice).withdraw(eth("1"))
      ).to.be.revertedWithCustomError(
        wallet,
        "EnforcedPause"
      );
    });

    it("Should prevent ERC-20 deposits while paused", async function () {
      await deployToken();

      const amount = tokens("100");

      await token.connect(alice).approve(
        await wallet.getAddress(),
        amount
      );

      await wallet.pause();

      await expect(
        wallet.connect(alice).depositToken(
          await token.getAddress(),
          amount
        )
      ).to.be.revertedWithCustomError(
        wallet,
        "EnforcedPause"
      );
    });

    it("Should prevent ERC-20 withdrawals while paused", async function () {
      await deployToken();

      const amount = tokens("100");

      await prepareAliceTokenDeposit(amount);

      await wallet.pause();

      const balanceBefore = await wallet.getWalletTokenBalance(
        alice.address,
        await token.getAddress()
      );

      const liabilitiesBefore = await wallet.totalTokenLiabilities(
        await token.getAddress()
      );

      await expect(
        wallet.connect(alice).withdrawToken(
          await token.getAddress(),
          tokens("40")
        )
      ).to.be.revertedWithCustomError(
        wallet,
        "EnforcedPause"
      );

      expect(
        await wallet.getWalletTokenBalance(
          alice.address,
          await token.getAddress()
        )
      ).to.equal(balanceBefore);

      expect(
        await wallet.totalTokenLiabilities(
          await token.getAddress()
        )
      ).to.equal(liabilitiesBefore);
    });

    it("Should allow wallet creation after unpausing", async function () {
      await wallet.pause();
      await wallet.unpause();

      await wallet.connect(bob).createWallet();

      expect(await wallet.getWalletCount()).to.equal(2n);
    });
  });

  // ============================================
  // 12. ACCOUNTING AND BALANCE TRACKING
  // ============================================

  describe("Accounting", function () {
    it("Should maintain ETH liabilities after deposits and withdrawals", async function () {
      await createAliceWallet();
      await createBobWallet();

      await wallet.connect(alice).deposit({
        value: eth("5"),
      });

      await wallet.connect(bob).deposit({
        value: eth("3"),
      });

      await wallet.connect(alice).withdraw(eth("2"));

      expect(await wallet.totalEthLiabilities()).to.equal(eth("6"));
      expect(await wallet.getContractBalance()).to.equal(eth("6"));
    });

    it("Should maintain token liabilities after deposits and withdrawals", async function () {
      await createAliceWallet();
      await deployToken();

      await prepareAliceTokenDeposit(tokens("100"));

      await wallet.connect(alice).withdrawToken(
        await token.getAddress(),
        tokens("40")
      );

      expect(
        await wallet.totalTokenLiabilities(await token.getAddress())
      ).to.equal(tokens("60"));

      expect(
        await wallet.getTokenContractBalance(await token.getAddress())
      ).to.equal(tokens("60"));
    });

    it("Should keep ETH and token accounting independent", async function () {
      await createAliceWallet();
      await deployToken();

      await wallet.connect(alice).deposit({
        value: eth("2"),
      });

      await prepareAliceTokenDeposit(tokens("100"));

      expect(await wallet.totalEthLiabilities()).to.equal(eth("2"));

      expect(
        await wallet.totalTokenLiabilities(await token.getAddress())
      ).to.equal(tokens("100"));
    });

    it("Should keep actual asset balances greater than or equal to recorded liabilities", async function () {
      await createAliceWallet();
      await createBobWallet();
      await deployToken();

      // Alice and Bob deposit ETH.
      await wallet.connect(alice).deposit({ value: eth("2") });
      await wallet.connect(bob).deposit({ value: eth("3") });

      // Alice and Bob deposit ERC-20 tokens.
      await prepareAliceTokenDeposit(tokens("100"));

      await token.connect(bob).approve(
        await wallet.getAddress(),
        tokens("50")
      );

      await wallet.connect(bob).depositToken(
        await token.getAddress(),
        tokens("50")
      );

      // Alice withdraws part of her ETH and token balances.
      await wallet.connect(alice).withdraw(eth("1"));

      await wallet.connect(alice).withdrawToken(
        await token.getAddress(),
        tokens("25")
      );

      // Transfer tokens directly to the contract.
      // This increases its actual token balance, not user liabilities.
      await token.transfer(
        await wallet.getAddress(),
        tokens("10")
      );

      const actualEthBalance = await wallet.getContractBalance();
      const ethLiabilities = await wallet.totalEthLiabilities();

      const tokenAddress = await token.getAddress();
      const actualTokenBalance = await wallet.getTokenContractBalance(tokenAddress);
      const tokenLiabilities = await wallet.totalTokenLiabilities(tokenAddress);

      expect(actualEthBalance).to.be.greaterThanOrEqual(ethLiabilities);
      expect(actualTokenBalance).to.be.greaterThanOrEqual(tokenLiabilities);

      expect(ethLiabilities).to.equal(eth("4"));
      expect(tokenLiabilities).to.equal(tokens("125"));
      expect(actualTokenBalance).to.equal(tokens("135"));
    });
  });
});


  // ============================================
  // 13. REENTRANCY SECURITY
  // ============================================

  describe("Reentrancy Protection", function () {
    it("Should revert failed ETH transfers without changing wallet accounting", async function () {
      const receiver = await ethers.deployContract(
        "RejectEtherReceiver",
        [await wallet.getAddress()]
      );

      await receiver.waitForDeployment();

      await receiver.createWalletAndDeposit({
        value: ethers.parseEther("2"),
      });

      const receiverAddress = await receiver.getAddress();

      const balanceBefore = await wallet.wallets(receiverAddress);
      const liabilitiesBefore = await wallet.totalEthLiabilities();
      const contractBalanceBefore = await wallet.getContractBalance();
      const transactionCountBefore = await wallet.getTransactionCount();

      await expect(
        receiver.attemptWithdrawal(ethers.parseEther("1"))
      ).to.be.revertedWith("ETH transfer failed");

      const balanceAfter = await wallet.wallets(receiverAddress);

      expect(balanceAfter[1]).to.equal(balanceBefore[1]);
      expect(await wallet.totalEthLiabilities()).to.equal(liabilitiesBefore);
      expect(await wallet.getContractBalance()).to.equal(contractBalanceBefore);
      expect(await wallet.getTransactionCount()).to.equal(transactionCountBefore);
    });


    let wallet: any;

    const eth = (amount: string) =>
      ethers.parseEther(amount);

    beforeEach(async function () {
      wallet = await ethers.deployContract("BlockvaultWallet");
      await wallet.waitForDeployment();
    });

    it("Should block a second withdrawal during an ongoing ETH withdrawal", async function () {
      const receiver = await ethers.deployContract(
        "ReentrantReceiver",
        [await wallet.getAddress()]
      );

      await receiver.waitForDeployment();

      // Give the receiver its own wallet and deposit 2 ETH.
      await receiver.createWalletAndDeposit({
        value: eth("2"),
      });

      // Attempt to withdraw 1 ETH while triggering reentrancy.
      await receiver.startAttack(eth("1"));

      expect(await receiver.reentryAttempted()).to.equal(true);

      // The second withdrawal must be rejected.
      expect(await receiver.reentrySucceeded()).to.equal(false);

      // Only the original withdrawal should have succeeded.
      const receiverWallet = await wallet.wallets(
        await receiver.getAddress()
      );

      expect(receiverWallet[1]).to.equal(eth("1"));

      expect(await wallet.totalEthLiabilities()).to.equal(eth("1"));
    });
  });
