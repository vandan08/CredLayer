package com.credlayer.backend.service;

import com.credlayer.backend.contract.EventDefinitions;
import com.credlayer.backend.model.DefaultRecord;
import com.credlayer.backend.model.Loan;
import com.credlayer.backend.model.Repayment;
import com.credlayer.backend.repository.DefaultRecordRepository;
import com.credlayer.backend.repository.LoanRepository;
import com.credlayer.backend.repository.RepaymentRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.EthFilter;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BlockchainListenerService {

    private final Web3j web3j;
    private final LoanRepository loanRepository;
    private final RepaymentRepository repaymentRepository;
    private final DefaultRecordRepository defaultRecordRepository;
    private final CreditScoringService creditScoringService;

    @Value("${credlayer.contracts.lending-pool}")
    private String lendingPoolAddress;

    @PostConstruct
    public void init() {
        if (lendingPoolAddress == null || lendingPoolAddress.isEmpty() || lendingPoolAddress.isBlank()) {
            log.warn("LendingPool address not set. Delaying Web3j subscriptions.");
            return;
        }

        log.info("Subscribing to LendingPool events at: {}", lendingPoolAddress);

        EthFilter filter = new EthFilter(
                DefaultBlockParameterName.LATEST,
                DefaultBlockParameterName.LATEST,
                lendingPoolAddress);

        web3j.ethLogFlowable(filter).subscribe(logMessage -> {
            String topic = logMessage.getTopics().get(0);

            if (topic.equals(EventEncoder.encode(EventDefinitions.LOAN_CREATED_EVENT))) {
                handleLoanCreated(logMessage);
            } else if (topic.equals(EventEncoder.encode(EventDefinitions.LOAN_REPAID_EVENT))) {
                handleLoanRepaid(logMessage);
            } else if (topic.equals(EventEncoder.encode(EventDefinitions.LOAN_LIQUIDATED_EVENT))) {
                handleLoanLiquidated(logMessage);
            }
        }, error -> {
            log.error("Error in Web3j subscription", error);
        });
    }

    private void handleLoanCreated(org.web3j.protocol.core.methods.response.Log logMessage) {
        log.info("Processing LoanCreated event...");
        try {
            List<Type> indexed = extractIndexed(logMessage, EventDefinitions.LOAN_CREATED_EVENT.getIndexedParameters());
            List<Type> nonIndexed = extractNonIndexed(logMessage,
                    EventDefinitions.LOAN_CREATED_EVENT.getNonIndexedParameters());

            Long loanId = ((Uint256) indexed.get(0)).getValue().longValue();
            String borrower = ((Address) indexed.get(1)).getValue();

            String amount = ((Uint256) nonIndexed.get(0)).getValue().toString();
            int interestRate = ((Uint256) nonIndexed.get(1)).getValue().intValue();

            // dueDate is strictly BigInt / long
            long dueTimestamp = ((Uint256) nonIndexed.get(3)).getValue().longValue();

            Loan loan = new Loan(
                    loanId,
                    borrower,
                    amount,
                    interestRate,
                    0, // Active
                    LocalDateTime.now().plusSeconds(dueTimestamp) // Simplified for now
            );

            loanRepository.save(loan);
            log.info("Saved new loan: {}", loanId);

        } catch (Exception e) {
            log.error("Failed to parse LoanCreated event", e);
        }
    }

    private void handleLoanRepaid(org.web3j.protocol.core.methods.response.Log logMessage) {
        log.info("Processing LoanRepaid event...");
        try {
            List<Type> indexed = extractIndexed(logMessage, EventDefinitions.LOAN_REPAID_EVENT.getIndexedParameters());
            List<Type> nonIndexed = extractNonIndexed(logMessage,
                    EventDefinitions.LOAN_REPAID_EVENT.getNonIndexedParameters());

            Long loanId = ((Uint256) indexed.get(0)).getValue().longValue();
            String borrower = ((Address) indexed.get(1)).getValue();
            String amount = ((Uint256) nonIndexed.get(0)).getValue().toString();

            Repayment rep = new Repayment(
                    loanId,
                    amount,
                    LocalDateTime.now());
            repaymentRepository.save(rep);

            loanRepository.findById(loanId).ifPresent(loan -> {
                loan.setStatus(1); // Repaid
                loanRepository.save(loan);
            });

            // Trigger score bump!
            creditScoringService.applyRepaymentBonus(borrower, amount);

        } catch (Exception e) {
            log.error("Failed to parse LoanRepaid event", e);
        }
    }

    private void handleLoanLiquidated(org.web3j.protocol.core.methods.response.Log logMessage) {
        log.info("Processing LoanLiquidated event...");
        try {
            List<Type> indexed = extractIndexed(logMessage,
                    EventDefinitions.LOAN_LIQUIDATED_EVENT.getIndexedParameters());

            Long loanId = ((Uint256) indexed.get(0)).getValue().longValue();
            String borrower = ((Address) indexed.get(1)).getValue();

            DefaultRecord def = new DefaultRecord(
                    loanId,
                    borrower,
                    150,
                    LocalDateTime.now());
            defaultRecordRepository.save(def);

            loanRepository.findById(loanId).ifPresent(loan -> {
                loan.setStatus(3); // Liquidated
                loanRepository.save(loan);
            });

            // Trigger score penalty!
            creditScoringService.applyDefaultPenalty(borrower, loanId);

        } catch (Exception e) {
            log.error("Failed to parse LoanLiquidated event", e);
        }
    }

    @SuppressWarnings("rawtypes")
    private List<Type> extractIndexed(org.web3j.protocol.core.methods.response.Log logMessage,
            List<TypeReference<Type>> indexedParameters) {
        java.util.List<Type> results = new java.util.ArrayList<>();
        for (int i = 0; i < indexedParameters.size(); i++) {
            // Topic 0 is event signature
            String topic = logMessage.getTopics().get(i + 1);
            results.add(FunctionReturnDecoder.decodeIndexedValue(topic, indexedParameters.get(i)));
        }
        return results;
    }

    @SuppressWarnings("rawtypes")
    private List<Type> extractNonIndexed(org.web3j.protocol.core.methods.response.Log logMessage,
            List<TypeReference<Type>> nonIndexedParameters) {
        return FunctionReturnDecoder.decode(logMessage.getData(), nonIndexedParameters);
    }
}
