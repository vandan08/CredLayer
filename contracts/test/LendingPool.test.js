require("@nomicfoundation/hardhat-chai-matchers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LendingPool", function () {
    let usdc, creditRegistry, collateralVault, lendingPool;
    let owner, oracle, lender, borrower, approvalSigner;
    const USDC_DECIMALS = 6;
    const toUSDC = (amount) => ethers.parseUnits(amount.toString(), USDC_DECIMALS);

    // Helper: create backend-signed loan approval
    async function signLoanApproval(signer, borrowerAddr, amount, duration, collateralAmount, deadline) {
        const messageHash = ethers.solidityPackedKeccak256(
            ["address", "uint256", "uint256", "uint256", "uint256"],
            [borrowerAddr, amount, duration, collateralAmount, deadline]
        );
        return signer.signMessage(ethers.getBytes(messageHash));
    }

    beforeEach(async function () {
        [owner, oracle, lender, borrower, approvalSigner] = await ethers.getSigners();

        // Deploy MockUSDC
        const MockUSDC = await ethers.getContractFactory("MockUSDC");
        usdc = await MockUSDC.deploy();
        await usdc.waitForDeployment();

        // Deploy CreditRegistry
        const CreditRegistry = await ethers.getContractFactory("CreditRegistry");
        creditRegistry = await CreditRegistry.deploy(oracle.address);
        await creditRegistry.waitForDeployment();

        // Deploy CollateralVault
        const CollateralVault = await ethers.getContractFactory("CollateralVault");
        collateralVault = await CollateralVault.deploy(
            await creditRegistry.getAddress(),
            await usdc.getAddress()
        );
        await collateralVault.waitForDeployment();

        // Deploy LendingPool
        const LendingPool = await ethers.getContractFactory("LendingPool");
        lendingPool = await LendingPool.deploy(
            await usdc.getAddress(),
            await creditRegistry.getAddress(),
            await collateralVault.getAddress(),
            approvalSigner.address
        );
        await lendingPool.waitForDeployment();

        // Link: CollateralVault → LendingPool
        await collateralVault.setLendingPool(await lendingPool.getAddress());

        // Transfer CreditRegistry ownership to LendingPool so it can record events
        await creditRegistry.transferOwnership(await lendingPool.getAddress());

        // Register borrower with A-band score for easier testing
        await creditRegistry.connect(oracle).registerBorrower(borrower.address);
        await creditRegistry.connect(oracle).updateCreditScore(borrower.address, 850);

        // Fund lender and borrower with USDC
        await usdc.mint(lender.address, toUSDC(500000));
        await usdc.mint(borrower.address, toUSDC(100000));
    });

    describe("Deposits & Withdrawals", function () {
        it("Should accept deposits", async function () {
            await usdc.connect(lender).approve(await lendingPool.getAddress(), toUSDC(10000));
            await lendingPool.connect(lender).deposit(toUSDC(10000));

            expect(await lendingPool.deposits(lender.address)).to.equal(toUSDC(10000));
            expect(await lendingPool.totalDeposits()).to.equal(toUSDC(10000));
        });

        it("Should emit Deposited event", async function () {
            await usdc.connect(lender).approve(await lendingPool.getAddress(), toUSDC(5000));
            await expect(lendingPool.connect(lender).deposit(toUSDC(5000)))
                .to.emit(lendingPool, "Deposited")
                .withArgs(lender.address, toUSDC(5000));
        });

        it("Should allow withdrawals", async function () {
            await usdc.connect(lender).approve(await lendingPool.getAddress(), toUSDC(10000));
            await lendingPool.connect(lender).deposit(toUSDC(10000));
            await lendingPool.connect(lender).withdraw(toUSDC(5000));

            expect(await lendingPool.deposits(lender.address)).to.equal(toUSDC(5000));
        });

        it("Should revert withdraw if insufficient deposit", async function () {
            await expect(
                lendingPool.connect(lender).withdraw(toUSDC(1000))
            ).to.be.revertedWith("LendingPool: insufficient deposit");
        });
    });

    describe("Borrowing", function () {
        const loanAmount = toUSDC(5000);
        const duration = 30 * 24 * 60 * 60; // 30 days
        let collateralAmount;

        beforeEach(async function () {
            // Lender deposits liquidity
            await usdc.connect(lender).approve(await lendingPool.getAddress(), toUSDC(100000));
            await lendingPool.connect(lender).deposit(toUSDC(100000));

            // Borrower's A-band = 40% collateral
            collateralAmount = toUSDC(2000); // 40% of 5000

            // Borrower deposits collateral into vault
            await usdc.connect(borrower).approve(await collateralVault.getAddress(), collateralAmount);
            await collateralVault.connect(borrower).depositCollateral(collateralAmount);
        });

        it("Should create a loan with valid signature", async function () {
            const block = await ethers.provider.getBlock("latest");
            const deadline = block.timestamp + 3600;
            const signature = await signLoanApproval(
                approvalSigner, borrower.address, loanAmount, duration, collateralAmount, deadline
            );

            await lendingPool.connect(borrower).borrow(
                loanAmount, duration, collateralAmount, deadline, signature
            );

            const loan = await lendingPool.getLoan(0);
            expect(loan.borrower).to.equal(borrower.address);
            expect(loan.amount).to.equal(loanAmount);
            expect(loan.interestRate).to.equal(500n); // 5% for A-band
        });

        it("Should emit LoanCreated event", async function () {
            const block = await ethers.provider.getBlock("latest");
            const deadline = block.timestamp + 3600;
            const signature = await signLoanApproval(
                approvalSigner, borrower.address, loanAmount, duration, collateralAmount, deadline
            );

            await expect(
                lendingPool.connect(borrower).borrow(loanAmount, duration, collateralAmount, deadline, signature)
            ).to.emit(lendingPool, "LoanCreated");
        });

        it("Should revert with invalid signature", async function () {
            const block = await ethers.provider.getBlock("latest");
            const deadline = block.timestamp + 3600;
            // Sign with wrong signer
            const badSignature = await signLoanApproval(
                lender, borrower.address, loanAmount, duration, collateralAmount, deadline
            );

            await expect(
                lendingPool.connect(borrower).borrow(loanAmount, duration, collateralAmount, deadline, badSignature)
            ).to.be.revertedWith("LendingPool: invalid signature");
        });

        it("Should revert if borrower not registered", async function () {
            const block = await ethers.provider.getBlock("latest");
            const deadline = block.timestamp + 3600;
            const signature = await signLoanApproval(
                approvalSigner, lender.address, loanAmount, duration, collateralAmount, deadline
            );

            await expect(
                lendingPool.connect(lender).borrow(loanAmount, duration, collateralAmount, deadline, signature)
            ).to.be.revertedWith("LendingPool: not registered");
        });
    });

    describe("Repayment", function () {
        let loanId;
        const loanAmount = toUSDC(5000);
        const duration = 30 * 24 * 60 * 60;

        beforeEach(async function () {
            // Setup: deposit, borrow
            await usdc.connect(lender).approve(await lendingPool.getAddress(), toUSDC(100000));
            await lendingPool.connect(lender).deposit(toUSDC(100000));

            const collateralAmount = toUSDC(2000);
            await usdc.connect(borrower).approve(await collateralVault.getAddress(), collateralAmount);
            await collateralVault.connect(borrower).depositCollateral(collateralAmount);

            const block = await ethers.provider.getBlock("latest");
            const deadline = block.timestamp + 3600;
            const signature = await signLoanApproval(
                approvalSigner, borrower.address, loanAmount, duration, collateralAmount, deadline
            );

            await lendingPool.connect(borrower).borrow(loanAmount, duration, collateralAmount, deadline, signature);
            loanId = 0;
        });

        it("Should repay a loan", async function () {
            // Approve a generous amount for repayment (principal + interest)
            await usdc.connect(borrower).approve(await lendingPool.getAddress(), toUSDC(10000));
            await lendingPool.connect(borrower).repay(loanId);

            const loan = await lendingPool.getLoan(loanId);
            expect(loan.status).to.equal(1n); // Repaid
        });

        it("Should emit LoanRepaid event", async function () {
            await usdc.connect(borrower).approve(await lendingPool.getAddress(), toUSDC(10000));
            await expect(lendingPool.connect(borrower).repay(loanId))
                .to.emit(lendingPool, "LoanRepaid");
        });

        it("Should unlock collateral after repayment", async function () {
            await usdc.connect(borrower).approve(await lendingPool.getAddress(), toUSDC(10000));
            await lendingPool.connect(borrower).repay(loanId);

            // Collateral should be unlocked back to borrower's available balance
            expect(await collateralVault.lockedCollateral(borrower.address)).to.equal(0n);
            expect(await collateralVault.collateralBalance(borrower.address)).to.equal(toUSDC(2000));
        });
    });

    describe("Liquidation", function () {
        it("Should liquidate an overdue loan", async function () {
            // Setup: deposit, borrow
            await usdc.connect(lender).approve(await lendingPool.getAddress(), toUSDC(100000));
            await lendingPool.connect(lender).deposit(toUSDC(100000));

            const collateralAmount = toUSDC(2000);
            await usdc.connect(borrower).approve(await collateralVault.getAddress(), collateralAmount);
            await collateralVault.connect(borrower).depositCollateral(collateralAmount);

            const duration = 7 * 24 * 60 * 60; // 7 days (minimum)
            const block = await ethers.provider.getBlock("latest");
            const deadline = block.timestamp + 3600;
            const loanAmount = toUSDC(5000);
            const signature = await signLoanApproval(
                approvalSigner, borrower.address, loanAmount, duration, collateralAmount, deadline
            );

            await lendingPool.connect(borrower).borrow(loanAmount, duration, collateralAmount, deadline, signature);

            // Fast forward past due date
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine");

            // Liquidate
            await lendingPool.connect(lender).liquidate(0);

            const loan = await lendingPool.getLoan(0);
            expect(loan.status).to.equal(3n); // Liquidated
        });

        it("Should revert liquidation if loan not overdue", async function () {
            // Setup: deposit, borrow
            await usdc.connect(lender).approve(await lendingPool.getAddress(), toUSDC(100000));
            await lendingPool.connect(lender).deposit(toUSDC(100000));

            const collateralAmount = toUSDC(2000);
            await usdc.connect(borrower).approve(await collateralVault.getAddress(), collateralAmount);
            await collateralVault.connect(borrower).depositCollateral(collateralAmount);

            const duration = 30 * 24 * 60 * 60;
            const block = await ethers.provider.getBlock("latest");
            const deadline = block.timestamp + 3600;
            const loanAmount = toUSDC(5000);
            const signature = await signLoanApproval(
                approvalSigner, borrower.address, loanAmount, duration, collateralAmount, deadline
            );

            await lendingPool.connect(borrower).borrow(loanAmount, duration, collateralAmount, deadline, signature);

            await expect(
                lendingPool.connect(lender).liquidate(0)
            ).to.be.revertedWith("LendingPool: loan not overdue");
        });
    });

    describe("View Functions", function () {
        it("Should return correct interest rate per band", async function () {
            expect(await lendingPool.getInterestRate(borrower.address)).to.equal(500n); // A-band = 5%
        });

        it("Should return pool utilization", async function () {
            expect(await lendingPool.getUtilizationRate()).to.equal(0n); // No deposits
        });
    });
});
