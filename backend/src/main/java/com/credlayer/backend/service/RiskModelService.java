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
        private String signature;

        public SignedLoanApproval(LoanTerms terms, long deadline, BigInteger amountRequested, String signature) {
            this.terms = terms;
            this.deadline = deadline;
            this.amountRequested = amountRequested;
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

        if (score >= 800) { // Band A
            maxLoan = new BigInteger("10000000000000000000000"); // 10,000 USDC
            interestRate = 5; // 5%
            requiredCollateral = 40; // 40% collateral
        } else if (score >= 600) { // Band B
            maxLoan = new BigInteger("5000000000000000000000"); // 5,000 USDC
            interestRate = 8; // 8%
            requiredCollateral = 70; // 70% collateral
        } else if (score >= 400) { // Band C
            maxLoan = new BigInteger("1000000000000000000000"); // 1,000 USDC
            interestRate = 12; // 12%
            requiredCollateral = 110; // 110% collateral (Over-collateralized)
        } else { // Band D
            maxLoan = new BigInteger("50000000000000000000"); // 50 USDC
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

    public SignedLoanApproval generateLoanApproval(String borrowerAddress, BigInteger amountRequested) {
        LoanTerms terms = calculateTerms(borrowerAddress);

        if (amountRequested.compareTo(terms.getMaxLoanAmount()) > 0) {
            throw new IllegalArgumentException("Requested amount exceeds risk limit for this borrower.");
        }

        // Validity: 1 hour from now
        long deadline = LocalDateTime.now().plusHours(1).atZone(java.time.ZoneId.systemDefault()).toEpochSecond();

        String signature = signatureService.signLoanApproval(
                borrowerAddress,
                amountRequested,
                terms.getInterestRate(),
                terms.getRequiredCollateralPercent(),
                deadline);

        return new SignedLoanApproval(
                terms,
                deadline,
                amountRequested,
                signature);
    }
}
