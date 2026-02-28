// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Governance
 * @notice DAO governance contract for the credit scoring protocol.
 *         Allows token holders to propose and vote on risk parameter changes.
 * @dev Proposals have a voting period, quorum requirement, and execution delay.
 */
contract Governance is Ownable, ReentrancyGuard {
    // ═══════════════════════════════════════════════════════════════
    //                          TYPES
    // ═══════════════════════════════════════════════════════════════

    enum ProposalStatus { Pending, Active, Passed, Failed, Executed, Cancelled }

    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address targetContract;
        bytes callData;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
        bool executed;
    }

    // ═══════════════════════════════════════════════════════════════
    //                          STATE
    // ═══════════════════════════════════════════════════════════════

    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId;

    /// @notice Track if an address has voted on a proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Track voting power (simplified: 1 address = 1 vote for now)
    mapping(address => uint256) public votingPower;

    // Governance parameters
    uint256 public votingPeriod = 3 days;
    uint256 public quorum = 3;              // Minimum votes needed
    uint256 public executionDelay = 1 days;  // Delay after voting ends

    /// @notice Total registered voters
    uint256 public totalVoters;

    // ═══════════════════════════════════════════════════════════════
    //                          EVENTS
    // ═══════════════════════════════════════════════════════════════

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        address targetContract
    );
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event VoterRegistered(address indexed voter, uint256 votingPower);

    // ═══════════════════════════════════════════════════════════════
    //                        CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    constructor() Ownable(msg.sender) {
        // Register deployer as voter with power 1
        votingPower[msg.sender] = 1;
        totalVoters = 1;
    }

    // ═══════════════════════════════════════════════════════════════
    //                      ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Register a voter with voting power
     * @param voter Address to register
     * @param power Voting power to assign
     */
    function registerVoter(address voter, uint256 power) external onlyOwner {
        require(voter != address(0), "Governance: zero address");
        require(power > 0, "Governance: power must be > 0");

        if (votingPower[voter] == 0) {
            totalVoters++;
        }
        votingPower[voter] = power;

        emit VoterRegistered(voter, power);
    }

    /**
     * @notice Update governance parameters
     */
    function setGovernanceParams(
        uint256 _votingPeriod,
        uint256 _quorum,
        uint256 _executionDelay
    ) external onlyOwner {
        votingPeriod = _votingPeriod;
        quorum = _quorum;
        executionDelay = _executionDelay;
    }

    // ═══════════════════════════════════════════════════════════════
    //                    PROPOSAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Create a new governance proposal
     * @param description Description of the proposal
     * @param targetContract Contract address to execute call on
     * @param callData Encoded function call to execute if passed
     */
    function createProposal(
        string calldata description,
        address targetContract,
        bytes calldata callData
    ) external returns (uint256) {
        require(votingPower[msg.sender] > 0, "Governance: not a voter");
        require(targetContract != address(0), "Governance: zero address");

        uint256 proposalId = nextProposalId++;
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            description: description,
            targetContract: targetContract,
            callData: callData,
            votesFor: 0,
            votesAgainst: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            status: ProposalStatus.Active,
            executed: false
        });

        emit ProposalCreated(proposalId, msg.sender, description, targetContract);
        return proposalId;
    }

    /**
     * @notice Vote on an active proposal
     * @param proposalId ID of the proposal
     * @param support True for 'yes', false for 'no'
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Active, "Governance: proposal not active");
        require(block.timestamp <= proposal.endTime, "Governance: voting ended");
        require(!hasVoted[proposalId][msg.sender], "Governance: already voted");
        require(votingPower[msg.sender] > 0, "Governance: not a voter");

        hasVoted[proposalId][msg.sender] = true;
        uint256 weight = votingPower[msg.sender];

        if (support) {
            proposal.votesFor += weight;
        } else {
            proposal.votesAgainst += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Execute a passed proposal after the execution delay
     * @param proposalId ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Governance: already executed");
        require(block.timestamp > proposal.endTime, "Governance: voting not ended");
        require(
            block.timestamp >= proposal.endTime + executionDelay,
            "Governance: execution delay not met"
        );

        // Check if passed: votesFor > votesAgainst AND quorum met
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        require(totalVotes >= quorum, "Governance: quorum not reached");
        require(proposal.votesFor > proposal.votesAgainst, "Governance: proposal did not pass");

        proposal.executed = true;
        proposal.status = ProposalStatus.Executed;

        // Execute the proposal
        (bool success, ) = proposal.targetContract.call(proposal.callData);
        require(success, "Governance: execution failed");

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancel a proposal (only proposer or owner)
     * @param proposalId ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Governance: not authorized"
        );
        require(!proposal.executed, "Governance: already executed");

        proposal.status = ProposalStatus.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Check if a proposal has passed
     */
    function hasPassed(uint256 proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        if (block.timestamp <= proposal.endTime) return false;
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        return totalVotes >= quorum && proposal.votesFor > proposal.votesAgainst;
    }
}
