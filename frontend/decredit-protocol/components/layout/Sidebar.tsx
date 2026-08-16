"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { clsx } from "clsx";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Borrow", href: "/borrow" },
  { label: "Lend", href: "/lend" },
  { label: "History", href: "/history" },
  { label: "Governance", href: "/governance" },
];

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Shared pieces (rendered in both desktop sidebar & mobile drawer) ───

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1">
      <ul className="flex flex-col gap-0">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={clsx(
                  "block py-[12px] text-[11px] tracking-[2px] uppercase font-medium font-mono transition-all duration-150 border-b border-surface-2",
                  active
                    ? "text-ink pl-2 border-b-2 border-chartreuse"
                    : "text-ink-muted hover:text-ink hover:pl-1"
                )}
              >
                {active && <span className="text-chartreuse mr-2">▸</span>}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function WalletPanel() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    query: { enabled: isConnected && !!address },
  });

  return (
    <div className="pt-6 border-t border-border">
      {isConnected && address ? (
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="w-[6px] h-[6px] bg-chartreuse block status-dot" />
            <span className="text-[8px] tracking-[2.5px] uppercase text-green font-mono font-semibold">
              {chain?.name ?? "Connected"}
            </span>
          </div>

          {/* Address */}
          <div className="bg-surface border border-border p-3">
            <div className="text-[8px] tracking-[2px] uppercase text-ink-faint mb-1 font-mono">Wallet</div>
            <div className="text-[11px] text-ink font-mono font-semibold">
              {truncateAddress(address)}
            </div>
            {balance && (
              <div className="text-[9px] text-ink-muted font-mono mt-1">
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </div>
            )}
          </div>

          {/* Scrolling hash — Web3 feel */}
          <div className="overflow-hidden h-4">
            <div className="hash-scroll text-[7px] text-ink-faint font-mono opacity-40">
              {address}{address}{address}
            </div>
          </div>

          <button
            onClick={() => disconnect()}
            className="w-full py-2 text-[8px] tracking-[2.5px] uppercase font-semibold font-mono border border-border text-ink-muted hover:text-crimson hover:border-crimson transition-all"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-[6px] h-[6px] bg-surface-2 block" />
            <span className="text-[8px] tracking-[2.5px] uppercase text-ink-faint font-mono">
              Not Connected
            </span>
          </div>

          {/* Decorative disconnected hash */}
          <div className="overflow-hidden h-3">
            <div className="text-[7px] text-ink-faint font-mono opacity-20">
              0x0000000000000000000000000000000000000000
            </div>
          </div>

          <button
            onClick={() => {
              const connector = connectors[0];
              if (connector) connect({ connector });
            }}
            className="w-full py-3 text-[9px] tracking-[2.5px] uppercase font-semibold font-mono border-2 border-ink bg-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse transition-all"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
}

function Logo() {
  return (
    <div>
      <div className="font-serif text-xl font-black leading-tight tracking-tight">
        DeCredit
      </div>
      <div className="text-[9px] tracking-[3px] uppercase text-ink-muted mt-1 font-mono">
        Protocol v1.0
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on route change and lock body scroll while open.
  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[220px] border-r border-border bg-bg z-50 flex-col px-8 py-10">
        <div className="mb-12 pb-8 border-b border-border">
          <Logo />
          {/* Decorative geometric mark */}
          <div className="mt-4 flex gap-[2px]">
            <div className="w-3 h-3 border border-ink" />
            <div className="w-3 h-3 bg-chartreuse" />
            <div className="w-3 h-3 border border-ink" />
          </div>
        </div>

        <Nav />
        <WalletPanel />

        {/* Footer mark */}
        <div className="mt-4 pt-4 border-t border-surface-2">
          <div className="text-[7px] text-ink-faint font-mono tracking-[1px] leading-relaxed">
            DECENTRALIZED CREDIT<br />
            SCORING PROTOCOL<br />
            © 2026 ON-CHAIN
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar (<lg) ── */}
      <header className="lg:hidden sticky top-0 z-50 bg-bg border-b border-border flex items-center justify-between px-5 py-4">
        <Logo />
        <div className="flex items-center gap-4">
          <span
            className={clsx(
              "w-[6px] h-[6px] block",
              isConnected ? "bg-chartreuse status-dot" : "bg-surface-2"
            )}
            title={isConnected ? "Wallet connected" : "Not connected"}
          />
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex flex-col gap-[5px] p-1"
          >
            <span className="block w-6 h-[2px] bg-ink" />
            <span className="block w-6 h-[2px] bg-ink" />
            <span className="block w-4 h-[2px] bg-ink self-end" />
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-[90]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Panel */}
          <div
            className="absolute right-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-bg border-l border-border flex flex-col px-8 py-8 overflow-y-auto"
            style={{ animation: "drawerIn 0.2s cubic-bezier(0.16,1,0.3,1) both" }}
          >
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
              <Logo />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="text-ink font-mono text-[16px] p-1"
              >
                ✕
              </button>
            </div>

            <Nav onNavigate={() => setDrawerOpen(false)} />
            <WalletPanel />
          </div>
          <style>{`
            @keyframes drawerIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
