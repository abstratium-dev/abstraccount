package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.abstraccount.service.AttachmentPersistenceService;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

/**
 * Tests for attachment upload/list/download/replace/delete, cross-tenant
 * isolation, and journal-locking enforcement. See
 * docs/ephemeral-and-volatile-and-temporary-but-interesting/TRANSACTION_ATTACHMENTS.md.
 */
@QuarkusTest
class AttachmentResourceTest {

    private static final byte[] PDF_BYTES = "%PDF-1.4\n%test receipt content".getBytes();
    private static final byte[] NOT_PDF_BYTES = "this is not a pdf".getBytes();

    @Inject
    JournalPersistenceService persistenceService;

    @Inject
    AttachmentPersistenceService attachmentPersistenceService;

    @Inject
    TestTransactionHelper testTransactionHelper;

    private String journalId;
    private String transactionId;

    @BeforeEach
    @Transactional
    void setUp() {
        testTransactionHelper.deleteAllData();

        JournalEntity journal = new JournalEntity();
        journal.setTitle("Test Journal");
        journal.setCurrency("CHF");
        journal = persistenceService.saveJournal(journal);
        journalId = journal.getId();

        AccountEntity account1 = new AccountEntity();
        account1.setJournalId(journalId);
        account1.setName("1000 Cash");
        account1.setType(AccountType.ASSET);
        account1 = persistenceService.saveAccount(account1);

        AccountEntity account2 = new AccountEntity();
        account2.setJournalId(journalId);
        account2.setName("3000 Revenue");
        account2.setType(AccountType.REVENUE);
        account2 = persistenceService.saveAccount(account2);

        TransactionEntity transaction = new TransactionEntity();
        transaction.setJournalId(journalId);
        transaction.setTransactionDate(LocalDate.of(2024, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Receipt transaction");

        EntryEntity entry1 = new EntryEntity();
        entry1.setAccountId(account1.getId());
        entry1.setCommodity("CHF");
        entry1.setAmount(new BigDecimal("100.00"));
        entry1.setEntryOrder(0);
        transaction.addEntry(entry1);

        EntryEntity entry2 = new EntryEntity();
        entry2.setAccountId(account2.getId());
        entry2.setCommodity("CHF");
        entry2.setAmount(new BigDecimal("-100.00"));
        entry2.setEntryOrder(1);
        transaction.addEntry(entry2);

        transaction = persistenceService.saveTransaction(transaction);
        transactionId = transaction.getId();
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadAndListAttachment() {
        String attachmentId = uploadReceipt(transactionId, "receipt.pdf");

        given()
        .when()
            .get("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(200)
            .body("size()", equalTo(1))
            .body("[0].id", equalTo(attachmentId))
            .body("[0].fileName", equalTo("receipt.pdf"))
            .body("[0].contentType", equalTo("application/pdf"))
            .body("[0].sizeBytes", equalTo(PDF_BYTES.length));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDownloadAttachment() {
        String attachmentId = uploadReceipt(transactionId, "receipt.pdf");

        byte[] downloaded = given()
        .when()
            .get("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(200)
            .contentType("application/pdf")
            .extract().asByteArray();

        org.junit.jupiter.api.Assertions.assertArrayEquals(PDF_BYTES, downloaded);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testReplaceAttachment() {
        String attachmentId = uploadReceipt(transactionId, "receipt.pdf");

        byte[] newBytes = "%PDF-1.4\n%replaced content".getBytes();
        given()
            .multiPart("file", "replacement.pdf", newBytes, "application/pdf")
        .when()
            .put("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(200)
            .body("fileName", equalTo("replacement.pdf"))
            .body("sizeBytes", equalTo(newBytes.length));

        byte[] downloaded = given()
        .when()
            .get("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(200)
            .extract().asByteArray();
        org.junit.jupiter.api.Assertions.assertArrayEquals(newBytes, downloaded);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteAttachment() {
        String attachmentId = uploadReceipt(transactionId, "receipt.pdf");

        given()
        .when()
            .delete("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(200)
            .body("status", equalTo("success"));

        given()
        .when()
            .get("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(404);

        given()
        .when()
            .get("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(200)
            .body("size()", equalTo(0));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDeleteUnknownAttachment_returns404() {
        given()
        .when()
            .delete("/api/attachment/{attachmentId}", "non-existent-id")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadRejectsNonPdf() {
        given()
            .multiPart("file", "not-a-receipt.pdf", NOT_PDF_BYTES, "application/pdf")
        .when()
            .post("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(400)
            .body(containsString("valid PDF"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadRejectsWrongContentType() {
        given()
            .multiPart("file", "receipt.txt", PDF_BYTES, "text/plain")
        .when()
            .post("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(400)
            .body(containsString("Unsupported content type"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadToUnknownTransaction_returns404() {
        given()
            .multiPart("file", "receipt.pdf", PDF_BYTES, "application/pdf")
        .when()
            .post("/api/attachment/transaction/{transactionId}", "non-existent-transaction")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testListAttachments_unknownTransaction_returns404() {
        given()
        .when()
            .get("/api/attachment/transaction/{transactionId}", "non-existent-transaction")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDownloadTransactionZip_unknownTransaction_returns404() {
        given()
        .when()
            .get("/api/attachment/transaction/{transactionId}/zip", "non-existent-transaction")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testListAttachments_crossOrgTransaction_returns404() {
        // transactionId belongs to the default org (created in @BeforeEach
        // with no active HTTP request context); a second-org caller must
        // get 404, not a silently-empty 200.
        given()
        .when()
            .get("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadSanitizesPathTraversalFileName() {
        // A crafted file name must never propagate path segments into
        // stored metadata (which later feeds Content-Disposition headers
        // and bulk-export zip entry names - see TRANSACTION_ATTACHMENTS.md
        // §11 "Zip Slip" note).
        given()
            .multiPart("file", "../../etc/evil.pdf", PDF_BYTES, "application/pdf")
        .when()
            .post("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(200)
            .body("fileName", equalTo("evil.pdf"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadSanitizesQuoteInFileName_andDownloadIsSafe() {
        given()
            .multiPart("file", "receipt\".pdf", PDF_BYTES, "application/pdf")
        .when()
            .post("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(200)
            .body("fileName", not(containsString("\"")));

        String attachmentId = uploadReceipt(transactionId, "second.pdf");
        given()
        .when()
            .get("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(200)
            .header("Content-Disposition", not(containsString("\r")))
            .header("Content-Disposition", not(containsString("\n")));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDownloadJournalZip_invalidDate_returns400() {
        given()
            .queryParam("from", "not-a-date")
        .when()
            .get("/api/attachment/journal/{journalId}/zip", journalId)
        .then()
            .statusCode(400)
            .body(containsString("Invalid 'from' date"));
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testDownloadJournalZip_unknownJournal_returns404() {
        given()
        .when()
            .get("/api/attachment/journal/{journalId}/zip", "non-existent-journal")
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testUploadRejected_whenJournalLocked() {
        persistenceService.setJournalLocked(journalId, true);

        given()
            .multiPart("file", "receipt.pdf", PDF_BYTES, "application/pdf")
        .when()
            .post("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(423);
    }

    @Test
    @TestSecurity(user = "testuser", roles = {Roles.USER})
    void testReplaceAndDeleteRejected_whenJournalLocked() {
        String attachmentId = uploadReceipt(transactionId, "receipt.pdf");

        persistenceService.setJournalLocked(journalId, true);

        given()
            .multiPart("file", "receipt2.pdf", PDF_BYTES, "application/pdf")
        .when()
            .put("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(423);

        given()
        .when()
            .delete("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(423);

        // Reads still work while locked
        given()
        .when()
            .get("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(200);
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testDownloadAnotherOrganizationsAttachment_returnsNotFound() {
        // Created directly via the service (no HTTP request, so no
        // OrgIdResolutionFilter runs) - this is persisted under the default
        // org, same as the journal/transaction created in @BeforeEach. The
        // REST calls below, however, run under the "second-org" tenant
        // configured by @TestSecurity/@OidcSecurity above, and must not be
        // able to reach it.
        String attachmentId = uploadAsDefaultOrg();

        given()
        .when()
            .get("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(404);

        // The transaction itself belongs to the default org too, so listing
        // its attachments as second-org also 404s (not a silently-empty 200).
        given()
        .when()
            .get("/api/attachment/transaction/{transactionId}", transactionId)
        .then()
            .statusCode(404);
    }

    @Test
    @TestSecurity(user = "second-org-user", roles = {Roles.USER})
    @OidcSecurity(claims = @Claim(key = "orgId", value = "second-org"))
    void testDeleteAnotherOrganizationsAttachment_returnsNotFound() {
        String attachmentId = uploadAsDefaultOrg();

        given()
        .when()
            .delete("/api/attachment/{attachmentId}", attachmentId)
        .then()
            .statusCode(404);
    }

    @Transactional
    String uploadAsDefaultOrg() {
        return attachmentPersistenceService
            .create(transactionId, "receipt.pdf", "application/pdf", PDF_BYTES, "default-org-user")
            .getId();
    }

    private String uploadReceipt(String txId, String fileName) {
        return given()
            .multiPart("file", fileName, PDF_BYTES, "application/pdf")
        .when()
            .post("/api/attachment/transaction/{transactionId}", txId)
        .then()
            .statusCode(200)
            .body("fileName", equalTo(fileName))
            .extract().path("id");
    }
}
