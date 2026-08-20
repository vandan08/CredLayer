import { BANDS, BAND_ORDER, type Band } from "./risk";

/**
 * Seeded demo data. Every screen falls back to this when no wallet is
 * connected, so a visitor can explore the whole protocol without MetaMask,
 * testnet ETH, or a funded account.
 *
 * Scores are on the same 0–1000 scale the contracts use — see lib/risk.ts.
 */

export type RiskBand = Band;

export interface BorrowerProfile {
  address: string;
  score: number;
  band: RiskBand;
  scoreDelta: number;
  maxLoan: number;
  collateralPct: number;
  interestRate: number;
  liquidationThreshold: number;
  totalBorrowed: number;
  repaymentRate: number;
  poolSupplied: number;
  defaults: number;
}

export interface Loan {
  id: string;
  amount: number;
  duration: string;
  rate: number;
  status: "Active" | "Repaid" | "Overdue";
  date: string;
  dueDate: string;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  author: string;
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  quorum: number;
  status: "Active" | "Passed" | "Failed" | "Pending";
  endsAt: string;
}

export const BORROWER: BorrowerProfile = {
  address: "0x71C7...4E3F",
  score: 850, // Band A on the contracts' 0–1000 scale
  band: "A",
  scoreDelta: 20,
  maxLoan: BANDS.A.maxLoanUsdc,
  collateralPct: BANDS.A.collateralPct,
  interestRate: BANDS.A.interestPct,
  liquidationThreshold: 35,
  totalBorrowed: 9300, // sum of LOANS below
  repaymentRate: 100,
  poolSupplied: 2000,
  defaults: 0,
};

/**
 * The ledger tells the protocol's story in reverse: the borrower starts in
 * Band C paying 12%, repays consistently, and works down to Band A at 5%.
 * Rates are the real band rates — nothing here is a number the protocol
 * would not actually charge.
 */
export const LOANS: Loan[] = [
  { id: "#LN-00041", amount: 3200, duration: "30 days", rate: BANDS.A.interestPct, status: "Active", date: "Feb 12, 2026", dueDate: "Mar 14, 2026" },
  { id: "#LN-00038", amount: 2800, duration: "45 days", rate: BANDS.A.interestPct, status: "Repaid", date: "Dec 01, 2025", dueDate: "Jan 15, 2026" },
  { id: "#LN-00031", amount: 1600, duration: "30 days", rate: BANDS.B.interestPct, status: "Repaid", date: "Sep 18, 2025", dueDate: "Oct 18, 2025" },
  { id: "#LN-00024", amount: 800,  duration: "14 days", rate: BANDS.B.interestPct, status: "Repaid", date: "Jun 03, 2025", dueDate: "Jun 17, 2025" },
  { id: "#LN-00017", amount: 900,  duration: "60 days", rate: BANDS.C.interestPct, status: "Repaid", date: "Jan 10, 2025", dueDate: "Mar 11, 2025" },
];

// 0–1000 scale. The dip at month 3 is a late repayment; the climb past 600
// and 800 is where the borrower crosses into Band B and then Band A.
export const SCORE_HISTORY = [500, 540, 520, 580, 620, 660, 640, 700, 740, 780, 820, 850];
export const SCORE_MONTHS  = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];

export const PROPOSALS: GovernanceProposal[] = [
  {
    id: "GIP-014",
    title: "Adjust Band A Collateral Ratio to 35%",
    description: "Proposal to lower Band A required collateral from 40% to 35% to improve capital efficiency for highly-rated borrowers while maintaining protocol solvency.",
    author: "0xA2f1...9C3D",
    votesFor: 1840,
    votesAgainst: 420,
    totalVotes: 2260,
    quorum: 3000,
    status: "Active",
    endsAt: "Mar 08, 2026",
  },
  {
    id: "GIP-013",
    title: "Increase Maximum Loan Duration to 180 Days",
    description: "Extend maximum loan duration from 90 to 180 days for Band A and B borrowers to support longer-term financing needs.",
    author: "0xF7c3...1A2E",
    votesFor: 2900,
    votesAgainst: 180,
    totalVotes: 3080,
    quorum: 3000,
    status: "Passed",
    endsAt: "Feb 22, 2026",
  },
  {
    id: "GIP-012",
    title: "Reduce Oracle Update Interval to 6 Hours",
    description: "Change the minimum oracle score update interval from 24 hours to 6 hours for more responsive credit scoring.",
    author: "0x3E91...7F5B",
    votesFor: 980,
    votesAgainst: 2100,
    totalVotes: 3080,
    quorum: 3000,
    status: "Failed",
    endsAt: "Feb 10, 2026",
  },
];

export const POOL_DATA = {
  totalDeposited: 4210000,
  totalBorrowed: 3048240,
  utilizationRate: 72.4,
  apyForLenders: 3.62,
  liquidityProviders: 847,
};

/**
 * Derived from the single source of truth in lib/risk.ts so the dashboard,
 * the borrow form and the landing page can never quote different numbers
 * than the contracts enforce.
 */
export const BAND_CONFIG: Record<
  RiskBand,
  { collateral: number; rate: number; maxLoan: number; label: string; color: string }
> = Object.fromEntries(
  BAND_ORDER.map((b) => {
    const t = BANDS[b];
    const upper = b === "A" ? 1000 : BANDS[BAND_ORDER[BAND_ORDER.indexOf(b) - 1]].floor - 1;
    return [
      b,
      {
        collateral: t.collateralPct,
        rate: t.interestPct,
        maxLoan: t.maxLoanUsdc,
        label: b === "A" ? `${t.floor}+` : `${t.floor}–${upper}`,
        color: t.color,
      },
    ];
  })
) as Record<RiskBand, { collateral: number; rate: number; maxLoan: number; label: string; color: string }>;
