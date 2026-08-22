# CredLayer — Deployment Guide

Deploying all three layers on **free tiers**, end to end. Budget ~2 hours the first
time, most of it waiting on builds and testnet faucets.

```
1. Contracts  → Sepolia testnet        (Hardhat + Alchemy)
2. Database   → Neon Postgres          (free)
3. Frontend   → Vercel                 (Hobby, free)   ← deployed twice, see §4
4. Backend    → Render                 (free Docker web service)
```

---

## 0. Free-tier map

| Service | Free tier | The catch |
|---|---|---|
| **Alchemy** | 300M compute units/mo | Plenty. No card required. |
| **Sepolia faucet** | ~0.05 ETH/day | **The real bottleneck** — see §1.1. |
| **Etherscan** | 100k API calls/day | Only used for `hardhat verify`. |
| **Neon** | ~0.5 GB Postgres | Auto-suspends when idle, wakes on connect (~1s). |
| **Render** | 512 MB RAM web service | **Spins down after 15 min idle → ~50s cold start.** See §6. |
| **Vercel** | Hobby | Non-commercial use only. A portfolio piece is normally fine; a client's production app is not. |

Everything below fits in these tiers. No credit card is required at any step.

> **Why the odd ordering?** The backend's CORS allowlist needs the frontend's URL,
> and the frontend needs the backend's URL. Deploying the frontend first breaks the
> cycle — it is fully functional without the backend (every page except the borrow
> signature reads straight from chain).

---

## 1. Contracts → Sepolia

### 1.1 Wallet and test ETH

Create a **brand-new MetaMask account** for this. Never reuse a wallet that holds
anything. This single key becomes three things at once — contract deployer,
`CreditRegistry` oracle, and `LendingPool` approvalSigner — which is exactly what
the backend expects, and is also the single biggest thing separating this from a
production setup (documented in [SECURITY.md](SECURITY.md) §2.2).

You need roughly **0.05 Sepolia ETH**; 0.1 is comfortable. The deploy script sends
about 11 transactions — five contract creations plus linking and seeding.

Faucets, best first:

- **Google Cloud Web3 faucet** — 0.05/day, no mainnet balance required
- **sepolia-faucet.pk910.de** — proof-of-work, mine in the browser, slow but has no gatekeeping
- **Alchemy / Chainlink faucets** — faster, but usually require a small mainnet ETH balance on the requesting address

If every faucet gates you, the PoW one always works — leave it running for 20 minutes.

### 1.2 Get an RPC URL

Alchemy → create app → chain **Ethereum**, network **Sepolia** → copy the HTTPS URL.
It looks like `https://eth-sepolia.g.alchemy.com/v2/<KEY>`.

### 1.3 Deploy

```bash
cd contracts
cp .env.example .env
```

Fill in `.env`:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_KEY>
PRIVATE_KEY=0x<your new wallet's private key>
ETHERSCAN_API_KEY=<from etherscan.io/apis>
```

> `contracts/.env` is gitignored. Confirm with `git status` before you ever commit —
> a leaked key here is a leaked oracle.

Sanity-check, then deploy:

```bash
npx hardhat test
```

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

This takes a few minutes on a public testnet. It deploys the five contracts, links
the vault to the pool, seeds 500,000 MockUSDC of pool liquidity, registers your
deployer as a borrower, and creates one governance proposal so the DAO page has real
content.

It writes addresses to two places:
- `contracts/deployments/sepolia.json` — the deployment record
- `frontend/decredit-protocol/lib/web3/deployed.json` — **read at build time by Vercel**

```bash
git add contracts/deployments/sepolia.json frontend/decredit-protocol/lib/web3/deployed.json && git commit -m "chore: sepolia deployment addresses"
```

If you skip this commit, Vercel builds against the old localhost addresses and every
on-chain read silently returns nothing.

### 1.4 Verify on Etherscan

Optional, and worth it — verified source means a reviewer can read your Solidity
straight from the block explorer, and the landing page links each contract there.

```bash
npx hardhat verify --network sepolia <MOCK_USDC>
```
```bash
npx hardhat verify --network sepolia <CREDIT_REGISTRY> <DEPLOYER_ADDR>
```
```bash
npx hardhat verify --network sepolia <COLLATERAL_VAULT> <CREDIT_REGISTRY> <MOCK_USDC>
```
```bash
npx hardhat verify --network sepolia <LENDING_POOL> <MOCK_USDC> <CREDIT_REGISTRY> <COLLATERAL_VAULT> <DEPLOYER_ADDR>
```
```bash
npx hardhat verify --network sepolia <GOVERNANCE>
```

"Already Verified" is a success, not an error.

---

## 2. Database → Neon

1. neon.tech → sign up → **New Project**, database name `credlayer_db`.
2. Copy the **pooled** connection string.
3. Convert it to JDBC form — Spring needs `jdbc:` in front, and the user/password
   split out into their own variables:

```
Neon gives you:  postgresql://alex:AbC123@ep-cool-x.aws.neon.tech/credlayer_db?sslmode=require

