# CredLayer — Security Policy & Threat Model

> **Status: testnet / portfolio project.** CredLayer has **not** been professionally
> audited and is not intended to custody real funds. This document exists to make the
> security reasoning explicit and reviewable, and to be honest about what is *not*
> covered.

---

## 1. What makes this protocol unusual

Most DeFi lending is fully on-chain and over-collateralized: the contract can verify
everything it needs from chain state. CredLayer issues **under-collateralized** loans
(down to 40% LTV), which is only possible because an **off-chain risk engine**
attests to a borrower's creditworthiness.

That attestation is the security-critical seam of the whole system:

```
Frontend ──(1) request──▶ Backend risk engine ──(2) ECDSA-signed approval──▶ Borrower
                                                                                │
                                                            (3) submits approval│
                                                                                ▼
                                                                         LendingPool
                                                                     (verifies signature)
```

The contract cannot re-derive a credit score, so it instead verifies **who signed the
approval** and **that the approval has not been reused or expired**. Everything in
§3.1 follows from that.

---

## 2. Trust model

### 2.1 Assets at risk

| Asset | Where | Impact if compromised |
|---|---|---|
| Pool liquidity (lender USDC) | `LendingPool` | Direct theft |
| Borrower collateral | `CollateralVault` | Direct theft |
| Credit scores | `CreditRegistry` | Fraudulent under-collateralized loans |
| Oracle private key | Backend env | **Total loss** — see §2.2 |

### 2.2 Trusted components (explicit, not implicit)

**The oracle/signer key is fully trusted.** One key is simultaneously the
`CreditRegistry` oracle and the `LendingPool` `approvalSigner`. An attacker holding it
can set any borrower's score to 1000 and sign approvals for maximum loans at 40%
collateral — draining the pool down to the collateral floor.

This is an accepted architectural trade-off of hybrid credit scoring, **not** an
oversight. It is mitigated by, in order of strength:

1. The key is never committed — injected via `CREDLAYER_ORACLE_KEY` (see `DEPLOYMENT.md`).
   The local-dev default is Hardhat's *published* account #0 key, so forgetting to set
   `CREDLAYER_ORACLE_KEY` in production would otherwise sign approvals with a key the whole
   internet holds. `OracleKeyGuard` refuses to start the application when that well-known key
   is paired with a non-local RPC endpoint, converting a silent compromise into a boot failure.
2. Signed approvals are single-use and expire in 1 hour, bounding a leaked-signature
   (not leaked-key) incident.
3. `Pausable` on every state-changing entry point gives the owner an emergency stop.
4. **Not yet done:** KMS/HSM custody and a multisig owner — required before mainnet (§6).

**The contract owner is trusted** to set `approvalSigner`, interest rates, and the
pause state. Every such action now emits an event (`ApprovalSignerUpdated`,
`InterestRatesUpdated`, `MaxLoanAmountUpdated`, `OracleUpdated`, `LendingPoolUpdated`,
`GovernanceParamsUpdated`) so an off-chain monitor can alert on owner compromise.

### 2.3 Untrusted by design

Borrowers, lenders, liquidators, and all API callers are untrusted. The frontend is
untrusted — it is a convenience, and every value it sends is re-validated by the
backend and re-verified on-chain.

---

## 3. Threats and mitigations

### 3.1 Loan approval forgery and replay

| Threat | Mitigation | Verified by |
|---|---|---|
| Forge an approval without the oracle key | ECDSA recover must equal `approvalSigner` | `Should revert with invalid signature` |
| **Reuse one approval for many loans** | Approval hash recorded in `usedApprovals`; second use reverts | `Should reject a replayed approval signature` |
| Use an old approval after a score drop | 1-hour `deadline` inside the signed payload | `LendingPool: signature expired` |
| Steal someone else's approval | `msg.sender` — not a parameter — is hashed, binding the approval to one wallet | `Should revert if borrower not registered` |
| Tamper with amount/duration/collateral | All four are inside the signed hash; any change invalidates the signature | `SignatureServiceTest` |

