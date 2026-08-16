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
import "./interfaces/ILendingPool.sol";
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
contract LendingPool is ILendingPool, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Loan / LoanStatus types and the core protocol events are declared in
    // ILendingPool, which this contract implements.

    // ═══════════════════════════════════════════════════════════════
    //                          STATE
    // ═══════════════════════════════════════════════════════════════

    IERC20 public lendingToken;         // USDC
    ICreditRegistry public creditRegistry;
    CollateralVault public collateralVault;

    /// @notice Backend signer address for loan approval signatures
    address public approvalSigner;

    /// @notice Approval hashes that have already been consumed.
    ///         Prevents a single backend-signed approval from being replayed
    ///         for multiple loans within its deadline window.
    mapping(bytes32 => bool) public usedApprovals;

    /// @notice All loans
    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    /// @notice Borrower's active loan IDs
    mapping(address => uint256[]) public borrowerLoans;

    // ─── ERC-4626-style share accounting ────────────────────────
    // Lenders receive pool shares on deposit instead of a flat principal
    // balance. Share price = totalAssets() / totalShares, where totalAssets
    // counts idle cash PLUS outstanding loan principal (a receivable).
    // Repaid interest and seized collateral raise the share price, so yield
    // and liquidation gains/losses accrue to all lenders pro-rata.
    //
    // Interest is only recognised when it is actually repaid (no accrual of
    // unpaid interest into NAV), and defaulted loans keep counting at face
    // value until someone calls the permissionless liquidate().

    /// @notice Pool shares held per liquidity provider
    mapping(address => uint256) public sharesOf;
    uint256 public totalShares;

    /// @dev Virtual offset (OpenZeppelin-style "decimal offset") that makes
    ///      donation/inflation attacks against early depositors unprofitable:
    ///      conversion behaves as if 10^3 shares and 1 asset already exist.
    uint256 private constant VIRTUAL_SHARES = 1e3;
    uint256 private constant VIRTUAL_ASSETS = 1;

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

    // Deposited / Withdrawn / LoanCreated / LoanRepaid / Liquidated / Defaulted
    // are inherited from ILendingPool.

    // Admin actions — emitted so off-chain monitoring can alert on any change
    // to security-critical protocol parameters.
    event ApprovalSignerUpdated(address indexed previousSigner, address indexed newSigner);
    event InterestRatesUpdated(uint256 rateA, uint256 rateB, uint256 rateC, uint256 rateD);
    event MaxLoanAmountUpdated(uint256 previousAmount, uint256 newAmount);

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
        emit ApprovalSignerUpdated(approvalSigner, _signer);
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

        emit InterestRatesUpdated(_rateA, _rateB, _rateC, _rateD);
    }

    function setMaxLoanAmount(uint256 _amount) external onlyOwner {
        emit MaxLoanAmountUpdated(maxLoanAmount, _amount);
        maxLoanAmount = _amount;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ═══════════════════════════════════════════════════════════════
    //                  LIQUIDITY PROVIDER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @notice Deposit lending tokens into the pool in exchange for pool shares
     * @param amount Amount of tokens to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LendingPool: amount must be > 0");

        // Price the shares BEFORE the transfer changes the pool balance.
        uint256 shares = convertToShares(amount);
        require(shares > 0, "LendingPool: deposit too small");

        lendingToken.safeTransferFrom(msg.sender, address(this), amount);
        sharesOf[msg.sender] += shares;
        totalShares += shares;

        emit Deposited(msg.sender, amount, shares);
    }

    /**
     * @notice Withdraw an exact asset amount by burning the equivalent shares
     * @param amount Amount of tokens to withdraw (principal + accrued yield)
     */
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "LendingPool: amount must be > 0");

        // Round shares up so a withdrawer can never extract more value than
        // their shares are worth.
        uint256 shares = _convertToSharesUp(amount);
        require(sharesOf[msg.sender] >= shares, "LendingPool: insufficient deposit");

        uint256 availableLiquidity = lendingToken.balanceOf(address(this));
        require(availableLiquidity >= amount, "LendingPool: insufficient liquidity");

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        lendingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, shares);
    }

    /**
     * @notice Redeem an exact number of shares for their current asset value.
     *         Use `redeem(sharesOf(msg.sender))` to exit a position completely
     *         without leaving rounding dust behind.
     * @param shares Number of pool shares to burn
     */
    function redeem(uint256 shares) external nonReentrant whenNotPaused {
        require(shares > 0, "LendingPool: shares must be > 0");
        require(sharesOf[msg.sender] >= shares, "LendingPool: insufficient shares");

        uint256 amount = convertToAssets(shares);
        require(amount > 0, "LendingPool: redeem too small");

        uint256 availableLiquidity = lendingToken.balanceOf(address(this));
        require(availableLiquidity >= amount, "LendingPool: insufficient liquidity");

        sharesOf[msg.sender] -= shares;
        totalShares -= shares;
        lendingToken.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount, shares);
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

        // Replay protection: each signed approval is single-use.
        require(!usedApprovals[messageHash], "LendingPool: approval already used");
        usedApprovals[messageHash] = true;

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

    // ─── Share accounting views ──────────────────────────────────

    /**
     * @notice Net asset value of the pool: idle cash plus outstanding loan
     *         principal (a receivable owed back to the pool).
     */
    function totalAssets() public view returns (uint256) {
        return lendingToken.balanceOf(address(this)) + totalBorrowed;
    }

    /**
     * @notice Convert an asset amount to pool shares (rounds down).
     * @dev Virtual shares/assets keep the rate well-defined for an empty pool
     *      and blunt donation-based share-price manipulation.
     */
    function convertToShares(uint256 assets) public view returns (uint256) {
        return (assets * (totalShares + VIRTUAL_SHARES)) / (totalAssets() + VIRTUAL_ASSETS);
    }

    /**
     * @notice Convert pool shares to their current asset value (rounds down).
     */
    function convertToAssets(uint256 shares) public view returns (uint256) {
        return (shares * (totalAssets() + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES);
    }

    /**
     * @notice Maximum assets a provider could withdraw at the current share
     *         price (subject to available liquidity).
     */
    function maxWithdraw(address provider) external view returns (uint256) {
        return convertToAssets(sharesOf[provider]);
    }

    /**
     * @notice Current asset value of a provider's position.
     * @dev Kept as a function (same ABI as the former public mapping) so
     *      existing integrations keep working; the value now includes yield.
     */
    function deposits(address provider) external view returns (uint256) {
        return convertToAssets(sharesOf[provider]);
    }

    /**
     * @notice Total value held by liquidity providers.
     * @dev ABI-compatible replacement for the former state variable.
     */
    function totalDeposits() external view returns (uint256) {
        return totalAssets();
    }

    /**
     * @notice Pool utilization rate in basis points (borrowed / NAV)
     */
    function getUtilizationRate() external view returns (uint256) {
        uint256 assets = totalAssets();
        if (assets == 0) return 0;
        return (totalBorrowed * 10000) / assets;
    }

    // ═══════════════════════════════════════════════════════════════
    //                     INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev convertToShares with rounding UP — used when burning shares for an
     *      exact asset withdrawal so rounding always favours the pool.
     */
    function _convertToSharesUp(uint256 assets) internal view returns (uint256) {
        uint256 denominator = totalAssets() + VIRTUAL_ASSETS;
        return (assets * (totalShares + VIRTUAL_SHARES) + denominator - 1) / denominator;
    }

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
