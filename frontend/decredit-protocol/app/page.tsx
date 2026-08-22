import Link from "next/link";
import { RiskSimulator } from "@/components/landing/RiskSimulator";
import { FlowDiagram } from "@/components/landing/FlowDiagram";
import { VideoBackdrop } from "@/components/landing/VideoBackdrop";
import { LandingNav } from "@/components/landing/LandingNav";
import { ADDRESSES, isDeployed } from "@/lib/web3/contracts";
import { BANDS, BAND_ORDER } from "@/lib/risk";

const GITHUB = "https://github.com/vandan08/CredLayer";

const IS_SEPOLIA = process.env.NEXT_PUBLIC_CHAIN === "sepolia";
const EXPLORER = "https://sepolia.etherscan.io/address/";

const CONTRACTS: { name: string; address: string; role: string }[] = [
  {
    name: "CreditRegistry",
    address: ADDRESSES.CREDIT_REGISTRY,
    role: "Borrower profiles, scores and risk bands. Only the oracle may write.",
  },
  {
    name: "LendingPool",
    address: ADDRESSES.LENDING_POOL,
    role: "Borrow, repay, liquidate. Verifies the risk engine's signature on every loan.",
  },
  {
    name: "CollateralVault",
    address: ADDRESSES.COLLATERAL_VAULT,
    role: "Holds and locks collateral. Enforces per-band LTV in basis points.",
  },
  {
    name: "Governance",
    address: ADDRESSES.GOVERNANCE,
    role: "Token-holder voting over protocol risk parameters.",
  },
  {
    name: "MockUSDC",
    address: ADDRESSES.MOCK_USDC,
    role: "Six-decimal test stablecoin with an open faucet for the demo.",
  },
];

function short(a: string) {
  return a.slice(0, 10) + "…" + a.slice(-8);
}

// ── Small building blocks ──────────────────────────────────────

function SectionHead({ n, title, kicker }: { n: string; title: string; kicker?: string }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">
          {n} — {kicker ?? title}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <h2 className="font-serif text-[30px] md:text-[44px] font-bold tracking-[-1.5px] leading-[1.05] max-w-[820px]">
        {title}
      </h2>
    </div>
  );
}

