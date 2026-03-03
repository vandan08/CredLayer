// ═══════════════════════════════════════════════════════════════
//  Contract Addresses (update after deploying to Hardhat)
// ═══════════════════════════════════════════════════════════════

export const ADDRESSES = {
    LENDING_POOL: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    CREDIT_REGISTRY: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    COLLATERAL_VAULT: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    GOVERNANCE: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    MOCK_USDC: "0x0000000000000000000000000000000000000000" as `0x${string}`,
} as const;

// ═══════════════════════════════════════════════════════════════
//  Backend API
// ═══════════════════════════════════════════════════════════════

export const BACKEND_URL = "http://localhost:8080";

// ═══════════════════════════════════════════════════════════════
//  ABI Fragments — only the functions the frontend needs
// ═══════════════════════════════════════════════════════════════

export const CREDIT_REGISTRY_ABI = [
    {
        name: "getCreditScore",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "borrower", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getBorrowerProfile",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "borrower", type: "address" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "isRegistered", type: "bool" },
                    { name: "creditScore", type: "uint256" },
                    { name: "totalLoans", type: "uint256" },
                    { name: "successfulRepayments", type: "uint256" },
                    { name: "defaults", type: "uint256" },
                    { name: "riskBand", type: "uint8" },
                    { name: "lastUpdated", type: "uint256" },
                    { name: "reputationMultiplier", type: "uint256" },
                ],
            },
        ],
    },
] as const;

export const LENDING_POOL_ABI = [
    {
        name: "deposit",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "amount", type: "uint256" }],
        outputs: [],
    },
    {
        name: "withdraw",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "amount", type: "uint256" }],
        outputs: [],
    },
    {
        name: "borrow",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "amount", type: "uint256" },
            { name: "duration", type: "uint256" },
            { name: "collateralAmount", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "signature", type: "bytes" },
        ],
        outputs: [],
    },
    {
        name: "repay",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "loanId", type: "uint256" }],
        outputs: [],
    },
    {
        name: "getLoan",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "loanId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "loanId", type: "uint256" },
                    { name: "borrower", type: "address" },
                    { name: "amount", type: "uint256" },
                    { name: "collateralAmount", type: "uint256" },
                    { name: "interestRate", type: "uint256" },
                    { name: "startTime", type: "uint256" },
                    { name: "dueDate", type: "uint256" },
                    { name: "status", type: "uint8" },
                ],
            },
        ],
    },
    {
        name: "getBorrowerLoanIds",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "borrower", type: "address" }],
        outputs: [{ name: "", type: "uint256[]" }],
    },
    {
        name: "deposits",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "totalDeposits",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "totalBorrowed",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;

export const GOVERNANCE_ABI = [
    {
        name: "vote",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "proposalId", type: "uint256" },
            { name: "support", type: "bool" },
        ],
        outputs: [],
    },
    {
        name: "getProposal",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "proposalId", type: "uint256" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "proposer", type: "address" },
                    { name: "description", type: "string" },
                    { name: "targetContract", type: "address" },
                    { name: "callData", type: "bytes" },
                    { name: "votesFor", type: "uint256" },
                    { name: "votesAgainst", type: "uint256" },
                    { name: "startTime", type: "uint256" },
                    { name: "endTime", type: "uint256" },
                    { name: "executed", type: "bool" },
                    { name: "status", type: "uint8" },
                ],
            },
        ],
    },
    {
        name: "votingPower",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "nextProposalId",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "hasVoted",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "", type: "uint256" },
            { name: "", type: "address" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
] as const;

export const ERC20_ABI = [
    {
        name: "approve",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "balanceOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "allowance",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
] as const;
