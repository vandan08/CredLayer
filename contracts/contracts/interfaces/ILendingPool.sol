// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILendingPool
 * @notice Interface for the Lending Pool contract.
 * @dev LendingPool inherits this interface, so the compiler enforces that the
 *      two stay in sync — this file is a trustworthy integration reference.
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

    // Lenders receive pool shares, so deposit/withdraw report both legs.
    event Deposited(address indexed provider, uint256 assets, uint256 shares);
    event Withdrawn(address indexed provider, uint256 assets, uint256 shares);
    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 interestRate,
        uint256 collateralAmount,
        uint256 dueDate
    );
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 totalPaid);
    event Liquidated(uint256 indexed loanId, address indexed borrower, uint256 collateralSeized);
    event Defaulted(uint256 indexed loanId, address indexed borrower);

    // ─── Liquidity provision (share-based) ───────────────────────
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function redeem(uint256 shares) external;

    // ─── Borrowing ───────────────────────────────────────────────
    function borrow(
        uint256 amount,
        uint256 duration,
        uint256 collateralAmount,
        uint256 deadline,
        bytes calldata signature
    ) external;
    function repay(uint256 loanId) external;
    function liquidate(uint256 loanId) external;

    // ─── Views ───────────────────────────────────────────────────
    function getLoan(uint256 loanId) external view returns (Loan memory);
    function getInterestRate(address borrower) external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function maxWithdraw(address provider) external view returns (uint256);
}
