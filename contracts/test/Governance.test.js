require("@nomicfoundation/hardhat-chai-matchers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance", function () {
    let governance;
    let owner, voter1, voter2, voter3, nonVoter;

    beforeEach(async function () {
        [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

        const Governance = await ethers.getContractFactory("Governance");
        governance = await Governance.deploy();
        await governance.waitForDeployment();

        // Register voters
        await governance.registerVoter(voter1.address, 1);
        await governance.registerVoter(voter2.address, 1);
        await governance.registerVoter(voter3.address, 1);

        // Reduce voting period for testing
        await governance.setGovernanceParams(
            60,  // 60 seconds voting period
            2,   // quorum of 2
            10   // 10 seconds execution delay
        );
    });

    describe("Deployment", function () {
        it("Should set deployer as owner and voter", async function () {
            expect(await governance.owner()).to.equal(owner.address);
            expect(await governance.votingPower(owner.address)).to.equal(1n);
        });
    });

    describe("Voter Registration", function () {
        it("Should register voters with power", async function () {
            expect(await governance.votingPower(voter1.address)).to.equal(1);
            expect(await governance.totalVoters()).to.equal(4n); // owner + 3 voters
        });

        it("Should revert if non-owner registers voter", async function () {
            await expect(
                governance.connect(nonVoter).registerVoter(nonVoter.address, 1)
            ).to.be.reverted;
        });
    });

    describe("Proposal Creation", function () {
        it("Should create a proposal", async function () {
            // Encode a call to setGovernanceParams as example
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);

            await governance.connect(voter1).createProposal(
                "Increase voting period to 120s",
                await governance.getAddress(),
                callData
            );

            const proposal = await governance.getProposal(0);
            expect(proposal.proposer).to.equal(voter1.address);
            expect(proposal.description).to.equal("Increase voting period to 120s");
        });

        it("Should emit ProposalCreated event", async function () {
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);

            await expect(
                governance.connect(voter1).createProposal(
                    "Test proposal",
                    await governance.getAddress(),
                    callData
                )
            ).to.emit(governance, "ProposalCreated");
        });

        it("Should revert if non-voter creates proposal", async function () {
            const callData = "0x";
            await expect(
                governance.connect(nonVoter).createProposal("Bad", await governance.getAddress(), callData)
            ).to.be.revertedWith("Governance: not a voter");
        });
    });

    describe("Voting", function () {
        let proposalId;

        beforeEach(async function () {
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);
            const tx = await governance.connect(voter1).createProposal(
                "Test",
                await governance.getAddress(),
                callData
            );
            proposalId = 0;
        });

        it("Should allow voting for", async function () {
            await governance.connect(voter1).vote(proposalId, true);
            const proposal = await governance.getProposal(proposalId);
            expect(proposal.votesFor).to.equal(1n);
        });

        it("Should allow voting against", async function () {
            await governance.connect(voter1).vote(proposalId, false);
            const proposal = await governance.getProposal(proposalId);
            expect(proposal.votesAgainst).to.equal(1n);
        });

        it("Should revert double voting", async function () {
            await governance.connect(voter1).vote(proposalId, true);
            await expect(
                governance.connect(voter1).vote(proposalId, true)
            ).to.be.revertedWith("Governance: already voted");
        });

        it("Should revert non-voter", async function () {
            await expect(
                governance.connect(nonVoter).vote(proposalId, true)
            ).to.be.revertedWith("Governance: not a voter");
        });
    });

    describe("Execution", function () {
        let proposalId;

        beforeEach(async function () {
            // Create a proposal to update governance params
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);
            await governance.connect(voter1).createProposal(
                "Update params",
                await governance.getAddress(),
                callData
            );
            proposalId = 0;

            // Vote to pass (need quorum of 2)
            await governance.connect(voter1).vote(proposalId, true);
            await governance.connect(voter2).vote(proposalId, true);
        });

        it("Should execute a passed proposal after delay", async function () {
            // Fast forward past voting period + execution delay
            await ethers.provider.send("evm_increaseTime", [70]); // 60s voting + 10s delay
            await ethers.provider.send("evm_mine");

            // The DAO proposal tries to call `setGovernanceParams` which is `onlyOwner`.
            // Ownership must be transferred to the DAO itself for the execution to succeed.
            await governance.connect(owner).transferOwnership(await governance.getAddress());

            await governance.executeProposal(proposalId);

            const proposal = await governance.getProposal(proposalId);
            expect(proposal.executed).to.be.true;
            expect(await governance.votingPeriod()).to.equal(120);
        });

        it("Should revert execution before delay", async function () {
            // Fast forward past voting, but NOT past execution delay
            await ethers.provider.send("evm_increaseTime", [61]);
            await ethers.provider.send("evm_mine");

            await expect(
                governance.executeProposal(proposalId)
            ).to.be.revertedWith("Governance: execution delay not met");
        });

        it("Should revert if quorum not met", async function () {
            // Create new proposal with only 1 vote (quorum = 2)
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);
            await governance.connect(voter1).createProposal("Low vote", await governance.getAddress(), callData);
            await governance.connect(voter1).vote(1, true);

            await ethers.provider.send("evm_increaseTime", [70]);
            await ethers.provider.send("evm_mine");

            await expect(
                governance.executeProposal(1)
            ).to.be.revertedWith("Governance: quorum not reached");
        });
    });

    describe("Cancellation", function () {
        it("Should cancel a proposal (proposer)", async function () {
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);
            await governance.connect(voter1).createProposal("Cancel me", await governance.getAddress(), callData);

            await governance.connect(voter1).cancelProposal(0);
            const proposal = await governance.getProposal(0);
            expect(proposal.status).to.equal(5n); // Cancelled
        });

        it("Should cancel a proposal (owner)", async function () {
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);
            await governance.connect(voter1).createProposal("Cancel me", await governance.getAddress(), callData);

            await governance.connect(owner).cancelProposal(0);
            const proposal = await governance.getProposal(0);
            expect(proposal.status).to.equal(5n); // Cancelled
        });

        it("Should revert if unauthorized cancellation", async function () {
            const callData = governance.interface.encodeFunctionData("setGovernanceParams", [120, 3, 20]);
            await governance.connect(voter1).createProposal("Cancel me", await governance.getAddress(), callData);

            await expect(
                governance.connect(voter2).cancelProposal(0)
            ).to.be.revertedWith("Governance: not authorized");
        });
    });
});
