package com.credlayer.backend.service;

import com.credlayer.backend.model.User;
import com.credlayer.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RiskModelServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SignatureService signatureService;

    @InjectMocks
    private RiskModelService riskModelService;

    private final String testAddress = "0x1234567890123456789012345678901234567890";

    // 30-day duration in seconds, used for all approval requests below.
    private final BigInteger duration = BigInteger.valueOf(30L * 24 * 60 * 60);

    /** USDC whole units → base units (6 decimals). */
    private static BigInteger usdc(long whole) {
        return BigInteger.valueOf(whole).multiply(BigInteger.valueOf(1_000_000L));
    }

    @BeforeEach
    void stubSignature() {
        lenient().when(signatureService.signLoanApproval(anyString(), any(), any(), any(), anyLong()))
                .thenReturn("0xsignature");
    }

    @Test
    void testCalculateTerms_BandA() {
        User user = new User(testAddress, 850, "A", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(testAddress, terms.getBorrower());
        assertEquals(usdc(10_000), terms.getMaxLoanAmount());
        assertEquals(5, terms.getInterestRate());
        assertEquals(40, terms.getRequiredCollateralPercent());
        assertEquals("A", terms.getRiskBand());
        assertEquals(850, terms.getCurrentScore());
    }

    @Test
    void testCalculateTerms_BandB() {
        User user = new User(testAddress, 700, "B", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(usdc(5_000), terms.getMaxLoanAmount());
        assertEquals(8, terms.getInterestRate());
        assertEquals(70, terms.getRequiredCollateralPercent());
        assertEquals("B", terms.getRiskBand());
    }

    @Test
    void testCalculateTerms_BandC() {
        User user = new User(testAddress, 500, "C", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(usdc(1_000), terms.getMaxLoanAmount());
        assertEquals(12, terms.getInterestRate());
        assertEquals(110, terms.getRequiredCollateralPercent());
        assertEquals("C", terms.getRiskBand());
    }

    @Test
    void testCalculateTerms_BandD() {
        User user = new User(testAddress, 300, "D", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(usdc(50), terms.getMaxLoanAmount());
        assertEquals(20, terms.getInterestRate());
        assertEquals(150, terms.getRequiredCollateralPercent());
        assertEquals("D", terms.getRiskBand());
    }

    @Test
    void testCalculateTerms_UnknownUser_DefaultsToC() {
        when(userRepository.findById(testAddress)).thenReturn(Optional.empty());

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(500, terms.getCurrentScore());
        assertEquals("C", terms.getRiskBand());
        assertEquals(usdc(1_000), terms.getMaxLoanAmount());
        assertEquals(12, terms.getInterestRate());
        assertEquals(110, terms.getRequiredCollateralPercent());
    }

    @Test
    void testGenerateLoanApproval_ValidRequest() {
        User user = new User(testAddress, 850, "A", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        BigInteger requestedAmount = usdc(5_000);
        RiskModelService.SignedLoanApproval approval = riskModelService.generateLoanApproval(
                testAddress, requestedAmount, duration);

        assertNotNull(approval);
        assertEquals(requestedAmount, approval.getAmountRequested());
        assertEquals(duration, approval.getDuration());
        // Band A requires 40% collateral → 2,000 USDC.
        assertEquals(usdc(2_000), approval.getCollateralAmount());
        assertEquals("0xsignature", approval.getSignature());
        assertTrue(approval.getDeadline() > System.currentTimeMillis() / 1000);

        verify(signatureService).signLoanApproval(
                eq(testAddress), eq(requestedAmount), eq(duration), eq(usdc(2_000)), anyLong());
    }

    @Test
    void testGenerateLoanApproval_CollateralRoundsUp() {
        User user = new User(testAddress, 500, "C", LocalDateTime.now()); // 110% collateral
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        // 1 base unit * 110 / 100 = 1.1 → rounds up to 2 so it always covers the requirement.
        BigInteger approvalAmount = BigInteger.ONE;
        RiskModelService.SignedLoanApproval approval = riskModelService.generateLoanApproval(
                testAddress, approvalAmount, duration);

        assertEquals(BigInteger.TWO, approval.getCollateralAmount());
    }

    @Test
    void testGenerateLoanApproval_AmountExceedsMax_ThrowsException() {
        User user = new User(testAddress, 850, "A", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        BigInteger excessiveAmount = usdc(20_000);

        assertThrows(IllegalArgumentException.class, () -> {
            riskModelService.generateLoanApproval(testAddress, excessiveAmount, duration);
        });

        verify(signatureService, never()).signLoanApproval(anyString(), any(), any(), any(), anyLong());
    }

    @Test
    void testGenerateLoanApproval_ZeroAmount_ThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> {
            riskModelService.generateLoanApproval(testAddress, BigInteger.ZERO, duration);
        });
    }

    @Test
    void testGenerateLoanApproval_DeadlineIsOneHourFromNow() {
        User user = new User(testAddress, 700, "B", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        long beforeCall = System.currentTimeMillis() / 1000;
        RiskModelService.SignedLoanApproval approval = riskModelService.generateLoanApproval(
                testAddress, usdc(1_000), duration);
        long afterCall = System.currentTimeMillis() / 1000;

        assertTrue(approval.getDeadline() >= beforeCall + 3600);
        assertTrue(approval.getDeadline() <= afterCall + 3600);
    }

    @Test
    void testGenerateLoanApproval_BandBParameters() {
        User user = new User(testAddress, 650, "B", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        BigInteger amount = usdc(3_000);
        riskModelService.generateLoanApproval(testAddress, amount, duration);

        // Band B → 70% collateral → 2,100 USDC.
        verify(signatureService).signLoanApproval(
                eq(testAddress), eq(amount), eq(duration), eq(usdc(2_100)), anyLong());
    }

    @Test
    void testLoanTerms_GettersWork() {
        RiskModelService.LoanTerms terms = new RiskModelService.LoanTerms(
                testAddress, new BigInteger("1000"), 10, 50, "B", 700);

        assertEquals(testAddress, terms.getBorrower());
        assertEquals(new BigInteger("1000"), terms.getMaxLoanAmount());
        assertEquals(10, terms.getInterestRate());
        assertEquals(50, terms.getRequiredCollateralPercent());
        assertEquals("B", terms.getRiskBand());
        assertEquals(700, terms.getCurrentScore());
    }

    @Test
    void testSignedLoanApproval_GettersWork() {
        RiskModelService.LoanTerms terms = new RiskModelService.LoanTerms(
                testAddress, new BigInteger("1000"), 10, 50, "B", 700);

        RiskModelService.SignedLoanApproval approval = new RiskModelService.SignedLoanApproval(
                terms, 1234567890L, new BigInteger("500"), duration, new BigInteger("250"), "0xsignature");

        assertEquals(terms, approval.getTerms());
        assertEquals(1234567890L, approval.getDeadline());
        assertEquals(new BigInteger("500"), approval.getAmountRequested());
        assertEquals(duration, approval.getDuration());
        assertEquals(new BigInteger("250"), approval.getCollateralAmount());
        assertEquals("0xsignature", approval.getSignature());
    }
}
