package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.core.service.CurrentOrgContext;
import dev.abstratium.core.util.TestTransactionHelper;
import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class TagServiceTest {

    @Inject
    TagService tagService;

    @Inject
    EntityManager entityManager;

    @Inject
    CurrentOrgContext currentOrgContext;

    @Inject
    TestTransactionHelper transactionHelper;

    @ConfigProperty(name = "default.org.uuid")
    String defaultOrgId;

    @BeforeEach
    void setUp() {
        currentOrgContext.setOrgId(defaultOrgId);
    }

    private String createJournal() {
        JournalEntity journal = new JournalEntity();
        journal.setId(UUID.randomUUID().toString());
        journal.setTitle("Test Journal");
        journal.setCurrency("CHF");
        entityManager.persist(journal);
        entityManager.flush();
        return journal.getId();
    }

    private TransactionEntity createTransactionWithTag(String journalId, String tagKey, String tagValue) {
        TransactionEntity tx = new TransactionEntity();
        tx.setId(UUID.randomUUID().toString());
        tx.setJournalId(journalId);
        tx.setTransactionDate(LocalDate.now());
        tx.setDescription("Test transaction");
        tx.setStatus(TransactionStatus.CLEARED);

        TagEntity tag = new TagEntity();
        tag.setTagKey(tagKey);
        tag.setTagValue(tagValue);
        tag.setTransaction(tx);
        tx.addTag(tag);

        entityManager.persist(tx);
        return tx;
    }

    @Test
    @Transactional
    void searchTagValues_returnsDistinctValuesSortedAndFilteredByPrefix() {
        String journalId = createJournal();

        createTransactionWithTag(journalId, "invoice", "SI00000002");
        createTransactionWithTag(journalId, "invoice", "SI00000003");
        createTransactionWithTag(journalId, "invoice", "CI00000001");
        createTransactionWithTag(journalId, "other", "SI00000004");

        List<String> allInvoices = tagService.searchTagValues(journalId, "invoice", null);
        assertEquals(List.of("SI00000003", "SI00000002", "CI00000001"), allInvoices);

        List<String> siInvoices = tagService.searchTagValues(journalId, "invoice", "SI");
        assertEquals(List.of("SI00000003", "SI00000002"), siInvoices);

        List<String> ciInvoices = tagService.searchTagValues(journalId, "invoice", "CI");
        assertEquals(List.of("CI00000001"), ciInvoices);
    }

    @Test
    @TestTransaction
    void directCrossOrganizationAccountInsertIsRejectedByForeignKey() {
        String journalId = createJournal();

        assertThrows(PersistenceException.class, () -> entityManager.createNativeQuery("""
                        INSERT INTO T_account (id, account_name, type, journal_id, org_id, account_order)
                        VALUES (:id, :name, :type, :journalId, :orgId, :accountOrder)
                        """)
                .setParameter("id", UUID.randomUUID().toString())
                .setParameter("name", "Cross organization account")
                .setParameter("type", "CASH")
                .setParameter("journalId", journalId)
                .setParameter("orgId", "second-org")
                .setParameter("accountOrder", 1)
                .executeUpdate());
    }

    @Test
    void jpqlQueriesAreIsolatedByOrganizationDiscriminator() throws Exception {
        JournalEntity defaultOrgJournal = new JournalEntity();
        defaultOrgJournal.setTitle("Default organization journal");
        defaultOrgJournal.setCurrency("CHF");
        JournalEntity secondOrgJournal = new JournalEntity();
        secondOrgJournal.setTitle("Second organization journal");
        secondOrgJournal.setCurrency("CHF");

        try {
            persistJournal(defaultOrgId, defaultOrgJournal);
            persistJournal("second-org", secondOrgJournal);

            List<String> journalIds = List.of(defaultOrgJournal.getId(), secondOrgJournal.getId());
            assertEquals(List.of(defaultOrgJournal.getId()), findJournalIds(defaultOrgId, journalIds));
            assertEquals(List.of(secondOrgJournal.getId()), findJournalIds("second-org", journalIds));
        } finally {
            deleteJournal(defaultOrgId, defaultOrgJournal.getId());
            deleteJournal("second-org", secondOrgJournal.getId());
            currentOrgContext.setOrgId(defaultOrgId);
        }
    }

    private void persistJournal(String orgId, JournalEntity journal) throws Exception {
        currentOrgContext.setOrgId(orgId);
        transactionHelper.beginTransaction();
        entityManager.persist(journal);
        transactionHelper.commitTransaction();
        entityManager.clear();
    }

    private List<String> findJournalIds(String orgId, List<String> journalIds) throws Exception {
        currentOrgContext.setOrgId(orgId);
        transactionHelper.beginTransaction();
        List<String> result = entityManager.createQuery(
                        "SELECT j.id FROM JournalEntity j WHERE j.id IN :journalIds", String.class)
                .setParameter("journalIds", journalIds)
                .getResultList();
        transactionHelper.commitTransaction();
        entityManager.clear();
        return result;
    }

    private void deleteJournal(String orgId, String journalId) throws Exception {
        currentOrgContext.setOrgId(orgId);
        transactionHelper.beginTransaction();
        entityManager.createQuery("DELETE FROM JournalEntity j WHERE j.id = :journalId")
                .setParameter("journalId", journalId)
                .executeUpdate();
        transactionHelper.commitTransaction();
        entityManager.clear();
    }

    @Test
    @Transactional
    void searchTagValues_regexDoesNotReturnValuesFromAnotherOrganization() {
        String journalId = createJournal();
        createTransactionWithTag(journalId, "invoice", "SI00000001");
        entityManager.flush();

        assertEquals(List.of("SI00000001"), tagService.searchTagValues(journalId, "invoice", "SI.*"));

        currentOrgContext.setOrgId("second-org");

        assertTrue(tagService.searchTagValues(journalId, "invoice", "SI.*").isEmpty());
    }

    @Test
    @Transactional
    void searchTagValues_emptyPrefix_returnsAll() {
        String journalId = createJournal();
        createTransactionWithTag(journalId, "invoice", "INV-001");
        createTransactionWithTag(journalId, "invoice", "INV-002");

        List<String> results = tagService.searchTagValues(journalId, "invoice", "");
        assertEquals(2, results.size());
    }

    @Test
    @Transactional
    void searchTagValues_regexWithCharClass_returnsMatches() {
        String journalId = createJournal();
        createTransactionWithTag(journalId, "invoice", "SI00000001");
        createTransactionWithTag(journalId, "invoice", "CI00000001");
        createTransactionWithTag(journalId, "invoice", "PI00000001");

        List<String> results = tagService.searchTagValues(journalId, "invoice", "[SC]I.*");
        assertEquals(2, results.size());
        assertTrue(results.contains("SI00000001"));
        assertTrue(results.contains("CI00000001"));
    }

    @Test
    @Transactional
    void searchTagValues_regexWithGroup_returnsMatches() {
        String journalId = createJournal();
        createTransactionWithTag(journalId, "invoice", "SI00000001");
        createTransactionWithTag(journalId, "invoice", "PI00000001");
        createTransactionWithTag(journalId, "invoice", "CI00000001");

        List<String> results = tagService.searchTagValues(journalId, "invoice", "(SI|PI).*");
        assertEquals(2, results.size());
    }

    @Test
    @Transactional
    void searchTagValues_regexWithPlus_returnsMatches() {
        String journalId = createJournal();
        createTransactionWithTag(journalId, "invoice", "SI00000001");
        createTransactionWithTag(journalId, "invoice", "SINV");

        List<String> results = tagService.searchTagValues(journalId, "invoice", "SI.+");
        assertEquals(2, results.size());
    }

    @Test
    @Transactional
    void searchTagValues_supportsRegexPatterns() {
        String journalId = createJournal();

        createTransactionWithTag(journalId, "invoice", "SI00000001");
        createTransactionWithTag(journalId, "invoice", "SI00000002");
        createTransactionWithTag(journalId, "invoice", "SI00000011");
        createTransactionWithTag(journalId, "invoice", "SI00000021");
        createTransactionWithTag(journalId, "invoice", "CI00000001");
        createTransactionWithTag(journalId, "invoice", "PI00000001");

        // Test regex pattern: invoices ending in 01
        List<String> endingIn01 = tagService.searchTagValues(journalId, "invoice", ".*01$");
        assertEquals(3, endingIn01.size());
        assertTrue(endingIn01.contains("SI00000001"));
        assertTrue(endingIn01.contains("CI00000001"));
        assertTrue(endingIn01.contains("PI00000001"));

        // Test regex pattern: invoices starting with SI
        List<String> startingWithSI = tagService.searchTagValues(journalId, "invoice", "^SI.*");
        assertEquals(4, startingWithSI.size());
        assertTrue(startingWithSI.contains("SI00000001"));
        assertTrue(startingWithSI.contains("SI00000002"));
        assertTrue(startingWithSI.contains("SI00000011"));
        assertTrue(startingWithSI.contains("SI00000021"));

        // Test regex pattern: invoices ending in 1 (not 01)
        List<String> endingIn1 = tagService.searchTagValues(journalId, "invoice", ".*[^0]1$");
        assertEquals(2, endingIn1.size());
        assertTrue(endingIn1.contains("SI00000011"));
        assertTrue(endingIn1.contains("SI00000021"));

        // Test regex pattern: SI invoices ending in 2
        List<String> siEndingIn2 = tagService.searchTagValues(journalId, "invoice", "^SI.*2$");
        assertEquals(1, siEndingIn2.size());
        assertTrue(siEndingIn2.contains("SI00000002"));
    }
}