CREDLAYER_DB_URL       = jdbc:postgresql://ep-cool-x.aws.neon.tech/credlayer_db?sslmode=require
CREDLAYER_DB_USER      = alex
CREDLAYER_DB_PASSWORD  = AbC123
```

Keep `?sslmode=require` — Neon rejects unencrypted connections. The schema is created
automatically on first boot (`ddl-auto: update`); there is no SQL to run.

---

## 3. Frontend → Vercel (first pass)

Deploy now, without the backend, to get your stable URL.

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. **Root Directory: `frontend/decredit-protocol`** ← the one setting people miss.
   Framework preset auto-detects as Next.js.
3. Environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_CHAIN` | `sepolia` |
| `NEXT_PUBLIC_RPC_URL` | your Alchemy Sepolia URL |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` |

Leave `NEXT_PUBLIC_BACKEND_URL` unset for now.

4. Deploy. **Write down the production URL** — you need it in the next step.

At this point the landing page, dashboard, lend, history and governance all work
against Sepolia. Only the borrow flow is inert, because it needs a signature.

> Use the **production** domain (`<project>.vercel.app`), not a preview URL. The
> backend's CORS list matches origins exactly, so preview deploys on generated
> subdomains will be blocked.

---

## 4. Backend → Render

1. render.com → **New → Web Service** → connect the repo.
2. **Root Directory: `backend`**, **Runtime: Docker**, **Instance Type: Free**.
   Render finds `backend/Dockerfile` on its own.
3. Environment variables:

| Variable | Value |
|---|---|
| `CREDLAYER_DB_URL` | `jdbc:postgresql://<neon-host>/credlayer_db?sslmode=require` |
| `CREDLAYER_DB_USER` | Neon user |
| `CREDLAYER_DB_PASSWORD` | Neon password *(mark as Secret)* |
| `CREDLAYER_RPC_URL` | your Alchemy Sepolia URL |
| `CREDLAYER_ORACLE_KEY` | your deployer private key *(mark as Secret)* |
| `CREDLAYER_CREDIT_REGISTRY` | from `deployments/sepolia.json` |
| `CREDLAYER_LENDING_POOL` | from `deployments/sepolia.json` |
| `CREDLAYER_ALLOWED_ORIGINS` | `https://<your-project>.vercel.app` — no trailing slash |

Do **not** set `PORT`. Render injects it, and `application.yml` already reads `${PORT:8080}`.

4. Deploy. The first build runs a full Maven build inside Docker — expect 5–10 minutes.

Smoke test:

```bash
curl https://<your-backend>.onrender.com/api/risk/score/0x0000000000000000000000000000000000000001
```

Expect `{"walletAddress":"0x...","currentScore":500,"riskBand":"C"}`. The first call
after idle takes ~50 seconds — that is the free tier waking up, not a failure.

---

## 5. Frontend → Vercel (second pass)

Back in Vercel → Settings → Environment Variables, add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | `https://<your-backend>.onrender.com` — no trailing slash |

