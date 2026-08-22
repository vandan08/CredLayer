"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";
import {
  BANDS,
  BAND_ORDER,
  MAX_SCORE,
  bandForScore,
  collateralFor,
  capitalFreed,
  totalRepayment,
} from "@/lib/risk";

const BASELINE_PCT = 150; // typical over-collateralized DeFi money market
const DURATIONS = [14, 30, 90] as const;

const PRESETS: { label: string; score: number; note: string }[] = [
  { label: "Fresh wallet", score: 500, note: "No history — starts in Band C" },
  { label: "6 repayments", score: 640, note: "Crosses into Band B at 600" },
  { label: "Seasoned", score: 850, note: "Band A — 40% collateral" },
  { label: "Post-default", score: 320, note: "Penalised into Band D" },
];

function usd(n: number) {
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function RiskSimulator() {
  const [score, setScore] = useState(850);
  const [amount, setAmount] = useState(4000);
  const [days, setDays] = useState<number>(30);

  const band = bandForScore(score);
  const terms = BANDS[band];

  // The risk engine refuses anything above the band ceiling, so clamp the
  // principal the same way RiskModelService.generateLoanApproval does.
  const principal = Math.min(amount, terms.maxLoanUsdc);
  const overCeiling = amount > terms.maxLoanUsdc;

  const collateral = collateralFor(principal, terms.collateralPct);
  const baseline = collateralFor(principal, BASELINE_PCT);
  const freed = capitalFreed(principal, terms.collateralPct);
  const owed = totalRepayment(principal, terms.interestPct, days);
  const interest = owed - principal;

  // Widest bar in the comparison sets the scale.
  const scale = Math.max(baseline, collateral, principal) || 1;

  const nextBand = useMemo(() => {
    const idx = BAND_ORDER.indexOf(band);
    return idx > 0 ? BAND_ORDER[idx - 1] : null;
  }, [band]);

  const pointsToNext = nextBand ? BANDS[nextBand].floor - score : 0;

  return (
    <div className="border border-ink bg-bg/75">
      {/* Header */}
      <div className="border-b border-ink px-6 md:px-8 py-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-[9px] tracking-[3px] uppercase text-ink-faint font-mono mb-1">
            Interactive
          </div>
          <h3 className="font-serif text-[24px] md:text-[30px] font-bold tracking-[-1px] leading-none">
            Risk Engine Simulator
          </h3>
        </div>
        <div className="text-[9px] font-mono text-ink-muted tracking-[1px] uppercase text-right leading-relaxed">
          Constants read from<br />
          <span className="text-ink">CreditRegistry.sol</span> ·{" "}
          <span className="text-ink">CollateralVault.sol</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Inputs */}
        <div className="p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-ink space-y-8">
          {/* Score */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <label
                htmlFor="sim-score"
                className="text-[9px] tracking-[2.5px] uppercase text-ink-muted font-mono"
              >
                Credit Score
              </label>
              <span className="font-serif text-[34px] font-black leading-none tracking-[-1.5px] tabular-nums">
                {score}
                <span className="text-[13px] text-ink-faint font-mono font-normal tracking-normal">
                  /{MAX_SCORE}
                </span>
              </span>
            </div>

            <input
              id="sim-score"
              type="range"
              min={0}
              max={MAX_SCORE}
              step={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="sim-range w-full"
              aria-describedby="sim-score-band"
            />

            {/* Band ruler — thresholds are the real on-chain constants */}
            <div className="relative h-6 mt-2 select-none">
              {BAND_ORDER.map((b) => {
                const t = BANDS[b];
                const left = (t.floor / MAX_SCORE) * 100;
                return (
                  <div
                    key={b}
                    className="absolute top-0 flex flex-col items-start"
                    style={{ left: `${left}%` }}
                  >
                    <div className={clsx("w-px h-2", b === band ? "bg-ink" : "bg-border")} />
                    <span
                      className={clsx(
                        "text-[8px] font-mono tracking-[1px] mt-[2px] -ml-px",
                        b === band ? "text-ink font-bold" : "text-ink-faint"
                      )}
                    >
                      {t.floor}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-[6px] mt-4">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setScore(p.score)}
                  title={p.note}
                  className={clsx(
                    "px-3 py-[6px] text-[9px] tracking-[1.5px] uppercase font-mono border transition-all",
                    score === p.score
                      ? "border-ink bg-ink text-bg"
                      : "border-border text-ink-muted hover:border-ink hover:text-ink"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <label
                htmlFor="sim-amount"
                className="text-[9px] tracking-[2.5px] uppercase text-ink-muted font-mono"
              >
                Requested Loan
              </label>
              <span className="font-serif text-[26px] font-black leading-none tracking-[-1px] tabular-nums">
                {usd(principal)}
              </span>
            </div>

            <input
              id="sim-amount"
              type="range"
              min={50}
              max={10000}
              step={50}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="sim-range w-full"
            />

            <div className="flex justify-between text-[8px] font-mono text-ink-faint tracking-[1px] mt-2">
              <span>$50</span>
              <span>$10,000</span>
            </div>

            {overCeiling && (
              <div className="mt-3 border-l-2 border-l-amber bg-surface px-3 py-2">
                <p className="text-[9px] font-mono text-ink-muted leading-relaxed">
                  <span className="text-amber font-semibold">CLAMPED</span> — Band {band} is
                  capped at {usd(terms.maxLoanUsdc)}. The risk engine rejects anything larger
                  before it ever reaches a signature.
                </p>
              </div>
            )}
          </div>

          {/* Duration */}
          <div>
            <div className="text-[9px] tracking-[2.5px] uppercase text-ink-muted font-mono mb-3">
              Term
            </div>
            <div className="flex gap-[6px]">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={clsx(
                    "flex-1 py-[10px] text-[10px] tracking-[1.5px] uppercase font-mono border transition-all",
                    days === d
                      ? "border-ink bg-ink text-bg"
                      : "border-border text-ink-muted hover:border-ink hover:text-ink"
                  )}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Outputs */}
        <div className="p-6 md:p-8 bg-surface/40">
          {/* Band verdict */}
          <div id="sim-score-band" className="flex items-start gap-4 mb-6">
            <div
              className="w-[52px] h-[52px] shrink-0 border-2 border-ink flex items-center justify-center font-serif text-[28px] font-black leading-none"
              style={{ background: terms.color, color: band === "A" ? "#1A1915" : "#F2EFE8" }}
            >
              {band}
            </div>
            <div className="min-w-0">
              <div className="text-[9px] tracking-[2.5px] uppercase text-ink-faint font-mono mb-1">
                Assigned Band — {terms.label}
              </div>
              <p className="text-[10px] font-mono text-ink-muted leading-relaxed">{terms.blurb}</p>
            </div>
          </div>

          {/* Terms grid */}
          <div className="grid grid-cols-2 border-t border-l border-border mb-6">
            {[
              { k: "Collateral Required", v: terms.collateralPct + "%" },
              { k: "Interest Rate", v: terms.interestPct + "%" },
              { k: "Collateral Posted", v: usd(collateral) },
              { k: "Band Ceiling", v: usd(terms.maxLoanUsdc) },
              { k: "Interest (" + days + "d)", v: usd(Math.round(interest)) },
              { k: "Total Repayment", v: usd(Math.round(owed)) },
            ].map((s) => (
              <div key={s.k} className="border-r border-b border-border p-4">
                <div className="text-[8px] tracking-[2px] uppercase text-ink-faint font-mono mb-2">
                  {s.k}
                </div>
                <div className="font-serif text-[22px] font-bold leading-none tabular-nums">
                  {s.v}
                </div>
              </div>
            ))}
          </div>

          {/* Capital efficiency bars */}
          <div className="mb-6">
            <div className="text-[9px] tracking-[2.5px] uppercase text-ink-muted font-mono mb-4">
              Capital Locked vs. A Standard DeFi Pool
            </div>

            <div className="space-y-3">
              <Bar
                label={"Typical pool · " + BASELINE_PCT + "%"}
                value={baseline}
                scale={scale}
                display={usd(baseline)}
                tone="muted"
              />
              <Bar
                label={"CredLayer · Band " + band + " · " + terms.collateralPct + "%"}
                value={collateral}
                scale={scale}
                display={usd(collateral)}
                tone="accent"
              />
            </div>

            <div className="mt-4 border border-ink bg-bg px-4 py-3 flex items-baseline justify-between gap-3">
              <span className="text-[9px] tracking-[2px] uppercase font-mono text-ink-muted">
                Capital freed
              </span>
              <span className="font-serif text-[26px] font-black leading-none tabular-nums">
                {freed > 0 ? usd(freed) : "$0"}
              </span>
            </div>
          </div>

          {/* Path to the next band */}
          <div className="border-t border-border pt-4">
            {nextBand ? (
              <p className="text-[9px] font-mono text-ink-muted leading-relaxed tracking-[0.5px]">
                <span className="text-ink font-semibold">{pointsToNext} points</span> from Band{" "}
                {nextBand} — roughly{" "}
                <span className="text-ink font-semibold">
                  {Math.ceil(pointsToNext / 10)} on-time repayments
                </span>
                . Each settled loan credits +10 via the oracle; a default deducts far more.
              </p>
            ) : (
              <p className="text-[9px] font-mono text-ink-muted leading-relaxed tracking-[0.5px]">
                <span className="text-ink font-semibold">Top band.</span> Band A is the
                protocol&apos;s most capital-efficient tier — 40% collateral, 5% on the principal.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  scale,
  display,
  tone,
}: {
  label: string;
  value: number;
  scale: number;
  display: string;
  tone: "muted" | "accent";
}) {
  const pct = Math.max(2, (value / scale) * 100);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-[6px]">
        <span className="text-[9px] font-mono text-ink-muted tracking-[1px] uppercase">
          {label}
        </span>
        <span className="text-[10px] font-mono font-semibold tabular-nums">{display}</span>
      </div>
      <div className="h-[14px] bg-surface-2 border border-border">
        <div
          className={clsx(
            "h-full transition-all duration-500 ease-out",
            tone === "accent" ? "bg-chartreuse" : "bg-ink-faint"
          )}
          style={{ width: pct + "%" }}
        />
      </div>
    </div>
  );
}
