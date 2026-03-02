package com.credlayer.backend.controller;

import com.credlayer.backend.model.User;
import com.credlayer.backend.repository.UserRepository;
import com.credlayer.backend.service.RiskModelService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigInteger;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RiskController.class)
class RiskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RiskModelService riskModelService;

    @MockBean
    private UserRepository userRepository;

    private final String testAddress = "0x1234567890123456789012345678901234567890";

    @Test
    void testGetCreditScore_ExistingUser() throws Exception {
        User user = new User(testAddress, 750, "B", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/risk/score/{walletAddress}", testAddress))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.walletAddress").value(testAddress))
            .andExpect(jsonPath("$.currentScore").value(750))
            .andExpect(jsonPath("$.riskBand").value("B"));
    }

    @Test
    void testGetCreditScore_NewUser_ReturnsDefault() throws Exception {
        when(userRepository.findById(testAddress)).thenReturn(Optional.empty());

        mockMvc.perform(get("/api/risk/score/{walletAddress}", testAddress))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.walletAddress").value(testAddress))
            .andExpect(jsonPath("$.currentScore").value(500))
            .andExpect(jsonPath("$.riskBand").value("C"));
    }

    @Test
    void testRequestLoanApproval_ValidRequest() throws Exception {
        RiskModelService.LoanTerms terms = new RiskModelService.LoanTerms(
            testAddress,
            new BigInteger("10000000000000000000000"),
            5,
            40,
            "A",
            850
        );

        BigInteger requestedAmount = new BigInteger("5000000000000000000000");
        RiskModelService.SignedLoanApproval approval = new RiskModelService.SignedLoanApproval(
            terms,
            System.currentTimeMillis() / 1000 + 3600,
            requestedAmount,
            "0xabcdef1234567890"
        );

        when(riskModelService.generateLoanApproval(eq(testAddress), eq(requestedAmount)))
            .thenReturn(approval);

        RiskController.LoanRequestDto request = new RiskController.LoanRequestDto();
        request.setBorrower(testAddress);
        request.setAmount(requestedAmount);

        mockMvc.perform(post("/api/risk/loan-approval")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.signature").value("0xabcdef1234567890"))
            .andExpect(jsonPath("$.amountRequested").value(requestedAmount.toString()))
            .andExpect(jsonPath("$.terms.riskBand").value("A"));
    }

    @Test
    void testRequestLoanApproval_AmountExceedsMax_ReturnsBadRequest() throws Exception {
        BigInteger excessiveAmount = new BigInteger("99999999999999999999999");

        when(riskModelService.generateLoanApproval(eq(testAddress), eq(excessiveAmount)))
            .thenThrow(new IllegalArgumentException("Requested amount exceeds risk limit for this borrower."));

        RiskController.LoanRequestDto request = new RiskController.LoanRequestDto();
        request.setBorrower(testAddress);
        request.setAmount(excessiveAmount);

        mockMvc.perform(post("/api/risk/loan-approval")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Requested amount exceeds risk limit for this borrower."));
    }

    @Test
    void testRequestLoanApproval_InvalidJson_ReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/risk/loan-approval")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{invalid json}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void testGetCreditScore_BandAUser() throws Exception {
        User user = new User(testAddress, 900, "A", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/risk/score/{walletAddress}", testAddress))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.currentScore").value(900))
            .andExpect(jsonPath("$.riskBand").value("A"));
    }

    @Test
    void testGetCreditScore_BandDUser() throws Exception {
        User user = new User(testAddress, 200, "D", LocalDateTime.now());
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(user));

        mockMvc.perform(get("/api/risk/score/{walletAddress}", testAddress))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.currentScore").value(200))
            .andExpect(jsonPath("$.riskBand").value("D"));
    }

    @Test
    void testRequestLoanApproval_BandBUser() throws Exception {
        RiskModelService.LoanTerms terms = new RiskModelService.LoanTerms(
            testAddress,
            new BigInteger("5000000000000000000000"),
            8,
            70,
            "B",
            700
        );

        BigInteger requestedAmount = new BigInteger("3000000000000000000000");
        RiskModelService.SignedLoanApproval approval = new RiskModelService.SignedLoanApproval(
            terms,
            System.currentTimeMillis() / 1000 + 3600,
            requestedAmount,
            "0xsignature"
        );

        when(riskModelService.generateLoanApproval(eq(testAddress), eq(requestedAmount)))
            .thenReturn(approval);

        RiskController.LoanRequestDto request = new RiskController.LoanRequestDto();
        request.setBorrower(testAddress);
        request.setAmount(requestedAmount);

        mockMvc.perform(post("/api/risk/loan-approval")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.terms.interestRate").value(8))
            .andExpect(jsonPath("$.terms.requiredCollateralPercent").value(70));
    }
}
