# Decentralized Credit Scoring & Under-Collateralized Lending Protocol

A comprehensive blockchain-based lending platform that revolutionizes DeFi by introducing reputation-based, under-collateralized loans. The protocol integrates an off-chain risk engine with on-chain smart contracts to dynamically adjust collateral requirements based on a user's credit score.

## 🌟 Project Overview

Traditional DeFi lending requires significant over-collateralization (often 150%+). This protocol enables under-collateralized borrowing (down to 40% LTV) by utilizing an off-chain risk scoring engine. Borrowers with high credit scores and good repayment histories are rewarded with lower collateral requirements and better interest rates.

### The System Consists of Three Main Layers:
1. **Smart Contracts (Phase 1 - Completed)**: Core protocol logic (Solidity, Hardhat).
2. **Backend Risk Engine (Phase 2 - Completed)**: Java Spring Boot application to analyze off-chain data, assess risk, and push credit scores on-chain.
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

## ⚙️ Phase 2: Backend Risk Engine

The backend is built with **Java 17+ and Spring Boot 3.x**, heavily utilizing **Web3j** for seamless blockchain interactions and PostgreSQL for data persistence.

- **Blockchain Listener Service**: Subscribes to Ethereum events (`LoanCreated`, `LoanRepaid`, `LoanLiquidated`) to sync the database with on-chain activities.
- **Credit Scoring Engine**: Updates user credit scores mathematically based on on-chain events (repayment bonuses, default penalties).
- **Oracle Updater Service**: Authenticates the backend as an Oracle and securely signs & broadcasts updated credit scores to `CreditRegistry.sol` using raw signed transactions.
- **Risk Model Service**: Calculates loan terms dynamically (max loan, interest rate, required collateral) tailored to the borrower's risk band.
- **REST APIs**: Provides endpoints to fetch risk models and generate off-chain ECDSA signed approvals that users submit to `LendingPool.sol` to execute borrows natively on-chain.

## 🚀 Quickstarts

### Smart Contracts (Hardhat)
Navigate to the `contracts` directory:
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

### Backend (Java Spring Boot)
Navigate to the `backend` directory. Ensure you have Docker running for PostgreSQL and update `application.yml` with your Hardhat node connection if testing locally.
```bash
cd backend
docker-compose up -d
./mvnw clean spring-boot:run
```

## 🔐 Security Features

- **Access Controls**: `Ownable` is heavily utilized. Only authorized Oracles can update credit scores.
- **Pausability**: Core functions are equipped with `Pausable` to quickly halt the protocol in emergencies.
- **Reentrancy Protection**: `ReentrancyGuard` from OpenZeppelin is applied to all sensitive state-mutating functions (borrow, repay, liquidate, deposit).
- **Backend Signatures**: Borrowing requires an off-chain ECDSA signature signed by a trusted backend key, preventing unauthorized or un-scored loans.

## 🧑‍💻 Next Steps
- Implementation of the Next.js Frontend (Phase 3) focusing on an "Industrial Credit Bureau" aesthetic.
- End-to-end integration mapping frontend interactions through the backend and down to the smart contracts.
