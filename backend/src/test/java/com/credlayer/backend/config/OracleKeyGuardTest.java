package com.credlayer.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.BeanCreationException;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.env.MapPropertySource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class OracleKeyGuardTest {

    private static final String DEV_KEY = "0x" + OracleKeyGuard.WELL_KNOWN_DEV_KEY;
    private static final String REAL_KEY =
            "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
    private static final String REMOTE_RPC = "https://eth-sepolia.g.alchemy.com/v2/demo";

    @Test
    void rejectsWellKnownDevKeyOnRemoteRpc() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> OracleKeyGuard.verify(DEV_KEY, REMOTE_RPC));

        assertTrue(e.getMessage().contains("CREDLAYER_ORACLE_KEY"),
                "the error should name the variable that fixes it");
    }

    @Test
    void rejectsWellKnownDevKeyRegardlessOfPrefixOrCasing() {
        // Same key, no 0x prefix, upper-cased — still the publicly-known key.
        String unprefixedUpper = OracleKeyGuard.WELL_KNOWN_DEV_KEY.toUpperCase();

        assertThrows(IllegalStateException.class,
                () -> OracleKeyGuard.verify(unprefixedUpper, REMOTE_RPC));
        assertThrows(IllegalStateException.class,
                () -> OracleKeyGuard.verify("  " + DEV_KEY + "  ", REMOTE_RPC));
    }

    @Test
    void allowsWellKnownDevKeyAgainstLocalNode() {
        assertDoesNotThrow(() -> OracleKeyGuard.verify(DEV_KEY, "http://127.0.0.1:8545"));
        assertDoesNotThrow(() -> OracleKeyGuard.verify(DEV_KEY, "http://localhost:8545"));
        assertDoesNotThrow(() -> OracleKeyGuard.verify(DEV_KEY, "http://host.docker.internal:8545"));
    }

    @Test
    void allowsDedicatedKeyOnRemoteRpc() {
        assertDoesNotThrow(() -> OracleKeyGuard.verify(REAL_KEY, REMOTE_RPC));
    }

    @Test
    void treatsUnsetRpcAsLocalRatherThanFailingBoot() {
        // No RPC configured means no chain to compromise; the listener is inert.
        assertDoesNotThrow(() -> OracleKeyGuard.verify(DEV_KEY, ""));
        assertDoesNotThrow(() -> OracleKeyGuard.verify(DEV_KEY, null));
    }

    @Test
    void treatsUnparseableRpcAsRemote() {
        // Fail closed: if we cannot prove the endpoint is local, assume it is not.
        assertThrows(IllegalStateException.class,
                () -> OracleKeyGuard.verify(DEV_KEY, "not a url"));
    }

    @Test
    void warnsButStartsWhenNoKeyIsConfigured() {
        assertDoesNotThrow(() -> OracleKeyGuard.verify("", REMOTE_RPC));
        assertDoesNotThrow(() -> OracleKeyGuard.verify(null, REMOTE_RPC));
    }

    // ─── Spring wiring ────────────────────────────────────────────
    // The checks above exercise the logic directly. These prove the guard is actually
    // bound to application startup: @Value resolution plus @PostConstruct invocation.
    // Without them a broken annotation would fail open and never run in production.

    @Test
    void abortsContextStartupWhenMisconfigured() {
        BeanCreationException e = assertThrows(BeanCreationException.class,
                () -> startContext(DEV_KEY, REMOTE_RPC));

        assertInstanceOf(IllegalStateException.class, rootCause(e));
    }

    @Test
    void startsContextWhenProperlyConfigured() {
        assertDoesNotThrow(() -> startContext(REAL_KEY, REMOTE_RPC).close());
    }

    /** Boot a minimal context containing only the guard, with the given properties bound. */
    private static AnnotationConfigApplicationContext startContext(String key, String rpcUrl) {
        AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext();
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource(
                "test-properties",
                Map.of("credlayer.oracle.private-key", key, "web3j.client-address", rpcUrl)));
        context.register(PropertySourcesPlaceholderConfigurer.class, OracleKeyGuard.class);
        context.refresh();
        return context;
    }

    private static Throwable rootCause(Throwable t) {
        Throwable cause = t;
        while (cause.getCause() != null) {
            cause = cause.getCause();
        }
        return cause;
    }
}
