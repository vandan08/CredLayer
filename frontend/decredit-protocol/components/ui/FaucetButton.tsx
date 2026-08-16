"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { MOCK_USDC_ABI, ADDRESSES, isDeployed } from "@/lib/web3/contracts";
import { clsx } from "clsx";

/**
 * One-click test-USDC faucet (MockUSDC.faucet mints 10,000 USDC to the caller).
 * Only rendered when connected and contracts are deployed — this is a
 * local/testnet convenience, MockUSDC does not exist on mainnet.
 */
export function FaucetButton({ onMinted }: { onMinted?: () => void }) {
    const { isConnected } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const [state, setState] = useState<"idle" | "minting" | "done" | "error">("idle");

    if (!isConnected || !isDeployed(ADDRESSES.MOCK_USDC)) return null;

    const handleFaucet = async () => {
        setState("minting");
        try {
            await writeContractAsync({
                address: ADDRESSES.MOCK_USDC,
                abi: MOCK_USDC_ABI,
                functionName: "faucet",
            });
            setState("done");
            onMinted?.();
            setTimeout(() => setState("idle"), 4000);
        } catch (err) {
            console.error("Faucet failed:", err);
            setState("error");
            setTimeout(() => setState("idle"), 4000);
        }
    };

    return (
        <button
            onClick={handleFaucet}
            disabled={state === "minting"}
            className={clsx(
                "text-[8px] tracking-[2px] uppercase font-semibold font-mono px-3 py-[6px] border transition-all",
                state === "done"
                    ? "border-green text-green"
                    : state === "error"
                        ? "border-crimson text-crimson"
                        : state === "minting"
                            ? "border-border text-ink-muted"
                            : "border-chartreuse bg-chartreuse/20 text-[#4A5E00] hover:bg-chartreuse/40"
            )}
        >
            {state === "done"
                ? "+10,000 USDC ✓"
                : state === "error"
                    ? "Faucet failed"
                    : state === "minting"
                        ? "Minting…"
                        : "Get Test USDC"}
        </button>
    );
}
