"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { POOL_DATA } from "@/lib/data";
import { LENDING_POOL_ABI, ERC20_ABI, ADDRESSES } from "@/lib/web3/contracts";
import { FaucetButton } from "@/components/ui/FaucetButton";
import { toast } from "@/components/ui/Toaster";
import { clsx } from "clsx";

const POOL_BREAKDOWN = [
  { band: "A", pct: 38, amount: 1599780, color: "#C6F135", textColor: "#1A1915" },
  { band: "B", pct: 29, amount: 1220900, color: "#1A1915", textColor: "#F2EFE8" },
  { band: "C", pct: 21, amount: 884100, color: "#B45309", textColor: "#F2EFE8" },
  { band: "D", pct: 12, amount: 497460, color: "#9B1C1C", textColor: "#F2EFE8" },
];

type Tab = "deposit" | "withdraw";

export default function LendPage() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState(1000);
  const [tab, setTab] = useState<Tab>("deposit");
  const [btnState, setBtnState] = useState<"idle" | "approving" | "confirming" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { writeContractAsync: approveAsync } = useWriteContract();
  const { writeContractAsync: writeAsync } = useWriteContract();

  // ── On-chain reads ──
  const { data: rawUserDeposit } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "deposits",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: rawTotalDeposits } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "totalDeposits",
    query: { enabled: isConnected },
  });

  const { data: rawTotalBorrowed } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "totalBorrowed",
    query: { enabled: isConnected },
  });

  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: ADDRESSES.MOCK_USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  // Live share preview for the current slider amount (pool shares minted on deposit)
  const { data: rawSharePreview } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "convertToShares",
    args: [parseUnits(String(amount), 6)],
    query: { enabled: isConnected },
  });

  // Current share price: USDC value of 1 dcUSDC (1e9 share units)
  const { data: rawShareRate } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "convertToAssets",
    args: [parseUnits("1", 9)],
    query: { enabled: isConnected },
  });

  const userDeposit = rawUserDeposit ? Number(formatUnits(rawUserDeposit as bigint, 6)) : 0;
  const usdcBalance = rawBalance ? Number(formatUnits(rawBalance as bigint, 6)) : 0;
  const sharePreview = rawSharePreview ? Number(formatUnits(rawSharePreview as bigint, 9)) : null;
  const shareRate = rawShareRate ? Number(formatUnits(rawShareRate as bigint, 6)) : null;
  const totalDeposited = rawTotalDeposits ? Number(formatUnits(rawTotalDeposits as bigint, 6)) : POOL_DATA.totalDeposited;
  const totalBorrowed = rawTotalBorrowed ? Number(formatUnits(rawTotalBorrowed as bigint, 6)) : POOL_DATA.totalBorrowed;
  const utilizationRate = totalDeposited > 0 ? (totalBorrowed / totalDeposited) * 100 : POOL_DATA.utilizationRate;

  const estApy = POOL_DATA.apyForLenders;
  const monthlyYield = amount * (estApy / 100) / 12;
  const yearlyYield = amount * (estApy / 100);

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      setErrorMsg("Connect your wallet first");
      setBtnState("error");
      setTimeout(() => setBtnState("idle"), 3000);
      return;
    }

    try {
      setErrorMsg(null);
      const amountWei = parseUnits(String(amount), 6);
      let hash: `0x${string}`;

      if (tab === "deposit") {
        // Step 1: Approve
        setBtnState("approving");
        await approveAsync({
          address: ADDRESSES.MOCK_USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ADDRESSES.LENDING_POOL, amountWei],
        });

        // Step 2: Deposit
        setBtnState("confirming");
        hash = await writeAsync({
          address: ADDRESSES.LENDING_POOL,
          abi: LENDING_POOL_ABI,
          functionName: "deposit",
          args: [amountWei],
        });
      } else {
        // Withdraw
        setBtnState("confirming");
        hash = await writeAsync({
          address: ADDRESSES.LENDING_POOL,
          abi: LENDING_POOL_ABI,
          functionName: "withdraw",
          args: [amountWei],
        });
      }
      setTxHash(hash);

      setBtnState("success");
      toast({
        kind: "success",
        title: tab === "deposit" ? "Deposit confirmed" : "Withdrawal confirmed",
        message: `$${amount.toLocaleString()} USDC ${tab === "deposit" ? "supplied to" : "withdrawn from"} the pool.`,
        txHash: hash,
      });
      setTimeout(() => setBtnState("idle"), 5000);
    } catch (err: any) {
      console.error("Lend action failed:", err);
      const msg = err?.shortMessage || err?.message || "Transaction failed";
      setErrorMsg(msg);
      toast({ kind: "error", title: `${tab === "deposit" ? "Deposit" : "Withdrawal"} failed`, message: msg });
      setBtnState("error");
      setTimeout(() => setBtnState("idle"), 5000);
    }
  };

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-[1100px]">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">01 — Liquidity Pool</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-serif text-[32px] md:text-[42px] font-bold tracking-[-1px] leading-none mb-1">Lend</h1>
        <p className="text-[11px] text-ink-muted font-mono">Provide USDC liquidity. Earn yield from borrower interest.</p>
      </div>

      {/* Pool stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-border mb-8">
        {[
          { label: "Total Deposited", value: `$${(totalDeposited / 1e6).toFixed(2)}M`, sub: "Available liquidity" },
          { label: "Currently Borrowed", value: `$${(totalBorrowed / 1e6).toFixed(2)}M`, sub: "Active loans" },
          { label: "Utilization Rate", value: `${utilizationRate.toFixed(1)}%`, sub: "Pool efficiency" },
          { label: "Lender APY", value: `${estApy}%`, sub: "Current yield rate" },
        ].map((s, i) => (
          <div key={i} className={clsx("p-7 border-border", i % 2 === 0 && "border-r", i < 3 && "lg:border-r", i < 2 && "border-b lg:border-b-0")}>
            <div className="label mb-2">{s.label}</div>
            <div className="font-serif text-[28px] font-bold tracking-[-1px] leading-none">{s.value}</div>
            <div className="text-[10px] text-ink-muted font-mono mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div className="panel mb-8">
        <div className="panel-header">
          <span className="panel-title">Pool Utilization Breakdown</span>
          <span className="text-[9px] text-ink-faint font-mono">By Risk Band</span>
        </div>
        <div className="p-7">
          <div className="flex h-8 mb-4 overflow-hidden border border-border">
            {POOL_BREAKDOWN.map((b) => (
              <div
                key={b.band}
                className="flex items-center justify-center text-[9px] font-bold font-mono transition-all"
                style={{ width: `${b.pct}%`, background: b.color, color: b.textColor }}
              >
                {b.band}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
            {POOL_BREAKDOWN.map((b) => (
              <div key={b.band} className="flex items-center gap-2 p-3">
                <div className="w-2 h-2 shrink-0" style={{ background: b.color }} />
                <div>
                  <div className="text-[10px] font-mono font-semibold">Band {b.band} — {b.pct}%</div>
                  <div className="text-[9px] text-ink-faint font-mono">${(b.amount / 1000).toFixed(0)}K lent</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-8">
        {/* Deposit / Withdraw form */}
        <div className="panel">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["deposit", "withdraw"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={clsx(
                  "flex-1 py-4 text-[10px] tracking-[2.5px] uppercase font-semibold font-mono border-r border-border last:border-r-0 transition-colors",
                  tab === t ? "bg-ink text-bg" : "bg-bg text-ink-muted hover:bg-surface"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-6">
            {/* Wallet balance */}
            {isConnected && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-[9px] font-mono text-ink-faint tracking-[1px]">
                  WALLET BALANCE: ${usdcBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                  {userDeposit > 0 && ` · POSITION: $${userDeposit.toLocaleString(undefined, { maximumFractionDigits: 2 })} (incl. yield)`}
                </div>
                <div className="flex items-center gap-2">
                  {tab === "withdraw" && userDeposit > 0 && (
                    <button
                      onClick={() => setAmount(Math.max(1, Math.floor(userDeposit)))}
                      className="text-[8px] tracking-[2px] uppercase font-semibold font-mono px-3 py-[6px] border border-ink text-ink hover:bg-ink hover:text-bg transition-all"
                    >
                      Max
                    </button>
                  )}
                  <FaucetButton onMinted={() => refetchBalance()} />
                </div>
              </div>
            )}

            <div>
              <div className="label mb-2">Amount (USDC)</div>
              <div className="font-serif text-[48px] font-bold tracking-[-2px] leading-none mb-4">
                ${amount.toLocaleString()}
              </div>
              <input
                type="range"
                min={100}
                max={50000}
                step={100}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-[2px] bg-surface-2 appearance-none outline-none mb-2"
                style={{
                  background: `linear-gradient(to right, #1A1915 ${((amount - 100) / (50000 - 100)) * 100}%, #DDD9CF ${((amount - 100) / (50000 - 100)) * 100}%)`
                }}
              />
              <div className="flex justify-between text-[9px] text-ink-faint font-mono tracking-[1px]">
                <span>MIN $100</span>
                <span>MAX $50,000</span>
              </div>
            </div>

            {/* LP share info — live pool share preview when connected */}
            {tab === "deposit" && (
              <div className="bg-surface p-5 border-l-2 border-ink">
                <div className="label mb-2">
                  Pool Shares Received
                  {sharePreview !== null && <span className="ml-2 text-chartreuse">● LIVE</span>}
                </div>
                <div className="font-serif text-[28px] font-bold tracking-[-1px]">
                  {(sharePreview ?? amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} dcUSDC
                </div>
                <div className="text-[10px] text-ink-muted font-mono mt-1">
                  {shareRate !== null
                    ? `Share price: 1 dcUSDC = ${shareRate.toFixed(6)} USDC — rises as interest is repaid`
                    : "Share price starts at 1.000000 and rises as interest is repaid"}
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={btnState !== "idle" && btnState !== "error"}
              className={clsx(
                "w-full py-4 text-[11px] tracking-[3px] uppercase font-semibold font-mono border-2 transition-all",
                btnState === "success"
                  ? "bg-green border-green text-chartreuse"
                  : btnState === "error"
                    ? "bg-crimson/10 border-crimson text-crimson"
                    : btnState !== "idle"
                      ? "bg-surface-2 border-border text-ink-muted"
                      : "bg-ink border-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse"
              )}
            >
              {btnState === "success"
                ? `${tab === "deposit" ? "Deposit" : "Withdrawal"} Confirmed ✓`
                : btnState === "error"
                  ? errorMsg || "Failed — Retry"
                  : btnState === "approving"
                    ? "Approving USDC..."
                    : btnState === "confirming"
                      ? "Confirming..."
                      : `${tab === "deposit" ? "Deposit" : "Withdraw"} →`}
            </button>

            {txHash && (
              <div className="text-[9px] font-mono text-ink-faint break-all">
                TX: {txHash}
              </div>
            )}
          </div>
        </div>

        {/* Yield summary */}
        <div className="space-y-6">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Yield Estimate</span>
            </div>
            <div className="p-6">
              {[
                { k: "Monthly Yield", v: `$${monthlyYield.toFixed(2)}` },
                { k: "Annual Yield", v: `$${yearlyYield.toFixed(2)}` },
                { k: "APY", v: `${estApy}%` },
                { k: "Your Position", v: `$${amount.toLocaleString()}` },
              ].map(({ k, v }) => (
                <div key={k} className="risk-row">
                  <span className="text-ink-muted font-mono">{k}</span>
                  <span className="font-semibold font-mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Protocol Health</span>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "Liquidity Providers", value: POOL_DATA.liquidityProviders.toLocaleString() },
                { label: "Default Rate", value: "0.82%" },
                { label: "Reserve Factor", value: "10%" },
                { label: "Oracle Uptime", value: "99.97%" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-[11px] font-mono">
                  <span className="text-ink-muted">{label}</span>
                  <span className="font-semibold">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px; height: 16px;
          background: #1A1915; cursor: none;
        }
      `}</style>
    </div>
  );
}
