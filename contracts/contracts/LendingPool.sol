// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/ICreditRegistry.sol";
import "./CollateralVault.sol";

/**
 * @title LendingPool
 * @notice Core lending pool for the decentralized credit scoring protocol.
 *         Handles deposits, borrowing (with backend-signed approvals), repayments, and liquidations.
 * @dev Interest rates are dynamically set based on borrower credit score risk band:
 *      Band A: 5%  (500 bps)
 *      Band B: 9%  (900 bps)
 *      Band C: 14% (1400 bps)
 *      Band D: 14% (1400 bps)
 */
contract LendingPool is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ═══════════════════════════════════════════════════════════════
    //                          TYPES
    // ═══════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════
    //                          STATE
    // ═══════════════════════════════════════════════════════════════

    IERC20 public lendingToken;         // USDC
    ICreditRegistry public creditRegistry;
    CollateralVault public collateralVault;

    /// @notice Backend signer address for loan approval signatures
    address public approvalSigner;

    /// @notice All loans
    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    /// @notice Borrower's active loan IDs
    mapping(address => uint256[]) public borrowerLoans;

    /// @notice Liquidity provider deposits
    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    uint256 public totalBorrowed;

    // Interest rates in basis points
    uint256 public interestRateA = 500;    // 5%
    uint256 public interestRateB = 900;    // 9%
    uint256 public interestRateC = 1400;   // 14%
    uint256 public interestRateD = 1400;   // 14%

    // Loan limits
    uint256 public maxLoanDuration = 365 days;
    uint256 public minLoanDuration = 7 days;
    uint256 public maxLoanAmount = 100_000 * 1e6; // 100K USDC (6 decimals)

    // ═══════════════════════════════════════════════════════════════
    //                          EVENTS
    // ═══════════════════════════════════════════════════════════════

    event Deposited(address indexed provider, uint256 amount);
    event Withdrawn(address indexed provider, uint256 amount);
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

    // ═══════════════════════════════════════════════════════════════
    //                        CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════

    /**
     * @param _lendingToken Address of the lending token (USDC)
     * @param _creditRegistry Address of the CreditRegistry contract
     * @param _collateralVault Address of the CollateralVault contract
     * @param _approvalSigner Address of the backend signer for loan approvals
     */
    constructor(
        address _lendingToken,
        address _creditRegistry,
        address _collateralVault,
        address _approvalSigner
    ) Ownable(msg.sender) {
        require(_lendingToken != address(0), "LendingPool: zero address");
        require(_creditRegistry != address(0), "LendingPool: zero address");
        require(_collateralVault != address(0), "LendingPool: zero address");
        require(_approvalSigner != address(0), "LendingPool: zero address");

        lendingToken = IERC20(_lendingToken);
        creditRegistry = ICreditRegistry(_creditRegistry);
        collateralVault = CollateralVault(_collateralVault);
        approvalSigner = _approvalSigner;
    }

    // ═══════════════════════════════════════════════════════════════
    //                      ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function setApprovalSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "LendingPool: zero address");
        approvalSigner = _signer;
    }

    function setInterestRates(
        uint256 _rateA,
        uint256 _rateB,
        uint256 _rateC,
        uint256 _rateD
    ) external onlyOwner {
        interestRateA = _rateA;
        interestRateB = _rateB;
        interestRateC = _rateC;
        interestRateD = _rateD;
    }

    function setMaxLoanAmount(uint256 _amount) external onlyOwner {
        maxLoanAmount = _amount;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ═══════════════════════════════════════════════════════════════
    //                  LIQUIDITY PROVIDER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Deposit lending tokens into the pool
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LendingPool: amount must be > 0");

        lendingToken.safeTransferFrom(msg.sender, address(this), amount);
        deposits[msg.sender] += amount;
        totalDeposits += amount;

        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw deposited tokens from the pool
     * @param amount Amount of tokens to withdraw
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LendingPool: amount must be > 0");
        require(deposits[msg.sender] >= amount, "LendingPool: insufficient deposit");

        uint256 availableLiquidity = lendingToken.balanceOf(address(this));
        require(availableLiquidity >= amount, "LendingPool: insufficient liquidity");

        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        lendingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    // ═══════════════════════════════════════════════════════════════
    //                     BORROWER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Borrow tokens from the pool with backend-signed approval
     * @param amount Amount to borrow
     * @param duration Loan duration in seconds
     * @param collateralAmount Amount of collateral to lock
     * @param deadline Signature expiry timestamp
     * @param signature Backend-signed approval
     */
    function borrow(
        uint256 amount,
        uint256 duration,
        uint256 collateralAmount,
        uint256 deadline,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        require(amount > 0 && amount <= maxLoanAmount, "LendingPool: invalid amount");
        require(duration >= minLoanDuration && duration <= maxLoanDuration, "LendingPool: invalid duration");
        require(block.timestamp <= deadline, "LendingPool: signature expired");
        require(creditRegistry.isRegistered(msg.sender), "LendingPool: not registered");

        // Verify backend signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, amount, duration, collateralAmount, deadline)
        );
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(signature);
        require(signer == approvalSigner, "LendingPool: invalid signature");

        // Check credit-based collateral requirement
        uint256 requiredCollateral = collateralVault.getRequiredCollateral(msg.sender, amount);
        require(collateralAmount >= requiredCollateral, "LendingPool: insufficient collateral");

        // Check pool liquidity
        uint256 availableLiquidity = lendingToken.balanceOf(address(this));
        require(availableLiquidity >= amount, "LendingPool: insufficient liquidity");

        // Lock collateral
        collateralVault.lockCollateral(msg.sender, collateralAmount);

        // Get interest rate based on credit score
        uint256 interestRate = _getInterestRate(msg.sender);

        // Create loan
        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            loanId: loanId,
            borrower: msg.sender,
            amount: amount,
            collateralAmount: collateralAmount,
            interestRate: interestRate,
            dueDate: block.timestamp + duration,
            repaidAmount: 0,
            status: LoanStatus.Active,
            createdAt: block.timestamp
        });

        borrowerLoans[msg.sender].push(loanId);

        // Update credit registry
        creditRegistry.recordLoan(msg.sender);
        totalBorrowed += amount;

        // Transfer tokens to borrower
        lendingToken.safeTransfer(msg.sender, amount);

        emit LoanCreated(loanId, msg.sender, amount, interestRate, collateralAmount, block.timestamp + duration);
    }

    /**
     * @notice Repay an active loan (principal + interest)
     * @param loanId ID of the loan to repay
     */
    function repay(uint256 loanId) external nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "LendingPool: not borrower");
        require(loan.status == LoanStatus.Active, "LendingPool: loan not active");

        // Calculate total repayment (principal + interest)
        uint256 interest = _calculateInterest(loan.amount, loan.interestRate, loan.createdAt);
        uint256 totalRepayment = loan.amount + interest;

        // Transfer repayment from borrower
        lendingToken.safeTransferFrom(msg.sender, address(this), totalRepayment);

        // Update loan
        loan.repaidAmount = totalRepayment;
        loan.status = LoanStatus.Repaid;
        totalBorrowed -= loan.amount;

        // Unlock collateral
        collateralVault.unlockCollateral(msg.sender, loan.collateralAmount);

        // Update credit registry
        creditRegistry.recordRepayment(msg.sender);

        emit LoanRepaid(loanId, msg.sender, totalRepayment);
    }

    /**
     * @notice Liquidate an overdue loan
     * @param loanId ID of the loan to liquidate
     */
    function liquidate(uint256 loanId) external nonReentrant whenNotPaused {
        Loan storage loan = loans[loanId];
        require(loan.status == LoanStatus.Active, "LendingPool: loan not active");
        require(block.timestamp > loan.dueDate, "LendingPool: loan not overdue");

        loan.status = LoanStatus.Liquidated;
        totalBorrowed -= loan.amount;

        // Seize collateral → send to pool (this contract)
        collateralVault.liquidateCollateral(
            loan.borrower,
            loan.collateralAmount,
            address(this)
        );

        // Record default in credit registry
        creditRegistry.recordDefault(loan.borrower);

        emit Defaulted(loanId, loan.borrower);
        emit Liquidated(loanId, loan.borrower, loan.collateralAmount);
    }

    // ═══════════════════════════════════════════════════════════════
    //                      VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Get loan details
     */
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    /**
     * @notice Get all loan IDs for a borrower
     */
    function getBorrowerLoanIds(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    /**
     * @notice Get the interest rate for a borrower based on their credit score
     */
    function getInterestRate(address borrower) external view returns (uint256) {
        return _getInterestRate(borrower);
    }

    /**
     * @notice Get available liquidity in the pool
     */
    function getAvailableLiquidity() external view returns (uint256) {
        return lendingToken.balanceOf(address(this));
    }

    /**
     * @notice Calculate the total repayment for a loan (principal + accrued interest)
     */
    function getTotalRepayment(uint256 loanId) external view returns (uint256) {
        Loan storage loan = loans[loanId];
        uint256 interest = _calculateInterest(loan.amount, loan.interestRate, loan.createdAt);
        return loan.amount + interest;
    }

    /**
     * @notice Pool utilization rate in basis points
     */
    function getUtilizationRate() external view returns (uint256) {
        if (totalDeposits == 0) return 0;
        return (totalBorrowed * 10000) / totalDeposits;
    }

    // ═══════════════════════════════════════════════════════════════
    //                     INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function _getInterestRate(address borrower) internal view returns (uint256) {
        ICreditRegistry.RiskBand band = creditRegistry.getRiskBand(borrower);
        if (band == ICreditRegistry.RiskBand.A) return interestRateA;
        if (band == ICreditRegistry.RiskBand.B) return interestRateB;
        if (band == ICreditRegistry.RiskBand.C) return interestRateC;
        return interestRateD;
    }

    /**
     * @dev Simple interest calculation: principal * rate * time / (365 days * 10000)
     */
    function _calculateInterest(
        uint256 principal,
        uint256 rate,
        uint256 startTime
    ) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - startTime;
        return (principal * rate * elapsed) / (365 days * 10000);
    }
}
