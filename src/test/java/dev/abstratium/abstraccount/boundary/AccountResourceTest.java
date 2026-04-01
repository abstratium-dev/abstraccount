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
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testGetAccountTree_withDuplicateAccountNumbers() {
        // Test that accounts with same number but different UUIDs work correctly
        // Example: "1 Assets:2 Equity" and "2 Liabilities:20 Current liabilities"
        // Both have "2" but are different accounts
        
        // Create "2 Equity" under Assets in a separate transaction
        String equityId = createEquityAccount();
        
        // Verify tree structure - just check counts since order isn't guaranteed
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/account/" + testJournalId + "/tree")
        .then()
            .statusCode(200)
            .body("$", hasSize(2)) // Still 2 root accounts
            .body("name", hasItems("1 Assets", "2 Liabilities"))
            .body("[0].children", hasSize(3)) // Assets has 3 children (Current, Fixed, Equity)
            .body("[1].children", hasSize(1)); // Liabilities has 1 child (Current)
    }
    
    @Transactional
    String createEquityAccount() {
        String equityId = UUID.randomUUID().toString();
        AccountEntity equity = new AccountEntity();
        equity.setId(equityId);
        equity.setName("2 Equity"); // Name includes number
        equity.setType(AccountType.EQUITY);
        equity.setParentAccountId(assetsId);
        equity.setJournalId(testJournalId);
        em.persist(equity);
        return equityId;
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
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateAccount() {
        String requestBody = """
            {
                "name": "1000 Petty Cash",
                "type": "CASH",
                "note": "Small cash transactions",
                "parentAccountId": "%s",
                "journalId": "%s",
                "accountOrder": 1
            }
            """.formatted(currentAssetsId, testJournalId);
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/account")
        .then()
            .statusCode(201)
            .body("name", equalTo("1000 Petty Cash"))
            .body("type", equalTo("CASH"))
            .body("note", equalTo("Small cash transactions"))
            .body("parentId", equalTo(currentAssetsId))
            .body("id", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateAccount_withoutParent() {
        String requestBody = """
            {
                "name": "3 Equity",
                "type": "EQUITY",
                "note": null,
                "parentAccountId": null,
                "journalId": "%s",
                "accountOrder": 3
            }
            """.formatted(testJournalId);
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/account")
        .then()
            .statusCode(201)
            .body("name", equalTo("3 Equity"))
            .body("type", equalTo("EQUITY"))
            .body("parentId", nullValue())
            .body("id", notNullValue());
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateAccount_invalidJournal() {
        String requestBody = """
            {
                "name": "Test Account",
                "type": "ASSET",
                "note": null,
                "parentAccountId": null,
                "journalId": "invalid-journal-id",
                "accountOrder": 1
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/account")
        .then()
            .statusCode(400)
            .body(containsString("Journal not found"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testCreateAccount_invalidParent() {
        String requestBody = """
            {
                "name": "Test Account",
                "type": "ASSET",
                "note": null,
                "parentAccountId": "invalid-parent-id",
                "journalId": "%s",
                "accountOrder": 1
            }
            """.formatted(testJournalId);
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .post("/api/account")
        .then()
            .statusCode(400)
            .body(containsString("Parent account not found"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateAccount() {
        String requestBody = """
            {
                "name": "1 Assets Updated",
                "type": "ASSET",
                "note": "Updated note",
                "parentAccountId": null,
                "accountOrder": 1
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/account/" + assetsId)
        .then()
            .statusCode(200)
            .body("id", equalTo(assetsId))
            .body("name", equalTo("1 Assets Updated"))
            .body("note", equalTo("Updated note"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateAccount_changeParent() {
        // Move currentAssets under liabilities
        String requestBody = """
            {
                "name": "10 Current Assets",
                "type": "ASSET",
                "note": null,
                "parentAccountId": "%s",
                "accountOrder": 1
            }
            """.formatted(liabilitiesId);
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/account/" + currentAssetsId)
        .then()
            .statusCode(200)
            .body("id", equalTo(currentAssetsId))
            .body("parentId", equalTo(liabilitiesId));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateAccount_preventSelfAsParent() {
        String requestBody = """
            {
                "name": "1 Assets",
                "type": "ASSET",
                "note": null,
                "parentAccountId": "%s",
                "accountOrder": 1
            }
            """.formatted(assetsId);
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/account/" + assetsId)
        .then()
            .statusCode(400)
            .body(containsString("cannot be its own parent"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateAccount_preventCircularReference() {
        // Try to set assets (parent) as child of currentAssets (child)
        String requestBody = """
            {
                "name": "1 Assets",
                "type": "ASSET",
                "note": null,
                "parentAccountId": "%s",
                "accountOrder": 1
            }
            """.formatted(currentAssetsId);
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/account/" + assetsId)
        .then()
            .statusCode(400)
            .body(containsString("circular reference"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUpdateAccount_notFound() {
        String requestBody = """
            {
                "name": "Test",
                "type": "ASSET",
                "note": null,
                "parentAccountId": null,
                "accountOrder": 1
            }
            """;
        
        given()
            .contentType(ContentType.JSON)
            .body(requestBody)
        .when()
            .put("/api/account/invalid-id")
        .then()
            .statusCode(404)
            .body(containsString("Account not found"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteAccount_leafAccount() {
        // Create a leaf account to delete
        String leafAccountId = createLeafAccount();
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/account/" + testJournalId + "/account/" + leafAccountId)
        .then()
            .statusCode(204);
        
        // Verify it's deleted
        AccountEntity deleted = em.find(AccountEntity.class, leafAccountId);
        org.junit.jupiter.api.Assertions.assertNull(deleted);
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteAccount_withChildren() {
        // Try to delete an account with children (currentAssets has children)
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/account/" + testJournalId + "/account/" + currentAssetsId)
        .then()
            .statusCode(400)
            .body(containsString("Cannot delete account with children"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteAccount_notFound() {
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/account/" + testJournalId + "/account/invalid-id")
        .then()
            .statusCode(400)
            .body(containsString("Account not found"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteAccount_wrongJournal() {
        String otherJournalId = createOtherJournal();
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .delete("/api/account/" + otherJournalId + "/account/" + assetsId)
        .then()
            .statusCode(400)
            .body(containsString("does not belong to the specified journal"));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testIsLeafAccount_true() {
        String leafAccountId = createLeafAccount();
        
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/account/" + leafAccountId + "/is-leaf")
        .then()
            .statusCode(200)
            .body("isLeaf", equalTo(true));
    }
    
    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testIsLeafAccount_false() {
        // currentAssets has children
        given()
            .contentType(ContentType.JSON)
        .when()
            .get("/api/account/" + currentAssetsId + "/is-leaf")
        .then()
            .statusCode(200)
            .body("isLeaf", equalTo(false));
    }
    
    @Transactional
    String createLeafAccount() {
        String leafId = UUID.randomUUID().toString();
        AccountEntity leaf = new AccountEntity();
        leaf.setId(leafId);
        leaf.setName("999 Leaf Account");
        leaf.setType(AccountType.ASSET);
        leaf.setParentAccountId(currentAssetsId);
        leaf.setJournalId(testJournalId);
        em.persist(leaf);
        em.flush();
        return leafId;
    }
    
    @Transactional
    String createOtherJournal() {
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Other Journal");
        journal.setCurrency("EUR");
        em.persist(journal);
        em.flush();
        return journal.getId();
    }
}
