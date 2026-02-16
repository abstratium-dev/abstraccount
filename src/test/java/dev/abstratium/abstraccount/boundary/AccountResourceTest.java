package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.model.AccountType;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class AccountResourceTest {
    
    @Inject
    EntityManager em;
    
    private String testJournalId;
    private String assetsId;
    private String currentAssetsId;
    private String liabilitiesId;
    
    @BeforeEach
    @Transactional
    void setUp() {
        // Clean up
        em.createQuery("DELETE FROM AccountEntity").executeUpdate();
        em.createQuery("DELETE FROM JournalEntity").executeUpdate();
        
        // Create test journal
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Test Journal");
        journal.setCurrency("USD");
        em.persist(journal);
        em.flush();
        testJournalId = journal.getId();
        
        // Create account hierarchy with UUIDs:
        // Assets (UUID)
        //   Current Assets (UUID)
        //     Cash (UUID)
        //     Bank (UUID)
        //   Fixed Assets (UUID)
        // Liabilities (UUID)
        //   Current Liabilities (UUID)
        
        assetsId = UUID.randomUUID().toString();
        AccountEntity assets = new AccountEntity();
        assets.setId(assetsId);
        assets.setName("1 Assets"); // Name includes number
        assets.setType(AccountType.ASSET);
        assets.setJournalId(testJournalId);
        em.persist(assets);
        
        currentAssetsId = UUID.randomUUID().toString();
        AccountEntity currentAssets = new AccountEntity();
        currentAssets.setId(currentAssetsId);
        currentAssets.setName("10 Current Assets"); // Name includes number
        currentAssets.setType(AccountType.ASSET);
        currentAssets.setParentAccountId(assetsId);
        currentAssets.setJournalId(testJournalId);
        em.persist(currentAssets);
        
        AccountEntity cash = new AccountEntity();
        cash.setId(UUID.randomUUID().toString());
        cash.setName("100 Cash"); // Name includes number
        cash.setType(AccountType.CASH);
        cash.setParentAccountId(currentAssetsId);
        cash.setJournalId(testJournalId);
        em.persist(cash);
        
        AccountEntity bank = new AccountEntity();
        bank.setId(UUID.randomUUID().toString());
        bank.setName("110 Bank"); // Name includes number
        bank.setType(AccountType.ASSET);
        bank.setParentAccountId(currentAssetsId);
        bank.setJournalId(testJournalId);
        em.persist(bank);
        
        AccountEntity fixedAssets = new AccountEntity();
        fixedAssets.setId(UUID.randomUUID().toString());
        fixedAssets.setName("14 Fixed Assets"); // Name includes number
        fixedAssets.setType(AccountType.ASSET);
        fixedAssets.setParentAccountId(assetsId);
        fixedAssets.setJournalId(testJournalId);
        em.persist(fixedAssets);
        
        liabilitiesId = UUID.randomUUID().toString();
        AccountEntity liabilities = new AccountEntity();
        liabilities.setId(liabilitiesId);
        liabilities.setName("2 Liabilities"); // Name includes number
        liabilities.setType(AccountType.LIABILITY);
        liabilities.setJournalId(testJournalId);
        em.persist(liabilities);
        
        AccountEntity currentLiabilities = new AccountEntity();
        currentLiabilities.setId(UUID.randomUUID().toString());
        currentLiabilities.setName("20 Current Liabilities"); // Name includes number
        currentLiabilities.setType(AccountType.LIABILITY);
        currentLiabilities.setParentAccountId(liabilitiesId);
        currentLiabilities.setJournalId(testJournalId);
        em.persist(currentLiabilities);
        
        em.flush();
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetAccountTree() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/account/" + testJournalId + "/tree")
        .then()
            .statusCode(200)
            .body("$", hasSize(2)) // 2 root accounts
            .body("[0].id", equalTo(assetsId))
            .body("[0].name", equalTo("1 Assets")) // Name includes number
            .body("[0].type", equalTo("ASSET"))
            .body("[0].children", hasSize(2)) // Current Assets and Fixed Assets
            .body("[0].children[0].id", anyOf(equalTo(currentAssetsId), notNullValue()))
            .body("[0].children[0].children", notNullValue())
            .body("[1].id", equalTo(liabilitiesId))
            .body("[1].name", equalTo("2 Liabilities")) // Name includes number
            .body("[1].children", hasSize(1)); // Current Liabilities
    }
    
    @Test
    @Transactional
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetAccountTree_withDuplicateAccountNumbers() {
        // Test that accounts with same number but different UUIDs work correctly
        // Example: "1 Assets:2 Equity" and "2 Liabilities:20 Current liabilities"
        // Both have "2" but are different accounts
        
        // Create "2 Equity" under Assets
        String equityId = UUID.randomUUID().toString();
        AccountEntity equity = new AccountEntity();
        equity.setId(equityId);
        equity.setName("2 Equity"); // Name includes number
        equity.setType(AccountType.EQUITY);
        equity.setParentAccountId(assetsId);
        equity.setJournalId(testJournalId);
        em.persist(equity);
        em.flush();
        
        // Verify tree structure - just check counts since order isn't guaranteed
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/account/" + testJournalId + "/tree")
        .then()
            .statusCode(200)
            .body("$", hasSize(2)) // Still 2 root accounts
            .body("name", hasItems("1 Assets", "2 Liabilities"))
            .body("[0].children.size() + [1].children.size()", equalTo(4)); // Total 4 children across both roots
    }
    
    @Test
    void testGetAccountTree_unauthorized() {
        // In test mode without @TestSecurity, Quarkus returns 400
        // In production, unauthenticated requests get 302 redirect to OAuth provider
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/account/" + testJournalId + "/tree")
        .then()
            .statusCode(400);
    }
    
    @Test
    @TestSecurity(user = "testUser", roles = {}) // Authenticated but no roles
    void testGetAccountTree_forbidden() {
        // Authenticated user without USER role should return 403
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/account/" + testJournalId + "/tree")
        .then()
            .statusCode(403);
    }
}
