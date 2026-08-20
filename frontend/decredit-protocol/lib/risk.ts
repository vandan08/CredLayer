// ═══════════════════════════════════════════════════════════════
//  Protocol Risk Model — single source of truth for the UI
//
//  Every constant below is mirrored from on-chain code. Keep these in
//  sync when the contracts change:
//
//    Score bands       → CreditRegistry.sol  BAND_{A,B,C}_THRESHOLD
//    Collateral ratios → CollateralVault.sol COLLATERAL_RATIO_{A..D}
//    Interest rates    → backend RiskModelService.calculateTerms()
//    Max loan sizes    → backend RiskModelService.calculateTerms()
//
//  Note: credit scores are 0–1000 on-chain. Some legacy demo widgets
//  render a 300–850 "FICO-like" scale; use `toDisplayScale` for those
//  rather than hard-coding a second set of thresholds.
// ═══════════════════════════════════════════════════════════════

export type Band = "A" | "B" | "C" | "D";

/** CreditRegistry.sol: BAND_A_THRESHOLD / BAND_B_THRESHOLD / BAND_C_THRESHOLD */
export const BAND_THRESHOLDS = { A: 800, B: 600, C: 400 } as const;

export const MIN_SCORE = 0;
export const MAX_SCORE = 1000;

export interface BandTerms {
    band: Band;
    /** Inclusive lower bound of the band on the 0–1000 scale. */
    floor: number;
    /** Collateral required as a percent of the loan principal. */
    collateralPct: number;
    /** Annualised interest rate, percent. */
    interestPct: number;
    /** Ceiling on a single loan, in whole USDC. */
    maxLoanUsdc: number;
    label: string;
    blurb: string;
    color: string;
}

/**
 * Band table. Collateral percentages match CollateralVault's basis-point
 * constants (4000/7000/11000/11000). Rates and loan ceilings are enforced
 * off-chain by the risk engine, which co-signs every approval.
 */
export const BANDS: Record<Band, BandTerms> = {
    A: {
        band: "A",
        floor: 800,
        collateralPct: 40,
        interestPct: 5,
        maxLoanUsdc: 10_000,
        label: "Prime",
        blurb: "Long repayment history, zero defaults. Borrows at 40% collateral — 2.5x capital efficiency versus a standard over-collateralized pool.",
        color: "#C6F135",
    },
    B: {
        band: "B",
        floor: 600,
        collateralPct: 70,
        interestPct: 8,
        maxLoanUsdc: 5_000,
        label: "Established",
        blurb: "A proven track record with minor blemishes. Still borrows under-collateralized, at a modest rate premium.",
        color: "#1B4332",
    },
    C: {
        band: "C",
        floor: 400,
        collateralPct: 110,
        interestPct: 12,
        maxLoanUsdc: 1_000,
        label: "Building",
        blurb: "New or thin-file wallets start here. Over-collateralized until on-chain repayments accumulate.",
        color: "#B45309",
    },
    D: {
        band: "D",
        floor: 0,
        // ⚠ Band D is the one place the two layers disagree: CollateralVault's
        // COLLATERAL_RATIO_D is 110%, but RiskModelService signs approvals at
        // 150%. The contract check is `collateral >= required`, so the stricter
        // backend figure is what a borrower actually posts — and therefore what
        // the UI must quote. Reconcile the two before this ever sees real funds.
        collateralPct: 150,
        interestPct: 20,
        maxLoanUsdc: 50,
        label: "Impaired",
        blurb: "A prior default is on record. Access is throttled to a nominal ceiling until the score recovers.",
        color: "#9B1C1C",
    },
};

export const BAND_ORDER: Band[] = ["A", "B", "C", "D"];

/** Mirrors CreditRegistry._calculateRiskBand. */
export function bandForScore(score: number): Band {
    if (score >= BAND_THRESHOLDS.A) return "A";
    if (score >= BAND_THRESHOLDS.B) return "B";
    if (score >= BAND_THRESHOLDS.C) return "C";
    return "D";
}

export function termsForScore(score: number): BandTerms {
    return BANDS[bandForScore(score)];
}

/**
 * Collateral required for a principal, in whole USDC.
 *
 * Mirrors RiskModelService.generateLoanApproval, which rounds **up** so the
 * signed collateral figure always satisfies the contract's
 * `collateralAmount >= requiredCollateral` check.
 */
export function collateralFor(principalUsdc: number, collateralPct: number): number {
    return Math.ceil((principalUsdc * collateralPct) / 100);
}

/** Total owed at maturity for a simple-interest loan of `days`. */
export function totalRepayment(principalUsdc: number, interestPct: number, days: number): number {
    return principalUsdc * (1 + (interestPct / 100) * (days / 365));
}

/**
 * Capital freed relative to a conventional 150%-collateral DeFi loan —
 * the number that motivates the whole protocol.
 */
export function capitalFreed(principalUsdc: number, collateralPct: number): number {
    const baseline = collateralFor(principalUsdc, 150);
    return baseline - collateralFor(principalUsdc, collateralPct);
}

/** Convert an on-chain 0–1000 score to the 300–850 display scale. */
export function toDisplayScale(score: number): number {
    return Math.round(300 + (score / MAX_SCORE) * 550);
}
