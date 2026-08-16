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

    // Canonical loan parameters (USDC has 6 decimals): 5,000 USDC, 30 days, 2,000 collateral.
    private final BigInteger amount = new BigInteger("5000000000"); // 5,000e6
    private final BigInteger duration = BigInteger.valueOf(30L * 24 * 60 * 60);
    private final BigInteger collateral = new BigInteger("2000000000"); // 2,000e6

    @BeforeEach
    void setUp() {
        signatureService = new SignatureService();
        ReflectionTestUtils.setField(signatureService, "privateKeyHex", testPrivateKey);
    }

    @Test
    void testSignLoanApproval_GeneratesValidSignature() {
        long deadline = System.currentTimeMillis() / 1000 + 3600;

        String signature = signatureService.signLoanApproval(testAddress, amount, duration, collateral, deadline);

        assertNotNull(signature);
        assertTrue(signature.startsWith("0x"));
        assertEquals(132, signature.length()); // 0x + 130 hex chars (65 bytes)
    }

    @Test
    void testSignLoanApproval_DifferentInputsProduceDifferentSignatures() {
        long deadline = System.currentTimeMillis() / 1000 + 3600;

        String sig1 = signatureService.signLoanApproval(testAddress, amount, duration, collateral, deadline);
        String sig2 = signatureService.signLoanApproval(testAddress, amount.add(BigInteger.ONE), duration, collateral,
                deadline);

        assertNotEquals(sig1, sig2);
    }

    @Test
    void testSignLoanApproval_SameInputsProduceSameSignature() {
        long deadline = 1234567890L;

        String sig1 = signatureService.signLoanApproval(testAddress, amount, duration, collateral, deadline);
        String sig2 = signatureService.signLoanApproval(testAddress, amount, duration, collateral, deadline);

        assertEquals(sig1, sig2);
    }

    /**
     * The recovered signer must be the oracle account, and the hash must be built
     * exactly as Solidity's {@code keccak256(abi.encodePacked(address, uint256 x4))}.
     */
    @Test
    void testSignLoanApproval_SignatureRecoversToOracle() throws Exception {
        long deadline = System.currentTimeMillis() / 1000 + 3600;

        String signature = signatureService.signLoanApproval(testAddress, amount, duration, collateral, deadline);

        byte[] hash = packedHash(testAddress, amount, duration, collateral, deadline);

        byte[] sigBytes = Numeric.hexStringToByteArray(signature);
        byte[] r = new byte[32];
        byte[] s = new byte[32];
        System.arraycopy(sigBytes, 0, r, 0, 32);
        System.arraycopy(sigBytes, 32, s, 0, 32);
        byte v = sigBytes[64];

        Sign.SignatureData signatureData = new Sign.SignatureData(v, r, s);
        BigInteger publicKey = Sign.signedPrefixedMessageToKey(hash, signatureData);
        String recoveredAddress = "0x" + org.web3j.crypto.Keys.getAddress(publicKey);

        Credentials credentials = Credentials.create(testPrivateKey);
        assertEquals(credentials.getAddress().toLowerCase(), recoveredAddress.toLowerCase());
    }

    @Test
    void testSignLoanApproval_RejectsMalformedAddress() {
        long deadline = 1234567890L;
        assertThrows(IllegalArgumentException.class,
                () -> signatureService.signLoanApproval("0x1234", amount, duration, collateral, deadline));
    }

    @Test
    void testSignLoanApproval_DifferentBorrowerAddresses() {
        String borrower1 = "0x1111111111111111111111111111111111111111";
        String borrower2 = "0x2222222222222222222222222222222222222222";
        long deadline = 1234567890L;

        String sig1 = signatureService.signLoanApproval(borrower1, amount, duration, collateral, deadline);
        String sig2 = signatureService.signLoanApproval(borrower2, amount, duration, collateral, deadline);

        assertNotEquals(sig1, sig2);
    }

    @Test
    void testSignLoanApproval_DifferentDeadlines() {
        String sig1 = signatureService.signLoanApproval(testAddress, amount, duration, collateral, 1000000000L);
        String sig2 = signatureService.signLoanApproval(testAddress, amount, duration, collateral, 2000000000L);

        assertNotEquals(sig1, sig2);
    }

    /** Reproduce Solidity abi.encodePacked(address, uint256, uint256, uint256, uint256) then keccak256. */
    private static byte[] packedHash(String borrower, BigInteger amount, BigInteger duration, BigInteger collateral,
            long deadline) {
        byte[] addressBytes = Numeric.hexStringToByteArray(Numeric.cleanHexPrefix(borrower));
        ByteBuffer buffer = ByteBuffer.allocate(20 + 32 + 32 + 32 + 32);
        buffer.put(addressBytes);
        buffer.put(Numeric.toBytesPadded(amount, 32));
        buffer.put(Numeric.toBytesPadded(duration, 32));
        buffer.put(Numeric.toBytesPadded(collateral, 32));
        buffer.put(Numeric.toBytesPadded(BigInteger.valueOf(deadline), 32));
        return Hash.sha3(buffer.array());
    }
}
