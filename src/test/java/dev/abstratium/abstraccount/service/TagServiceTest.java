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
        tx.setTransactionId("TX-" + UUID.randomUUID());

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
}
