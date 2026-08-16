# CredLayer — Deployment Guide

Three deployables, in strict order (each layer needs the previous one's outputs):

```
1. Contracts  → Sepolia testnet        (Hardhat)
2. Backend    → Render / Railway       (Docker, Spring Boot)  + Neon Postgres
3. Frontend   → Vercel                 (Next.js)
```

---

## 0. Accounts & prerequisites (all free tiers)

| Service | Used for | Sign up |
|---|---|---|
| **Alchemy** (or Infura) | Sepolia RPC endpoint | alchemy.com |
| **Etherscan** | Contract verification (API key) | etherscan.io/apis |
| **Neon** (or Supabase) | Managed Postgres | neon.tech |
| **Render** (or Railway) | Backend container hosting | render.com |
| **Vercel** | Frontend hosting | vercel.com |
| **Sepolia faucet** | Test ETH for the deployer/oracle wallet | sepoliafaucet.com / Alchemy faucet |

Create a **dedicated deployment wallet** (never reuse a personal key). Fund it with ~0.5 Sepolia ETH. This one wallet will be: contract deployer, CreditRegistry **oracle**, and LendingPool **approvalSigner** — which is exactly what the backend expects (it signs approvals and pushes scores with the same key).

---

## 1. Deploy contracts to Sepolia

```bash
cd contracts
cp .env.example .env
```

Fill in `.env`:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
PRIVATE_KEY=0x<deployment wallet private key>
ETHERSCAN_API_KEY=<your key>
```

Deploy + verify:

```bash
npx hardhat test                                  # sanity: 75 passing
npx hardhat run scripts/deploy.js --network sepolia
```

The script:
- deploys MockUSDC, CreditRegistry, CollateralVault, LendingPool, Governance,
- links the vault to the pool,
- seeds the pool with 500k test USDC and registers the deployer,
- writes addresses to `contracts/deployments/sepolia.json` **and** `frontend/decredit-protocol/lib/web3/deployed.json` (commit this file — Vercel builds from git).

Verify on Etherscan (optional but great for the portfolio — people can read your code on-chain):

```bash
npx hardhat verify --network sepolia <MOCK_USDC_ADDR>
npx hardhat verify --network sepolia <CREDIT_REGISTRY_ADDR> <DEPLOYER_ADDR>
npx hardhat verify --network sepolia <COLLATERAL_VAULT_ADDR> <CREDIT_REGISTRY_ADDR> <MOCK_USDC_ADDR>
npx hardhat verify --network sepolia <LENDING_POOL_ADDR> <MOCK_USDC_ADDR> <CREDIT_REGISTRY_ADDR> <COLLATERAL_VAULT_ADDR> <DEPLOYER_ADDR>
npx hardhat verify --network sepolia <GOVERNANCE_ADDR>
```

---

## 2. Database — Neon Postgres

1. Create a Neon project → database `credlayer_db`.
2. Copy the pooled connection string. Convert it to JDBC form:

```
jdbc:postgresql://<host>/<db>?sslmode=require
```

Schema is auto-created by Hibernate (`ddl-auto: update`) on first boot — no manual SQL needed.

---

## 3. Backend — Render (Docker)

The backend ships with a production [Dockerfile](backend/Dockerfile) (multi-stage build, non-root user, env-driven config).

**Render:** New → Web Service → connect your GitHub repo → Root Directory: `backend` → Runtime: Docker.

Set environment variables:

| Variable | Value |
|---|---|
| `CREDLAYER_DB_URL` | `jdbc:postgresql://<neon-host>/credlayer_db?sslmode=require` |
| `CREDLAYER_DB_USER` | Neon user |
| `CREDLAYER_DB_PASSWORD` | Neon password |
| `CREDLAYER_RPC_URL` | same Alchemy Sepolia URL as step 1 |
| `CREDLAYER_ORACLE_KEY` | **the deployment wallet's private key** (⚠ never the Hardhat default) |
| `CREDLAYER_CREDIT_REGISTRY` | from `deployments/sepolia.json` |
| `CREDLAYER_LENDING_POOL` | from `deployments/sepolia.json` |
| `CREDLAYER_ALLOWED_ORIGINS` | `https://<your-app>.vercel.app` |

> Store `CREDLAYER_ORACLE_KEY` as a **secret** (Render "Secret" env var), never in the repo.

Smoke test once live:

```bash
curl https://<backend>.onrender.com/api/risk/score/0x0000000000000000000000000000000000000001
# → {"walletAddress":"0x...","currentScore":500,"riskBand":"C"}
```

**Local alternative (docker-compose):** `cd backend && docker compose up -d` starts Postgres; run the app with `mvn spring-boot:run`.

---

## 4. Frontend — Vercel

Project settings → Root Directory: `frontend/decredit-protocol`.

Environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://<backend>.onrender.com` |
| `NEXT_PUBLIC_CHAIN` | `sepolia` |
| `NEXT_PUBLIC_RPC_URL` | Alchemy Sepolia URL (optional; falls back to public RPC) |

Make sure `lib/web3/deployed.json` (written by the Sepolia deploy) is **committed** before pushing — the build bakes those addresses in.

---

## 5. End-to-end smoke test

1. Open the Vercel URL, connect MetaMask (switch to Sepolia).
2. **Lend** page → "Get Test USDC" (MockUSDC faucet, mints 10,000) → deposit some.
3. **Borrow** page → request a loan → 3 MetaMask prompts (approve → deposit collateral → borrow).
4. **History** page → the loan appears in *Active Loans* → Repay it.
5. Backend logs should show `LoanRepaid` detected → score bumped +10 → oracle tx pushed on-chain.
6. **Dashboard** → live score updated.

---

## Production security checklist

- [x] Signed approvals are **single-use** on-chain (replay protection in `LendingPool.usedApprovals`)
- [x] Approvals expire after 1 hour (deadline in signed payload)
- [x] Signature binds borrower address → only that wallet can use it (`msg.sender` in hash)
- [x] Oracle-only score updates on-chain (`onlyOracle`)
- [x] CORS restricted to configured frontend origin (no wildcard)
- [x] API input validation (EVM address format)
- [x] All secrets via environment variables; container runs as non-root
- [x] ReentrancyGuard + Pausable on all state-changing contract functions
- [x] Share-based lender accounting — interest & liquidation P/L accrue pro-rata, no orphaned funds
- [x] Vault inflation/donation attack mitigated via virtual share offset (OZ-style)
- [ ] Rate limiting on `/api/risk/*` (add a gateway/Cloudflare in front, or bucket4j)
- [ ] Key management: move oracle key to a KMS/HSM (AWS KMS, GCP) for mainnet
- [ ] Professional smart-contract audit before any real funds
