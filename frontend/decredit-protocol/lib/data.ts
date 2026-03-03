export type RiskBand = "A" | "B" | "C" | "D";

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
  score: 742,
  band: "A",
  scoreDelta: 18,
  maxLoan: 24000,
  collateralPct: 40,
  interestRate: 5.0,
  liquidationThreshold: 35,
  totalBorrowed: 8400,
  repaymentRate: 100,
  poolSupplied: 2000,
  defaults: 0,
};

export const LOANS: Loan[] = [
  { id: "#LN-00041", amount: 3200, duration: "30 days", rate: 5.0,  status: "Active",  date: "Feb 12, 2026", dueDate: "Mar 14, 2026" },
  { id: "#LN-00038", amount: 2800, duration: "45 days", rate: 5.0,  status: "Repaid",  date: "Dec 01, 2025", dueDate: "Jan 15, 2026" },
  { id: "#LN-00031", amount: 1600, duration: "30 days", rate: 7.2,  status: "Repaid",  date: "Sep 18, 2025", dueDate: "Oct 18, 2025" },
  { id: "#LN-00024", amount: 800,  duration: "14 days", rate: 9.0,  status: "Repaid",  date: "Jun 03, 2025", dueDate: "Jun 17, 2025" },
  { id: "#LN-00017", amount: 2100, duration: "60 days", rate: 14.0, status: "Repaid",  date: "Jan 10, 2025", dueDate: "Mar 11, 2025" },
];

export const SCORE_HISTORY = [480, 510, 495, 540, 580, 610, 590, 640, 670, 700, 728, 742];
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

export const BAND_CONFIG: Record<RiskBand, { collateral: number; rate: number; label: string; color: string }> = {
  A: { collateral: 40,  rate: 5.0,  label: "750+",    color: "#C6F135" },
  B: { collateral: 70,  rate: 9.0,  label: "650–749", color: "#1A1915" },
  C: { collateral: 110, rate: 14.0, label: "500–649", color: "#B45309" },
  D: { collateral: 150, rate: 20.0, label: "<500",    color: "#9B1C1C" },
};
