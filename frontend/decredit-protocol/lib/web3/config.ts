import { http, createConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/**
 * Network selection is environment-driven so the same build works locally and
 * on a public testnet:
 *   NEXT_PUBLIC_CHAIN=sepolia   → Sepolia (optionally NEXT_PUBLIC_RPC_URL)
 *   (unset)                     → local Hardhat node
 */
const useSepolia = process.env.NEXT_PUBLIC_CHAIN === "sepolia";

export const activeChain = useSepolia ? sepolia : hardhat;

export const config = useSepolia
    ? createConfig({
        chains: [sepolia],
        connectors: [injected()],
        transports: {
            // Falls back to viem's default public Sepolia RPC when unset.
            [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
        },
    })
    : createConfig({
        chains: [hardhat],
        connectors: [injected()],
        transports: {
            [hardhat.id]: http("http://127.0.0.1:8545"),
        },
    });
