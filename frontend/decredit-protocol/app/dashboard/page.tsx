"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { BORROWER, LOANS, SCORE_HISTORY, SCORE_MONTHS, BAND_CONFIG, type RiskBand } from "@/lib/data";
import { CREDIT_REGISTRY_ABI, LENDING_POOL_ABI, ADDRESSES } from "@/lib/web3/contracts";
import { clsx } from "clsx";

const SCORE_MAX = 850;
const SCORE_MIN = 300;
const SEGMENTS = 28;

// ─── Helpers ────────────────────────────────────────────────────

function scoreToBand(score: number): RiskBand {
  if (score >= 750) return "A";
  if (score >= 650) return "B";
  if (score >= 500) return "C";
  return "D";
}

// ─── Components ─────────────────────────────────────────────────

function VUMeter({ score }: { score: number }) {
  const [activeCount, setActiveCount] = useState(0);
  const scorePct = (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  const targetActive = Math.round(scorePct * SEGMENTS);

  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setActiveCount(i);
      if (i >= targetActive) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [targetActive]);

  return (
    <div>
      <div className="flex gap-[3px] items-end h-20 mb-3">
        {Array.from({ length: SEGMENTS }).map((_, i) => {
          const pct = (i + 1) / SEGMENTS;
          const heightPct = 30 + (i / SEGMENTS) * 70;
          const isActive = i < activeCount;
          let color = "bg-surface-2";
          if (isActive) {
            if (pct <= 0.35) color = "bg-crimson";
            else if (pct <= 0.59) color = "bg-amber";
            else if (pct <= 0.76) color = "bg-ink";
            else color = "bg-chartreuse";
          }
          return (
            <div
              key={i}
              className={clsx("flex-1 transition-colors duration-200", color)}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] tracking-[2px] uppercase text-ink-faint font-mono">
        <span>300 — D</span>
        <span>500 — C</span>
        <span>650 — B</span>
        <span>750+ — A</span>
      </div>
    </div>
  );
}

function Sparkline({ data, months }: { data: number[]; months: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth * window.devicePixelRatio;
    const H = canvas.offsetHeight * window.devicePixelRatio;
    canvas.width = W;
    canvas.height = H;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const minV = 400, maxV = 800;
    const px = (v: number) => h - ((v - minV) / (maxV - minV)) * (h - 20) - 4;

    let progress = 0;
    const animate = () => {
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = "#C8C4BB";
      for (let gx = 0; gx <= 12; gx++) {
        for (let gy = 0; gy <= 4; gy++) {
          ctx.fillRect((gx / 12) * w, 4 + (gy / 4) * (h - 8), 1, 1);
        }
      }

      const count = Math.max(2, Math.floor(progress * data.length));
      const pts = data.slice(0, count);

      ctx.beginPath();
      pts.forEach((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = px(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineTo(((pts.length - 1) / (data.length - 1)) * w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = "rgba(198,241,53,0.08)";
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = "#1A1915";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      pts.forEach((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = px(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      const lx = ((pts.length - 1) / (data.length - 1)) * w;
      const ly = px(pts[pts.length - 1]);
      ctx.fillStyle = "#C6F135";
      ctx.strokeStyle = "#1A1915";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(lx - 4, ly - 4, 8, 8);
      ctx.fill();
      ctx.stroke();

      if (progress === 1) {
        ctx.fillStyle = "#A8A49C";
        ctx.font = "10px 'IBM Plex Mono'";
        ctx.textAlign = "left";
        ctx.fillText(String(data[0]), 4, px(data[0]) - 6);
        ctx.textAlign = "right";
        ctx.fillStyle = "#1A1915";
        ctx.font = "bold 11px 'IBM Plex Mono'";
        ctx.fillText(String(data[data.length - 1]), w - 4, px(data[data.length - 1]) - 8);
      }

      progress = Math.min(1, progress + 0.04);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [data]);

  return (
    <div>
      <canvas ref={canvasRef} className="w-full h-20 block" />
      <div className="flex justify-between text-[9px] tracking-[1px] text-ink-faint font-mono mt-2">
        {months.filter((_, i) => i % 3 === 0).map((m) => (
          <span key={m}>{m}</span>
        ))}
        <span>{months[months.length - 1]}</span>
      </div>
    </div>
  );
}

function ScoreDigits({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(300);
  useEffect(() => {
    const step = (score - 300) / 40;
    let current = 300;
    const t = setInterval(() => {
      current = Math.min(score, current + step);
      setDisplayed(Math.round(current));
      if (current >= score) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [score]);

  return (
    <span className="font-serif text-[110px] font-black leading-none tracking-[-4px]">
      {displayed}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  Active: "bg-chartreuse/30 text-[#4A5E00]",
  Repaid: "bg-green/10 text-green",
  Overdue: "bg-crimson/10 text-crimson",
};

// ─── Main Page ──────────────────────────────────────────────────

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  // ── On-chain reads ──
  const { data: rawScore } = useReadContract({
    address: ADDRESSES.CREDIT_REGISTRY,
    abi: CREDIT_REGISTRY_ABI,
    functionName: "getCreditScore",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const { data: rawProfile } = useReadContract({
    address: ADDRESSES.CREDIT_REGISTRY,
    abi: CREDIT_REGISTRY_ABI,
    functionName: "getBorrowerProfile",
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

  // ── Derive values (fallback to mock data when not connected) ──
  const liveScore = rawScore ? Number(rawScore) : null;
  const score = liveScore !== null ? Math.round(liveScore * 850 / 1000) : BORROWER.score;
  const band = liveScore !== null ? scoreToBand(score) : BORROWER.band;
  const cfg = BAND_CONFIG[band];

  const totalDeposits = rawTotalDeposits ? Number(rawTotalDeposits) / 1e6 : 4210000;
  const totalBorrowed = rawTotalBorrowed ? Number(rawTotalBorrowed) / 1e6 : 3048240;
  const utilization = totalDeposits > 0 ? (totalBorrowed / totalDeposits) * 100 : 0;

  const profile = rawProfile
    ? {
      totalLoans: Number((rawProfile as any).totalLoans),
      successfulRepayments: Number((rawProfile as any).successfulRepayments),
      defaults: Number((rawProfile as any).defaults),
    }
    : { totalLoans: 5, successfulRepayments: 5, defaults: 0 };

  const repaymentRate = profile.totalLoans > 0
    ? Math.round((profile.successfulRepayments / profile.totalLoans) * 100)
    : BORROWER.repaymentRate;

  const scoreDelta = BORROWER.scoreDelta; // Would need historical data for real delta

  return (
    <div className="p-14 max-w-[1200px]">
      {/* Connection banner */}
      {!isConnected && (
        <div className="bg-surface border-l-2 border-l-amber border border-border px-6 py-4 mb-6 flex items-center gap-4">
          <div className="w-2 h-2 bg-amber shrink-0" />
          <span className="text-[10px] font-mono text-ink-muted tracking-[0.5px]">
            WALLET NOT CONNECTED — Displaying demo data. Connect your wallet for live on-chain reads.
          </span>
        </div>
      )}
      {isConnected && (
        <div className="bg-green/5 border-l-2 border-l-chartreuse border border-border px-6 py-3 mb-6 flex items-center gap-4">
          <div className="w-2 h-2 bg-chartreuse status-dot shrink-0" />
          <span className="text-[10px] font-mono text-green tracking-[0.5px]">
            LIVE — Reading from CreditRegistry & LendingPool contracts
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">01 — Borrower Overview</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-serif text-[42px] font-bold tracking-[-1px] leading-none mb-1">Credit Dashboard</h1>
        <p className="text-[11px] text-ink-muted font-mono tracking-wide">
          {isConnected && address
            ? `Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`
            : "Last evaluated: " + new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
          }
        </p>
      </div>

      {/* Score + Gauge */}
      <div className="border border-border grid grid-cols-2 mb-0">
        <div className="p-12 border-r border-border relative overflow-hidden">
          <div className="label mb-4">
            Credit Score
            {isConnected && <span className="ml-2 text-chartreuse">● LIVE</span>}
          </div>
          <div className={clsx("relative z-10", isConnected && "data-glow")}>
            <ScoreDigits score={score} />
          </div>
          <div className="font-serif text-[260px] font-black text-surface absolute bottom-[-60px] right-[-16px] leading-none pointer-events-none select-none z-0">
            {band}
          </div>
          <div className="relative z-10 mt-3">
            <span className="inline-block bg-green text-chartreuse text-[10px] tracking-[3px] uppercase font-semibold font-mono px-4 py-[6px]">
              Risk Band {band}
            </span>
          </div>
          <div className="text-[11px] text-green font-mono mt-2 relative z-10">▲ +{scoreDelta} since last evaluation</div>
        </div>

        <div className="p-12">
          <div className="label mb-6">Score Range Indicator</div>
          <VUMeter score={score} />
          <div className="mt-8 space-y-0">
            {[
              ["Max Loan Amount", `$${cfg.collateral > 100 ? "5,000" : "24,000"} USDC`, "good"],
              ["Required Collateral", `${cfg.collateral}%`, "good"],
              ["Interest Rate", `${cfg.rate.toFixed(2)}% APR`, "good"],
              ["Liquidation Threshold", `${Math.max(35, cfg.collateral - 5)}%`, "warn"],
            ].map(([k, v, type]) => (
              <div key={k} className="risk-row">
                <span className="text-ink-muted font-mono">{k}</span>
                <span className={clsx("font-semibold font-mono", type === "good" ? "text-green" : "text-amber")}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-x border-b border-border mb-10">
        {[
          { label: "Total Borrowed", value: `$${BORROWER.totalBorrowed.toLocaleString()}`, sub: `Across ${profile.totalLoans} completed loans` },
          { label: "Repayment Rate", value: `${repaymentRate}%`, sub: `${profile.defaults} defaults on record` },
          { label: "Pool Participation", value: `$${BORROWER.poolSupplied.toLocaleString()}`, sub: "Supplied as liquidity" },
        ].map((s, i) => (
          <div key={i} className={clsx("p-8", i < 2 && "border-r border-border")}>
            <div className="label mb-2">{s.label}</div>
            <div className="font-serif text-[32px] font-bold tracking-[-1px] leading-none">{s.value}</div>
            <div className="text-[10px] text-ink-muted font-mono mt-2">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Loan Ledger + Sparkline */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">02 — Loan Ledger</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">Repayment History</span>
            <span className="text-[9px] text-ink-faint font-mono tracking-[1px]">All time</span>
          </div>
          <div className="px-7 pb-4">
            <table className="w-full text-[11px] font-mono border-collapse">
              <thead>
                <tr className="border-b-2 border-ink">
                  {["Loan ID", "Amount", "Duration", "Rate", "Date", "Status"].map((h) => (
                    <th key={h} className="text-[9px] tracking-[2px] uppercase text-ink-faint font-semibold text-left py-3 last:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LOANS.map((loan) => (
                  <tr key={loan.id} className="border-b border-surface-2 hover:bg-surface transition-colors">
                    <td className="py-3 text-ink-faint text-[9px] tracking-[1px]">{loan.id}</td>
                    <td className="py-3">${loan.amount.toLocaleString()}</td>
                    <td className="py-3 text-ink-muted">{loan.duration}</td>
                    <td className="py-3 text-ink-muted">{loan.rate.toFixed(2)}%</td>
                    <td className="py-3 text-ink-muted">{loan.date}</td>
                    <td className="py-3 text-right">
                      <span className={clsx("text-[8px] tracking-[2px] uppercase font-semibold px-2 py-1", statusStyles[loan.status])}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-7 py-5 border-t border-border">
            <div className="flex justify-between text-[9px] tracking-[2px] uppercase text-ink-faint font-mono mb-2">
              <span>Pool Utilization</span>
              <span>{utilization.toFixed(1)}% — ${(totalBorrowed / 1e6).toFixed(2)}M / ${(totalDeposits / 1e6).toFixed(2)}M</span>
            </div>
            <div className="h-1 bg-surface-2 relative overflow-hidden">
              <div
                className="h-full bg-chartreuse origin-left"
                style={{ width: `${utilization}%`, animation: "barGrow 1.2s cubic-bezier(0.16,1,0.3,1) 0.5s both" }}
              />
            </div>
          </div>
        </div>

        <div className="panel mt-6">
          <div className="panel-header">
            <span className="panel-title">Score History</span>
            <span className="text-[9px] text-ink-faint font-mono tracking-[1px]">Last 12 months</span>
          </div>
          <div className="px-7 py-6">
            <Sparkline data={SCORE_HISTORY} months={SCORE_MONTHS} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes barGrow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
