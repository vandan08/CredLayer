# 🎯 CredLayer - Quick Context Summary

## What is CredLayer?

**A DeFi lending protocol that enables under-collateralized loans based on on-chain credit scores.**

## The Innovation

```
Traditional DeFi:
Borrow $10,000 → Need $15,000 collateral (150%)

CredLayer (Band A):
Borrow $10,000 → Need $4,000 collateral (40%) ✨
```

## How It Works

```
1. User builds credit by repaying loans
2. Credit score increases (0-1000)
3. Better score = Less collateral + Lower interest
4. Default = Score drops + Worse terms
```

## Risk Bands

| Band | Score | Collateral | Interest | Max Loan |
|------|-------|------------|----------|----------|
| A 🌟 | 800+ | 40% | 5% | $10K |
| B ⭐ | 600-799 | 70% | 8% | $5K |
| C ⚠️ | 400-599 | 110% | 12% | $1K |
| D 🔴 | 0-399 | 150% | 20% | $50 |

## Architecture

```
Frontend (Next.js)
    ↓ REST API
Backend (Java Spring Boot)
    ↓ Web3j
Smart Contracts (Solidity)
    ↓ Events
Backend (Sync & Score)
```

## Key Components

### Smart Contracts
- **CreditRegistry**: Stores credit scores
- **LendingPool**: Handles loans
- **CollateralVault**: Manages collateral
- **Governance**: DAO voting

### Backend Services
- **CreditScoringService**: Calculates scores
- **RiskModelService**: Determines loan terms
- **SignatureService**: Signs approvals
- **OracleUpdateService**: Updates on-chain scores
- **BlockchainListenerService**: Syncs events

### Database
- **users**: Credit scores, risk bands
- **loans**: Active/repaid/defaulted loans
- **repayments**: Payment history
- **defaults**: Default records

## User Flows

### Borrow
```
1. Request loan → Backend calculates terms
2. Backend signs approval (valid 1 hour)
3. Deposit collateral
4. Borrow with signature
5. Receive USDC
```

### Repay
```
1. Repay loan + interest
2. Collateral unlocked
3. Credit score +10
4. Better terms next time
```

### Default
```
1. Miss payment deadline
2. Anyone can liquidate
3. Collateral seized
4. Credit score -150
5. Worse terms next time
```

## Credit Score Progression

```
New User: 500 (Band C)
  ↓ +10 per repayment
After 10 repayments: 600 (Band B) ⭐
  ↓ +10 per repayment
After 30 repayments: 800 (Band A) 🌟
  ↓ +10 per repayment
After 50 repayments: 1000 (Max)

Default: -150 per default 🔴
```

## Security Features

- ✅ **Signature verification**: Backend must approve loans
- ✅ **Access control**: Only oracle updates scores
- ✅ **Reentrancy guards**: Prevent attacks
- ✅ **Pausable**: Emergency stop
- ✅ **Time-limited signatures**: 1-hour expiry

## Testing Status

```
Smart Contracts: ✅ 55 tests, 95% coverage
Backend: ✅ 42 tests, 90% coverage
Frontend: 🟡 In progress
```

## Tech Stack

```
Contracts: Solidity + Hardhat + OpenZeppelin
Backend: Java 17 + Spring Boot + Web3j + PostgreSQL
Frontend: Next.js + TypeScript + Tailwind + Wagmi
```

## Current Status

```
Phase 1 (Contracts): ✅ Complete
Phase 2 (Backend): ✅ Complete
Phase 3 (Frontend): 🟡 In Progress
Phase 4 (Enhancements): 🔜 Planned
```

## Key Files

```
Contracts:
├── CreditRegistry.sol
├── LendingPool.sol
├── CollateralVault.sol
└── Governance.sol

Backend:
├── CreditScoringService.java
├── RiskModelService.java
├── SignatureService.java
└── OracleUpdateService.java

Tests:
├── 55 contract tests
└── 42 backend tests
```

## Why It Matters

**Problem**: DeFi lending is capital inefficient (150%+ collateral)

**Solution**: Trust-based lending with on-chain reputation

**Impact**: 
- Borrowers need less capital
- Lenders earn higher yields
- Good behavior rewarded
- Bad behavior penalized

## Example Scenario

```
Alice (New User):
├─ Score: 500 (Band C)
├─ Borrows: $1,000 with $1,100 collateral
├─ Repays on time (10 times)
├─ Score: 600 (Band B) ⭐
├─ Now borrows: $5,000 with $3,500 collateral
├─ Repays on time (20 more times)
├─ Score: 800 (Band A) 🌟
└─ Now borrows: $10,000 with $4,000 collateral

Bob (Defaulter):
├─ Score: 500 (Band C)
├─ Borrows: $1,000 with $1,100 collateral
├─ Defaults (misses payment)
├─ Score: 350 (Band D) 🔴
└─ Now can only borrow: $50 with $75 collateral
```

---

**CredLayer = DeFi + Credit Scores + Under-collateralized Loans**

See `APPLICATION_CONTEXT.md` for complete details.
