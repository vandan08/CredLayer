// ═══════════════════════════════════════════════════════════════
//  Contract Addresses
//  Sourced from deployed.json, which `scripts/deploy.js` regenerates
//  on every deploy. A zero address means "not deployed yet".
// ═══════════════════════════════════════════════════════════════

import deployed from "./deployed.json";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export const ADDRESSES = {
    LENDING_POOL: (deployed.LendingPool || ZERO) as `0x${string}`,
    CREDIT_REGISTRY: (deployed.CreditRegistry || ZERO) as `0x${string}`,
    COLLATERAL_VAULT: (deployed.CollateralVault || ZERO) as `0x${string}`,
    GOVERNANCE: (deployed.Governance || ZERO) as `0x${string}`,
    MOCK_USDC: (deployed.MockUSDC || ZERO) as `0x${string}`,
} as const;

/** True once contracts have actually been deployed (addresses are non-zero). */
export function isDeployed(address: `0x${string}`): boolean {
    return address !== ZERO;
}

// ═══════════════════════════════════════════════════════════════
//  Backend API
// ═══════════════════════════════════════════════════════════════

export const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

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
        // Must match ICreditRegistry.BorrowerProfile exactly (field order matters).
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "creditScore", type: "uint256" },
                    { name: "totalLoans", type: "uint256" },
                    { name: "repaidLoans", type: "uint256" },
                    { name: "defaultedLoans", type: "uint256" },
                    { name: "reputationMultiplier", type: "uint256" },
                    { name: "lastUpdated", type: "uint256" },
                    { name: "isRegistered", type: "bool" },
                ],
            },
        ],
    },
    {
        name: "isRegistered",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "borrower", type: "address" }],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "getRiskBand",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "borrower", type: "address" }],
        outputs: [{ name: "", type: "uint8" }],
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
        // Must match LendingPool.Loan exactly (field order matters).
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
                    { name: "dueDate", type: "uint256" },
                    { name: "repaidAmount", type: "uint256" },
                    { name: "status", type: "uint8" },
                    { name: "createdAt", type: "uint256" },
                ],
            },
        ],
    },
    {
        name: "getTotalRepayment",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "loanId", type: "uint256" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getBorrowerLoanIds",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "borrower", type: "address" }],
        outputs: [{ name: "", type: "uint256[]" }],
    },
    {
        // Now a view over share value (includes accrued yield), same ABI shape
        // as the pre-4626 public mapping.
        name: "deposits",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "maxWithdraw",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "provider", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "sharesOf",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "convertToShares",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "assets", type: "uint256" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "convertToAssets",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "shares", type: "uint256" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "redeem",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "shares", type: "uint256" }],
        outputs: [],
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
        // Must match Governance.Proposal exactly (field order matters).
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "id", type: "uint256" },
                    { name: "proposer", type: "address" },
                    { name: "description", type: "string" },
                    { name: "targetContract", type: "address" },
                    { name: "callData", type: "bytes" },
                    { name: "votesFor", type: "uint256" },
                    { name: "votesAgainst", type: "uint256" },
                    { name: "startTime", type: "uint256" },
                    { name: "endTime", type: "uint256" },
                    { name: "status", type: "uint8" },
                    { name: "executed", type: "bool" },
                ],
            },
        ],
    },
    {
        name: "selfRegister",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
    {
        name: "createProposal",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "description", type: "string" },
            { name: "targetContract", type: "address" },
            { name: "callData", type: "bytes" },
        ],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "quorum",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "totalVoters",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
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

export const COLLATERAL_VAULT_ABI = [
    {
        name: "depositCollateral",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "amount", type: "uint256" }],
        outputs: [],
    },
    {
        name: "withdrawCollateral",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "amount", type: "uint256" }],
        outputs: [],
    },
    {
        name: "collateralBalance",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "lockedCollateral",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "getRequiredCollateral",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "borrower", type: "address" },
            { name: "loanAmount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256" }],
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

// MockUSDC extends ERC20 with a public faucet for local testing.
export const MOCK_USDC_ABI = [
    ...ERC20_ABI,
    {
        name: "faucet",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
] as const;
