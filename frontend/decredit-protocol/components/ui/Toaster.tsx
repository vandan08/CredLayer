"use client";

import { useEffect, useState } from "react";
import { activeChain } from "@/lib/web3/config";
import { clsx } from "clsx";

// ─── Tiny module-level toast bus (no external deps) ─────────────

export type Toast = {
    id: number;
    kind: "success" | "error" | "info";
    title: string;
    message?: string;
    txHash?: string;
};

type Listener = (toast: Toast) => void;

let nextId = 1;
const listeners = new Set<Listener>();

/** Fire a toast from anywhere (client-side). */
export function toast(t: Omit<Toast, "id">) {
    const full = { ...t, id: nextId++ };
    listeners.forEach((l) => l(full));
}

/** Explorer tx URL for the active chain, or null when none exists (local Hardhat). */
export function explorerTxUrl(hash: string): string | null {
    const base = activeChain.blockExplorers?.default?.url;
    return base ? `${base}/tx/${hash}` : null;
}

// ─── Renderer (mounted once in the root layout) ─────────────────

const KIND_STYLES: Record<Toast["kind"], string> = {
    success: "border-l-chartreuse",
    error: "border-l-crimson",
    info: "border-l-ink",
};

export function Toaster() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        const onToast = (t: Toast) => {
            setToasts((prev) => [...prev, t]);
            // Auto-dismiss after 6s
            setTimeout(() => {
                setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }, 6000);
        };
        listeners.add(onToast);
        return () => {
            listeners.delete(onToast);
        };
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-[320px] max-w-[calc(100vw-3rem)]">
            {toasts.map((t) => {
                const explorer = t.txHash ? explorerTxUrl(t.txHash) : null;
                return (
                    <div
                        key={t.id}
                        className={clsx(
                            "bg-bg border border-border border-l-2 shadow-[4px_4px_0_rgba(26,25,21,0.08)] p-4",
                            KIND_STYLES[t.kind]
                        )}
                        style={{ animation: "toastIn 0.25s cubic-bezier(0.16,1,0.3,1) both" }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[10px] tracking-[2px] uppercase font-semibold font-mono text-ink">
                                    {t.title}
                                </div>
                                {t.message && (
                                    <div className="text-[10px] font-mono text-ink-muted mt-1 leading-relaxed break-words">
                                        {t.message}
                                    </div>
                                )}
                                {t.txHash && (
                                    explorer ? (
                                        <a
                                            href={explorer}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block text-[9px] font-mono text-green underline underline-offset-2 mt-2"
                                        >
                                            View on {activeChain.blockExplorers!.default.name} ↗
                                        </a>
                                    ) : (
                                        <div className="text-[8px] font-mono text-ink-faint mt-2 break-all">
                                            TX: {t.txHash.slice(0, 18)}…{t.txHash.slice(-6)}
                                        </div>
                                    )
                                )}
                            </div>
                            <button
                                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                                className="text-ink-faint hover:text-ink text-[12px] font-mono leading-none shrink-0"
                                aria-label="Dismiss"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                );
            })}
            <style>{`
                @keyframes toastIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
