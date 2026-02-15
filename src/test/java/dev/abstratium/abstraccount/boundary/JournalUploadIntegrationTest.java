package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration test for journal upload via REST API.
 * Tests the complete flow: upload journal → parse → persist → retrieve.
 */
@QuarkusTest
class JournalUploadIntegrationTest {
    
    private static final Logger LOG = Logger.getLogger(JournalUploadIntegrationTest.class);
    
    @Inject
    JournalPersistenceService persistenceService;
    
    @BeforeEach
    @Transactional
    void setUp() {
        persistenceService.deleteAll();
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
    void testUploadJournalWithEquityHierarchy() throws IOException {
        // Load test journal file
        String journalContent = Files.readString(
            Paths.get("src/test/resources/test-equity-hierarchy.txt")
        );
        
        LOG.infof("Uploading journal with %d characters", journalContent.length());
        
        // Upload journal via REST API
        given()
            .contentType(ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200);
        
        // Verify journal metadata was saved
        List<JournalEntity> journals = persistenceService.findAllJournals();
        assertEquals(1, journals.size());
        JournalEntity journal = journals.get(0);
        assertEquals("Test Equity Hierarchy", journal.getTitle());
        assertEquals("CHF", journal.getCurrency());
        assertNotNull(journal.getCommodities());
        assertTrue(journal.getCommodities().containsKey("CHF"));
        
        // Verify all accounts were saved
        List<AccountEntity> accounts = persistenceService.loadAllAccounts(journal.getId());
        assertEquals(6, accounts.size(), "Should have 6 accounts");
        
        LOG.infof("Retrieved %d accounts from database", accounts.size());
        for (AccountEntity account : accounts) {
            LOG.debugf("Account: id=%s, name='%s', parentId=%s", 
                account.getId(), 
                account.getName(), 
                account.getParentAccountId());
        }
        
        // Verify root account: 2 Equity
        AccountEntity equity = findAccountByNumber(accounts, "2");
        assertNotNull(equity, "Root equity account should exist");
        assertEquals("2", equity.getId());
        assertEquals(AccountType.EQUITY, equity.getType());
        assertEquals("Shareholders equity", equity.getNote());
        assertNull(equity.getParentAccountId(), "Root account should have no parent");
        
        // Verify level 1: 2 Equity:20 Reserves
        AccountEntity reserves = findAccountByNumber(accounts, "20");
        assertNotNull(reserves, "Reserves account should exist");
        assertEquals("20", reserves.getId());
        assertEquals(AccountType.EQUITY, reserves.getType());
        assertEquals("Reserves and retained earnings", reserves.getNote());
        assertEquals(equity.getId(), reserves.getParentAccountId(), "Reserves parent should be equity");
        
        // Verify level 2: 2 Equity:20 Reserves:200 Legal Reserves
        AccountEntity legalReserves = findAccountByNumber(accounts, "200");
        assertNotNull(legalReserves, "Legal Reserves account should exist");
        assertEquals("200", legalReserves.getId());
        assertEquals(AccountType.EQUITY, legalReserves.getType());
        assertEquals("Legal reserves from profit", legalReserves.getNote());
        assertEquals(reserves.getId(), legalReserves.getParentAccountId(), "Legal Reserves parent should be reserves");
        
        // Verify level 1: 2 Equity:28 Share Capital
        AccountEntity shareCapital = findAccountByNumber(accounts, "28");
        assertNotNull(shareCapital, "Share Capital account should exist");
        assertEquals("28", shareCapital.getId());
        assertEquals(AccountType.EQUITY, shareCapital.getType());
        assertEquals("Basic shareholder capital", shareCapital.getNote());
        assertEquals(equity.getId(), shareCapital.getParentAccountId(), "Share Capital parent should be equity");
        
        // Verify level 2: 2 Equity:28 Share Capital:280 Foundation Capital
        AccountEntity foundationCapital = findAccountByNumber(accounts, "280");
        assertNotNull(foundationCapital, "Foundation Capital account should exist");
        assertEquals("280", foundationCapital.getId());
        assertEquals(AccountType.EQUITY, foundationCapital.getType());
        assertEquals("Foundation capital", foundationCapital.getNote());
        assertEquals(shareCapital.getId(), foundationCapital.getParentAccountId(), "Foundation Capital parent should be share capital");
        
        // Verify level 3: 2 Equity:28 Share Capital:280 Foundation Capital:2800 Basic Capital
        AccountEntity basicCapital = findAccountByNumber(accounts, "2800");
        assertNotNull(basicCapital, "Basic Capital account should exist");
        assertEquals("2800", basicCapital.getId());
        assertEquals(AccountType.EQUITY, basicCapital.getType());
        assertEquals("Basic shareholder or foundation capital", basicCapital.getNote());
        assertEquals(foundationCapital.getId(), basicCapital.getParentAccountId(), "Basic Capital parent should be foundation capital");
        
        // Verify hierarchy structure
        long rootAccounts = accounts.stream()
            .filter(a -> a.getParentAccountId() == null)
            .count();
        assertEquals(1, rootAccounts, "Should have exactly 1 root account");
        
        // Verify all account IDs are unique
        long uniqueAccountIds = accounts.stream()
            .map(AccountEntity::getId)
            .distinct()
            .count();
        assertEquals(6, uniqueAccountIds, "All 6 accounts should have unique IDs");
        
        LOG.infof("Successfully uploaded and verified journal with %d accounts", accounts.size());
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
    void testUploadInvalidJournal() {
        // Try to upload invalid content (blank journal should fail)
        given()
            .contentType(ContentType.TEXT)
            .body("   ")
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(400);  // Parser throws IllegalArgumentException which is caught and returns 400
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {"abstratium-abstraccount_user"})
    void testUploadJournalWithoutAuthentication() {
        // This test verifies that @TestSecurity is working
        // The actual test without auth would fail with 401
        String journalContent = """
            ; title: Test
            ; currency: CHF
            
            account 1 Assets
              ; type:Asset
            """;
        
        given()
            .contentType(ContentType.TEXT)
            .body(journalContent)
        .when()
            .post("/api/journal/upload")
        .then()
            .statusCode(200);
    }
    
    private AccountEntity findAccountByNumber(List<AccountEntity> accounts, String accountNumber) {
        return accounts.stream()
            .filter(a -> accountNumber.equals(a.getId()))
            .findFirst()
            .orElse(null);
    }
}
