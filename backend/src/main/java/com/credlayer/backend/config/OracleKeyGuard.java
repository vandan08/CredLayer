package com.credlayer.backend.config;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

/**
 * Fail-fast guard on the oracle key.
 *
 * <p>{@code application.yml} defaults {@code credlayer.oracle.private-key} to Hardhat's
 * published account #0 so the stack runs out of the box against a local node. That key is
 * public: anyone can sign loan approvals and push credit scores with it. On a real network
 * it is a total compromise of the trust model (see SECURITY.md §2.2).
 *
 * <p>A missing {@code CREDLAYER_ORACLE_KEY} in production would otherwise be silent — the
 * app boots happily and signs approvals with a key the whole internet holds. This guard
 * turns that misconfiguration into a startup failure instead, but only in the case that is
 * actually dangerous: the well-known key paired with a non-local RPC endpoint. Local
 * development against Hardhat is unaffected.
 */
@Component
@Slf4j
public class OracleKeyGuard {

    /** Hardhat's published account #0 private key, without the {@code 0x} prefix. */
    static final String WELL_KNOWN_DEV_KEY =
            "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    private static final Set<String> LOCAL_HOSTS = Set.of(
            "localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]", "host.docker.internal");

    @Value("${credlayer.oracle.private-key:}")
    private String privateKeyHex;

    @Value("${web3j.client-address:}")
    private String rpcUrl;

    @PostConstruct
    void verifyOnStartup() {
        verify(privateKeyHex, rpcUrl);
    }

    /**
     * Throws if the well-known development key is configured against a remote chain.
     *
     * @throws IllegalStateException when the default dev key would be used on a non-local RPC
     */
    static void verify(String privateKeyHex, String rpcUrl) {
        String key = privateKeyHex == null ? "" : privateKeyHex.trim().toLowerCase(Locale.ROOT);
        if (key.startsWith("0x")) {
            key = key.substring(2);
        }

        if (key.isEmpty()) {
            log.warn("No oracle key configured (credlayer.oracle.private-key is empty). "
                    + "Loan-approval signing and on-chain score updates will fail.");
            return;
        }

        if (!WELL_KNOWN_DEV_KEY.equals(key)) {
            return;
        }

        if (isLocalRpc(rpcUrl)) {
            log.warn("Using the well-known Hardhat development oracle key against a local node. "
                    + "This is fine for local development - never set this on a public network.");
            return;
        }

        throw new IllegalStateException(
                "Refusing to start: the oracle key is Hardhat's publicly-known account #0 key, "
                        + "but the RPC endpoint (" + rpcUrl + ") is not local. Anyone holding that key "
                        + "can sign loan approvals and rewrite credit scores. Set CREDLAYER_ORACLE_KEY "
                        + "to a dedicated deployment key - see DEPLOYMENT.md section 3.");
    }

    /** True when the RPC endpoint points at a local chain (or is unset, so unreachable). */
    private static boolean isLocalRpc(String rpcUrl) {
        if (rpcUrl == null || rpcUrl.isBlank()) {
            return true;
        }
        try {
            String host = URI.create(rpcUrl.trim()).getHost();
            // An unparseable host is treated as remote — fail closed rather than open.
            return host != null && LOCAL_HOSTS.contains(host.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }
}