Then **Deployments → ⋯ → Redeploy**. Next.js inlines `NEXT_PUBLIC_*` at build time,
so adding the variable alone changes nothing until you rebuild.

---

## 6. Keeping the demo warm

Render's free tier sleeps after 15 minutes idle. If someone clicks your link cold and
goes straight to Borrow, it looks broken.

Mitigations, in order of effort:

1. **Before any demo or recording, hit the backend URL yourself** and wait for the
   200. Thirty seconds of prep removes the problem entirely.
2. **Free cron ping.** cron-job.org → new job → your `/api/risk/score/0x...0001`
   endpoint every 10 minutes. Keeps it warm within the 750 free instance-hours/month.
3. Accept it. Everything except borrowing works regardless, because those pages read
   the chain directly.

---

## 7. End-to-end test

1. Open the Vercel URL. The landing page and risk simulator need no wallet.
2. **Launch App** → connect MetaMask → switch to Sepolia.
3. **Lend** → *Get Test USDC* (mints 10,000 MockUSDC) → deposit some.
4. **Borrow** → request a loan → three MetaMask prompts: approve → deposit collateral → borrow.
5. **History** → the loan shows under *Active Loans* → repay it.
6. Render logs should show `LoanRepaid` detected → score +10 → oracle transaction pushed.
7. **Dashboard** → score updated from chain.

You need Sepolia ETH in the *browser* wallet for gas here, separate from the deployer's.

---

## 8. Troubleshooting

| Symptom | Cause |
|---|---|
| `Refusing to start: the oracle key is Hardhat's publicly-known account #0 key` | `CREDLAYER_ORACLE_KEY` is unset. This is `OracleKeyGuard` working correctly — set it and redeploy. |
| Frontend loads, all on-chain values empty | `deployed.json` wasn't committed, or `NEXT_PUBLIC_CHAIN` isn't `sepolia`. |
| Borrow fails with a CORS error in the console | `CREDLAYER_ALLOWED_ORIGINS` doesn't exactly match the origin — check for a trailing slash, `http` vs `https`, or a preview URL. |
| Borrow hangs ~50s then works | Render cold start. See §6. |
| Backend boots then dies | Usually the Neon URL — must start `jdbc:` and keep `?sslmode=require`. |
| Render build OOMs | Free tier is 512 MB. `-XX:MaxRAMPercentage=75` is already set in the Dockerfile; if it still struggles, the build stage is the culprit, not runtime. |
| `insufficient funds` mid-deploy | Faucet more Sepolia ETH and re-run. Redeploying from scratch is fine — it just writes new addresses. |

---

## 9. Alternatives if Render doesn't suit

- **Koyeb** — free web service, historically without aggressive spin-down. Same Docker setup.
- **Google Cloud Run** — generous free tier, scales to zero with a much shorter cold start than Render. Needs a card on file and the `gcloud` CLI, so more setup.
- **Fly.io** — good fit for containers; free allowances have changed over time, check current terms.

The frontend and contracts have no equally simple alternative worth switching for.

---

## Production security checklist

- [x] Signed approvals are **single-use** on-chain (`LendingPool.usedApprovals`)
- [x] Approvals expire after 1 hour (deadline inside the signed payload)
- [x] Signature binds the borrower address — only that wallet can redeem it
- [x] Oracle-only score updates on-chain (`onlyOracle`)
- [x] CORS restricted to the configured frontend origin, no wildcard
- [x] API input validation (EVM address format)
- [x] All secrets via environment variables; container runs as non-root
- [x] ReentrancyGuard + Pausable on all state-changing contract functions
- [x] Share-based lender accounting — interest and liquidation P/L accrue pro-rata
- [x] Vault inflation/donation attack mitigated via virtual share offset
- [ ] Rate limiting on `/api/risk/*` (gateway, Cloudflare, or bucket4j)
- [ ] Key management: move the oracle key to a KMS/HSM for mainnet
- [ ] Split deployer / oracle / approvalSigner into separate keys
- [ ] Reconcile the Band D collateral ratio between the vault and the risk engine (SECURITY.md §6.9)
- [ ] Professional smart-contract audit before any real funds
