package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.model.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TransactionFiltersTest {

    private Transaction createTestTransaction(LocalDate date, TransactionStatus status, String accountId) {
        Account account1 = Account.root(accountId, "Test Account", AccountType.ASSET, null);
        Account account2 = Account.root("equity", "Equity", AccountType.EQUITY, null);
        Entry entry1 = Entry.simple(account1, Amount.of("CHF", "100.00"));
        Entry entry2 = Entry.simple(account2, Amount.of("CHF", "-100.00"));
        return new Transaction(date, status, "Test", null, "tx1", List.of(), List.of(entry1, entry2));
    }

    private Transaction createTransactionWithTag(LocalDate date, String tagKey, String tagValue) {
        Account account1 = Account.root("acc1", "Test Account", AccountType.ASSET, null);
        Account account2 = Account.root("equity", "Equity", AccountType.EQUITY, null);
        Entry entry1 = Entry.simple(account1, Amount.of("CHF", "100.00"));
        Entry entry2 = Entry.simple(account2, Amount.of("CHF", "-100.00"));
        Tag tag = new Tag(tagKey, tagValue);
        return new Transaction(date, TransactionStatus.CLEARED, "Test", null, "tx1", List.of(tag), List.of(entry1, entry2));
    }

    @Test
    void onOrBefore_filtersCorrectly() {
        LocalDate cutoffDate = LocalDate.of(2024, 6, 15);
        TransactionFilter filter = TransactionFilters.onOrBefore(cutoffDate);

        Transaction before = createTestTransaction(LocalDate.of(2024, 6, 10), TransactionStatus.CLEARED, "acc1");
        Transaction onDate = createTestTransaction(LocalDate.of(2024, 6, 15), TransactionStatus.CLEARED, "acc1");
        Transaction after = createTestTransaction(LocalDate.of(2024, 6, 20), TransactionStatus.CLEARED, "acc1");

        assertTrue(filter.matches(before));
        assertTrue(filter.matches(onDate));
        assertFalse(filter.matches(after));
    }

    @Test
    void onOrAfter_filtersCorrectly() {
        LocalDate cutoffDate = LocalDate.of(2024, 6, 15);
        TransactionFilter filter = TransactionFilters.onOrAfter(cutoffDate);

        Transaction before = createTestTransaction(LocalDate.of(2024, 6, 10), TransactionStatus.CLEARED, "acc1");
        Transaction onDate = createTestTransaction(LocalDate.of(2024, 6, 15), TransactionStatus.CLEARED, "acc1");
        Transaction after = createTestTransaction(LocalDate.of(2024, 6, 20), TransactionStatus.CLEARED, "acc1");

        assertFalse(filter.matches(before));
        assertTrue(filter.matches(onDate));
        assertTrue(filter.matches(after));
    }

    @Test
    void onDate_filtersCorrectly() {
        LocalDate targetDate = LocalDate.of(2024, 6, 15);
        TransactionFilter filter = TransactionFilters.onDate(targetDate);

        Transaction before = createTestTransaction(LocalDate.of(2024, 6, 10), TransactionStatus.CLEARED, "acc1");
        Transaction onDate = createTestTransaction(LocalDate.of(2024, 6, 15), TransactionStatus.CLEARED, "acc1");
        Transaction after = createTestTransaction(LocalDate.of(2024, 6, 20), TransactionStatus.CLEARED, "acc1");

        assertFalse(filter.matches(before));
        assertTrue(filter.matches(onDate));
        assertFalse(filter.matches(after));
    }

    @Test
    void between_filtersCorrectly() {
        LocalDate startDate = LocalDate.of(2024, 6, 10);
        LocalDate endDate = LocalDate.of(2024, 6, 20);
        TransactionFilter filter = TransactionFilters.between(startDate, endDate);

        Transaction before = createTestTransaction(LocalDate.of(2024, 6, 5), TransactionStatus.CLEARED, "acc1");
        Transaction atStart = createTestTransaction(LocalDate.of(2024, 6, 10), TransactionStatus.CLEARED, "acc1");
        Transaction inMiddle = createTestTransaction(LocalDate.of(2024, 6, 15), TransactionStatus.CLEARED, "acc1");
        Transaction atEnd = createTestTransaction(LocalDate.of(2024, 6, 20), TransactionStatus.CLEARED, "acc1");
        Transaction after = createTestTransaction(LocalDate.of(2024, 6, 25), TransactionStatus.CLEARED, "acc1");

        assertFalse(filter.matches(before));
        assertTrue(filter.matches(atStart));
        assertTrue(filter.matches(inMiddle));
        assertTrue(filter.matches(atEnd));
        assertFalse(filter.matches(after));
    }

    @Test
    void withStatus_filtersCorrectly() {
        TransactionFilter clearedFilter = TransactionFilters.withStatus(TransactionStatus.CLEARED);

        Transaction cleared = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc1");
        Transaction pending = createTestTransaction(LocalDate.now(), TransactionStatus.PENDING, "acc1");
        Transaction uncleared = createTestTransaction(LocalDate.now(), TransactionStatus.UNCLEARED, "acc1");

        assertTrue(clearedFilter.matches(cleared));
        assertFalse(clearedFilter.matches(pending));
        assertFalse(clearedFilter.matches(uncleared));
    }

    @Test
    void affectingAccount_filtersCorrectly() {
        Account targetAccount = Account.root("acc1", "Account 1", AccountType.ASSET, null);
        Account otherAccount = Account.root("acc2", "Account 2", AccountType.ASSET, null);
        
        TransactionFilter filter = TransactionFilters.affectingAccount(targetAccount);

        Transaction withTargetAccount = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc1");
        Transaction withOtherAccount = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc2");

        assertTrue(filter.matches(withTargetAccount));
        assertFalse(filter.matches(withOtherAccount));
    }

    @Test
    void affectingAccountById_filtersCorrectly() {
        TransactionFilter filter = TransactionFilters.affectingAccountById("acc1");

        Transaction withTargetAccount = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc1");
        Transaction withOtherAccount = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc2");

        assertTrue(filter.matches(withTargetAccount));
        assertFalse(filter.matches(withOtherAccount));
    }

    @Test
    void withTag_filtersCorrectly() {
        TransactionFilter filter = TransactionFilters.withTag("invoice");

        Transaction withInvoiceTag = createTransactionWithTag(LocalDate.now(), "invoice", "INV-001");
        Transaction withOtherTag = createTransactionWithTag(LocalDate.now(), "project", "PRJ-001");
        Transaction noTags = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc1");

        assertTrue(filter.matches(withInvoiceTag));
        assertFalse(filter.matches(withOtherTag));
        assertFalse(filter.matches(noTags));
    }

    @Test
    void withTagValue_filtersCorrectly() {
        TransactionFilter filter = TransactionFilters.withTagValue("invoice", "INV-001");

        Transaction withMatchingTag = createTransactionWithTag(LocalDate.now(), "invoice", "INV-001");
        Transaction withDifferentValue = createTransactionWithTag(LocalDate.now(), "invoice", "INV-002");
        Transaction withDifferentKey = createTransactionWithTag(LocalDate.now(), "project", "INV-001");

        assertTrue(filter.matches(withMatchingTag));
        assertFalse(filter.matches(withDifferentValue));
        assertFalse(filter.matches(withDifferentKey));
    }

    @Test
    void combineFilters_withAnd() {
        LocalDate targetDate = LocalDate.of(2024, 6, 15);
        TransactionFilter dateFilter = TransactionFilters.onDate(targetDate);
        TransactionFilter statusFilter = TransactionFilters.withStatus(TransactionStatus.CLEARED);
        TransactionFilter combined = dateFilter.and(statusFilter);

        Transaction matchesBoth = createTestTransaction(LocalDate.of(2024, 6, 15), TransactionStatus.CLEARED, "acc1");
        Transaction matchesDateOnly = createTestTransaction(LocalDate.of(2024, 6, 15), TransactionStatus.PENDING, "acc1");
        Transaction matchesStatusOnly = createTestTransaction(LocalDate.of(2024, 6, 20), TransactionStatus.CLEARED, "acc1");
        Transaction matchesNeither = createTestTransaction(LocalDate.of(2024, 6, 20), TransactionStatus.PENDING, "acc1");

        assertTrue(combined.matches(matchesBoth));
        assertFalse(combined.matches(matchesDateOnly));
        assertFalse(combined.matches(matchesStatusOnly));
        assertFalse(combined.matches(matchesNeither));
    }

    @Test
    void combineFilters_withOr() {
        TransactionFilter clearedFilter = TransactionFilters.withStatus(TransactionStatus.CLEARED);
        TransactionFilter pendingFilter = TransactionFilters.withStatus(TransactionStatus.PENDING);
        TransactionFilter combined = clearedFilter.or(pendingFilter);

        Transaction cleared = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc1");
        Transaction pending = createTestTransaction(LocalDate.now(), TransactionStatus.PENDING, "acc1");
        Transaction uncleared = createTestTransaction(LocalDate.now(), TransactionStatus.UNCLEARED, "acc1");

        assertTrue(combined.matches(cleared));
        assertTrue(combined.matches(pending));
        assertFalse(combined.matches(uncleared));
    }

    @Test
    void negateFilter() {
        TransactionFilter clearedFilter = TransactionFilters.withStatus(TransactionStatus.CLEARED);
        TransactionFilter notCleared = clearedFilter.negate();

        Transaction cleared = createTestTransaction(LocalDate.now(), TransactionStatus.CLEARED, "acc1");
        Transaction pending = createTestTransaction(LocalDate.now(), TransactionStatus.PENDING, "acc1");

        assertFalse(notCleared.matches(cleared));
        assertTrue(notCleared.matches(pending));
    }
}
