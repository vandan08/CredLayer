package com.credlayer.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "defaults")
public class DefaultRecord {

    @Id
    private Long loanId; // 1:1 mapping with loan
    private String borrower;
    private int penaltyApplied;
    private LocalDateTime timestamp;

    public DefaultRecord() {
    }

    public DefaultRecord(Long loanId, String borrower, int penaltyApplied, LocalDateTime timestamp) {
        this.loanId = loanId;
        this.borrower = borrower;
        this.penaltyApplied = penaltyApplied;
        this.timestamp = timestamp;
    }

    public Long getLoanId() {
        return loanId;
    }

    public void setLoanId(Long loanId) {
        this.loanId = loanId;
    }

    public String getBorrower() {
        return borrower;
    }

    public void setBorrower(String borrower) {
        this.borrower = borrower;
    }

    public int getPenaltyApplied() {
        return penaltyApplied;
    }

    public void setPenaltyApplied(int penaltyApplied) {
        this.penaltyApplied = penaltyApplied;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
