"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { BORROWER, BAND_CONFIG } from "@/lib/data";
import { LENDING_POOL_ABI, ERC20_ABI, ADDRESSES, BACKEND_URL } from "@/lib/web3/contracts";
import { clsx } from "clsx";

const DURATIONS = [
  { label: "14 days", days: 14, seconds: 14 * 86400 },
  { label: "30 days", days: 30, seconds: 30 * 86400 },
  { label: "45 days", days: 45, seconds: 45 * 86400 },
  { label: "60 days", days: 60, seconds: 60 * 86400 },
  { label: "90 days", days: 90, seconds: 90 * 86400 },
];

type BtnState = "idle" | "approving" | "borrowing" | "success" | "error";

export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const b = BORROWER;
  const cfg = BAND_CONFIG[b.band];
  const [amount, setAmount] = useState(5000);
  const [durationIdx, setDurationIdx] = useState(1);
  const [btnState, setBtnState] = useState<BtnState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const duration = DURATIONS[durationIdx];
  const collateral = amount * (cfg.collateral / 100);
  const interest = amount * (cfg.rate / 100) * (duration.days / 365);
  const totalRepay = amount + interest;

  // wagmi write hooks
  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: borrowAsync } = useWriteContract();

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

    try {
      setErrorMsg(null);

      // Step 1: Get signed approval from backend
      setBtnState("approving");
      const res = await fetch(`${BACKEND_URL}/api/risk/loan-approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower: address,
          amount: parseUnits(String(amount), 6).toString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Backend approval failed");
      }

      const approval = await res.json();
      const { signature, deadline } = approval;
      const collateralWei = parseUnits(String(Math.ceil(collateral)), 6);
      const amountWei = parseUnits(String(amount), 6);

      // Step 2: Approve collateral token transfer
      await approveAsync({
        address: ADDRESSES.MOCK_USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ADDRESSES.COLLATERAL_VAULT, collateralWei],
      });

      // Step 3: Execute borrow
      setBtnState("borrowing");
      const hash = await borrowAsync({
        address: ADDRESSES.LENDING_POOL,
        abi: LENDING_POOL_ABI,
        functionName: "borrow",
        args: [
          amountWei,
          BigInt(duration.seconds),
          collateralWei,
          BigInt(deadline),
          signature as `0x${string}`,
        ],
      });

      setTxHash(hash);
      setBtnState("success");
      setTimeout(() => setBtnState("idle"), 6000);
    } catch (err: any) {
      console.error("Borrow failed:", err);
      setErrorMsg(err?.shortMessage || err?.message || "Transaction failed");
      setBtnState("error");
      setTimeout(() => setBtnState("idle"), 5000);
    }
  };

  const btnContent: Record<BtnState, string> = {
    idle: "Request Loan →",
    approving: "Approving Collateral...",
    borrowing: "Submitting to LendingPool...",
    success: "Loan Created ✓",
    error: errorMsg || "Request Failed — Retry",
  };

  return (
    <div className="p-14 max-w-[1100px]">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">01 — Loan Request</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-serif text-[42px] font-bold tracking-[-1px] leading-none mb-1">Borrow</h1>
        <p className="text-[11px] text-ink-muted font-mono">Under-collateralized loans based on your on-chain credit score.</p>
      </div>

      {/* Band notice */}
      <div className="border border-border flex items-center justify-between px-7 py-5 mb-8 bg-surface">
        <div className="flex items-center gap-4">
          <span className="bg-green text-chartreuse text-[10px] tracking-[3px] uppercase font-semibold font-mono px-4 py-2">
            Band {b.band}
          </span>
          <span className="text-[11px] font-mono text-ink-muted">
            Score <strong className="text-ink">{b.score}</strong> — Eligible for premium terms
          </span>
        </div>
        <div className="text-[10px] tracking-[2px] uppercase text-ink-faint font-mono">
          {isConnected ? "Wallet connected" : "Demo mode"} · {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-8">
        {/* Left — Form */}
        <div>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Configure Loan</span>
              <span className="text-[9px] text-ink-faint font-mono tracking-[1px]">Band {b.band} Terms</span>
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
                  min={500}
                  max={b.maxLoan}
                  step={500}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-[2px] bg-surface-2 appearance-none outline-none mb-2"
                  style={{
                    background: `linear-gradient(to right, #1A1915 ${((amount - 500) / (b.maxLoan - 500)) * 100}%, #DDD9CF ${((amount - 500) / (b.maxLoan - 500)) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-[9px] text-ink-faint font-mono tracking-[1px]">
                  <span>MIN $500</span>
                  <span>MAX ${b.maxLoan.toLocaleString()}</span>
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="label mb-3">Duration</div>
                <div className="flex gap-0">
                  {DURATIONS.map((d, i) => (
                    <button
                      key={d.label}
                      onClick={() => setDurationIdx(i)}
                      className={clsx(
                        "flex-1 py-3 text-[10px] tracking-[1.5px] uppercase font-semibold font-mono border border-border transition-all",
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
                  {cfg.collateral}% of loan amount — Band {b.band} rate
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
                      : btnState === "approving" || btnState === "borrowing"
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
                { k: `Collateral (${cfg.collateral}%)`, v: `$${collateral.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, accent: true },
                { k: "APR", v: `${cfg.rate.toFixed(2)}%` },
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
              {(["A", "B", "C", "D"] as const).map((band) => {
                const bc = BAND_CONFIG[band];
                const isYours = band === b.band;
                return (
                  <div
                    key={band}
                    className={clsx(
                      "flex items-center gap-4 px-6 py-4 border-b border-border last:border-0",
                      isYours ? "bg-surface" : ""
                    )}
                  >
                    <span
                      className="w-6 h-6 flex items-center justify-center text-[10px] font-bold font-mono shrink-0"
                      style={{ background: bc.color, color: band === "A" ? "#1A1915" : "#F2EFE8" }}
                    >
                      {band}
                    </span>
                    <div className="flex-1">
                      <div className="text-[10px] text-ink-faint font-mono">{bc.label}</div>
                    </div>
                    <div className="text-[11px] font-mono text-right">
                      <div>{bc.collateral}% col.</div>
                      <div className="text-ink-muted text-[9px]">{bc.rate}% APR</div>
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
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #1A1915;
          cursor: none;
        }
        input[type="range"]::-moz-range-thumb {
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
