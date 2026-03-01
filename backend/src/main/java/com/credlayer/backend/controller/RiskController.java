package com.credlayer.backend.controller;

import com.credlayer.backend.model.User;
import com.credlayer.backend.repository.UserRepository;
import com.credlayer.backend.service.RiskModelService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigInteger;
import java.util.Map;

@RestController
@RequestMapping("/api/risk")
@CrossOrigin(origins = "*") // Allow requests from Next.js frontend
public class RiskController {

    private final RiskModelService riskModelService;
    private final UserRepository userRepository;

    public RiskController(RiskModelService riskModelService, UserRepository userRepository) {
        this.riskModelService = riskModelService;
        this.userRepository = userRepository;
    }

    public static class LoanRequestDto {
        private String borrower;
        private BigInteger amount;

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
    }

    /**
     * Get user credit score and risk band.
     */
    @GetMapping("/score/{walletAddress}")
    public ResponseEntity<?> getCreditScore(@PathVariable String walletAddress) {
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
        try {
            RiskModelService.SignedLoanApproval approval = riskModelService.generateLoanApproval(
                    request.getBorrower(),
                    request.getAmount());
            return ResponseEntity.ok(approval);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