The signed payload is exactly:

```solidity
keccak256(abi.encodePacked(msg.sender, amount, duration, collateralAmount, deadline))
```

EIP-191 (`personal_sign`) prefixed. The Java signer reproduces this byte-for-byte;
`SignatureServiceTest.testSignLoanApproval_SignatureRecoversToOracle` pins the
encoding so backend/contract drift fails CI rather than production.

> **Note on the replay fix.** The original design relied only on the 1-hour deadline.
> That is *not* sufficient: within the window an approval could be submitted repeatedly,
> opening as many loans as pool liquidity allowed against a single risk assessment.
> Single-use consumption closes it.

### 3.2 Lender fund accounting

Lenders hold **pool shares**, not a principal balance (ERC-4626-style). This is a
security property, not just a feature:

- Interest and liquidation proceeds accrue to the share price, so there are no
  unowned funds sitting in the pool for someone to race for.
- Losses are **socialized pro-rata** at the moment of liquidation, removing the
  bank-run incentive to withdraw first and stick remaining lenders with the loss.
- **Inflation/donation attack**: a first depositor could otherwise donate tokens to
  skew the share price and steal the next depositor's funds. Mitigated with an
  OpenZeppelin-style virtual offset (`VIRTUAL_SHARES = 1e3`). Verified by
  `Should keep donation attacks unprofitable and victim loss negligible` — the victim
  retains ≥99.8% and the attack is unprofitable.
- Withdrawals burn shares **rounded up** (`_convertToSharesUp`), so rounding always
  favours the pool rather than the withdrawer.

### 3.3 Reentrancy and value transfer

All state-changing entry points carry `nonReentrant`; token movement uses
OpenZeppelin `SafeERC20`. Collateral can only be moved by `LendingPool`
(`onlyLendingPool` on the vault). Slither reports two `reentrancy-benign` findings in
`borrow()` — both are writes ordered after an external call but inside the
`nonReentrant` guard, and neither is state another contract can observe mid-call.

### 3.4 Backend / API surface

| Threat | Mitigation |
|---|---|
| Any website calling the risk API | CORS restricted to `CREDLAYER_ALLOWED_ORIGINS` (no wildcard) |
| Malformed address injection | `^0x[0-9a-fA-F]{40}$` validated on every endpoint |
| SQL injection | Spring Data JPA parameter binding; no string-built queries |
| Secrets in the image | All config via env vars; container runs as a non-root user |
| Requesting more than the risk band allows | Enforced server-side in `RiskModelService`, then re-checked on-chain against `getRequiredCollateral` |

**Defence in depth:** the frontend is never the enforcement point. A borrower who
tampers with the UI still faces backend risk limits *and* the on-chain collateral
check.

### 3.5 Governance

`Governance.executeProposal` performs a low-level `call` to an arbitrary target —
intentional (that is what a parameter-change DAO does) and therefore only reachable
after a passed vote, quorum, and an execution delay. Voting is currently
`selfRegister()` → 1 address = 1 vote, which is **Sybil-attackable by design** for the
testnet demo (§6).

---

## 4. Automated security testing

Every push and PR runs (`.github/workflows/`):

| Check | Tool | Gate |
|---|---|---|
| Contract behaviour | Hardhat — **78 tests** | must pass |
| Backend logic | JUnit/Mockito — **50 tests** | must pass |
| Frontend | `tsc --noEmit`, ESLint, `next build` | must pass |
| Solidity static analysis | Slither | fails on **High** |
| Dependency CVEs (production deps) | `npm audit --omit=dev` | fails on **Critical** |
| Committed secrets | Gitleaks (full history) | must pass |

### 4.1 Slither triage (current: 21 findings, **0 high**)

Findings are not suppressed — they are triaged. Latest run:

