package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.TransactionStatus;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
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
