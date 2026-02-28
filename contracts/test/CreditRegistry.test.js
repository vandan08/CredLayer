const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CreditRegistry", function () {
    let creditRegistry;
    let owner, oracle, borrower1, borrower2, nonOracle;

    beforeEach(async function () {
        [owner, oracle, borrower1, borrower2, nonOracle] = await ethers.getSigners();

        const CreditRegistry = await ethers.getContractFactory("CreditRegistry");
        creditRegistry = await CreditRegistry.deploy(oracle.address);
        await creditRegistry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the correct oracle", async function () {
            expect(await creditRegistry.oracle()).to.equal(oracle.address);
        });

        it("Should set the correct owner", async function () {
            expect(await creditRegistry.owner()).to.equal(owner.address);
        });

        it("Should revert if oracle is zero address", async function () {
            const CreditRegistry = await ethers.getContractFactory("CreditRegistry");
            await expect(
                CreditRegistry.deploy(ethers.ZeroAddress)
            ).to.be.revertedWith("CreditRegistry: oracle is zero address");
        });
    });

    describe("Borrower Registration", function () {
        it("Should register a borrower with default score", async function () {
            await creditRegistry.connect(oracle).registerBorrower(borrower1.address);

            expect(await creditRegistry.isRegistered(borrower1.address)).to.be.true;
            expect(await creditRegistry.getCreditScore(borrower1.address)).to.equal(500);
            expect(await creditRegistry.totalBorrowers()).to.equal(1);
        });

        it("Should emit BorrowerRegistered event", async function () {
            await expect(creditRegistry.connect(oracle).registerBorrower(borrower1.address))
                .to.emit(creditRegistry, "BorrowerRegistered")
                .withArgs(borrower1.address, await getBlockTimestamp());
        });

        it("Should revert if borrower already registered", async function () {
            await creditRegistry.connect(oracle).registerBorrower(borrower1.address);
            await expect(
                creditRegistry.connect(oracle).registerBorrower(borrower1.address)
            ).to.be.revertedWith("CreditRegistry: borrower already registered");
        });

        it("Should allow owner to register borrowers", async function () {
            await creditRegistry.connect(owner).registerBorrower(borrower1.address);
            expect(await creditRegistry.isRegistered(borrower1.address)).to.be.true;
        });

        it("Should revert if non-oracle/non-owner tries to register", async function () {
            await expect(
                creditRegistry.connect(nonOracle).registerBorrower(borrower1.address)
            ).to.be.revertedWith("CreditRegistry: caller is not oracle or owner");
        });
    });

    describe("Credit Score Updates", function () {
        beforeEach(async function () {
            await creditRegistry.connect(oracle).registerBorrower(borrower1.address);
        });

        it("Should update credit score (oracle only)", async function () {
            await creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 750);
            expect(await creditRegistry.getCreditScore(borrower1.address)).to.equal(750);
        });

        it("Should emit CreditScoreUpdated event", async function () {
            await expect(creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 750))
                .to.emit(creditRegistry, "CreditScoreUpdated");
        });

        it("Should revert if non-oracle tries to update", async function () {
            await expect(
                creditRegistry.connect(nonOracle).updateCreditScore(borrower1.address, 750)
            ).to.be.revertedWith("CreditRegistry: caller is not the oracle");
        });

        it("Should revert if score exceeds maximum", async function () {
            await expect(
                creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 1001)
            ).to.be.revertedWith("CreditRegistry: score exceeds maximum");
        });

        it("Should increase reputation when score increases", async function () {
            await creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 600);
            const profile = await creditRegistry.getBorrowerProfile(borrower1.address);
            expect(profile.reputationMultiplier).to.equal(105); // 100 + 5
        });

        it("Should decrease reputation when score decreases", async function () {
            await creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 400);
            const profile = await creditRegistry.getBorrowerProfile(borrower1.address);
            expect(profile.reputationMultiplier).to.equal(95); // 100 - 5
        });
    });

    describe("Risk Bands", function () {
        beforeEach(async function () {
            await creditRegistry.connect(oracle).registerBorrower(borrower1.address);
        });

        it("Should return Band A for score >= 800", async function () {
            await creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 850);
            expect(await creditRegistry.getRiskBand(borrower1.address)).to.equal(3); // RiskBand.A = 3
        });

        it("Should return Band B for score 600-799", async function () {
            await creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 700);
            expect(await creditRegistry.getRiskBand(borrower1.address)).to.equal(2); // RiskBand.B = 2
        });

        it("Should return Band C for score 400-599 (default score = 500)", async function () {
            expect(await creditRegistry.getRiskBand(borrower1.address)).to.equal(1); // RiskBand.C = 1
        });

        it("Should return Band D for score < 400", async function () {
            await creditRegistry.connect(oracle).updateCreditScore(borrower1.address, 300);
            expect(await creditRegistry.getRiskBand(borrower1.address)).to.equal(0); // RiskBand.D = 0
        });
    });

    describe("Loan/Repayment/Default Recording", function () {
        beforeEach(async function () {
            await creditRegistry.connect(oracle).registerBorrower(borrower1.address);
        });

        it("Should record a loan", async function () {
            await creditRegistry.connect(oracle).recordLoan(borrower1.address);
            const profile = await creditRegistry.getBorrowerProfile(borrower1.address);
            expect(profile.totalLoans).to.equal(1);
        });

        it("Should record a repayment", async function () {
            await creditRegistry.connect(oracle).recordRepayment(borrower1.address);
            const profile = await creditRegistry.getBorrowerProfile(borrower1.address);
            expect(profile.repaidLoans).to.equal(1);
        });

        it("Should record a default", async function () {
            await creditRegistry.connect(oracle).recordDefault(borrower1.address);
            const profile = await creditRegistry.getBorrowerProfile(borrower1.address);
            expect(profile.defaultedLoans).to.equal(1);
        });
    });

    describe("Pausable", function () {
        it("Should pause and unpause", async function () {
            await creditRegistry.pause();
            await expect(
                creditRegistry.connect(oracle).registerBorrower(borrower1.address)
            ).to.be.reverted;

            await creditRegistry.unpause();
            await creditRegistry.connect(oracle).registerBorrower(borrower1.address);
            expect(await creditRegistry.isRegistered(borrower1.address)).to.be.true;
        });
    });

    describe("Oracle Management", function () {
        it("Should allow owner to change oracle", async function () {
            await creditRegistry.setOracle(nonOracle.address);
            expect(await creditRegistry.oracle()).to.equal(nonOracle.address);
        });

        it("Should revert if non-owner changes oracle", async function () {
            await expect(
                creditRegistry.connect(nonOracle).setOracle(nonOracle.address)
            ).to.be.reverted;
        });
    });
});

async function getBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
}
