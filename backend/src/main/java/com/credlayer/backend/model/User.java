package com.credlayer.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    private String walletAddress;

    private int currentScore;
    private String riskBand; // e.g. "A", "B", "C", "D"
    private LocalDateTime lastUpdated;

    public User() {
    }

    public User(String walletAddress, int currentScore, String riskBand, LocalDateTime lastUpdated) {
        this.walletAddress = walletAddress;
        this.currentScore = currentScore;
        this.riskBand = riskBand;
        this.lastUpdated = lastUpdated;
    }

    public String getWalletAddress() {
        return walletAddress;
    }

    public void setWalletAddress(String walletAddress) {
        this.walletAddress = walletAddress;
    }

    public int getCurrentScore() {
        return currentScore;
    }

    public void setCurrentScore(int currentScore) {
        this.currentScore = currentScore;
    }

    public String getRiskBand() {
        return riskBand;
    }

    public void setRiskBand(String riskBand) {
        this.riskBand = riskBand;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}
