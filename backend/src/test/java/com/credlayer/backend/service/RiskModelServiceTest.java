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

    @Test
    void testCalculateTerms_BandA() {
        User user = new User(testAddress, 850, "A", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(testAddress, terms.getBorrower());
        assertEquals(new BigInteger("10000000000000000000000"), terms.getMaxLoanAmount());
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

        assertEquals(new BigInteger("5000000000000000000000"), terms.getMaxLoanAmount());
        assertEquals(8, terms.getInterestRate());
        assertEquals(70, terms.getRequiredCollateralPercent());
        assertEquals("B", terms.getRiskBand());
    }

    @Test
    void testCalculateTerms_BandC() {
        User user = new User(testAddress, 500, "C", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(new BigInteger("1000000000000000000000"), terms.getMaxLoanAmount());
        assertEquals(12, terms.getInterestRate());
        assertEquals(110, terms.getRequiredCollateralPercent());
        assertEquals("C", terms.getRiskBand());
    }

    @Test
    void testCalculateTerms_BandD() {
        User user = new User(testAddress, 300, "D", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        RiskModelService.LoanTerms terms = riskModelService.calculateTerms(testAddress);

        assertEquals(new BigInteger("50000000000000000000"), terms.getMaxLoanAmount());
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
        assertEquals(new BigInteger("1000000000000000000000"), terms.getMaxLoanAmount());
        assertEquals(12, terms.getInterestRate());
        assertEquals(110, terms.getRequiredCollateralPercent());
    }

    @Test
    void testGenerateLoanApproval_ValidRequest() {
        User user = new User(testAddress, 850, "A", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));
        when(signatureService.signLoanApproval(anyString(), any(), anyInt(), anyInt(), anyLong()))
            .thenReturn("0xabcdef1234567890");

        BigInteger requestedAmount = new BigInteger("5000000000000000000000");
        RiskModelService.SignedLoanApproval approval = riskModelService.generateLoanApproval(
            testAddress, requestedAmount
        );

        assertNotNull(approval);
        assertEquals(requestedAmount, approval.getAmountRequested());
        assertEquals("0xabcdef1234567890", approval.getSignature());
        assertTrue(approval.getDeadline() > System.currentTimeMillis() / 1000);
        
        verify(signatureService).signLoanApproval(
            eq(testAddress), 
            eq(requestedAmount), 
            eq(5), 
            eq(40), 
            anyLong()
        );
    }

    @Test
    void testGenerateLoanApproval_AmountExceedsMax_ThrowsException() {
        User user = new User(testAddress, 850, "A", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        BigInteger excessiveAmount = new BigInteger("20000000000000000000000");

        assertThrows(IllegalArgumentException.class, () -> {
            riskModelService.generateLoanApproval(testAddress, excessiveAmount);
        });

        verify(signatureService, never()).signLoanApproval(anyString(), any(), anyInt(), anyInt(), anyLong());
    }

    @Test
    void testGenerateLoanApproval_DeadlineIsOneHourFromNow() {
        User user = new User(testAddress, 700, "B", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));
        when(signatureService.signLoanApproval(anyString(), any(), anyInt(), anyInt(), anyLong()))
            .thenReturn("0xsignature");

        long beforeCall = System.currentTimeMillis() / 1000;
        RiskModelService.SignedLoanApproval approval = riskModelService.generateLoanApproval(
            testAddress, new BigInteger("1000000000000000000000")
        );
        long afterCall = System.currentTimeMillis() / 1000;

        long expectedDeadlineMin = beforeCall + 3600;
        long expectedDeadlineMax = afterCall + 3600;

        assertTrue(approval.getDeadline() >= expectedDeadlineMin);
        assertTrue(approval.getDeadline() <= expectedDeadlineMax);
    }

    @Test
    void testGenerateLoanApproval_BandBParameters() {
        User user = new User(testAddress, 650, "B", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));
        when(signatureService.signLoanApproval(anyString(), any(), anyInt(), anyInt(), anyLong()))
            .thenReturn("0xsig");

        BigInteger amount = new BigInteger("3000000000000000000000");
        riskModelService.generateLoanApproval(testAddress, amount);

        verify(signatureService).signLoanApproval(
            eq(testAddress),
            eq(amount),
            eq(8),
            eq(70),
            anyLong()
        );
    }

    @Test
    void testGenerateLoanApproval_BandCParameters() {
        User user = new User(testAddress, 450, "C", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));
        when(signatureService.signLoanApproval(anyString(), any(), anyInt(), anyInt(), anyLong()))
            .thenReturn("0xsig");

        BigInteger amount = new BigInteger("500000000000000000000");
        riskModelService.generateLoanApproval(testAddress, amount);

        verify(signatureService).signLoanApproval(
            eq(testAddress),
            eq(amount),
            eq(12),
            eq(110),
            anyLong()
        );
    }

    @Test
    void testGenerateLoanApproval_BandDParameters() {
        User user = new User(testAddress, 200, "D", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));
        when(signatureService.signLoanApproval(anyString(), any(), anyInt(), anyInt(), anyLong()))
            .thenReturn("0xsig");

        BigInteger amount = new BigInteger("30000000000000000000");
        riskModelService.generateLoanApproval(testAddress, amount);

        verify(signatureService).signLoanApproval(
            eq(testAddress),
            eq(amount),
            eq(20),
            eq(150),
            anyLong()
        );
    }

    @Test
    void testLoanTerms_GettersWork() {
        RiskModelService.LoanTerms terms = new RiskModelService.LoanTerms(
            testAddress,
            new BigInteger("1000"),
            10,
            50,
            "B",
            700
        );

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
            testAddress, new BigInteger("1000"), 10, 50, "B", 700
        );
        
        RiskModelService.SignedLoanApproval approval = new RiskModelService.SignedLoanApproval(
            terms, 1234567890L, new BigInteger("500"), "0xsignature"
        );

        assertEquals(terms, approval.getTerms());
        assertEquals(1234567890L, approval.getDeadline());
        assertEquals(new BigInteger("500"), approval.getAmountRequested());
        assertEquals("0xsignature", approval.getSignature());
    }
}
