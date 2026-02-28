# Decentralized Credit Scoring & Under-Collateralized Lending Protocol

A comprehensive blockchain-based lending platform that revolutionizes DeFi by introducing reputation-based, under-collateralized loans. The protocol integrates an off-chain risk engine with on-chain smart contracts to dynamically adjust collateral requirements based on a user's credit score.

## 🌟 Project Overview

Traditional DeFi lending requires significant over-collateralization (often 150%+). This protocol enables under-collateralized borrowing (down to 40% LTV) by utilizing an off-chain risk scoring engine. Borrowers with high credit scores and good repayment histories are rewarded with lower collateral requirements and better interest rates.

### The System Consists of Three Main Layers:
1. **Smart Contracts (Phase 1 - Completed)**: Core protocol logic (Solidity, Hardhat).
2. **Backend Risk Engine (Phase 2 - Upcoming)**: Java Spring Boot application to analyze off-chain data and push credit scores.
3. **Frontend dApp (Phase 3 - Upcoming)**: Next.js application for users to borrow, lend, and manage proposals.

## 🏗️ Phase 1: Smart Contracts Architecture

The core protocol consists of the following smart contracts, all written in Solidity 0.8.24 and extensively tested using Hardhat:

- `CreditRegistry.sol`: 
  - Manages borrower profiles, including credit scores, loan histories, and reputation multipliers.
  - Scores are divided into Risk Bands (A, B, C, D) which determine loan terms.
  - Strictly relies on an authorized Oracle (the Backend Risk Engine) to update scores.
  
- `CollateralVault.sol`: 
  - Sub-vault that securely handles user collateral (USDC).
  - Dynamically calculates required collateral based on risk bands (e.g., 40% for Band A, 110% for Band C/D).

- `LendingPool.sol`: 
  - The main entry point for liquidity providers (lenders) and borrowers.
  - Features ECDSA signature verification to ensure loans are approved by the risk engine.
  - Manages borrowing, repayments, interest accrual, and liquidations.

- `Governance.sol`: 
  - A DAO contract allowing token holders to propose, vote on, and execute changes to protocol risk parameters.

- `MockUSDC.sol`: 
  - An ERC20 token used to simulate stablecoin interactions for local development.

## 🚀 Quickstart (Smart Contracts)

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
Navigate to the `contracts` directory and install dependencies:
```bash
cd contracts
npm install
```

### Compilation
Compile the smart contracts (ensure `viaIR` is enabled in `hardhat.config.js`):
```bash
npx hardhat compile
```

### Testing
We have a comprehensive test suite covering all contracts (66+ tests). To run them:
```bash
npx hardhat test
```

### Deployment
To deploy to a local Hardhat node:
```bash
npx hardhat node
# In a new terminal:
npx hardhat run scripts/deploy.js --network localhost
```

## 🔐 Security Features

- **Access Controls**: `Ownable` is heavily utilized. Only authorized Oracles can update credit scores.
- **Pausability**: Core functions are equipped with `Pausable` to quickly halt the protocol in emergencies.
- **Reentrancy Protection**: `ReentrancyGuard` from OpenZeppelin is applied to all sensitive state-mutating functions (borrow, repay, liquidate, deposit).
- **Backend Signatures**: Borrowing requires an off-chain ECDSA signature signed by a trusted backend key, preventing unauthorized or un-scored loans.

## 🧑‍💻 Next Steps
- Implementation of the Java Spring Boot Backend (Phase 2).
- Integration of the Web3j listener for real-time blockchain event parsing.
- Implementation of the Next.js Frontend (Phase 3).
