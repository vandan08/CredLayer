package com.credlayer.backend.contract;

import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.generated.Uint256;

import java.util.Arrays;

public class EventDefinitions {

    // event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256
    // amount, uint256 interestRate, uint256 collateralAmount, uint256 dueDate);
    public static final Event LOAN_CREATED_EVENT = new Event("LoanCreated",
            Arrays.asList(
                    new TypeReference<Uint256>(true) {
                    }, // indexed loanId
                    new TypeReference<Address>(true) {
                    }, // indexed borrower
                    new TypeReference<Uint256>() {
                    }, // amount
                    new TypeReference<Uint256>() {
                    }, // interestRate
                    new TypeReference<Uint256>() {
                    }, // collateralAmount
                    new TypeReference<Uint256>() {
                    } // dueDate
            ));

    // event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256
    // amount);
    public static final Event LOAN_REPAID_EVENT = new Event("LoanRepaid",
            Arrays.asList(
                    new TypeReference<Uint256>(true) {
                    }, // indexed loanId
                    new TypeReference<Address>(true) {
                    }, // indexed borrower
                    new TypeReference<Uint256>() {
                    } // amount
            ));

    // event LoanLiquidated(uint256 indexed loanId, address indexed borrower,
    // address indexed liquidator, uint256 collateralLiquidated);
    public static final Event LOAN_LIQUIDATED_EVENT = new Event("LoanLiquidated",
            Arrays.asList(
                    new TypeReference<Uint256>(true) {
                    }, // indexed loanId
                    new TypeReference<Address>(true) {
                    }, // indexed borrower
                    new TypeReference<Address>(true) {
                    }, // indexed liquidator
                    new TypeReference<Uint256>() {
                    } // collateralLiquidated
            ));

    // event CreditScoreUpdated(address indexed borrower, uint256 oldScore, uint256
    // newScore);
    public static final Event CREDIT_SCORE_UPDATED_EVENT = new Event("CreditScoreUpdated",
            Arrays.asList(
                    new TypeReference<Address>(true) {
                    }, // indexed borrower
                    new TypeReference<Uint256>() {
                    }, // oldScore
                    new TypeReference<Uint256>() {
                    } // newScore
            ));

    // event DefaultRecorded(address indexed borrower, uint256 loanId);
    public static final Event DEFAULT_RECORDED_EVENT = new Event("DefaultRecorded",
            Arrays.asList(
                    new TypeReference<Address>(true) {
                    }, // indexed borrower
                    new TypeReference<Uint256>() {
                    } // loanId
            ));
}
