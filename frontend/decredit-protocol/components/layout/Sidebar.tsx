"use client";

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

export function Sidebar() {
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    query: { enabled: isConnected && !!address },
  });

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] border-r border-border bg-bg z-50 flex flex-col px-8 py-10">
      {/* Logo */}
      <div className="mb-12 pb-8 border-b border-border">
        <div className="font-serif text-xl font-black leading-tight tracking-tight">
          DeCredit
        </div>
        <div className="text-[9px] tracking-[3px] uppercase text-ink-muted mt-1 font-mono">
          Protocol v1.0
        </div>
        {/* Decorative geometric mark */}
        <div className="mt-4 flex gap-[2px]">
          <div className="w-3 h-3 border border-ink" />
          <div className="w-3 h-3 bg-chartreuse" />
          <div className="w-3 h-3 border border-ink" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1">
        <ul className="flex flex-col gap-0">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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

      {/* Wallet */}
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

      {/* Footer mark */}
      <div className="mt-4 pt-4 border-t border-surface-2">
        <div className="text-[7px] text-ink-faint font-mono tracking-[1px] leading-relaxed">
          DECENTRALIZED CREDIT<br />
          SCORING PROTOCOL<br />
          © 2026 ON-CHAIN
        </div>
      </div>
    </aside>
  );
}
