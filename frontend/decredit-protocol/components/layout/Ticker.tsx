"use client";

const items = [
  "POOL UTILIZATION 72.4%",
  "BAND A RATE 5.00%",
  "BAND B RATE 9.00%",
  "BAND C RATE 14.00%",
  "TOTAL VALUE LOCKED $4.21M",
  "ACTIVE LOANS 1,204",
  "AVG CREDIT SCORE 718",
  "DEFAULT RATE 0.82%",
  "ORACLE BLOCK #19,847,231",
  "GOVERNANCE PROPOSALS 3 ACTIVE",
];

export function Ticker() {
  const repeated = [...items, ...items];

  return (
    <div className="bg-ink border-b-2 border-ink overflow-hidden whitespace-nowrap h-9 flex items-center">
      <div
        className="inline-flex gap-12 items-center"
        style={{
          animation: "ticker 35s linear infinite",
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
              <span className="ml-12 opacity-30">——</span>
            )}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
