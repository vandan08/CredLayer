"use client";

import { useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import { LENDING_POOL_ABI, ERC20_ABI, ADDRESSES, isDeployed } from "@/lib/web3/contracts";
import { toast } from "@/components/ui/Toaster";
import { clsx } from "clsx";

const LOAN_STATUS = ["Active", "Repaid", "Defaulted", "Liquidated"] as const;

const statusStyles: Record<string, string> = {
  Active: "bg-chartreuse/30 text-[#4A5E00]",
  Repaid: "bg-green/10 text-green",
  Defaulted: "bg-crimson/10 text-crimson",
  Liquidated: "bg-crimson/10 text-crimson",
};

type OnChainLoan = {
  loanId: bigint;
  amount: bigint;
  interestRate: bigint;
  dueDate: bigint;
  status: number;
};

/**
 * Live on-chain loan ledger for the connected borrower, with an inline repay
 * action. Reads {@code getBorrowerLoanIds → getLoan/getTotalRepayment} from the
 * LendingPool and repays by approving USDC to the pool then calling {@code repay}.
 */
export function ActiveLoans() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deployed = isDeployed(ADDRESSES.LENDING_POOL);
  const enabled = isConnected && !!address && deployed;

  const { data: loanIds, refetch: refetchIds } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "getBorrowerLoanIds",
    args: address ? [address] : undefined,
    query: { enabled },
  });

  const ids = (loanIds as bigint[] | undefined) ?? [];

  // Batch getLoan(id) + getTotalRepayment(id) for every loan the borrower has.
  const { data: loanData, refetch: refetchLoans } = useReadContracts({
    contracts: ids.flatMap((id) => [
      {
        address: ADDRESSES.LENDING_POOL,
        abi: LENDING_POOL_ABI,
        functionName: "getLoan",
        args: [id],
      } as const,
      {
        address: ADDRESSES.LENDING_POOL,
        abi: LENDING_POOL_ABI,
        functionName: "getTotalRepayment",
        args: [id],
      } as const,
    ]),
    query: { enabled: enabled && ids.length > 0 },
  });

  const handleRepay = async (loanId: bigint, totalRepayment: bigint) => {
    setError(null);
    setBusyId(loanId.toString());
    try {
      // Approve the pool to pull principal + accrued interest, then repay.
      await writeContractAsync({
        address: ADDRESSES.MOCK_USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [ADDRESSES.LENDING_POOL, totalRepayment],
      });
      const hash = await writeContractAsync({
        address: ADDRESSES.LENDING_POOL,
        abi: LENDING_POOL_ABI,
        functionName: "repay",
        args: [loanId],
      });
      toast({
        kind: "success",
        title: "Loan repaid",
        message: `Loan #${loanId.toString()} settled — collateral unlocked, credit score will update shortly.`,
        txHash: hash,
      });
      await Promise.all([refetchIds(), refetchLoans()]);
    } catch (err: any) {
      console.error("Repay failed:", err);
      const msg = err?.shortMessage || err?.message || "Repayment failed";
      setError(msg);
      toast({ kind: "error", title: "Repayment failed", message: msg });
    } finally {
      setBusyId(null);
    }
  };

  if (!enabled) {
    return (
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">Active Loans</span>
          <span className="text-[9px] text-ink-faint font-mono">On-chain</span>
        </div>
        <div className="p-7 text-[11px] font-mono text-ink-muted">
          {!isConnected
            ? "Connect your wallet to view and repay your on-chain loans."
            : "Contracts not deployed — run the deploy script to enable live loans."}
        </div>
      </div>
    );
  }

  const loans: OnChainLoan[] = ids.map((id, i) => {
    const loan = loanData?.[i * 2]?.result as any;
    return {
      loanId: id,
      amount: loan?.amount ?? BigInt(0),
      interestRate: loan?.interestRate ?? BigInt(0),
      dueDate: loan?.dueDate ?? BigInt(0),
      status: Number(loan?.status ?? 0),
    };
  });

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">Active Loans</span>
        <span className="text-[8px] font-mono text-chartreuse tracking-[1px]">● LIVE</span>
      </div>

      {loans.length === 0 ? (
        <div className="p-7 text-[11px] font-mono text-ink-muted">
          No loans found for this wallet yet. Head to Borrow to open your first loan.
        </div>
      ) : (
        <div className="px-7 pb-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[11px] font-mono border-collapse">
            <thead>
              <tr className="border-b-2 border-ink">
                {["ID", "Amount", "Rate", "Due", "Payoff", "Status", ""].map((h) => (
                  <th key={h} className="text-[9px] tracking-[2px] uppercase text-ink-faint font-semibold text-left py-3 last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, i) => {
                const total = loanData?.[i * 2 + 1]?.result as bigint | undefined;
                const statusLabel = LOAN_STATUS[loan.status] ?? "Active";
                const due = loan.dueDate > BigInt(0)
                  ? new Date(Number(loan.dueDate) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—";
                const isBusy = busyId === loan.loanId.toString();
                return (
                  <tr key={loan.loanId.toString()} className="border-b border-surface-2 hover:bg-surface transition-colors">
                    <td className="py-3 text-ink-faint text-[9px] tracking-[1px]">#{loan.loanId.toString()}</td>
                    <td className="py-3 font-semibold">${Number(formatUnits(loan.amount, 6)).toLocaleString()}</td>
                    <td className="py-3 text-ink-muted">{(Number(loan.interestRate) / 100).toFixed(2)}%</td>
                    <td className="py-3 text-ink-muted">{due}</td>
                    <td className="py-3 text-ink-muted">
                      {total !== undefined ? `$${Number(formatUnits(total, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="py-3">
                      <span className={clsx("text-[8px] tracking-[2px] uppercase font-semibold px-2 py-1", statusStyles[statusLabel])}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {loan.status === 0 && total !== undefined && (
                        <button
                          onClick={() => handleRepay(loan.loanId, total)}
                          disabled={isBusy}
                          className={clsx(
                            "text-[8px] tracking-[2px] uppercase font-semibold font-mono px-3 py-1 border transition-all",
                            isBusy
                              ? "border-border text-ink-muted"
                              : "border-ink bg-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse"
                          )}
                        >
                          {isBusy ? "Repaying…" : "Repay"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {error && <div className="text-[9px] font-mono text-crimson mt-3 break-all">{error}</div>}
        </div>
      )}
    </div>
  );
}
