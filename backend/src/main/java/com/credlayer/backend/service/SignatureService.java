package com.credlayer.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Sign;
import org.web3j.crypto.StructuredDataEncoder;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.ByteBuffer;

@Service
@Slf4j
public class SignatureService {

    @Value("${credlayer.oracle.private-key}")
    private String privateKeyHex;

    public String signLoanApproval(String borrower, BigInteger amount, int interestRate, int collateralPercent,
            long deadline) {
        Credentials credentials = Credentials.create(privateKeyHex);

        // Match Solidity: keccak256(abi.encodePacked(borrower, amount, duration, collateralAmount, deadline))
        // Note: Solidity expects duration (uint256), not interestRate
        byte[] addressBytes = Numeric.hexStringToByteArray(Numeric.cleanHexPrefix(borrower));

        // For abi.encodePacked, we need to match exact Solidity types
        // The contract expects: (address, uint256, uint256, uint256, uint256)
        ByteBuffer buffer = ByteBuffer.allocate(20 + 32 + 32 + 32 + 32);

        buffer.put(addressBytes); // address (20 bytes)
        buffer.put(padLeft(amount.toByteArray(), 32)); // amount (uint256)
        buffer.put(padLeft(BigInteger.valueOf(interestRate).toByteArray(), 32)); // duration (uint256)
        buffer.put(padLeft(BigInteger.valueOf(collateralPercent).toByteArray(), 32)); // collateralAmount (uint256)
        buffer.put(padLeft(BigInteger.valueOf(deadline).toByteArray(), 32)); // deadline (uint256)

        byte[] hash = Hash.sha3(buffer.array());

        // Sign with Ethereum prefix
        Sign.SignatureData signatureData = Sign.signPrefixedMessage(hash, credentials.getEcKeyPair());

        byte[] sigBytes = new byte[65];
        System.arraycopy(signatureData.getR(), 0, sigBytes, 0, 32);
        System.arraycopy(signatureData.getS(), 0, sigBytes, 32, 32);
        sigBytes[64] = signatureData.getV()[0];

        log.debug("Signed loan approval for {} with hash: {}", borrower, Numeric.toHexString(hash));
        return Numeric.toHexString(sigBytes);
    }

    private byte[] padLeft(byte[] input, int length) {
        byte[] padded = new byte[length];
        int startPos = length - input.length;
        System.arraycopy(input, 0, padded, startPos > 0 ? startPos : 0, Math.min(input.length, length));
        return padded;
    }
}
