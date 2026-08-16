package com.credlayer.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.ByteBuffer;

@Service
@Slf4j
public class SignatureService {

    @Value("${credlayer.oracle.private-key}")
    private String privateKeyHex;

    /**
     * Produce a backend ("oracle") signature over the exact tuple the LendingPool
     * contract verifies:
     *
     * <pre>
     *   keccak256(abi.encodePacked(borrower, amount, duration, collateralAmount, deadline))
     * </pre>
     *
     * then signed as an EIP-191 personal_sign message (Ethereum prefix). All four
     * numeric fields are {@code uint256} and must match, byte-for-byte, the values
     * the borrower later passes to {@code LendingPool.borrow(...)}.
     *
     * @param borrower         borrower wallet address (0x-prefixed, 20 bytes)
     * @param amount           loan amount in token base units (USDC: 6 decimals)
     * @param duration         loan duration in seconds
     * @param collateralAmount collateral amount in token base units
     * @param deadline         signature expiry as a unix timestamp (seconds)
     */
    public String signLoanApproval(String borrower, BigInteger amount, BigInteger duration,
            BigInteger collateralAmount, long deadline) {
        Credentials credentials = Credentials.create(privateKeyHex);

        // abi.encodePacked packs an address as 20 bytes and each uint256 as 32 bytes.
        byte[] addressBytes = Numeric.hexStringToByteArray(Numeric.cleanHexPrefix(borrower));
        if (addressBytes.length != 20) {
            throw new IllegalArgumentException("Invalid borrower address: " + borrower);
        }

        ByteBuffer buffer = ByteBuffer.allocate(20 + 32 + 32 + 32 + 32);
        buffer.put(addressBytes); // address   (20 bytes)
        buffer.put(Numeric.toBytesPadded(amount, 32)); // amount           (uint256)
        buffer.put(Numeric.toBytesPadded(duration, 32)); // duration         (uint256)
        buffer.put(Numeric.toBytesPadded(collateralAmount, 32)); // collateralAmount (uint256)
        buffer.put(Numeric.toBytesPadded(BigInteger.valueOf(deadline), 32)); // deadline (uint256)

        byte[] hash = Hash.sha3(buffer.array());

        // Sign with the Ethereum "\x19Ethereum Signed Message:\n32" prefix so it matches
        // Solidity's MessageHashUtils.toEthSignedMessageHash / ecrecover flow.
        Sign.SignatureData signatureData = Sign.signPrefixedMessage(hash, credentials.getEcKeyPair());

        byte[] sigBytes = new byte[65];
        System.arraycopy(signatureData.getR(), 0, sigBytes, 0, 32);
        System.arraycopy(signatureData.getS(), 0, sigBytes, 32, 32);
        sigBytes[64] = signatureData.getV()[0];

        log.debug("Signed loan approval for {} with hash: {}", borrower, Numeric.toHexString(hash));
        return Numeric.toHexString(sigBytes);
    }
}
