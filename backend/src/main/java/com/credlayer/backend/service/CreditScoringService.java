package com.credlayer.backend.service;

import com.credlayer.backend.model.User;
import com.credlayer.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreditScoringService {

    private final UserRepository userRepository;
    private final OracleUpdateService oracleUpdateService;

    public void applyRepaymentBonus(String borrowerAddress, String amountRepaid) {
        log.info("Applying repayment bonus for borrower: {}", borrowerAddress);
        User user = getUserOrCreate(borrowerAddress);

        // Simple logic for Phase 2 MVP: Increment score by 10 per repayment
        int newScore = Math.min(1000, user.getCurrentScore() + 10);
        updateScoreAndBand(user, newScore);
    }

    public void applyDefaultPenalty(String borrowerAddress, Long loanId) {
        log.info("Applying default penalty for borrower {} on loan {}", borrowerAddress, loanId);
        User user = getUserOrCreate(borrowerAddress);

        // Huge penalty for defaulting
        int newScore = Math.max(0, user.getCurrentScore() - 150);
        updateScoreAndBand(user, newScore);
    }

    private User getUserOrCreate(String address) {
        return userRepository.findById(address).orElseGet(() -> {
            User newUser = new User(
                    address,
                    500, // Default starting score
                    "C",
                    LocalDateTime.now());
            return userRepository.save(newUser);
        });
    }

    private void updateScoreAndBand(User user, int newScore) {
        user.setCurrentScore(newScore);

        if (newScore >= 800) {
            user.setRiskBand("A");
        } else if (newScore >= 600) {
            user.setRiskBand("B");
        } else if (newScore >= 400) {
            user.setRiskBand("C");
        } else {
            user.setRiskBand("D");
        }

        user.setLastUpdated(LocalDateTime.now());
        userRepository.save(user);

        log.info("Updated User {} to Score {} (Band {})", user.getWalletAddress(), newScore, user.getRiskBand());

        // Push the new score to the blockchain Oracle
        oracleUpdateService.pushScoreToChain(user.getWalletAddress(), newScore);
    }
}