| Severity | Detector | Count | Assessment |
|---|---|---|---|
| Medium | `incorrect-equality` | 1 | **False positive.** `assets == 0` is a divide-by-zero guard in the `getUtilizationRate` view. |
| Low | `timestamp` | 17 | **Accepted.** Loan due dates require `block.timestamp`. Validator drift (~seconds) is immaterial against a 7-day minimum loan duration. |
| Low | `reentrancy-benign` | 2 | **Accepted.** Inside `nonReentrant`; see §3.3. |
| Informational | `low-level-calls` | 1 | **By design.** Governance proposal execution; see §3.5. |

Findings fixed rather than accepted:

- `events-access` / `events-maths` (4) — admin setters were silent; all now emit events (§2.2).
- `missing-inheritance` — `ILendingPool` had **drifted** from the implementation
  (stale `Deposited`/`LoanCreated` signatures). The interface was corrected and
  `LendingPool` now inherits it, so the compiler prevents the drift from recurring.

### 4.2 Dependency advisories

**Fixed:** Next.js was pinned at `14.2.5`, which carries a **critical** middleware
authorization bypass (plus cache-poisoning and DoS advisories). Upgraded to the
patched `14.2.35`. Production dependencies now report **zero critical**.

**Accepted, tracked:** twelve `high` advisories remain in production dependencies
(`next`, `postcss`, and wallet-connector transitives such as `axios`, `ws`, `h3`,
`hono`, `lodash`). Every one is fixable *only* by a semver-major upgrade:

- `next` → 16.x is a major framework migration, out of scope for this build.
- The wallet transitives are pulled in by `@wagmi/connectors`. Forcing them via
  `npm audit fix` was attempted and **breaks the build** (`@coinbase/cdp-sdk`
  resolves an unpublished `@x402/evm` peer), so it was reverted deliberately rather
  than shipped broken.

The CI gate is therefore set at **critical for production dependencies**, with the
full report published on every run. This is a deliberate, documented threshold — not
a silenced check. Revisit when Next 15/16 migration is scheduled.

---

## 5. Reproducing the analysis locally

```bash
cd contracts && npx hardhat test
```

```bash
pip install slither-analyzer && cd contracts && slither . --config-file slither.config.json
```

---

## 6. Known limitations (accepted for a testnet portfolio build)

These are deliberate, not overlooked. Each is blocking for a mainnet deployment:

1. **No professional audit.** Non-negotiable before real funds.
2. **Centralized oracle key** (§2.2) — needs KMS/HSM custody plus a multisig owner.
3. **Single-asset collateral.** Collateral and debt are both USDC, so there is no
   price risk today. Multi-collateral requires Chainlink feeds and a real liquidation
   engine; `LIQUIDATION_THRESHOLD` in `CollateralVault` is currently unused scaffolding.
4. **Liquidation is time-based only** — triggered by a missed due date, not by a
   collateral-value drop.
5. **Sybil-able governance** (§3.5) — needs token- or reputation-weighted voting.
6. **No API rate limiting.** `/api/risk/*` is unauthenticated; a public deployment
   should sit behind a gateway or WAF.
7. **Credit score is not Sybil-resistant.** A borrower who defaults can abandon the
   wallet and start fresh at the 500 default. Real mitigation needs identity
   attestation — the fundamental open problem in under-collateralized DeFi lending.
8. **`MockUSDC` has a public faucet** and must never be deployed to mainnet.
9. **Band D collateral ratio diverges between layers.** `CollateralVault.COLLATERAL_RATIO_D`
   is `11000` (110%), while `RiskModelService.calculateTerms()` signs Band D approvals at
   150%. This is *fail-safe* — the contract check is `collateral >= required`, so the
   stricter backend figure always passes — and the frontend quotes 150% because that is
   what a borrower actually posts. It is still two sources of truth for one number and
   should be reconciled to a single constant before mainnet.

---

## 7. Reporting a vulnerability

Please **do not** open a public issue for a security bug. Report it privately via
[GitHub Security Advisories](https://github.com/vandan08/CredLayer/security/advisories/new).

Include reproduction steps and impact. As an unfunded portfolio project there is no
bug bounty, but credit will be given in the advisory.
