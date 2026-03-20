"use client";

import { useAccount, useReadContract } from "wagmi";
import { LENDING_POOL_ABI, ADDRESSES } from "@/lib/web3/contracts";
import { formatUnits } from "viem";

const items = [
  "POOL UTILIZATION 72.4%",
  "BAND A RATE 5.00%",
  "BAND B RATE 9.00%",
  "BAND C RATE 14.00%",
  "TOTAL VALUE LOCKED $4.21M",
  "ACTIVE LOANS 1,204",
  "AVG CREDIT SCORE 718",
  "DEFAULT RATE 0.82%",
  "GOVERNANCE PROPOSALS 3 ACTIVE",
];

export function Ticker() {
  const { isConnected } = useAccount();

  // Read live pool data when connected
  const { data: rawTotalDeposits } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "totalDeposits",
    query: { enabled: isConnected },
  });

  const { data: rawTotalBorrowed } = useReadContract({
    address: ADDRESSES.LENDING_POOL,
    abi: LENDING_POOL_ABI,
    functionName: "totalBorrowed",
    query: { enabled: isConnected },
  });

  // Build ticker items — use live data if connected
  const totalDeposits = rawTotalDeposits ? Number(formatUnits(rawTotalDeposits as bigint, 6)) : 4210000;
  const totalBorrowed = rawTotalBorrowed ? Number(formatUnits(rawTotalBorrowed as bigint, 6)) : 3048240;
  const utilization = totalDeposits > 0 ? ((totalBorrowed / totalDeposits) * 100).toFixed(1) : "72.4";
  const tvlFormatted = totalDeposits >= 1e6 ? `$${(totalDeposits / 1e6).toFixed(2)}M` : `$${totalDeposits.toLocaleString()}`;

  const liveItems = [
    `POOL UTILIZATION ${utilization}%`,
    "BAND A RATE 5.00%",
    "BAND B RATE 9.00%",
    "BAND C RATE 14.00%",
    `TOTAL VALUE LOCKED ${tvlFormatted}`,
    "ACTIVE LOANS 1,204",
    "AVG CREDIT SCORE 718",
    "DEFAULT RATE 0.82%",
    isConnected ? "◆ WALLET CONNECTED" : "◇ WALLET DISCONNECTED",
    `BLOCK ${new Date().toLocaleTimeString("en-US", { hour12: false })}`,
    "GOVERNANCE PROPOSALS 3 ACTIVE",
  ];

  const tickerItems = isConnected ? liveItems : items;
  const repeated = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <div className="bg-ink border-b-2 border-ink overflow-hidden whitespace-nowrap h-9 flex items-center relative">
      {/* Faded edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#1A1915] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#1A1915] to-transparent z-10" />

      <div
        className="inline-flex gap-12 items-center"
        style={{
          animation: "ticker 45s linear infinite",
          paddingLeft: "100%",
        }}
      >
        {repeated.map((item, i) => (
          <span
            key={i}
            className="text-chartreuse text-[10px] tracking-[2px] font-mono shrink-0"
          >
            {item}
            {i < repeated.length - 1 && (
              <span className="ml-12 opacity-20">◆</span>
            )}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
