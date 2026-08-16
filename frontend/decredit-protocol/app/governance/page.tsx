"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { PROPOSALS } from "@/lib/data";
import { GOVERNANCE_ABI, ADDRESSES, isDeployed } from "@/lib/web3/contracts";
import { toast } from "@/components/ui/Toaster";
import { clsx } from "clsx";

// Governance.ProposalStatus enum
const STATUS_LABELS = ["Pending", "Active", "Passed", "Failed", "Executed", "Cancelled"] as const;

const statusStyles: Record<string, { bg: string; text: string }> = {
  Active: { bg: "bg-chartreuse/30", text: "text-[#4A5E00]" },
  Passed: { bg: "bg-green/10", text: "text-green" },
  Executed: { bg: "bg-green/10", text: "text-green" },
  Failed: { bg: "bg-crimson/10", text: "text-crimson" },
  Cancelled: { bg: "bg-crimson/10", text: "text-crimson" },
  Pending: { bg: "bg-surface-2", text: "text-ink-muted" },
};

type LiveProposal = {
  id: bigint;
  proposer: string;
  description: string;
  votesFor: bigint;
  votesAgainst: bigint;
  endTime: bigint;
  status: number;
};

function shortAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

// ─── Live proposal card ─────────────────────────────────────────

function LiveProposalCard({
  p,
  quorum,
  canVote,
  onChanged,
}: {
  p: LiveProposal;
  quorum: number;
  canVote: boolean;
  onChanged: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [voting, setVoting] = useState<"yea" | "nay" | null>(null);

  const { data: hasVotedOnChain, refetch: refetchVoted } = useReadContract({
    address: ADDRESSES.GOVERNANCE,
    abi: GOVERNANCE_ABI,
    functionName: "hasVoted",
    args: address ? [p.id, address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const votesFor = Number(p.votesFor);
  const votesAgainst = Number(p.votesAgainst);
  const totalVotes = votesFor + votesAgainst;
  const endMs = Number(p.endTime) * 1000;
  const votingOpen = p.status === 1 && Date.now() <= endMs;

  // Storage keeps status=Active after the deadline; derive the real outcome for display.
  let displayStatus: string = STATUS_LABELS[p.status] ?? "Pending";
  if (p.status === 1 && !votingOpen) {
    displayStatus = totalVotes >= quorum && votesFor > votesAgainst ? "Passed" : "Failed";
  }

  const st = statusStyles[displayStatus] ?? statusStyles.Pending;
  const denom = Math.max(quorum, totalVotes, 1);

  const handleVote = async (support: boolean) => {
    setVoting(support ? "yea" : "nay");
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.GOVERNANCE,
        abi: GOVERNANCE_ABI,
        functionName: "vote",
        args: [p.id, support],
      });
      toast({
        kind: "success",
        title: `Voted ${support ? "Yea" : "Nay"}`,
        message: `Your vote on GIP-${p.id.toString()} is on-chain.`,
        txHash: hash,
      });
      await Promise.all([refetchVoted(), onChanged()]);
    } catch (err: any) {
      console.error("Vote failed:", err);
      toast({
        kind: "error",
        title: "Vote failed",
        message: err?.shortMessage || err?.message || "Transaction rejected",
      });
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="border border-border">
      {/* Card header */}
      <div className="px-5 md:px-8 py-6 border-b border-border flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] tracking-[2px] uppercase text-ink-faint font-mono">
              GIP-{p.id.toString()}
            </span>
            <span className={clsx("text-[8px] tracking-[2px] uppercase font-semibold font-mono px-2 py-1", st.bg, st.text)}>
              {displayStatus}
            </span>
            <span className="text-[8px] tracking-[1px] uppercase font-mono text-chartreuse">● On-chain</span>
          </div>
          <h3 className="font-serif text-xl font-bold tracking-[-0.5px] leading-tight">
            {p.description}
          </h3>
        </div>
        <div className="sm:text-right shrink-0">
          <div className="text-[9px] tracking-[1.5px] uppercase text-ink-faint font-mono">
            {votingOpen ? "Voting ends" : "Ended"}
          </div>
          <div className="text-[11px] font-mono font-semibold">
            {new Date(endMs).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Proposer */}
      <div className="px-5 md:px-8 py-4 border-b border-border text-[9px] font-mono text-ink-faint tracking-[1px]">
        Proposed by {shortAddr(p.proposer)}
      </div>

      {/* Vote bars */}
      <div className="px-5 md:px-8 py-6 border-b border-border grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between text-[9px] font-mono tracking-[1.5px] uppercase mb-2">
            <span className="text-ink-faint">For</span>
            <span className="text-green font-semibold">{votesFor.toLocaleString()}</span>
          </div>
          <div className="h-[3px] bg-surface-2">
            <div className="h-full bg-green" style={{ width: `${Math.min(100, (votesFor / denom) * 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[9px] font-mono tracking-[1.5px] uppercase mb-2">
            <span className="text-ink-faint">Against</span>
            <span className="text-crimson font-semibold">{votesAgainst.toLocaleString()}</span>
          </div>
          <div className="h-[3px] bg-surface-2">
            <div className="h-full bg-crimson" style={{ width: `${Math.min(100, (votesAgainst / denom) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Quorum */}
      <div className="px-5 md:px-8 py-4 border-b border-border">
        <div className="flex justify-between text-[9px] font-mono tracking-[1px] mb-2">
          <span className="text-ink-faint uppercase tracking-[1.5px]">Quorum Progress</span>
          <span className="text-ink-muted">{totalVotes} / {quorum} votes</span>
        </div>
        <div className="h-1 bg-surface-2">
          <div
            className={clsx("h-full transition-all", totalVotes >= quorum ? "bg-chartreuse" : "bg-ink")}
            style={{ width: `${Math.min(100, (totalVotes / Math.max(quorum, 1)) * 100)}%` }}
          />
        </div>
      </div>

      {/* Vote actions */}
      {votingOpen && (
        <div className="px-5 md:px-8 py-5 flex flex-col sm:flex-row gap-4">
          {hasVotedOnChain ? (
            <div className="text-[11px] font-mono text-ink-muted tracking-[1px]">
              ✓ You have voted on this proposal.
            </div>
          ) : !canVote ? (
            <div className="text-[11px] font-mono text-ink-muted tracking-[1px]">
              Register as a voter above to participate.
            </div>
          ) : (
            <>
              <button
                onClick={() => handleVote(true)}
                disabled={voting !== null}
                className={clsx(
                  "flex-1 py-3 border-2 border-green text-green text-[10px] tracking-[3px] uppercase font-semibold font-mono transition-all",
                  voting ? "opacity-50" : "hover:bg-green hover:text-chartreuse"
                )}
              >
                {voting === "yea" ? "Signing..." : "Vote Yea"}
              </button>
              <button
                onClick={() => handleVote(false)}
                disabled={voting !== null}
                className={clsx(
                  "flex-1 py-3 border-2 border-crimson text-crimson text-[10px] tracking-[3px] uppercase font-semibold font-mono transition-all",
                  voting ? "opacity-50" : "hover:bg-crimson hover:text-bg"
                )}
              >
                {voting === "nay" ? "Signing..." : "Vote Nay"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Demo (mock) proposal card — shown when not connected ───────

function DemoProposalCard({ p }: { p: (typeof PROPOSALS)[number] }) {
  const st = statusStyles[p.status] ?? statusStyles.Pending;
  return (
    <div className="border border-border opacity-80">
      <div className="px-5 md:px-8 py-6 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] tracking-[2px] uppercase text-ink-faint font-mono">{p.id}</span>
          <span className={clsx("text-[8px] tracking-[2px] uppercase font-semibold font-mono px-2 py-1", st.bg, st.text)}>
            {p.status}
          </span>
          <span className="text-[8px] tracking-[1px] uppercase font-mono text-ink-faint">Demo</span>
        </div>
        <h3 className="font-serif text-xl font-bold tracking-[-0.5px] leading-tight">{p.title}</h3>
        <p className="text-[12px] font-mono text-ink-muted leading-relaxed mt-3">{p.description}</p>
      </div>
      <div className="px-5 md:px-8 py-4 flex justify-between text-[9px] font-mono text-ink-faint tracking-[1px]">
        <span>For {p.votesFor.toLocaleString()} · Against {p.votesAgainst.toLocaleString()}</span>
        <span>Ends {p.endsAt}</span>
      </div>
    </div>
  );
}

// ─── Create proposal form ───────────────────────────────────────

function CreateProposalForm({ onCreated }: { onCreated: () => void }) {
  const { writeContractAsync } = useWriteContract();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      toast({ kind: "error", title: "Description too short", message: "Describe the proposal in at least 10 characters." });
      return;
    }
    setSubmitting(true);
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.GOVERNANCE,
        abi: GOVERNANCE_ABI,
        functionName: "createProposal",
        // Parameter-change proposals target the LendingPool; calldata is set
        // by protocol maintainers before execution in this simplified DAO.
        args: [description.trim(), ADDRESSES.LENDING_POOL, "0x"],
      });
      toast({ kind: "success", title: "Proposal created", message: "Your proposal is live for voting.", txHash: hash });
      setDescription("");
      setOpen(false);
      onCreated();
    } catch (err: any) {
      console.error("Create proposal failed:", err);
      toast({ kind: "error", title: "Proposal failed", message: err?.shortMessage || err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-border mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 md:px-8 py-4 flex items-center justify-between text-left"
      >
        <span className="text-[10px] tracking-[2.5px] uppercase font-semibold font-mono text-ink">
          + New Proposal
        </span>
        <span className="text-ink-faint font-mono text-[11px]">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-5 md:px-8 pb-6 space-y-4 border-t border-border pt-5">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the parameter change you are proposing…"
            rows={3}
            className="w-full bg-surface border border-border p-4 text-[12px] font-mono text-ink outline-none focus:border-ink resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={clsx(
              "px-6 py-3 text-[10px] tracking-[3px] uppercase font-semibold font-mono border-2 transition-all",
              submitting
                ? "bg-surface-2 border-border text-ink-muted"
                : "bg-ink border-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse"
            )}
          >
            {submitting ? "Submitting…" : "Submit Proposal"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function GovernancePage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [registering, setRegistering] = useState(false);

  const live = isConnected && isDeployed(ADDRESSES.GOVERNANCE);

  const { data: rawVotingPower, refetch: refetchPower } = useReadContract({
    address: ADDRESSES.GOVERNANCE,
    abi: GOVERNANCE_ABI,
    functionName: "votingPower",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address },
  });

  const { data: rawQuorum } = useReadContract({
    address: ADDRESSES.GOVERNANCE,
    abi: GOVERNANCE_ABI,
    functionName: "quorum",
    query: { enabled: live },
  });

  const { data: rawTotalVoters } = useReadContract({
    address: ADDRESSES.GOVERNANCE,
    abi: GOVERNANCE_ABI,
    functionName: "totalVoters",
    query: { enabled: live },
  });

  const { data: rawNextId, refetch: refetchNextId } = useReadContract({
    address: ADDRESSES.GOVERNANCE,
    abi: GOVERNANCE_ABI,
    functionName: "nextProposalId",
    query: { enabled: live },
  });

  const proposalCount = rawNextId ? Number(rawNextId) : 0;
  const proposalIds = useMemo(
    // Newest first, cap at the latest 20.
    () => Array.from({ length: Math.min(proposalCount, 20) }, (_, i) => BigInt(proposalCount - 1 - i)),
    [proposalCount]
  );

  const { data: proposalReads, refetch: refetchProposals } = useReadContracts({
    contracts: proposalIds.map((id) => ({
      address: ADDRESSES.GOVERNANCE,
      abi: GOVERNANCE_ABI,
      functionName: "getProposal",
      args: [id],
    } as const)),
    query: { enabled: live && proposalIds.length > 0 },
  });

  const proposals: LiveProposal[] = (proposalReads ?? [])
    .map((r) => r.result as any)
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      proposer: p.proposer,
      description: p.description,
      votesFor: p.votesFor,
      votesAgainst: p.votesAgainst,
      endTime: p.endTime,
      status: Number(p.status),
    }));

  const votingPower = rawVotingPower ? Number(rawVotingPower) : 0;
  const quorum = rawQuorum ? Number(rawQuorum) : 3;
  const canVote = votingPower > 0;
  const activeCount = proposals.filter(
    (p) => p.status === 1 && Date.now() <= Number(p.endTime) * 1000
  ).length;

  const refreshAll = () => Promise.all([refetchNextId(), refetchProposals()]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.GOVERNANCE,
        abi: GOVERNANCE_ABI,
        functionName: "selfRegister",
      });
      toast({ kind: "success", title: "Registered as voter", message: "You now hold 1 vote in the DAO.", txHash: hash });
      await refetchPower();
    } catch (err: any) {
      console.error("Register failed:", err);
      toast({ kind: "error", title: "Registration failed", message: err?.shortMessage || err?.message });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="p-6 md:p-10 lg:p-14 max-w-[900px]">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">01 — DAO</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <h1 className="font-serif text-[32px] md:text-[42px] font-bold tracking-[-1px] leading-none mb-1">Governance</h1>
        <p className="text-[11px] text-ink-muted font-mono">
          Protocol parameters are controlled by registered voters. Anyone can join with 1 vote.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-border mb-10">
        {[
          { label: "Active Proposals", value: live ? String(activeCount) : "—" },
          { label: "Your Voting Power", value: !isConnected ? "— Connect Wallet" : `${votingPower} vote${votingPower === 1 ? "" : "s"}` },
          { label: "Registered Voters", value: live && rawTotalVoters ? String(Number(rawTotalVoters)) : "—" },
        ].map((s, i) => (
          <div key={i} className={clsx("p-7 border-border", i < 2 && "sm:border-r border-b sm:border-b-0")}>
            <div className="label mb-2">{s.label}</div>
            <div className="font-serif text-[24px] md:text-[28px] font-bold tracking-[-1px]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Registration / connection notice */}
      {!isConnected ? (
        <div className="bg-surface border border-border px-6 py-4 mb-6">
          <span className="text-[11px] font-mono text-ink-muted">
            ⚠ Connect your wallet to vote on proposals. Showing demo data below.
          </span>
        </div>
      ) : live && !canVote ? (
        <div className="bg-surface border-l-2 border-l-chartreuse border border-border px-6 py-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-[11px] font-mono text-ink-muted">
            You are not a registered voter yet. Register once to vote on every proposal.
          </span>
          <button
            onClick={handleRegister}
            disabled={registering}
            className={clsx(
              "shrink-0 px-5 py-2 text-[9px] tracking-[2.5px] uppercase font-semibold font-mono border-2 transition-all",
              registering
                ? "bg-surface-2 border-border text-ink-muted"
                : "bg-ink border-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse"
            )}
          >
            {registering ? "Registering…" : "Register to Vote"}
          </button>
        </div>
      ) : null}

      {/* Create proposal */}
      {live && canVote && <CreateProposalForm onCreated={refreshAll} />}

      {/* Proposals */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] tracking-[3px] uppercase text-ink-faint font-mono">02 — Proposals</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="space-y-6">
        {live ? (
          proposals.length > 0 ? (
            proposals.map((p) => (
              <LiveProposalCard
                key={p.id.toString()}
                p={p}
                quorum={quorum}
                canVote={canVote}
                onChanged={refreshAll}
              />
            ))
          ) : (
            <div className="border border-border p-8 text-[11px] font-mono text-ink-muted">
              No proposals yet. Be the first to create one.
            </div>
          )
        ) : (
          PROPOSALS.map((p) => <DemoProposalCard key={p.id} p={p} />)
        )}
      </div>
    </div>
  );
}
