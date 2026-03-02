package com.credlayer.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.ByteBuffer;

import static org.junit.jupiter.api.Assertions.*;

class SignatureServiceTest {

    private SignatureService signatureService;
    private final String testPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    private final String testAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    @BeforeEach
    void setUp() {
        signatureService = new SignatureService();
        ReflectionTestUtils.setField(signatureService, "privateKeyHex", testPrivateKey);
    }

    @Test
    void testSignLoanApproval_GeneratesValidSignature() {
        String borrower = testAddress;
        BigInteger amount = new BigInteger("1000000000000000000000");
        int interestRate = 5;
        int collateralPercent = 40;
        long deadline = System.currentTimeMillis() / 1000 + 3600;

        String signature = signatureService.signLoanApproval(
            borrower, amount, interestRate, collateralPercent, deadline
        );

        assertNotNull(signature);
        assertTrue(signature.startsWith("0x"));
        assertEquals(132, signature.length()); // 0x + 130 hex chars (65 bytes)
    }

    @Test
    void testSignLoanApproval_DifferentInputsProduceDifferentSignatures() {
        String borrower = testAddress;
        BigInteger amount1 = new BigInteger("1000000000000000000000");
        BigInteger amount2 = new BigInteger("2000000000000000000000");
        long deadline = System.currentTimeMillis() / 1000 + 3600;

        String sig1 = signatureService.signLoanApproval(borrower, amount1, 5, 40, deadline);
        String sig2 = signatureService.signLoanApproval(borrower, amount2, 5, 40, deadline);

        assertNotEquals(sig1, sig2);
    }

    @Test
    void testSignLoanApproval_SameInputsProduceSameSignature() {
        String borrower = testAddress;
        BigInteger amount = new BigInteger("1000000000000000000000");
        int interestRate = 5;
        int collateralPercent = 40;
        long deadline = 1234567890L;

        String sig1 = signatureService.signLoanApproval(borrower, amount, interestRate, collateralPercent, deadline);
        String sig2 = signatureService.signLoanApproval(borrower, amount, interestRate, collateralPercent, deadline);

        assertEquals(sig1, sig2);
    }

    @Test
    void testSignLoanApproval_SignatureCanBeRecovered() throws Exception {
        String borrower = testAddress;
        BigInteger amount = new BigInteger("1000000000000000000000");
        int interestRate = 5;
        int collateralPercent = 40;
        long deadline = System.currentTimeMillis() / 1000 + 3600;

        String signature = signatureService.signLoanApproval(
            borrower, amount, interestRate, collateralPercent, deadline
        );

        // Reconstruct the message hash
        byte[] addressBytes = Numeric.hexStringToByteArray(Numeric.cleanHexPrefix(borrower));
        ByteBuffer buffer = ByteBuffer.allocate(20 + 32 + 32 + 32 + 32);
        buffer.put(addressBytes);
        buffer.put(padLeft(amount.toByteArray(), 32));
        buffer.put(padLeft(BigInteger.valueOf(interestRate).toByteArray(), 32));
        buffer.put(padLeft(BigInteger.valueOf(collateralPercent).toByteArray(), 32));
        buffer.put(padLeft(BigInteger.valueOf(deadline).toByteArray(), 32));
        byte[] hash = Hash.sha3(buffer.array());

        // Parse signature
        byte[] sigBytes = Numeric.hexStringToByteArray(signature);
        byte[] r = new byte[32];
        byte[] s = new byte[32];
        System.arraycopy(sigBytes, 0, r, 0, 32);
        System.arraycopy(sigBytes, 32, s, 0, 32);
        byte v = sigBytes[64];

        Sign.SignatureData signatureData = new Sign.SignatureData(v, r, s);

        // Recover signer
        BigInteger publicKey = Sign.signedPrefixedMessageToKey(hash, signatureData);
        String recoveredAddress = "0x" + org.web3j.crypto.Keys.getAddress(publicKey);

        Credentials credentials = Credentials.create(testPrivateKey);
        assertEquals(credentials.getAddress().toLowerCase(), recoveredAddress.toLowerCase());
    }

    @Test
    void testSignLoanApproval_WithZeroValues() {
        String signature = signatureService.signLoanApproval(
            testAddress, BigInteger.ZERO, 0, 0, 0L
        );

        assertNotNull(signature);
        assertTrue(signature.startsWith("0x"));
        assertEquals(132, signature.length());
    }

    @Test
    void testSignLoanApproval_WithLargeValues() {
        BigInteger largeAmount = new BigInteger("999999999999999999999999");
        long farFutureDeadline = Long.MAX_VALUE / 1000;

        String signature = signatureService.signLoanApproval(
            testAddress, largeAmount, 100, 200, farFutureDeadline
        );

        assertNotNull(signature);
        assertTrue(signature.startsWith("0x"));
    }

    @Test
    void testSignLoanApproval_DifferentBorrowerAddresses() {
        String borrower1 = "0x1111111111111111111111111111111111111111";
        String borrower2 = "0x2222222222222222222222222222222222222222";
        BigInteger amount = new BigInteger("1000");
        long deadline = 1234567890L;

        String sig1 = signatureService.signLoanApproval(borrower1, amount, 5, 40, deadline);
        String sig2 = signatureService.signLoanApproval(borrower2, amount, 5, 40, deadline);

        assertNotEquals(sig1, sig2);
    }

    @Test
    void testSignLoanApproval_DifferentDeadlines() {
        String borrower = testAddress;
        BigInteger amount = new BigInteger("1000");
        long deadline1 = 1000000000L;
        long deadline2 = 2000000000L;

        String sig1 = signatureService.signLoanApproval(borrower, amount, 5, 40, deadline1);
        String sig2 = signatureService.signLoanApproval(borrower, amount, 5, 40, deadline2);

        assertNotEquals(sig1, sig2);
    }

    private byte[] padLeft(byte[] input, int length) {
        byte[] padded = new byte[length];
        int startPos = length - input.length;
        System.arraycopy(input, 0, padded, startPos > 0 ? startPos : 0, Math.min(input.length, length));
        return padded;
    }
}
