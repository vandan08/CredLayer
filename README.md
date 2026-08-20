# CredLayer — Decentralized Credit Scoring & Under-Collateralized Lending

[![CI](https://github.com/vandan08/CredLayer/actions/workflows/ci.yml/badge.svg)](https://github.com/vandan08/CredLayer/actions/workflows/ci.yml)
[![Security](https://github.com/vandan08/CredLayer/actions/workflows/security.yml/badge.svg)](https://github.com/vandan08/CredLayer/actions/workflows/security.yml)
[![Tests](https://img.shields.io/badge/tests-128%20passing-brightgreen)](#-testing)
[![Solidity](https://img.shields.io/badge/solidity-0.8.24-363636)](contracts/contracts)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A blockchain-based lending platform that enables reputation-based, **under-collateralized** loans. An off-chain risk engine cryptographically co-signs every loan, letting on-chain contracts safely lend at collateral ratios that pure on-chain protocols cannot offer.

## 🔗 Live Demo

**→ [credlayer.vercel.app](https://credlayer.vercel.app)** *(update this link after your Vercel deploy)*

**No wallet required.** The landing page explains the mechanism and includes an
interactive risk-engine simulator that runs the protocol's real band logic in the
browser. Every app screen — dashboard, borrow, lend, history, governance — falls
back to seeded demo data when no wallet is connected, so the product is fully
explorable without MetaMask or testnet funds.

Connect MetaMask on Sepolia to switch the same UI onto live on-chain reads and writes.

> **Single source of truth:** score thresholds, collateral ratios, interest rates and
> loan ceilings live in [`frontend/decredit-protocol/lib/risk.ts`](frontend/decredit-protocol/lib/risk.ts),
> mirrored from `CreditRegistry.sol`, `CollateralVault.sol` and the backend
> `RiskModelService`. The UI cannot drift from what the contracts enforce.

## 🌟 Project Overview

Traditional DeFi lending requires significant over-collateralization (often 150%+). CredLayer enables under-collateralized borrowing (down to 40% LTV) using an off-chain risk scoring engine. Borrowers with high credit scores and good repayment histories are rewarded with lower collateral requirements and better interest rates.

### The System Consists of Three Main Layers:
1. **Smart Contracts** ✅ — Core protocol logic (Solidity 0.8.24, Hardhat). 78 tests.
2. **Backend Risk Engine** ✅ — Java Spring Boot service that scores borrowers, signs loan approvals, and acts as the on-chain oracle. 50 tests.
3. **Frontend dApp** ✅ — Next.js 14 + wagmi/viem. Live on-chain borrow, repay, lend, and DAO voting flows.

📄 **[SECURITY.md](SECURITY.md)** — threat model, trust assumptions, and static-analysis triage
🚀 **[DEPLOYMENT.md](DEPLOYMENT.md)** — step-by-step Sepolia + Render + Vercel deployment

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

Deploy locally (seeds pool liquidity, a registered borrower, and a demo proposal, then writes contract addresses into the frontend):

```bash
npx hardhat node          # terminal 1
npx hardhat run scripts/deploy.js --network localhost
```

### Backend (Java Spring Boot)
Ensure Docker is running for PostgreSQL. Defaults target a local Hardhat node; every value is env-overridable (see [DEPLOYMENT.md](DEPLOYMENT.md)).
```bash
cd backend
docker compose up -d
mvn spring-boot:run
```

### Frontend (Next.js)
```bash
cd frontend/decredit-protocol
npm install
npm run dev
```

## 🧪 Testing

```bash
cd contracts && npx hardhat test     # 78 passing
cd backend   && mvn test             # 50 passing
```

## 🔐 Security Features

Full threat model, trust assumptions, and Slither triage in **[SECURITY.md](SECURITY.md)**.

- **Signed loan approvals**: Borrowing requires an ECDSA signature over `(borrower, amount, duration, collateral, deadline)` from the risk engine — preventing unauthorized or un-scored loans.
- **Replay protection**: Each approval is **single-use** on-chain (`usedApprovals`) and expires after 1 hour, so one risk assessment can never fund multiple loans.
- **Share-based lender accounting**: ERC-4626-style shares mean interest and liquidation losses accrue pro-rata, with an OpenZeppelin-style virtual offset defeating vault inflation attacks.
- **Access controls**: Only the authorized oracle can update credit scores; only the pool can move collateral. All admin actions emit events for off-chain monitoring.
- **Pausability & reentrancy protection**: `Pausable` emergency stop plus `ReentrancyGuard` on every state-mutating function.
- **Automated in CI**: Slither static analysis, dependency CVE scanning, and full-history secret scanning run on every push.

> ⚠️ This is a testnet portfolio project. It has **not** been professionally audited — see [SECURITY.md §6](SECURITY.md) for known limitations.

## 🧑‍💻 Roadmap
- Chainlink price feeds + multi-collateral support (ETH, WBTC) with value-based liquidation.
- Richer credit model (repayment streak, loan size, account age) replacing the flat ±10/−150 heuristic.
- Token- or reputation-weighted governance to replace 1-address-1-vote.
