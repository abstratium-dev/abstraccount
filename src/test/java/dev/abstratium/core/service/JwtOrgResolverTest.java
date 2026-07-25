package dev.abstratium.core.service;

import io.quarkus.hibernate.orm.PersistenceUnitExtension;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Unit tests for JwtOrgResolver JWT payload parsing logic.
 * The resolver is also exercised end-to-end by the integration tests in
 * TokenResourceOrgIdTest, which verify that orgId-scoped entities resolve
 * to the correct organisation when a Bearer token is present.
 */
@QuarkusTest
public class JwtOrgResolverTest {

    @Inject
    @PersistenceUnitExtension
    JwtOrgResolver resolver;

    @Inject
    CurrentOrgContext currentOrgContext;

    @ConfigProperty(name = "default.org.uuid")
    String defaultOrgId;

    @BeforeEach
    void setUp() {
        currentOrgContext.setOrgId(null);
    }

    @Test
    public void resolveTenantId_withOrgIdInContext_returnsOrgId() {
        currentOrgContext.setOrgId("abc123-def456");
        assertEquals("abc123-def456", resolver.resolveTenantId());
    }

    @Test
    public void resolveTenantId_withNoOrgIdInContext_returnsDefaultOrgId() {
        assertEquals(defaultOrgId, resolver.resolveTenantId());
    }

    @Test
    public void resolveTenantId_withEmptyOrgIdInContext_returnsDefaultOrgId() {
        currentOrgContext.setOrgId("");
        assertEquals(defaultOrgId, resolver.resolveTenantId());
    }

    @Test
    public void resolveTenantId_withBlankOrgIdInContext_returnsDefaultOrgId() {
        currentOrgContext.setOrgId("  ");
        assertEquals(defaultOrgId, resolver.resolveTenantId());
    }

    @Test
    public void resolveTenantId_withAnotherOrgIdInContext_returnsOrgId() {
        currentOrgContext.setOrgId("second-org");
        assertEquals("second-org", resolver.resolveTenantId());
    }

    @Test
    public void resolveTenantId_withNullOrgIdInContext_returnsDefaultOrgId() {
        currentOrgContext.setOrgId(null);
        assertEquals(defaultOrgId, resolver.resolveTenantId());
    }

    @Test
    public void getDefaultTenantId_returnsConfiguredDefaultOrgId() {
        assertEquals(defaultOrgId, resolver.getDefaultTenantId());
    }

    @Test
    public void resolveTenantId_withUuidOrgIdInContext_returnsOrgId() {
        String orgId = "00000000-0000-0000-0000-000000000000";
        currentOrgContext.setOrgId(orgId);
        assertEquals(orgId, resolver.resolveTenantId());
    }

    @Test
    public void resolveTenantId_withNonUuidOrgIdInContext_returnsOrgId() {
        currentOrgContext.setOrgId("first-claim-org");
        assertEquals("first-claim-org", resolver.resolveTenantId());
    }

}
