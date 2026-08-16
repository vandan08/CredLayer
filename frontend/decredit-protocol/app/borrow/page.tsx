"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { type RiskBand } from "@/lib/data";
import {
  LENDING_POOL_ABI,
  ERC20_ABI,
  COLLATERAL_VAULT_ABI,
  CREDIT_REGISTRY_ABI,
  ADDRESSES,
  BACKEND_URL,
  isDeployed,
} from "@/lib/web3/contracts";
import { FaucetButton } from "@/components/ui/FaucetButton";
import { toast } from "@/components/ui/Toaster";
import { clsx } from "clsx";

const DURATIONS = [
  { label: "14 days", days: 14, seconds: 14 * 86400 },
  { label: "30 days", days: 30, seconds: 30 * 86400 },
  { label: "45 days", days: 45, seconds: 45 * 86400 },
  { label: "60 days", days: 60, seconds: 60 * 86400 },
  { label: "90 days", days: 90, seconds: 90 * 86400 },
];

/**
 * Risk-band terms on the protocol's native 0–1000 credit scale.
 * collateral% and maxLoan mirror the backend RiskModelService (what gets
 * signed); rate mirrors the LendingPool contract (what the loan actually pays).
 */
const ONCHAIN_BANDS: Record<RiskBand, { min: number; label: string; collateral: number; rate: number; maxLoan: number; color: string }> = {
  A: { min: 800, label: "800–1000", collateral: 40, rate: 5, maxLoan: 10_000, color: "#C6F135" },
  B: { min: 600, label: "600–799", collateral: 70, rate: 9, maxLoan: 5_000, color: "#1A1915" },
  C: { min: 400, label: "400–599", collateral: 110, rate: 14, maxLoan: 1_000, color: "#B45309" },
  D: { min: 0, label: "0–399", collateral: 150, rate: 14, maxLoan: 50, color: "#9B1C1C" },
};

function scoreToBand(score: number): RiskBand {
  if (score >= 800) return "A";
  if (score >= 600) return "B";
  if (score >= 400) return "C";
  return "D";
}

type BtnState =
  | "idle"
  | "registering"
  | "approving"
  | "depositing"
  | "borrowing"
  | "success"
  | "error";

