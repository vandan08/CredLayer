# CredLayer — Frontend (Phase 3)

Next.js 14 frontend for the CredLayer decentralized credit scoring & under-collateralized lending protocol.

## Routes

| Route | Group | Notes |
|---|---|---|
| `/` | — | Marketing landing page. Full-bleed, no sidebar, no wallet required. Includes the interactive risk-engine simulator. |
| `/dashboard`, `/borrow`, `/lend`, `/history`, `/governance` | `(app)` | The protocol app. Shares the sidebar + ticker chrome via `app/(app)/layout.tsx`. |

Every app page falls back to seeded demo data from `lib/data.ts` when no wallet is
connected, so the whole product is explorable without MetaMask or testnet funds.

## Risk constants

`lib/risk.ts` is the single source of truth for score thresholds, collateral
ratios, interest rates and loan ceilings. It mirrors `CreditRegistry.sol`,
`CollateralVault.sol` and the backend `RiskModelService`. Do not redeclare these
numbers anywhere else — `lib/data.ts`, the borrow page, the ticker and the
landing page all derive from it.

## Design Philosophy

**"Industrial Credit Bureau"** aesthetic — editorial serif typography meets terminal monospace data. Warm newsprint background, no gradients, no glassmorphism. Looks like serious financial infrastructure, not another Web3 startup.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (custom design tokens)
- **Framer Motion** (animations)
- **IBM Plex Mono** + **Playfair Display** (typography)

## Pages

| Route | Description |
|---|---|
| `/dashboard` | Credit score, VU meter, loan ledger, sparkline |
| `/borrow` | Loan request with oracle signature simulation |
| `/lend` | Liquidity pool deposit/withdraw |
| `/history` | Full loan ledger + activity timeline |
| `/governance` | DAO proposals with live voting |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Design Tokens

All colors are defined in `tailwind.config.ts`:

| Token | Value | Use |
|---|---|---|
| `bg` | `#F2EFE8` | Page background (newsprint) |
| `surface` | `#E8E4DB` | Card backgrounds |
| `ink` | `#1A1915` | Primary text / buttons |
| `chartreuse` | `#C6F135` | Primary accent (highest-priority data only) |
| `green` | `#1B4332` | Band A / positive states |
| `amber` | `#B45309` | Band B / warnings |
| `crimson` | `#9B1C1C` | Band C/D / errors |

## Next Steps (Integration)

1. **Web3 Wallet** — Replace mock data with `wagmi` + `viem` hooks
2. **Contract calls** — Wire `borrow`, `repay`, `deposit` to `LendingPool.sol`
3. **Oracle API** — Fetch real credit scores from your Spring Boot backend
4. **The Graph** — Replace `SCORE_HISTORY` with subgraph queries
5. **Real-time events** — WebSocket for live loan/score updates
