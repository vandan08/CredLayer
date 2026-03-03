"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { PROPOSALS, GovernanceProposal } from "@/lib/data";
import { GOVERNANCE_ABI, ADDRESSES } from "@/lib/web3/contracts";
import { clsx } from "clsx";

const statusStyles: Record<string, { bg: string; text: string }> = {
  Active: { bg: "bg-chartreuse/30", text: "text-[#4A5E00]" },
  Passed: { bg: "bg-green/10", text: "text-green" },
  Failed: { bg: "bg-crimson/10", text: "text-crimson" },
  Pending: { bg: "bg-surface-2", text: "text-ink-muted" },
};

function ProposalCard({ p, proposalIndex }: { p: GovernanceProposal; proposalIndex: number }) {
  const { address, isConnected } = useAccount();
  const [voted, setVoted] = useState<"yea" | "nay" | null>(null);
  const [voting, setVoting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync: voteAsync } = useWriteContract();

  // Check if user already voted on-chain
  const { data: hasVotedOnChain } = useReadContract({
    address: ADDRESSES.GOVERNANCE,
    abi: GOVERNANCE_ABI,
    functionName: "hasVoted",
    args: address ? [BigInt(proposalIndex), address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const alreadyVoted = hasVotedOnChain === true || voted !== null;

  const forPct = (p.votesFor / p.quorum) * 100;
  const againstPct = (p.votesAgainst / p.quorum) * 100;
  const quorumPct = (p.totalVotes / p.quorum) * 100;
  const st = statusStyles[p.status];

  const handleVote = async (support: boolean) => {
    if (!isConnected || !address) return;

    try {
      setVoting(true);
      const hash = await voteAsync({
        address: ADDRESSES.GOVERNANCE,
        abi: GOVERNANCE_ABI,
        functionName: "vote",
        args: [BigInt(proposalIndex), support],
      });
      setTxHash(hash);
      setVoted(support ? "yea" : "nay");
    } catch (err: any) {
      console.error("Vote failed:", err);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="border border-border">
      {/* Card header */}
      <div className="px-8 py-6 border-b border-border flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] tracking-[2px] uppercase text-ink-faint font-mono">{p.id}</span>
            <span className={clsx("text-[8px] tracking-[2px] uppercase font-semibold font-mono px-2 py-1", st.bg, st.text)}>
              {p.status}
            </span>
          </div>
          <h3 className="font-serif text-xl font-bold tracking-[-0.5px] leading-tight">{p.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] tracking-[1.5px] uppercase text-ink-faint font-mono">Ends</div>
          <div className="text-[11px] font-mono font-semibold">{p.endsAt}</div>
        </div>
      </div>

      {/* Description */}
      <div className="px-8 py-5 border-b border-border">
        <p className="text-[12px] font-mono text-ink-muted leading-relaxed">{p.description}</p>
        <div className="mt-3 text-[9px] font-mono text-ink-faint tracking-[1px]">
          Proposed by {p.author}
        </div>
      </div>

      {/* Vote bars */}
      <div className="px-8 py-6 border-b border-border grid grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between text-[9px] font-mono tracking-[1.5px] uppercase mb-2">
            <span className="text-ink-faint">For</span>
            <span className="text-green font-semibold">{p.votesFor.toLocaleString()}</span>
          </div>
          <div className="h-[3px] bg-surface-2">
            <div className="h-full bg-green" style={{ width: `${Math.min(100, forPct)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[9px] font-mono tracking-[1.5px] uppercase mb-2">
            <span className="text-ink-faint">Against</span>
            <span className="text-crimson font-semibold">{p.votesAgainst.toLocaleString()}</span>
          </div>
          <div className="h-[3px] bg-surface-2">
            <div className="h-full bg-crimson" style={{ width: `${Math.min(100, againstPct)}%` }} />
          </div>
        </div>
      </div>

      {/* Quorum */}
      <div className="px-8 py-4 border-b border-border">
        <div className="flex justify-between text-[9px] font-mono tracking-[1px] mb-2">
          <span className="text-ink-faint uppercase tracking-[1.5px]">Quorum Progress</span>
          <span className="text-ink-muted">{p.totalVotes.toLocaleString()} / {p.quorum.toLocaleString()} votes</span>
        </div>
        <div className="h-1 bg-surface-2">
          <div
            className={clsx("h-full transition-all", quorumPct >= 100 ? "bg-chartreuse" : "bg-ink")}
            style={{ width: `${Math.min(100, quorumPct)}%` }}
          />
        </div>
      </div>

      {/* Vote actions */}
      {p.status === "Active" && (
        <div className="px-8 py-5 flex gap-4">
          {alreadyVoted ? (
            <div className="text-[11px] font-mono text-ink-muted tracking-[1px]">
              ✓ You voted <strong className={voted === "yea" || hasVotedOnChain ? "text-green" : "text-crimson"}>{voted?.toUpperCase() || "ON-CHAIN"}</strong> on this proposal.
              {txHash && <span className="block text-[9px] text-ink-faint mt-1 break-all">TX: {txHash}</span>}
            </div>
          ) : (
            <>
              <button
                onClick={() => handleVote(true)}
                disabled={voting || !isConnected}
                className={clsx(
                  "flex-1 py-3 border-2 border-green text-green text-[10px] tracking-[3px] uppercase font-semibold font-mono transition-all",
                  isConnected ? "hover:bg-green hover:text-chartreuse" : "opacity-50",
                  voting && "opacity-50"
                )}
              >
                {voting ? "Signing..." : "Vote Yea"}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting || !isConnected}
                className={clsx(
                  "flex-1 py-3 border-2 border-crimson text-crimson text-[10px] tracking-[3px] uppercase font-semibold font-mono transition-all",
                  isConnected ? "hover:bg-crimson hover:text-bg" : "opacity-50",
                  voting && "opacity-50"
                )}
              >
                {voting ? "Signing..." : "Vote Nay"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function GovernancePage() {
  const { address, isConnected } = useAccount();

  // Read voting power from contract
  const { data: rawVotingPower } = useReadContract({
    address: ADDRESSES.GOVERNANCE,
    abi: GOVERNANCE_ABI,
    functionName: "votingPower",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const votingPower = rawVotingPower ? Number(rawVotingPower).toLocaleString() : "0";

  return (
    <div className="p-14 max-w-[900px]">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">01 — DAO</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-serif text-[42px] font-bold tracking-[-1px] leading-none mb-1">Governance</h1>
        <p className="text-[11px] text-ink-muted font-mono">Protocol parameters are controlled by token holders. One token = one vote.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border border-border mb-10">
        {[
          { label: "Active Proposals", value: "1" },
          { label: "Your Voting Power", value: isConnected ? `${votingPower} DCT` : "— Connect Wallet" },
          { label: "Total Proposals", value: "14" },
        ].map((s, i) => (
          <div key={i} className={clsx("p-7", i < 2 && "border-r border-border")}>
            <div className="label mb-2">{s.label}</div>
            <div className="font-serif text-[28px] font-bold tracking-[-1px]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Connection notice */}
      {!isConnected && (
        <div className="bg-surface border border-border px-6 py-4 mb-6">
          <span className="text-[11px] font-mono text-ink-muted">
            ⚠ Connect your wallet to vote on proposals.
          </span>
        </div>
      )}

      {/* Proposals */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">02 — Proposals</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-6">
        {PROPOSALS.map((p, i) => (
          <ProposalCard key={p.id} p={p} proposalIndex={i} />
        ))}
      </div>
    </div>
  );
}
