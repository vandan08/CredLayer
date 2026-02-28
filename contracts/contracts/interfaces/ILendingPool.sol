// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILendingPool
 * @notice Interface for the Lending Pool contract
 */
interface ILendingPool {
    enum LoanStatus { Active, Repaid, Defaulted, Liquidated }

    struct Loan {
        uint256 loanId;
        address borrower;
        uint256 amount;
        uint256 collateralAmount;
        uint256 interestRate;       // basis points (500 = 5%)
        uint256 dueDate;
        uint256 repaidAmount;
        LoanStatus status;
        uint256 createdAt;
    }

    event Deposited(address indexed provider, uint256 amount);
    event Withdrawn(address indexed provider, uint256 amount);
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 interestRate,
        uint256 dueDate
    );
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event Liquidated(uint256 indexed loanId, address indexed borrower, uint256 collateralSeized);
    event Defaulted(uint256 indexed loanId, address indexed borrower);

    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function borrow(
        uint256 amount,
        uint256 duration,
        uint256 collateralAmount,
        uint256 deadline,
        bytes calldata signature
    ) external;
    function repay(uint256 loanId) external;
    function liquidate(uint256 loanId) external;
    function getLoan(uint256 loanId) external view returns (Loan memory);
    function getInterestRate(address borrower) external view returns (uint256);
}
