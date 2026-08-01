package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class JournalTest {

    private Account account(String id) {
        return Account.root(id, id + " Account", AccountType.ASSET, null);
    }

    private Transaction transaction(String id) {
        return new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Transaction " + id, null, id, List.of(),
            List.of(
                Entry.simple(account("acc1"), Amount.of("CHF", "100.00")),
                Entry.simple(account("acc2"), Amount.of("CHF", "-100.00"))
            ));
    }

    private Transaction transactionWithTag(String id, String tagKey) {
        return new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Transaction " + id, null, id, List.of(Tag.simple(tagKey)),
            List.of(
                Entry.simple(account("acc1"), Amount.of("CHF", "100.00")),
                Entry.simple(account("acc2"), Amount.of("CHF", "-100.00"))
            ));
    }

    @Test
    void minimalCreatesJournalWithOnlyCurrency() {
        Journal journal = Journal.minimal("CHF");
        assertEquals("CHF", journal.currency());
        assertNull(journal.title());
        assertNull(journal.subtitle());
        assertNull(journal.logo());
        assertTrue(journal.commodities().isEmpty());
        assertTrue(journal.accounts().isEmpty());
        assertTrue(journal.transactions().isEmpty());
    }

    @Test
    void findCommodityReturnsPresentWhenFound() {
        Commodity chf = new Commodity("CHF", new BigDecimal("1000.00"));
        Commodity eur = new Commodity("EUR", new BigDecimal("1000.00"));
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(chf, eur), List.of(), List.of());

        Optional<Commodity> found = journal.findCommodity("CHF");
        assertTrue(found.isPresent());
        assertEquals("CHF", found.get().code());
    }

    @Test
    void findCommodityReturnsEmptyWhenNotFound() {
        Commodity chf = new Commodity("CHF", new BigDecimal("1000.00"));
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(chf), List.of(), List.of());

        assertTrue(journal.findCommodity("USD").isEmpty());
    }

    @Test
    void findAccountReturnsPresentWhenFound() {
        Account acc = account("acc1");
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(), List.of(acc), List.of());

        Optional<Account> found = journal.findAccount("acc1");
        assertTrue(found.isPresent());
        assertEquals("acc1", found.get().id());
    }

    @Test
    void findAccountReturnsEmptyWhenNotFound() {
        Account acc = account("acc1");
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(), List.of(acc), List.of());

        assertTrue(journal.findAccount("nonexistent").isEmpty());
    }

    @Test
    void findTransactionReturnsPresentWhenFound() {
        Transaction tx = transaction("tx1");
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(), List.of(), List.of(tx));

        Optional<Transaction> found = journal.findTransaction("tx1");
        assertTrue(found.isPresent());
        assertEquals("tx1", found.get().id());
    }

    @Test
    void findTransactionReturnsEmptyWhenNotFound() {
        Transaction tx = transaction("tx1");
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(), List.of(), List.of(tx));

        assertTrue(journal.findTransaction("nonexistent").isEmpty());
    }

    @Test
    void findTransactionsByTagReturnsMatchingTransactions() {
        Transaction tx1 = transactionWithTag("tx1", "OpeningBalances");
        Transaction tx2 = transactionWithTag("tx2", "Closing");
        Transaction tx3 = transactionWithTag("tx3", "OpeningBalances");
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(), List.of(), List.of(tx1, tx2, tx3));

        List<Transaction> openingBalances = journal.findTransactionsByTag("OpeningBalances");
        assertEquals(2, openingBalances.size());
        assertEquals("tx1", openingBalances.get(0).id());
        assertEquals("tx3", openingBalances.get(1).id());
    }

    @Test
    void findTransactionsByTagReturnsEmptyWhenNoMatch() {
        Transaction tx = transaction("tx1");
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(), List.of(), List.of(tx));

        assertTrue(journal.findTransactionsByTag("OpeningBalances").isEmpty());
    }

    @Test
    void nullCollectionsDefaultToEmpty() {
        Journal journal = new Journal(null, "Title", null, "CHF", null, null, null);
        assertNotNull(journal.commodities());
        assertNotNull(journal.accounts());
        assertNotNull(journal.transactions());
        assertTrue(journal.commodities().isEmpty());
        assertTrue(journal.accounts().isEmpty());
        assertTrue(journal.transactions().isEmpty());
    }

    @Test
    void collectionsAreImmutable() {
        Account acc = account("acc1");
        Journal journal = new Journal(null, "Title", null, "CHF",
            List.of(), List.of(acc), List.of());

        assertThrows(UnsupportedOperationException.class, () -> journal.accounts().add(account("acc2")));
    }
}
