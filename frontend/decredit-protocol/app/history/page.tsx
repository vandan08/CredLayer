"use client";

import { LOANS, SCORE_HISTORY, SCORE_MONTHS, BORROWER } from "@/lib/data";
import { clsx } from "clsx";

const statusStyles: Record<string, string> = {
  Active:  "bg-chartreuse/30 text-[#4A5E00]",
  Repaid:  "bg-green/10 text-green",
  Overdue: "bg-crimson/10 text-crimson",
};

const REPAYMENT_EVENTS = [
  { date: "Feb 12, 2026", event: "Loan #LN-00041 issued",      type: "borrow",  amount: "+$3,200" },
  { date: "Jan 15, 2026", event: "Loan #LN-00038 fully repaid", type: "repay",   amount: "-$2,811.64" },
  { date: "Dec 01, 2025", event: "Loan #LN-00038 issued",      type: "borrow",  amount: "+$2,800" },
  { date: "Nov 18, 2025", event: "Credit score updated: 728→742", type: "score",  amount: "+14 pts" },
  { date: "Oct 18, 2025", event: "Loan #LN-00031 fully repaid", type: "repay",   amount: "-$1,604.07" },
  { date: "Sep 18, 2025", event: "Loan #LN-00031 issued",      type: "borrow",  amount: "+$1,600" },
  { date: "Sep 01, 2025", event: "Upgraded to Band A",         type: "upgrade", amount: "Band B → A" },
  { date: "Jun 17, 2025", event: "Loan #LN-00024 fully repaid", type: "repay",   amount: "-$803.08" },
];

const eventColors: Record<string, string> = {
  borrow:  "bg-ink",
  repay:   "bg-green",
  score:   "bg-chartreuse",
  upgrade: "bg-amber",
};

export default function HistoryPage() {
  const totalInterestPaid = LOANS
    .filter((l) => l.status === "Repaid")
    .reduce((sum, l) => sum + l.amount * (l.rate / 100) * 0.08, 0);

  return (
    <div className="p-14 max-w-[1100px]">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">01 — Record</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-serif text-[42px] font-bold tracking-[-1px] leading-none mb-1">Loan History</h1>
        <p className="text-[11px] text-ink-muted font-mono">Complete on-chain record for wallet {BORROWER.address}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 border border-border mb-8">
        {[
          { label: "Total Loans",       value: LOANS.length.toString() },
          { label: "Total Borrowed",    value: `$${LOANS.reduce((s, l) => s + l.amount, 0).toLocaleString()}` },
          { label: "Interest Paid",     value: `$${totalInterestPaid.toFixed(2)}` },
          { label: "Default Count",     value: "0" },
        ].map((s, i) => (
          <div key={i} className={clsx("p-7", i < 3 && "border-r border-border")}>
            <div className="label mb-2">{s.label}</div>
            <div className="font-serif text-[28px] font-bold tracking-[-1px]">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-8">
        {/* Full ledger */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">02 — All Loans</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Loan Ledger</span>
              <span className="text-[9px] text-ink-faint font-mono">{LOANS.length} records</span>
            </div>
            <div className="px-7 pb-4">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink">
                    {["ID", "Amount", "Duration", "Rate", "Issued", "Status"].map((h) => (
                      <th key={h} className="text-[9px] tracking-[2px] uppercase text-ink-faint font-semibold text-left py-3 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LOANS.map((loan) => (
                    <tr key={loan.id} className="border-b border-surface-2 hover:bg-surface transition-colors group">
                      <td className="py-3 text-ink-faint text-[9px] tracking-[1px]">{loan.id}</td>
                      <td className="py-3 font-semibold">${loan.amount.toLocaleString()}</td>
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
          </div>

          {/* Score progression table */}
          <div className="panel mt-6">
            <div className="panel-header">
              <span className="panel-title">Score Progression</span>
              <span className="text-[9px] text-ink-faint font-mono">12-month trend</span>
            </div>
            <div className="px-7 pb-4">
              <table className="w-full text-[11px] font-mono border-collapse">
                <thead>
                  <tr className="border-b-2 border-ink">
                    <th className="text-[9px] tracking-[2px] uppercase text-ink-faint font-semibold text-left py-3">Month</th>
                    <th className="text-[9px] tracking-[2px] uppercase text-ink-faint font-semibold text-left py-3">Score</th>
                    <th className="text-[9px] tracking-[2px] uppercase text-ink-faint font-semibold text-right py-3">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {SCORE_HISTORY.map((score, i) => {
                    const delta = i === 0 ? 0 : score - SCORE_HISTORY[i - 1];
                    return (
                      <tr key={i} className="border-b border-surface-2 hover:bg-surface transition-colors">
                        <td className="py-2 text-ink-muted">{SCORE_MONTHS[i]}</td>
                        <td className="py-2 font-semibold">{score}</td>
                        <td className={clsx("py-2 text-right font-semibold", delta > 0 ? "text-green" : delta < 0 ? "text-crimson" : "text-ink-faint")}>
                          {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">03 — Timeline</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Activity Log</span>
            </div>
            <div className="p-6">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />

                <div className="space-y-0">
                  {REPAYMENT_EVENTS.map((ev, i) => (
                    <div key={i} className="relative flex gap-4 pb-6">
                      <div className={clsx("w-4 h-4 shrink-0 mt-[2px] relative z-10", eventColors[ev.type])} />
                      <div className="flex-1">
                        <div className="text-[10px] text-ink-faint font-mono mb-[2px] tracking-[0.5px]">{ev.date}</div>
                        <div className="text-[11px] font-mono text-ink leading-snug">{ev.event}</div>
                        <div className={clsx(
                          "text-[10px] font-mono font-semibold mt-1",
                          ev.type === "repay" ? "text-green" :
                          ev.type === "borrow" ? "text-ink" :
                          ev.type === "upgrade" ? "text-amber" : "text-ink-muted"
                        )}>
                          {ev.amount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
