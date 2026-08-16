package com.credlayer.backend.service;

import com.credlayer.backend.model.User;
import com.credlayer.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.time.LocalDateTime;

@Service
public class RiskModelService {

    private final UserRepository userRepository;
    private final SignatureService signatureService;

    public RiskModelService(UserRepository userRepository, SignatureService signatureService) {
        this.userRepository = userRepository;
        this.signatureService = signatureService;
    }

    public static class LoanTerms {
        private String borrower;
        private BigInteger maxLoanAmount;
        private int interestRate;
        private int requiredCollateralPercent; // LTV e.g. 50 = 50%
        private String riskBand;
        private int currentScore;

        public LoanTerms(String borrower, BigInteger maxLoanAmount, int interestRate, int requiredCollateralPercent,
                String riskBand, int currentScore) {
            this.borrower = borrower;
            this.maxLoanAmount = maxLoanAmount;
            this.interestRate = interestRate;
            this.requiredCollateralPercent = requiredCollateralPercent;
            this.riskBand = riskBand;
            this.currentScore = currentScore;
        }

        public String getBorrower() {
            return borrower;
        }

        public BigInteger getMaxLoanAmount() {
            return maxLoanAmount;
        }

        public int getInterestRate() {
            return interestRate;
        }

        public int getRequiredCollateralPercent() {
            return requiredCollateralPercent;
        }

        public String getRiskBand() {
            return riskBand;
        }

        public int getCurrentScore() {
            return currentScore;
        }
    }

    public static class SignedLoanApproval {
        private LoanTerms terms;
        private long deadline;
        private BigInteger amountRequested;
        private BigInteger duration;
        private BigInteger collateralAmount;
        private String signature;

        public SignedLoanApproval(LoanTerms terms, long deadline, BigInteger amountRequested, BigInteger duration,
                BigInteger collateralAmount, String signature) {
            this.terms = terms;
            this.deadline = deadline;
            this.amountRequested = amountRequested;
            this.duration = duration;
            this.collateralAmount = collateralAmount;
            this.signature = signature;
        }

        public LoanTerms getTerms() {
            return terms;
        }

        public long getDeadline() {
            return deadline;
        }

        public BigInteger getAmountRequested() {
            return amountRequested;
        }

        public BigInteger getDuration() {
            return duration;
        }

        public BigInteger getCollateralAmount() {
            return collateralAmount;
        }

        public String getSignature() {
            return signature;
        }
    }

    public LoanTerms calculateTerms(String borrowerAddress) {
        User user = userRepository.findById(borrowerAddress).orElseGet(() -> {
            // Return default terms for unknown user
            return new User(borrowerAddress, 500, "C", LocalDateTime.now());
        });

        int score = user.getCurrentScore();
        BigInteger maxLoan;
        int interestRate;
        int requiredCollateral;

        // Amounts are denominated in USDC base units (6 decimals), matching MockUSDC
        // and the on-chain LendingPool / CollateralVault accounting.
        if (score >= 800) { // Band A
            maxLoan = usdc(10_000); // 10,000 USDC
            interestRate = 5; // 5%
            requiredCollateral = 40; // 40% collateral
        } else if (score >= 600) { // Band B
            maxLoan = usdc(5_000); // 5,000 USDC
            interestRate = 8; // 8%
            requiredCollateral = 70; // 70% collateral
        } else if (score >= 400) { // Band C
            maxLoan = usdc(1_000); // 1,000 USDC
            interestRate = 12; // 12%
            requiredCollateral = 110; // 110% collateral (Over-collateralized)
        } else { // Band D
            maxLoan = usdc(50); // 50 USDC
            interestRate = 20; // 20%
            requiredCollateral = 150; // 150% collateral
        }

        return new LoanTerms(
                borrowerAddress,
                maxLoan,
                interestRate,
                requiredCollateral,
                user.getRiskBand(),
                score);
    }

    /**
     * Assess a loan request against the borrower's risk band and return a
     * backend-signed approval the borrower can submit to {@code LendingPool.borrow}.
     *
     * <p>The signature commits to the exact {@code collateralAmount} and
     * {@code duration} returned here, so the frontend must forward these values
     * unchanged. The collateral is derived from the band's required LTV
     * ({@code amount * requiredCollateralPercent / 100}).
     *
     * @param borrowerAddress borrower wallet address
     * @param amountRequested requested loan amount in USDC base units (6 decimals)
     * @param durationSeconds requested loan duration in seconds
     */
    public SignedLoanApproval generateLoanApproval(String borrowerAddress, BigInteger amountRequested,
            BigInteger durationSeconds) {
        LoanTerms terms = calculateTerms(borrowerAddress);

        if (amountRequested == null || amountRequested.signum() <= 0) {
            throw new IllegalArgumentException("Requested amount must be greater than zero.");
        }
        if (amountRequested.compareTo(terms.getMaxLoanAmount()) > 0) {
            throw new IllegalArgumentException("Requested amount exceeds risk limit for this borrower.");
        }
        if (durationSeconds == null || durationSeconds.signum() <= 0) {
            throw new IllegalArgumentException("Loan duration must be greater than zero.");
        }

        // Collateral required = amount * requiredCollateralPercent / 100, rounded up so
        // it always satisfies the contract's `collateralAmount >= requiredCollateral` check.
        BigInteger[] divMod = amountRequested
                .multiply(BigInteger.valueOf(terms.getRequiredCollateralPercent()))
                .divideAndRemainder(BigInteger.valueOf(100));
        BigInteger collateralAmount = divMod[1].signum() == 0 ? divMod[0] : divMod[0].add(BigInteger.ONE);

        // Validity: 1 hour from now
        long deadline = LocalDateTime.now().plusHours(1).atZone(java.time.ZoneId.systemDefault()).toEpochSecond();

        String signature = signatureService.signLoanApproval(
                borrowerAddress,
                amountRequested,
                durationSeconds,
                collateralAmount,
                deadline);

        return new SignedLoanApproval(
                terms,
                deadline,
                amountRequested,
                durationSeconds,
                collateralAmount,
                signature);
    }

    /** Convert a whole-USDC amount to base units (6 decimals). */
    private static BigInteger usdc(long whole) {
        return BigInteger.valueOf(whole).multiply(BigInteger.valueOf(1_000_000L));
    }
}
