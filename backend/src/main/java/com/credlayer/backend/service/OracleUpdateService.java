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

        if (creditRegistryAddress == null || creditRegistryAddress.isEmpty() || creditRegistryAddress.isBlank()) {
            log.warn("CreditRegistry address not configured. Skipping on-chain push.");
            return;
        }

        try {
            Credentials credentials = Credentials.create(privateKeyHex);

            Function function = new Function(
                    "updateCreditScore",
                    Arrays.asList(new Address(borrowerAddress), new Uint256(newScore)),
                    Collections.emptyList());

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
                log.error("Error pushing score to chain: {}", ethSendTransaction.getError().getMessage());
            } else {
                log.info("Successfully pushed score. Tx Hash: {}", ethSendTransaction.getTransactionHash());
            }

        } catch (Exception e) {
            log.error("Exception while pushing score to chain", e);
        }
    }
}