export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState(5000);
  const [durationIdx, setDurationIdx] = useState(1);
  const [btnState, setBtnState] = useState<BtnState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── On-chain credit profile drives the loan terms ──
  const registryDeployed = isDeployed(ADDRESSES.CREDIT_REGISTRY);

  const { data: registered } = useReadContract({
    address: ADDRESSES.CREDIT_REGISTRY,
    abi: CREDIT_REGISTRY_ABI,
    functionName: "isRegistered",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && registryDeployed },
  });

  const { data: rawScore } = useReadContract({
    address: ADDRESSES.CREDIT_REGISTRY,
    abi: CREDIT_REGISTRY_ABI,
    functionName: "getCreditScore",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && registryDeployed && registered === true },
  });

  // Unregistered wallets get the backend's default profile (500 / Band C).
  const liveScore =
    registered === true && rawScore !== undefined
      ? Number(rawScore)
      : registered === false
        ? 500
        : null;

  const live = isConnected && registryDeployed && liveScore !== null;
  // Demo profile (Band A, 850/1000) when no wallet is connected.
  const score = live ? liveScore : 850;
  const band: RiskBand = scoreToBand(score);
  const terms = ONCHAIN_BANDS[band];

  const maxLoan = terms.maxLoan;
  const minLoan = Math.min(500, Math.max(50, Math.round(maxLoan * 0.1)));
  const loanStep = maxLoan <= 1_000 ? 50 : 500;

  // Keep the requested amount inside the band's window when the band changes.
  useEffect(() => {
    setAmount((a) => Math.min(Math.max(a, minLoan), maxLoan));
  }, [minLoan, maxLoan]);

  const duration = DURATIONS[durationIdx];
  const collateral = amount * (terms.collateral / 100);
  const interest = amount * (terms.rate / 100) * (duration.days / 365);
  const totalRepay = amount + interest;

  // wagmi write hooks — one per distinct on-chain action
  const { writeContractAsync } = useWriteContract();

  const { data: receipt } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}` | undefined,
  });

  const handleBorrow = async () => {
    if (!isConnected || !address) {
      setErrorMsg("Connect your wallet first");
      setBtnState("error");
      setTimeout(() => setBtnState("idle"), 3000);
      return;
    }

    if (!isDeployed(ADDRESSES.LENDING_POOL)) {
      setErrorMsg("Contracts not deployed — run the deploy script");
      setBtnState("error");
      setTimeout(() => setBtnState("idle"), 4000);
      return;
    }

    try {
      setErrorMsg(null);

      // Step 1: Ensure the borrower is registered on-chain (LendingPool requires it).
      // Best-effort: a 4xx here usually means "already registered", which is fine.
      setBtnState("registering");
      await fetch(`${BACKEND_URL}/api/risk/register/${address}`, { method: "POST" }).catch(() => {});

      // Step 2: Get a backend-signed approval. The signature commits to the exact
      // amount, duration and collateral, so we must forward the returned values verbatim.
      const res = await fetch(`${BACKEND_URL}/api/risk/loan-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower: address,
          amount: parseUnits(String(amount), 6).toString(),
          duration: String(duration.seconds),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Backend approval failed");
      }

      const approval = await res.json();
      const signature = approval.signature as `0x${string}`;
      const amountWei = BigInt(approval.amountRequested);
      const durationSecs = BigInt(approval.duration);
      const collateralWei = BigInt(approval.collateralAmount);
      const deadline = BigInt(approval.deadline);

      // Step 3: Approve the vault to pull the collateral.
      setBtnState("approving");
      await writeContractAsync({
        address: ADDRESSES.MOCK_USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ADDRESSES.COLLATERAL_VAULT, collateralWei],
      });

      // Step 4: Deposit collateral into the vault so LendingPool can lock it.
      setBtnState("depositing");
      await writeContractAsync({
        address: ADDRESSES.COLLATERAL_VAULT,
        abi: COLLATERAL_VAULT_ABI,
        functionName: "depositCollateral",
        args: [collateralWei],
      });

      // Step 5: Execute the borrow with the signed approval.
      setBtnState("borrowing");
      const hash = await writeContractAsync({
        address: ADDRESSES.LENDING_POOL,
        abi: LENDING_POOL_ABI,
        functionName: "borrow",
        args: [amountWei, durationSecs, collateralWei, deadline, signature],
      });

      setTxHash(hash);
      setBtnState("success");
      toast({
        kind: "success",
        title: "Loan created",
        message: `Borrowed $${amount.toLocaleString()} USDC over ${duration.label}.`,
        txHash: hash,
      });
      setTimeout(() => setBtnState("idle"), 6000);
    } catch (err: any) {
      console.error("Borrow failed:", err);
      const msg = err?.shortMessage || err?.message || "Transaction failed";
      setErrorMsg(msg);
      toast({ kind: "error", title: "Borrow failed", message: msg });
      setBtnState("error");
      setTimeout(() => setBtnState("idle"), 5000);
    }
  };

  const btnContent: Record<BtnState, string> = {
    idle: "Request Loan →",
    registering: "Registering Borrower...",
    approving: "Approving Collateral...",
    depositing: "Depositing Collateral...",
    borrowing: "Submitting to LendingPool...",
    success: "Loan Created ✓",
    error: errorMsg || "Request Failed — Retry",
  };

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-[1100px]">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">01 — Loan Request</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-serif text-[32px] md:text-[42px] font-bold tracking-[-1px] leading-none mb-1">Borrow</h1>
        <p className="text-[11px] text-ink-muted font-mono">Under-collateralized loans based on your on-chain credit score.</p>
      </div>

      {/* Band notice */}
      <div className="border border-border flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 md:px-7 py-5 mb-8 bg-surface">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="bg-green text-chartreuse text-[10px] tracking-[3px] uppercase font-semibold font-mono px-4 py-2">
            Band {band}
          </span>
          <span className="text-[11px] font-mono text-ink-muted">
            Score <strong className="text-ink">{score}</strong> / 1000
            {live && <span className="text-chartreuse ml-2">● LIVE</span>}
            {live && registered === false && (
              <span className="text-ink-faint ml-2">(new borrower default)</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <FaucetButton />
          <div className="text-[10px] tracking-[2px] uppercase text-ink-faint font-mono">
            {isConnected ? "Wallet connected" : "Demo mode"} · {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-8">
        {/* Left — Form */}
        <div>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Configure Loan</span>
              <span className="text-[9px] text-ink-faint font-mono tracking-[1px]">Band {band} Terms</span>
            </div>
            <div className="p-8 space-y-8">
              {/* Amount slider */}
              <div>
                <div className="label mb-2">Loan Amount (USDC)</div>
                <div className="font-serif text-[48px] font-bold tracking-[-2px] leading-none mb-4">
                  ${amount.toLocaleString()}
                </div>
                <input
                  type="range"
                  min={minLoan}
                  max={maxLoan}
                  step={loanStep}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-[2px] bg-surface-2 appearance-none outline-none mb-2"
                  style={{
                    background: `linear-gradient(to right, #1A1915 ${((amount - minLoan) / Math.max(maxLoan - minLoan, 1)) * 100}%, #DDD9CF ${((amount - minLoan) / Math.max(maxLoan - minLoan, 1)) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-[9px] text-ink-faint font-mono tracking-[1px]">
                  <span>MIN ${minLoan.toLocaleString()}</span>
                  <span>MAX ${maxLoan.toLocaleString()} — BAND {band}</span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="label mb-3">Duration</div>
                <div className="flex flex-wrap gap-0">
                  {DURATIONS.map((d, i) => (
                    <button
                      key={d.label}
                      onClick={() => setDurationIdx(i)}
                      className={clsx(
                        "flex-1 min-w-[90px] py-3 text-[10px] tracking-[1.5px] uppercase font-semibold font-mono border border-border transition-all",
                        i > 0 && "-ml-px",
                        durationIdx === i
                          ? "bg-ink text-bg border-ink z-10 relative"
                          : "bg-bg text-ink-muted hover:bg-surface"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Collateral note */}
              <div className="bg-surface p-5 border-l-2 border-chartreuse">
                <div className="label mb-2">Collateral Required</div>
                <div className="font-serif text-[28px] font-bold tracking-[-1px]">
                  ${collateral.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDC
                </div>
                <div className="text-[10px] text-ink-muted font-mono mt-1">
                  {terms.collateral}% of loan amount — Band {band} rate
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleBorrow}
                disabled={btnState !== "idle" && btnState !== "error"}
                className={clsx(
                  "w-full py-4 text-[11px] tracking-[3px] uppercase font-semibold font-mono border-2 transition-all duration-150",
                  btnState === "success"
                    ? "bg-green border-green text-chartreuse"
                    : btnState === "error"
                      ? "bg-crimson/10 border-crimson text-crimson"
                      : btnState !== "idle"
                        ? "bg-surface-2 border-border text-ink-muted"
                        : "bg-ink border-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse active:shadow-[inset_0_0_0_2px_#1A1915]"
                )}
              >
                {btnContent[btnState]}
              </button>

              {/* Tx hash */}
              {txHash && (
                <div className="text-[9px] font-mono text-ink-faint break-all">
                  TX: {txHash}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right — Risk Breakdown */}
        <div className="space-y-6">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Loan Summary</span>
            </div>
            <div className="p-6 space-y-0">
              {[
                { k: "Principal", v: `$${amount.toLocaleString()}` },
                { k: `Collateral (${terms.collateral}%)`, v: `$${collateral.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, accent: true },
                { k: "APR", v: `${terms.rate.toFixed(2)}%` },
                { k: "Duration", v: duration.label },
                { k: "Interest", v: `$${interest.toFixed(2)}` },
                { k: "Total Repayable", v: `$${totalRepay.toFixed(2)}`, bold: true },
              ].map(({ k, v, accent, bold }) => (
                <div key={k} className={clsx("risk-row", bold && "border-t border-ink mt-1")}>
                  <span className="text-ink-muted font-mono">{k}</span>
                  <span className={clsx("font-mono font-semibold", accent ? "text-green" : bold ? "text-ink" : "text-ink")}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Band comparison */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Band Comparison</span>
            </div>
            <div className="p-0">
              {(["A", "B", "C", "D"] as const).map((bandKey) => {
                const bc = ONCHAIN_BANDS[bandKey];
                const isYours = bandKey === band;
                return (
                  <div
                    key={bandKey}
                    className={clsx(
                      "flex items-center gap-4 px-6 py-4 border-b border-border last:border-0",
                      isYours ? "bg-surface" : ""
                    )}
                  >
                    <span
                      className="w-6 h-6 flex items-center justify-center text-[10px] font-bold font-mono shrink-0"
                      style={{ background: bc.color, color: bandKey === "A" ? "#1A1915" : "#F2EFE8" }}
                    >
                      {bandKey}
                    </span>
                    <div className="flex-1">
                      <div className="text-[10px] text-ink-faint font-mono">{bc.label}</div>
                    </div>
                    <div className="text-[11px] font-mono text-right">
                      <div>{bc.collateral}% col.</div>
                      <div className="text-ink-muted text-[9px]">{bc.rate}% APR · max ${bc.maxLoan.toLocaleString()}</div>
                    </div>
                    {isYours && (
                      <span className="text-[8px] tracking-[2px] uppercase bg-chartreuse/30 text-[#4A5E00] font-semibold font-mono px-2 py-1">
                        Yours
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Oracle info */}
          <div className="border border-border p-6">
            <div className="label mb-3">Oracle Approval</div>
            <div className="flex items-center gap-3 mb-3">
              <div className={clsx("w-2 h-2", isConnected ? "bg-chartreuse" : "bg-surface-2")} />
              <span className={clsx("text-[11px] font-mono font-semibold", isConnected ? "text-green" : "text-ink-muted")}>
                {isConnected ? "Backend signature ready" : "Connect wallet to sign"}
              </span>
            </div>
            <div className="text-[9px] font-mono text-ink-faint leading-relaxed">
              ECDSA signed · Approval via backend API<br />
              Endpoint: {BACKEND_URL}/api/risk/loan-approval
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #1A1915;
          cursor: none;
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #1A1915;
          border: none;
          cursor: none;
        }
      `}</style>
    </div>
  );
}
