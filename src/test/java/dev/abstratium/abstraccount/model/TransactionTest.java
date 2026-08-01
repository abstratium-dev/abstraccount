package dev.abstratium.abstraccount.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TransactionTest {

    private Entry entry(String accountId, String quantity) {
        Account account = Account.root(accountId, accountId + " Account", AccountType.ASSET, null);
        return Entry.simple(account, Amount.of("CHF", quantity));
    }

    private Transaction balancedTransaction(LocalDate date, TransactionStatus status, String description) {
        return new Transaction(date, status, description, null, "tx1",
            List.of(), List.of(entry("acc1", "100.00"), entry("acc2", "-100.00")));
    }

    @Test
    void simpleCreatesTransactionWithMinimalInfo() {
        Transaction tx = Transaction.simple(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Test", List.of(entry("acc1", "100.00"), entry("acc2", "-100.00")));
        assertEquals(LocalDate.of(2025, 1, 1), tx.date());
        assertEquals(TransactionStatus.CLEARED, tx.status());
        assertEquals("Test", tx.description());
        assertNull(tx.partnerId());
        assertNull(tx.id());
        assertTrue(tx.tags().isEmpty());
        assertEquals(2, tx.entries().size());
    }

    @Test
    void withIdCreatesTransactionWithId() {
        Transaction tx = Transaction.withId(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Test", "tx-id-123", List.of(entry("acc1", "100.00"), entry("acc2", "-100.00")));
        assertEquals("tx-id-123", tx.id());
        assertNull(tx.partnerId());
    }

    @Test
    void isBalancedReturnsTrueForBalancedTransaction() {
        Transaction tx = balancedTransaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "Balanced");
        assertTrue(tx.isBalanced());
    }

    @Test
    void isBalancedReturnsFalseForUnbalancedTransaction() {
        Transaction tx = new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Unbalanced", null, "tx1", List.of(),
            List.of(entry("acc1", "100.00"), entry("acc2", "-50.00")));
        assertFalse(tx.isBalanced());
    }

    @Test
    void isBalancedHandlesMultipleCommodities() {
        Account acc1 = Account.root("acc1", "Cash", AccountType.ASSET, null);
        Account acc2 = Account.root("acc2", "Bank", AccountType.ASSET, null);
        Account acc3 = Account.root("acc3", "Equity", AccountType.EQUITY, null);
        Account acc4 = Account.root("acc4", "Foreign", AccountType.ASSET, null);

        Transaction tx = new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Multi-commodity balanced", null, "tx1", List.of(), List.of(
                Entry.simple(acc1, Amount.of("CHF", "100.00")),
                Entry.simple(acc2, Amount.of("CHF", "-100.00")),
                Entry.simple(acc3, Amount.of("EUR", "50.00")),
                Entry.simple(acc4, Amount.of("EUR", "-50.00"))
            ));
        assertTrue(tx.isBalanced());
    }

    @Test
    void isBalancedReturnsFalseWhenOneCommodityUnbalanced() {
        Account acc1 = Account.root("acc1", "Cash", AccountType.ASSET, null);
        Account acc2 = Account.root("acc2", "Bank", AccountType.ASSET, null);
        Account acc3 = Account.root("acc3", "Foreign", AccountType.ASSET, null);

        Transaction tx = new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Multi-commodity unbalanced", null, "tx1", List.of(), List.of(
                Entry.simple(acc1, Amount.of("CHF", "100.00")),
                Entry.simple(acc2, Amount.of("CHF", "-100.00")),
                Entry.simple(acc3, Amount.of("EUR", "50.00"))
            ));
        assertFalse(tx.isBalanced());
    }

    @Test
    void getTagValueReturnsValueWhenTagExists() {
        Tag tag = Tag.keyValue("invoice", "INV-001");
        Transaction tx = new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Test", null, "tx1", List.of(tag),
            List.of(entry("acc1", "100.00"), entry("acc2", "-100.00")));
        assertEquals("INV-001", tx.getTagValue("invoice"));
    }

    @Test
    void getTagValueReturnsNullWhenTagDoesNotExist() {
        Transaction tx = balancedTransaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "Test");
        assertNull(tx.getTagValue("invoice"));
    }

    @Test
    void hasTagReturnsTrueWhenTagExists() {
        Tag tag = Tag.simple("OpeningBalances");
        Transaction tx = new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED,
            "Test", null, "tx1", List.of(tag),
            List.of(entry("acc1", "100.00"), entry("acc2", "-100.00")));
        assertTrue(tx.hasTag("OpeningBalances"));
    }

    @Test
    void hasTagReturnsFalseWhenTagDoesNotExist() {
        Transaction tx = balancedTransaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "Test");
        assertFalse(tx.hasTag("OpeningBalances"));
    }

    @Test
    void nullDateThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            balancedTransaction(null, TransactionStatus.CLEARED, "Test"));
    }

    @Test
    void nullStatusThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            balancedTransaction(LocalDate.of(2025, 1, 1), null, "Test"));
    }

    @Test
    void nullDescriptionThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            balancedTransaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, null));
    }

    @Test
    void blankDescriptionThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            balancedTransaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, ""));
        assertThrows(IllegalArgumentException.class, () ->
            balancedTransaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "   "));
    }

    @Test
    void entriesWithFewerThanTwoThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "Test",
                null, "tx1", List.of(), List.of(entry("acc1", "100.00"))));
    }

    @Test
    void nullEntriesThrows() {
        assertThrows(IllegalArgumentException.class, () ->
            new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "Test",
                null, "tx1", List.of(), null));
    }

    @Test
    void nullTagsDefaultsToEmptyList() {
        Transaction tx = new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "Test",
            null, "tx1", null, List.of(entry("acc1", "100.00"), entry("acc2", "-100.00")));
        assertNotNull(tx.tags());
        assertTrue(tx.tags().isEmpty());
    }

    @Test
    void tagsAndEntriesAreImmutable() {
        Tag tag = Tag.simple("OpeningBalances");
        Transaction tx = new Transaction(LocalDate.of(2025, 1, 1), TransactionStatus.CLEARED, "Test",
            null, "tx1", List.of(tag),
            List.of(entry("acc1", "100.00"), entry("acc2", "-100.00")));

        assertThrows(UnsupportedOperationException.class, () -> tx.tags().add(Tag.simple("Other")));
        assertThrows(UnsupportedOperationException.class, () -> tx.entries().add(entry("acc3", "50.00")));
    }
}
