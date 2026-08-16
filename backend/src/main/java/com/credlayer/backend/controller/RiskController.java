package com.credlayer.backend.controller;

import com.credlayer.backend.model.User;
import com.credlayer.backend.repository.UserRepository;
import com.credlayer.backend.service.OracleUpdateService;
import com.credlayer.backend.service.RiskModelService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.util.Map;

@RestController
@RequestMapping("/api/risk")
public class RiskController {

    /** Default loan duration (30 days) used when the client does not specify one. */
    private static final BigInteger DEFAULT_DURATION_SECONDS = BigInteger.valueOf(30L * 24 * 60 * 60);

    /** EVM address format: 0x + 40 hex chars. */
    private static final java.util.regex.Pattern ADDRESS_PATTERN = java.util.regex.Pattern
            .compile("^0x[0-9a-fA-F]{40}$");

    private final RiskModelService riskModelService;
    private final UserRepository userRepository;
    private final OracleUpdateService oracleUpdateService;

    public RiskController(RiskModelService riskModelService, UserRepository userRepository,
            OracleUpdateService oracleUpdateService) {
        this.riskModelService = riskModelService;
        this.userRepository = userRepository;
        this.oracleUpdateService = oracleUpdateService;
    }

    public static class LoanRequestDto {
        private String borrower;
        private BigInteger amount;
        private BigInteger duration; // loan duration in seconds (optional)

        public String getBorrower() {
            return borrower;
        }

        public void setBorrower(String borrower) {
            this.borrower = borrower;
        }

        public BigInteger getAmount() {
            return amount;
        }

        public void setAmount(BigInteger amount) {
            this.amount = amount;
        }

        public BigInteger getDuration() {
            return duration;
        }

        public void setDuration(BigInteger duration) {
            this.duration = duration;
        }
    }

    /**
     * Get user credit score and risk band.
     */
    @GetMapping("/score/{walletAddress}")
    public ResponseEntity<?> getCreditScore(@PathVariable String walletAddress) {
        if (!isValidAddress(walletAddress)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid wallet address."));
        }
        User user = userRepository.findById(walletAddress).orElse(null);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.ok(Map.of(
                    "walletAddress", walletAddress,
                    "currentScore", 500,
                    "riskBand", "C"));
        }
    }

    /**
     * Request a loan and get risk parameters + Oracle ECDSA Signature for the Smart
     * Contract.
     */
    @PostMapping("/loan-approval")
    public ResponseEntity<?> requestLoanApproval(@RequestBody LoanRequestDto request) {
        if (request.getBorrower() == null || !isValidAddress(request.getBorrower())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid borrower address."));
        }
        try {
            BigInteger duration = request.getDuration() != null ? request.getDuration() : DEFAULT_DURATION_SECONDS;
            RiskModelService.SignedLoanApproval approval = riskModelService.generateLoanApproval(
                    request.getBorrower(),
                    request.getAmount(),
                    duration);
            return ResponseEntity.ok(approval);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Register a borrower on-chain (via the oracle account) so they can take out
     * loans. The LendingPool requires borrowers to exist in the CreditRegistry
     * before {@code borrow()} succeeds. Idempotent from the caller's perspective:
     * if the borrower is already registered the on-chain call is a no-op revert
     * that is surfaced as a 200 with {@code alreadyRegistered}.
     */
    @PostMapping("/register/{walletAddress}")
    public ResponseEntity<?> registerBorrower(@PathVariable String walletAddress) {
        if (!isValidAddress(walletAddress)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid wallet address."));
        }
        try {
            boolean submitted = oracleUpdateService.registerBorrower(walletAddress);
            return ResponseEntity.ok(Map.of(
                    "walletAddress", walletAddress,
                    "submitted", submitted));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private static boolean isValidAddress(String address) {
        return address != null && ADDRESS_PATTERN.matcher(address).matches();
    }
}
