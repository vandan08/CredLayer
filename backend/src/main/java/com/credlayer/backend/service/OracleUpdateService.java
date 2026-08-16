package com.credlayer.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthGetTransactionCount;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class OracleUpdateService {

    private final Web3j web3j;

    @Value("${credlayer.contracts.credit-registry}")
    private String creditRegistryAddress;

    @Value("${credlayer.oracle.private-key}")
    private String privateKeyHex;

    public void pushScoreToChain(String borrowerAddress, int newScore) {
        log.info("[ORACLE] Pushing new score {} for {} to CreditRegistry...", newScore, borrowerAddress);

        if (!isConfigured()) {
            log.warn("CreditRegistry address not configured. Skipping on-chain push.");
            return;
        }

        Function function = new Function(
                "updateCreditScore",
                Arrays.asList(new Address(borrowerAddress), new Uint256(newScore)),
                Collections.emptyList());

        try {
            String txHash = sendOracleTransaction(function);
            if (txHash != null) {
                log.info("Successfully pushed score. Tx Hash: {}", txHash);
            }
        } catch (Exception e) {
            log.error("Exception while pushing score to chain", e);
        }
    }

    /**
     * Register a borrower in the on-chain CreditRegistry so they become eligible to
     * borrow. Signed and submitted by the oracle account.
     *
     * @return {@code true} if a transaction was submitted, {@code false} if the
     *         registry is not configured.
     * @throws IllegalArgumentException if the address is blank
     */
    public boolean registerBorrower(String borrowerAddress) {
        if (borrowerAddress == null || borrowerAddress.isBlank()) {
            throw new IllegalArgumentException("Borrower address is required.");
        }
        if (!isConfigured()) {
            log.warn("CreditRegistry address not configured. Skipping borrower registration.");
            return false;
        }

        log.info("[ORACLE] Registering borrower {} in CreditRegistry...", borrowerAddress);
        Function function = new Function(
                "registerBorrower",
                Collections.singletonList(new Address(borrowerAddress)),
                Collections.emptyList());

        try {
            String txHash = sendOracleTransaction(function);
            log.info("Submitted borrower registration for {}. Tx Hash: {}", borrowerAddress, txHash);
            return true;
        } catch (Exception e) {
            // A revert here typically means the borrower is already registered; log and continue.
            log.warn("Borrower registration for {} did not succeed (may already be registered): {}",
                    borrowerAddress, e.getMessage());
            return false;
        }
    }

    private boolean isConfigured() {
        return creditRegistryAddress != null && !creditRegistryAddress.isBlank();
    }

    /**
     * Encode, sign (with the oracle key) and broadcast a state-changing call to the
     * CreditRegistry. Returns the transaction hash, or {@code null} if the node
     * reported an error.
     */
    private String sendOracleTransaction(Function function) throws Exception {
        Credentials credentials = Credentials.create(privateKeyHex);
        String encodedFunction = FunctionEncoder.encode(function);

        EthGetTransactionCount ethGetTransactionCount = web3j.ethGetTransactionCount(
                credentials.getAddress(), DefaultBlockParameterName.LATEST).sendAsync().get();
        BigInteger nonce = ethGetTransactionCount.getTransactionCount();

        // Simplified Gas parameters for local testing/Hardhat
        BigInteger gasPrice = BigInteger.valueOf(20000000000L);
        BigInteger gasLimit = BigInteger.valueOf(3000000L);

        RawTransaction rawTransaction = RawTransaction.createTransaction(
                nonce, gasPrice, gasLimit, creditRegistryAddress, encodedFunction);

        byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, credentials);
        String hexValue = Numeric.toHexString(signedMessage);

        EthSendTransaction ethSendTransaction = web3j.ethSendRawTransaction(hexValue).sendAsync().get();
        if (ethSendTransaction.hasError()) {
            log.error("Oracle transaction error: {}", ethSendTransaction.getError().getMessage());
            return null;
        }
        return ethSendTransaction.getTransactionHash();
    }
}
