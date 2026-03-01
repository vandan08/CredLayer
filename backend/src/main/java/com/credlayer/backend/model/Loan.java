package com.credlayer.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "loans")
public class Loan {

    @Id
    private Long loanId;
    private String borrower;
    private String amount;
    private int interestRate;
    private int status; // 0=Active, 1=Repaid, 2=Defaulted, 3=Liquidated
    private LocalDateTime dueDate;

    public Loan() {
    }

    public Loan(Long loanId, String borrower, String amount, int interestRate, int status, LocalDateTime dueDate) {
        this.loanId = loanId;
        this.borrower = borrower;
        this.amount = amount;
        this.interestRate = interestRate;
        this.status = status;
        this.dueDate = dueDate;
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

    public String getAmount() {
        return amount;
    }

    public void setAmount(String amount) {
        this.amount = amount;
    }

    public int getInterestRate() {
        return interestRate;
    }

    public void setInterestRate(int interestRate) {
        this.interestRate = interestRate;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public LocalDateTime getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDateTime dueDate) {
        this.dueDate = dueDate;
    }
}