function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={"px-6 md:px-10 lg:px-16 py-16 md:py-24 " + className}>
      <div className="max-w-[1180px] mx-auto">{children}</div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="relative z-0 min-h-screen">
      <VideoBackdrop />

      <LandingNav />

      {/* ══ Hero ══
          The clip is the subject here and the copy is a caption on top of it.
          Everything that asks to be read — the argument, the band table — now
          starts in the section below, where the page turns back into paper. */}
      <section
        data-hero
        className="relative min-h-[100svh] -mt-[68px] flex flex-col justify-end overflow-hidden"
      >
        {/* Scrims: enough contrast to read against, not so much that the clip
            flattens into a texture. */}
        <div className="absolute inset-x-0 top-0 h-[240px] bg-gradient-to-b from-ink/70 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-ink/88 via-ink/55 to-transparent pointer-events-none" />

        <div className="relative max-w-[1180px] w-full mx-auto px-6 md:px-10 lg:px-16 pt-32 pb-16 md:pb-20">
          <div className="inline-flex items-center gap-2 border border-bg/25 bg-ink/25 px-3 py-[7px] mb-8">
            <span className="w-[6px] h-[6px] bg-chartreuse block status-dot" />
            <span className="text-[9px] tracking-[2.5px] uppercase font-mono text-bg/85">
              {IS_SEPOLIA ? "Live on Sepolia testnet" : "Full-stack DeFi protocol"}
            </span>
          </div>

          <h1
            className="font-serif text-bg text-[46px] sm:text-[64px] lg:text-[82px] font-black tracking-[-3px] leading-[0.94] mb-8 max-w-[900px]"
            style={{ textShadow: "0 2px 30px rgba(26,25,21,0.45)" }}
          >
            Lending priced by{" "}
            <br className="hidden sm:block" />
            reputation, not{" "}
            <br className="hidden sm:block" />
            just collateral.
          </h1>

          <p
            className="text-[12px] md:text-[13px] font-mono text-bg/90 leading-[1.9] max-w-[540px]"
            style={{ textShadow: "0 1px 16px rgba(26,25,21,0.7)" }}
          >
            An off-chain risk engine scores every wallet from its repayment history
            and cryptographically co-signs each loan — so the contract can safely
            lend at{" "}
            <span className="text-chartreuse font-semibold">40% collateral</span>{" "}
            where pure on-chain protocols demand 150%.
          </p>
        </div>

        <div className="relative max-w-[1180px] w-full mx-auto px-6 md:px-10 lg:px-16 pb-8 flex items-center justify-end gap-3">
          <span className="text-[9px] tracking-[3px] uppercase font-mono text-bg/70">
            Scroll
          </span>
          <span className="w-[7px] h-[7px] bg-chartreuse block" />
        </div>
      </section>

      {/* ══ The argument ══ */}
      <Shell className="border-b border-border">
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-start">
          <div>
            <p className="text-[13px] md:text-[14px] font-mono text-ink-muted leading-[1.85] max-w-[560px] mb-4">
              Conventional DeFi money markets demand{" "}
              <span className="text-ink font-semibold">150% collateral</span> because a
              contract cannot know who it is lending to. CredLayer gives it a memory: an
              off-chain risk engine scores every wallet from its on-chain repayment history
              and <span className="text-ink font-semibold">cryptographically co-signs</span>{" "}
              each loan.
            </p>

            <p className="text-[13px] md:text-[14px] font-mono text-ink-muted leading-[1.85] max-w-[560px] mb-9">
              The contract verifies that signature before a single dollar moves — so it can
              safely lend at <span className="text-ink font-semibold">40%</span>.
            </p>

            <div className="border-l-2 border-l-chartreuse bg-surface/70 px-4 py-3 max-w-[560px]">
              <p className="text-[10px] font-mono text-ink-muted leading-relaxed">
                <span className="text-ink font-semibold">No wallet needed.</span> Every
                screen is explorable with seeded demo data. Connect MetaMask on{" "}
                {IS_SEPOLIA ? "Sepolia" : "a local Hardhat node"} to switch the same UI onto
                live on-chain reads and writes.
              </p>
            </div>
          </div>

          {/* Band table */}
          <div className="border border-ink bg-bg/60">
            <div className="bg-ink px-5 py-3 flex items-baseline justify-between">
              <span className="text-[9px] tracking-[2.5px] uppercase font-mono font-bold text-chartreuse">
                Risk Bands
              </span>
              <span className="text-[8px] tracking-[1.5px] uppercase font-mono text-ink-faint">
                CreditRegistry.sol
              </span>
            </div>

            <div className="grid grid-cols-[auto_1fr_auto_auto] text-[9px] font-mono uppercase tracking-[1.5px] text-ink-faint border-b border-border">
              <div className="px-4 py-2">Band</div>
              <div className="px-2 py-2">Score</div>
              <div className="px-3 py-2 text-right">LTV</div>
              <div className="px-4 py-2 text-right">Rate</div>
            </div>

            {BAND_ORDER.map((b) => {
              const t = BANDS[b];
              const upper =
                b === "A" ? "1000" : String(BANDS[BAND_ORDER[BAND_ORDER.indexOf(b) - 1]].floor - 1);
              return (
                <div
                  key={b}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center border-b border-border last:border-b-0 hover:bg-surface/70 transition-colors"
                >
                  <div className="px-4 py-4">
                    <div
                      className="w-7 h-7 border border-ink flex items-center justify-center font-serif text-[15px] font-black leading-none"
                      style={{ background: t.color, color: b === "A" ? "#1A1915" : "#F2EFE8" }}
                    >
                      {b}
                    </div>
                  </div>
                  <div className="px-2 py-4">
                    <div className="text-[11px] font-mono font-semibold tabular-nums">
                      {t.floor}–{upper}
                    </div>
                    <div className="text-[9px] font-mono text-ink-faint tracking-[1px] uppercase">
                      {t.label}
                    </div>
                  </div>
                  <div className="px-3 py-4 text-right font-serif text-[20px] font-bold tabular-nums leading-none">
                    {t.collateralPct}%
                  </div>
                  <div className="px-4 py-4 text-right font-serif text-[20px] font-bold tabular-nums leading-none">
                    {t.interestPct}%
                  </div>
                </div>
              );
            })}

            <div className="bg-surface/70 px-5 py-4 border-t border-ink">
              <p className="text-[9px] font-mono text-ink-muted leading-relaxed">
                Band A borrowers lock <span className="text-ink font-semibold">$0.40</span> per
                dollar borrowed. A 150% pool locks{" "}
                <span className="text-ink font-semibold">$1.50</span> — nearly{" "}
                <span className="text-ink font-semibold">4x</span> the capital, idle.
              </p>
            </div>
          </div>
        </div>
      </Shell>

      {/* ══ Stat band ══ */}
      <div className="border-y border-ink bg-ink/90">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10 lg:px-16 grid grid-cols-2 md:grid-cols-4 divide-x divide-ink-muted/30">
          {[
            { v: "40%", k: "Best-case collateral" },
            { v: "128", k: "Automated tests passing" },
            { v: "5", k: "Solidity contracts" },
            { v: "3", k: "Deployed layers" },
          ].map((s) => (
            <div key={s.k} className="px-4 md:px-6 py-8 first:pl-0 last:pr-0">
              <div className="font-serif text-[34px] md:text-[46px] font-black text-chartreuse leading-none tracking-[-1.5px] mb-2 tabular-nums">
                {s.v}
              </div>
              <div className="text-[8px] md:text-[9px] tracking-[2px] uppercase font-mono text-ink-faint leading-relaxed">
                {s.k}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Mechanism ══ */}
      <Shell className="border-b border-border">
        <div id="mechanism" className="scroll-mt-24" />
        <SectionHead
          n="01"
          kicker="The mechanism"
          title="A signature is what makes an under-collateralized loan safe."
        />

        <p className="text-[13px] font-mono text-ink-muted leading-[1.9] max-w-[720px] mb-12">
          The risk engine never holds funds and never moves money. Its only power is to
          sign — and the contract only accepts a signature that survives five independent
          checks. If the backend is compromised, the worst it can do is approve a loan that
          is still bounded by the collateral the contract itself demands.
        </p>

        <FlowDiagram />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border mt-12 border border-border">
          {[
            {
              t: "Single-use",
              d: "Every approval hash is burned into LendingPool.usedApprovals the moment it is redeemed. Replaying it reverts.",
            },
            {
              t: "Time-boxed",
              d: "The deadline is inside the signed payload. An approval that sits unused for an hour is dead weight.",
            },
            {
              t: "Borrower-bound",
              d: "msg.sender is part of the hash. A leaked signature is worthless to anyone but the wallet it names.",
            },
          ].map((c) => (
            <div key={c.t} className="bg-bg/75 p-7">
              <div className="w-2 h-2 bg-chartreuse mb-5" />
              <h3 className="font-serif text-[20px] font-bold mb-3 tracking-[-0.5px]">{c.t}</h3>
              <p className="text-[10px] font-mono text-ink-muted leading-[1.8]">{c.d}</p>
            </div>
          ))}
        </div>
      </Shell>

      {/* ══ Simulator ══ */}
      <Shell className="border-b border-border bg-surface/30">
        <div id="simulator" className="scroll-mt-24" />
        <SectionHead
          n="02"
          kicker="Risk model"
          title="Move the score. Watch the terms move with it."
        />

        <p className="text-[13px] font-mono text-ink-muted leading-[1.9] max-w-[720px] mb-10">
          This runs the protocol&apos;s actual band logic in your browser — the same
          thresholds compiled into <span className="text-ink">CreditRegistry.sol</span>, the
          same basis-point LTVs enforced by{" "}
          <span className="text-ink">CollateralVault.sol</span>, and the same round-up rule
          the Java risk engine applies before it signs.
        </p>

        <RiskSimulator />
      </Shell>

      {/* ══ Architecture ══ */}
      <Shell className="border-b border-border">
        <div id="architecture" className="scroll-mt-24" />
        <SectionHead n="03" kicker="Architecture" title="Three layers, three languages." />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          {[
            {
              n: "I",
              t: "Smart Contracts",
              stack: "Solidity 0.8.24 · Hardhat · OpenZeppelin",
              tests: "78 tests",
              points: [
                "Share-based lender accounting — interest and liquidation P/L accrue pro-rata, no orphaned funds",
                "Vault inflation attack mitigated with an OZ-style virtual share offset",
                "ReentrancyGuard and Pausable on every state-changing path",
                "On-chain ECDSA recovery gates all borrowing",
              ],
            },
            {
              n: "II",
              t: "Risk Engine",
              stack: "Java 17 · Spring Boot 3 · Web3j · Postgres",
              tests: "50 tests",
              points: [
                "Event listener tails LoanCreated / LoanRepaid / LoanLiquidated and reconciles the database",
                "Scoring engine rewards settled loans and penalises defaults",
                "Oracle service broadcasts raw signed transactions to push scores on-chain",
                "Fail-fast guard refuses to boot against a real RPC with Hardhat's public key",
              ],
            },
            {
              n: "III",
              t: "dApp",
              stack: "Next.js 14 · wagmi · viem · Tailwind",
              tests: "Typed ABIs",
              points: [
                "Every page degrades to seeded demo data when no wallet is present",
                "Live borrow, repay, lend and DAO voting against real contracts",
                "Addresses generated by the deploy script — no hand-copied constants",
                "One build targets local Hardhat or Sepolia via a single env var",
              ],
            },
          ].map((l) => (
            <div key={l.t} className="bg-bg/75 p-7 md:p-8">
              <div className="flex items-baseline justify-between mb-5">
                <span className="font-serif text-[38px] font-black leading-none text-ink-faint">
                  {l.n}
                </span>
                <span className="text-[8px] tracking-[2px] uppercase font-mono text-ink-muted border border-border px-2 py-1">
                  {l.tests}
                </span>
              </div>

              <h3 className="font-serif text-[24px] font-bold tracking-[-0.5px] mb-2">{l.t}</h3>
              <div className="text-[9px] font-mono text-ink-muted tracking-[1px] uppercase mb-6 pb-6 border-b border-border leading-relaxed">
                {l.stack}
              </div>

              <ul className="space-y-3">
                {l.points.map((p) => (
                  <li key={p} className="flex gap-3">
                    <span className="text-chartreuse text-[10px] leading-[1.8] shrink-0">▸</span>
                    <span className="text-[10px] font-mono text-ink-muted leading-[1.8]">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Shell>

      {/* ══ On-chain ══ */}
      <Shell className="border-b border-border bg-surface/30">
        <div id="onchain" className="scroll-mt-24" />
        <SectionHead n="04" kicker="On-chain" title="Deployed, verified, readable." />

        <p className="text-[13px] font-mono text-ink-muted leading-[1.9] max-w-[720px] mb-10">
          {IS_SEPOLIA ? (
            <>
              The contracts below are live on Sepolia and verified on Etherscan — the source
              is readable, and every borrow, repayment and score update is a public
              transaction you can inspect.
            </>
          ) : (
            <>
              This build points at a local Hardhat node, so the addresses below are the
              deterministic development ones. A Sepolia deploy rewrites{" "}
              <span className="text-ink">deployed.json</span> and this section links straight
              through to Etherscan.
            </>
          )}
        </p>

        <div className="border border-ink bg-bg/60">
          {CONTRACTS.map((c, i) => {
            const deployed = isDeployed(c.address as `0x${string}`);
            const body = (
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 px-5 md:px-7 py-5 w-full">
                <div className="md:w-[190px] shrink-0">
                  <div className="font-serif text-[19px] font-bold tracking-[-0.5px] leading-none mb-[6px]">
                    {c.name}
                  </div>
                  <div className="text-[9px] font-mono text-ink-faint tracking-[1px] uppercase">
                    {deployed ? (IS_SEPOLIA ? "Sepolia" : "Local chain") : "Not deployed"}
                  </div>
                </div>

                <p className="flex-1 text-[10px] font-mono text-ink-muted leading-[1.75]">
                  {c.role}
                </p>

                <div className="md:text-right shrink-0">
                  <code className="text-[10px] font-mono text-ink tabular-nums">
                    {short(c.address)}
                  </code>
                  {IS_SEPOLIA && deployed && (
                    <div className="text-[8px] font-mono text-ink-muted tracking-[1.5px] uppercase mt-1">
                      View on Etherscan ↗
                    </div>
                  )}
                </div>
              </div>
            );

            const cls =
              "block border-border hover:bg-surface/70 transition-colors " +
              (i < CONTRACTS.length - 1 ? "border-b" : "");

            return IS_SEPOLIA && deployed ? (
              <a
                key={c.name}
                href={EXPLORER + c.address}
                target="_blank"
                rel="noreferrer"
                className={cls}
              >
                {body}
              </a>
            ) : (
              <div key={c.name} className={cls}>
                {body}
              </div>
            );
          })}
        </div>
      </Shell>

      {/* ══ Engineering ══ */}
      <Shell>
        <SectionHead n="05" kicker="Engineering" title="Built the way it would be shipped." />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-16">
          <div className="space-y-px bg-border border border-border">
            {[
              ["Contract tests", "78 passing — Hardhat, covering registry, vault, pool and DAO"],
              ["Backend tests", "50 passing — JUnit across scoring, signing and the REST surface"],
              ["CI", "GitHub Actions builds all three layers on every push"],
              ["Security scanning", "Slither static analysis plus gitleaks secret scanning"],
              ["Threat model", "Documented trust assumptions and static-analysis triage in SECURITY.md"],
              ["Secrets", "Env-driven throughout; the container runs as a non-root user"],
            ].map(([k, v]) => (
              <div key={k} className="bg-bg/75 px-6 py-5">
                <div className="text-[9px] tracking-[2.5px] uppercase font-mono text-ink-faint mb-2">
                  {k}
                </div>
                <p className="text-[11px] font-mono text-ink-muted leading-[1.7]">{v}</p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-serif text-[26px] font-bold tracking-[-0.5px] mb-5 leading-tight">
              Known limits
            </h3>
            <p className="text-[12px] font-mono text-ink-muted leading-[1.9] mb-6">
              A portfolio protocol that pretends to be production-ready is a red flag, so
              here is the honest boundary:
            </p>

            <ul className="space-y-4">
              {[
                "The oracle key lives in an environment variable. Mainnet would require a KMS or HSM, and ideally a multi-sig or threshold signer.",
                "One key is deployer, oracle and approval signer. That is convenient for a demo and unacceptable for real funds.",
                "Rate limiting on the risk API is delegated to a gateway rather than implemented in-process.",
                "MockUSDC is a faucet token. No real value moves anywhere in this system.",
                "No professional audit. The contracts are tested and statically analysed, not audited.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="text-amber text-[11px] leading-[1.8] shrink-0">—</span>
                  <span className="text-[11px] font-mono text-ink-muted leading-[1.8]">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Shell>

      {/* ══ Footer CTA ══ */}
      <footer className="bg-ink/90 text-bg">
        <div className="max-w-[1180px] mx-auto px-6 md:px-10 lg:px-16 py-16 md:py-20">
          <h2 className="font-serif text-[36px] md:text-[54px] font-black tracking-[-2px] leading-[1] mb-8 max-w-[760px]">
            Open the dashboard.
            <br />
            <span className="text-chartreuse">No wallet required.</span>
          </h2>

          <div className="flex flex-wrap gap-3 mb-14">
            <Link
              href="/dashboard"
              className="px-7 py-4 text-[10px] tracking-[2.5px] uppercase font-mono font-bold border-2 border-chartreuse bg-chartreuse text-ink hover:bg-bg hover:border-bg transition-all"
            >
              Launch app →
            </Link>
            <a
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className="px-7 py-4 text-[10px] tracking-[2.5px] uppercase font-mono font-bold border-2 border-bg text-bg hover:bg-bg hover:text-ink transition-all"
            >
              Read the source
            </a>
          </div>

          <div className="border-t border-ink-muted/40 pt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="font-serif text-[20px] font-black mb-2">CredLayer</div>
              <p className="text-[9px] font-mono text-ink-faint tracking-[1.5px] uppercase leading-relaxed">
                Decentralized credit scoring
                <br />& under-collateralized lending
              </p>
            </div>

            <p className="text-[9px] font-mono text-ink-faint tracking-[1px] leading-relaxed md:text-right max-w-[420px]">
              Testnet demonstration project. MockUSDC has no monetary value and nothing here
              is financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
