"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
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
      </div>

      {/* Nav */}
      <nav>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    "block py-[10px] text-[11px] tracking-[2px] uppercase font-medium font-mono transition-colors duration-150 border-b-2",
                    active
                      ? "text-ink border-chartreuse"
                      : "text-ink-muted border-transparent hover:text-ink"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Wallet */}
      <div className="mt-auto pt-6 border-t border-border">
        {isConnected && address ? (
          <>
            <div className="text-[9px] tracking-[2px] uppercase text-ink-faint mb-1">Connected</div>
            <div className="text-[10px] text-ink-muted font-mono break-all leading-relaxed">
              {truncateAddress(address)}
            </div>
            <div className="flex items-center gap-2 mt-2 mb-3">
              <span className="w-[6px] h-[6px] bg-green block animate-pulse" />
              <span className="text-[9px] tracking-[2px] uppercase text-green font-mono">
                {chain?.name ?? "Unknown"}
              </span>
            </div>
            <button
              onClick={() => disconnect()}
              className="w-full py-2 text-[9px] tracking-[2px] uppercase font-semibold font-mono border border-border text-ink-muted hover:bg-surface transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <div className="text-[9px] tracking-[2px] uppercase text-ink-faint mb-2">Not Connected</div>
            <button
              onClick={() => {
                const connector = connectors[0];
                if (connector) connect({ connector });
              }}
              className="w-full py-3 text-[9px] tracking-[2px] uppercase font-semibold font-mono border-2 border-ink bg-ink text-bg hover:bg-green hover:border-green hover:text-chartreuse transition-all"
            >
              Connect Wallet
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
