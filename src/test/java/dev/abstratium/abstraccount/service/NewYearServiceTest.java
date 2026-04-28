package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.boundary.NewYearAccountPreviewDTO;
import dev.abstratium.abstraccount.boundary.NewYearPreviewDTO;
import dev.abstratium.abstraccount.boundary.NewYearResultDTO;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class NewYearServiceTest {

    @Inject
    NewYearService newYearService;

    @Inject
    JournalPersistenceService journalPersistenceService;

    @Inject
    EntityManager em;

    private String sourceJournalId;
    private String assetAccountId;
    private String liabilityAccountId;
    private String equityAccountId;
    private String revenueAccountId;
    private String expenseAccountId;
    private String bankAccountId;
    private String loanAccountId;
    private String retainedEarningsId;

    @Transactional
    void setup() {
        // Create source journal with explicit ID
        sourceJournalId = UUID.randomUUID().toString();
        JournalEntity sourceJournal = new JournalEntity();
        sourceJournal.setId(sourceJournalId);
        sourceJournal.setTitle("Test Journal 2025");
        sourceJournal.setCurrency("CHF");
        em.persist(sourceJournal);

        // Create account hierarchy with explicit IDs
        assetAccountId = UUID.randomUUID().toString();
        AccountEntity assetAccount = new AccountEntity();
        assetAccount.setId(assetAccountId);
        assetAccount.setJournalId(sourceJournalId);
        assetAccount.setName("1 Assets");
        assetAccount.setType(AccountType.ASSET);
        assetAccount.setAccountOrder(0);
        em.persist(assetAccount);

        liabilityAccountId = UUID.randomUUID().toString();
        AccountEntity liabilityAccount = new AccountEntity();
        liabilityAccount.setId(liabilityAccountId);
        liabilityAccount.setJournalId(sourceJournalId);
        liabilityAccount.setName("2 Liabilities");
        liabilityAccount.setType(AccountType.LIABILITY);
        liabilityAccount.setAccountOrder(1);
        em.persist(liabilityAccount);

        equityAccountId = UUID.randomUUID().toString();
        AccountEntity equityAccount = new AccountEntity();
        equityAccount.setId(equityAccountId);
        equityAccount.setJournalId(sourceJournalId);
        equityAccount.setName("3 Equity");
        equityAccount.setType(AccountType.EQUITY);
        equityAccount.setAccountOrder(2);
        em.persist(equityAccount);

        revenueAccountId = UUID.randomUUID().toString();
        AccountEntity revenueAccount = new AccountEntity();
        revenueAccount.setId(revenueAccountId);
        revenueAccount.setJournalId(sourceJournalId);
        revenueAccount.setName("4 Revenue");
        revenueAccount.setType(AccountType.REVENUE);
        revenueAccount.setAccountOrder(3);
        em.persist(revenueAccount);

        expenseAccountId = UUID.randomUUID().toString();
        AccountEntity expenseAccount = new AccountEntity();
        expenseAccount.setId(expenseAccountId);
        expenseAccount.setJournalId(sourceJournalId);
        expenseAccount.setName("5 Expenses");
        expenseAccount.setType(AccountType.EXPENSE);
        expenseAccount.setAccountOrder(4);
        em.persist(expenseAccount);

        // Create child accounts with explicit IDs
        bankAccountId = UUID.randomUUID().toString();
        AccountEntity bankAccount = new AccountEntity();
        bankAccount.setId(bankAccountId);
        bankAccount.setJournalId(sourceJournalId);
        bankAccount.setName("1020 Bank");
        bankAccount.setType(AccountType.ASSET);
        bankAccount.setParentAccountId(assetAccountId);
        bankAccount.setAccountOrder(5);
        em.persist(bankAccount);

        loanAccountId = UUID.randomUUID().toString();
        AccountEntity loanAccount = new AccountEntity();
        loanAccount.setId(loanAccountId);
        loanAccount.setJournalId(sourceJournalId);
        loanAccount.setName("2000 Loans");
        loanAccount.setType(AccountType.LIABILITY);
        loanAccount.setParentAccountId(liabilityAccountId);
        loanAccount.setAccountOrder(6);
        em.persist(loanAccount);

        retainedEarningsId = UUID.randomUUID().toString();
        AccountEntity retainedEarnings = new AccountEntity();
        retainedEarnings.setId(retainedEarningsId);
        retainedEarnings.setJournalId(sourceJournalId);
        retainedEarnings.setName("2970 Retained");
        retainedEarnings.setType(AccountType.EQUITY);
        retainedEarnings.setParentAccountId(equityAccountId);
        retainedEarnings.setAccountOrder(7);
        em.persist(retainedEarnings);

        // Annual profit/loss account (2979) for profit/loss transfer testing
        AccountEntity annualProfitLoss = new AccountEntity();
        annualProfitLoss.setId(UUID.randomUUID().toString());
        annualProfitLoss.setJournalId(sourceJournalId);
        annualProfitLoss.setName("2979 Annual profit/loss");
        annualProfitLoss.setType(AccountType.EQUITY);
        annualProfitLoss.setParentAccountId(equityAccountId);
        annualProfitLoss.setAccountOrder(10);
        em.persist(annualProfitLoss);

        AccountEntity revenueServices = new AccountEntity();
        revenueServices.setId(UUID.randomUUID().toString());
        revenueServices.setJournalId(sourceJournalId);
        revenueServices.setName("3200 Services");
        revenueServices.setType(AccountType.REVENUE);
        revenueServices.setParentAccountId(revenueAccountId);
        revenueServices.setAccountOrder(8);
        em.persist(revenueServices);

        AccountEntity expenseAdmin = new AccountEntity();
        expenseAdmin.setId(UUID.randomUUID().toString());
        expenseAdmin.setJournalId(sourceJournalId);
        expenseAdmin.setName("6500 Admin");
        expenseAdmin.setType(AccountType.EXPENSE);
        expenseAdmin.setParentAccountId(expenseAccountId);
        expenseAdmin.setAccountOrder(9);
        em.persist(expenseAdmin);

        // Create transactions with balances as of end of year
        LocalDate yearEnd = LocalDate.of(2025, 12, 31);

        // Bank account: CHF 10,000 (debit/positive)
        createTransaction(yearEnd, "Initial balance", sourceJournalId,
            new EntryData(bankAccountId, "CHF", new BigDecimal("10000.00")),
            new EntryData(assetAccountId, "CHF", new BigDecimal("-10000.00")));

        // Loan account: CHF 5,000 (credit/negative in our system)
        createTransaction(yearEnd, "Loan taken", sourceJournalId,
            new EntryData(loanAccountId, "CHF", new BigDecimal("-5000.00")),
            new EntryData(liabilityAccountId, "CHF", new BigDecimal("5000.00")));

        // Retained earnings: CHF 3,000
        createTransaction(yearEnd, "Previous year profit", sourceJournalId,
            new EntryData(retainedEarningsId, "CHF", new BigDecimal("3000.00")),
            new EntryData(equityAccountId, "CHF", new BigDecimal("-3000.00")));

        // Revenue: CHF 50,000 (credit/negative)
        createTransaction(yearEnd, "Service revenue", sourceJournalId,
            new EntryData(revenueServices.getId(), "CHF", new BigDecimal("-50000.00")),
            new EntryData(revenueAccountId, "CHF", new BigDecimal("50000.00")));

        // Expense: CHF 20,000 (debit/positive)
        createTransaction(yearEnd, "Admin expenses", sourceJournalId,
            new EntryData(expenseAdmin.getId(), "CHF", new BigDecimal("20000.00")),
            new EntryData(expenseAccountId, "CHF", new BigDecimal("-20000.00")));

        // Annual profit/loss: CHF 30,000 (profit from 50000 revenue - 20000 expenses)
        // This simulates the closing entry that would have been made at year-end
        // transferring the net profit to account 2979
        AccountEntity annualPLAccount = em.createQuery(
            "SELECT a FROM AccountEntity a WHERE a.journalId = :journalId AND a.name LIKE '%2979%'",
            AccountEntity.class)
            .setParameter("journalId", sourceJournalId)
            .getSingleResult();

        createTransaction(yearEnd, "Annual profit 2025", sourceJournalId,
            new EntryData(annualPLAccount.getId(), "CHF", new BigDecimal("-30000.00")),
            new EntryData(equityAccountId, "CHF", new BigDecimal("30000.00")));

        em.flush();
    }

    private record EntryData(String accountId, String commodity, BigDecimal amount) {}

    private void createTransaction(LocalDate date, String description, String journalId, EntryData... entries) {
        TransactionEntity tx = new TransactionEntity();
        tx.setId(UUID.randomUUID().toString());
        tx.setJournalId(journalId);
        tx.setTransactionDate(date);
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription(description);
        em.persist(tx);

        int order = 0;
        for (EntryData entryData : entries) {
            EntryEntity entry = new EntryEntity();
            entry.setId(UUID.randomUUID().toString());
            entry.setTransaction(tx);
            entry.setAccountId(entryData.accountId());
            entry.setCommodity(entryData.commodity());
            entry.setAmount(entryData.amount());
            entry.setEntryOrder(order++);
            em.persist(entry);
            tx.addEntry(entry);
        }
    }

    @Test
    @Transactional
    void preview_shouldReturnAccountPreviews() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When
        NewYearPreviewDTO preview = newYearService.preview(
            sourceJournalId,
            "Test Journal 2026",
            openingDate,
            "3:2970"  // Retained earnings account (optional, for profit/loss transfer)
        );

        // Then
        assertNotNull(preview);
        assertEquals(sourceJournalId, preview.sourceJournalId());
        assertEquals("Test Journal 2025", preview.sourceJournalTitle());
        assertEquals("Test Journal 2026", preview.newJournalTitle());
        assertEquals("2026-01-01", preview.openingDate());

        // accountCount includes ALL accounts in the source journal (11 total including 2979)
        assertEquals(11, preview.accountCount());
        // accounts list only includes balance sheet accounts (ASSET, LIABILITY, EQUITY)
        // 1 Assets, 1020 Bank, 2 Liabilities, 2000 Loans, 3 Equity, 2970 Retained, 2979 Annual profit/loss = 7 accounts
        assertEquals(7, preview.accounts().size());

        // openingBalanceCount is balance sheet accounts (ASSET, LIABILITY, EQUITY) with non-zero balances
        // Bank (10000), 1 Assets (-10000), Loan (-5000), 2 Liabilities (5000),
        // Retained (3000), 3 Equity (-3000), 2979 Annual profit/loss (-30000) = 7 accounts
        assertEquals(7, preview.openingBalanceCount());

        // Verify retained earnings account was found
        assertEquals("3:2970", preview.retainedEarningsCodePath());
        assertNotNull(preview.retainedEarningsFullName());
    }

    @Test
    @Transactional
    void preview_shouldUseDefaultTitle_whenNewTitleNotProvided() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When
        NewYearPreviewDTO preview = newYearService.preview(
            sourceJournalId,
            null,
            openingDate,
            "3:2970"  // Retained earnings account (optional, for profit/loss transfer)
        );

        // Then
        assertEquals("Test Journal 2025", preview.newJournalTitle());
    }

    @Test
    @Transactional
    void preview_shouldAllowInvalidRetainedEarningsCodePath() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When - invalid code path (should not throw, just warn)
        NewYearPreviewDTO preview = newYearService.preview(
            sourceJournalId,
            "New Journal",
            openingDate,
            "99:9999"  // Invalid code path - should just warn
        );

        // Then
        assertNotNull(preview);
        // The code path should still be preserved even if account not found
        assertEquals("99:9999", preview.retainedEarningsCodePath());
        assertNull(preview.retainedEarningsFullName());
    }

    @Test
    @Transactional
    void preview_shouldThrowException_whenSourceJournalNotFound() {
        // Given - no setup needed for this error case
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            newYearService.preview(
                "non-existent-id",
                "New Journal",
                openingDate,
                null
            );
        });
    }

    @Test
    @Transactional
    void execute_shouldCreateNewJournalWithAccounts() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);
        String newTitle = "Test Journal 2026";

        // When
        NewYearResultDTO result = newYearService.execute(
            sourceJournalId,
            newTitle,
            openingDate,
            "3:2970"  // Retained earnings account (optional, for profit/loss transfer)
        );

        // Then
        assertNotNull(result);
        assertNotNull(result.newJournalId());
        assertEquals(newTitle, result.newJournalTitle());
        assertEquals(11, result.accountCount()); // All accounts copied (including revenue/expense and 2979)
        assertEquals(7, result.openingBalanceCount()); // Only balance sheet accounts with non-zero balances get opening transactions (now 7 with 2979)

        // Verify the new journal exists
        JournalEntity newJournal = em.find(JournalEntity.class, result.newJournalId());
        assertNotNull(newJournal);
        assertEquals(newTitle, newJournal.getTitle());
        // Verify currency was copied (from the source journal entity we created)
        assertEquals("CHF", newJournal.getCurrency());

        // Verify accounts were copied (all accounts including revenue/expense and 2979)
        List<AccountEntity> newAccounts = journalPersistenceService.loadAllAccounts(result.newJournalId());
        assertEquals(11, newAccounts.size());

        // Verify account hierarchy is preserved
        AccountEntity newAssetAccount = newAccounts.stream()
            .filter(a -> a.getName().equals("1 Assets"))
            .findFirst()
            .orElseThrow();
        assertNull(newAssetAccount.getParentAccountId()); // Root account

        AccountEntity newBankAccount = newAccounts.stream()
            .filter(a -> a.getName().equals("1020 Bank"))
            .findFirst()
            .orElseThrow();
        assertNotNull(newBankAccount.getParentAccountId()); // Has parent
        assertEquals(newAssetAccount.getId(), newBankAccount.getParentAccountId());
    }

    @Test
    @Transactional
    void execute_shouldThrowException_whenSourceJournalNotFound() {
        // Given - no setup needed for this error case
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When/Then
        assertThrows(IllegalArgumentException.class, () -> {
            newYearService.execute(
                "non-existent-id",
                "New Journal",
                openingDate,
                null
            );
        });
    }

    @Test
    @Transactional
    void execute_shouldPreserveAccountTypes() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When
        NewYearResultDTO result = newYearService.execute(
            sourceJournalId,
            "Test Journal 2026",
            openingDate,
            "3:2970"  // Retained earnings account (optional, for profit/loss transfer)
        );

        // Then
        List<AccountEntity> newAccounts = journalPersistenceService.loadAllAccounts(result.newJournalId());

        // Verify all account types are preserved
        assertTrue(newAccounts.stream().anyMatch(a -> a.getType() == AccountType.ASSET));
        assertTrue(newAccounts.stream().anyMatch(a -> a.getType() == AccountType.LIABILITY));
        assertTrue(newAccounts.stream().anyMatch(a -> a.getType() == AccountType.EQUITY));
        assertTrue(newAccounts.stream().anyMatch(a -> a.getType() == AccountType.REVENUE));
        assertTrue(newAccounts.stream().anyMatch(a -> a.getType() == AccountType.EXPENSE));
    }

    @Test
    @Transactional
    void execute_shouldCopyAccountNotes() {
        // Given
        setup();
        // Add a note to an account
        List<AccountEntity> accounts = journalPersistenceService.loadAllAccounts(sourceJournalId);
        AccountEntity accountWithNote = accounts.get(0);
        accountWithNote.setNote("This is a test note");
        em.merge(accountWithNote);
        em.flush();

        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When
        NewYearResultDTO result = newYearService.execute(
            sourceJournalId,
            "Test Journal 2026",
            openingDate,
            "3:2970"  // Retained earnings account (optional, for profit/loss transfer)
        );

        // Then
        List<AccountEntity> newAccounts = journalPersistenceService.loadAllAccounts(result.newJournalId());
        AccountEntity copiedAccount = newAccounts.stream()
            .filter(a -> a.getName().equals(accountWithNote.getName()))
            .findFirst()
            .orElseThrow();

        assertEquals("This is a test note", copiedAccount.getNote());
    }

    @Test
    @Transactional
    void preview_shouldCalculateCorrectOpeningBalances() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When
        NewYearPreviewDTO preview = newYearService.preview(
            sourceJournalId,
            "Test Journal 2026",
            openingDate,
            "3:2970"  // Retained earnings account (optional, for profit/loss transfer)
        );

        // Then
        // Find the bank account preview
        NewYearAccountPreviewDTO bankPreview = preview.accounts().stream()
            .filter(a -> a.accountFullName().contains("Bank"))
            .findFirst()
            .orElseThrow();

        assertEquals(0, bankPreview.openingBalance().compareTo(new BigDecimal("10000.00")));
        assertEquals("CHF", bankPreview.commodity());

        // Find the loan account preview
        NewYearAccountPreviewDTO loanPreview = preview.accounts().stream()
            .filter(a -> a.accountFullName().contains("Loans"))
            .findFirst()
            .orElseThrow();

        assertEquals(0, loanPreview.openingBalance().compareTo(new BigDecimal("-5000.00")));
    }

    @Test
    @Transactional
    void execute_shouldCreateOpeningBalanceTransactions() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When
        NewYearResultDTO result = newYearService.execute(
            sourceJournalId,
            "Test Journal 2026",
            openingDate,
            null // No retained earnings account needed for opening balances
        );

        // Then
        // Verify opening balance transactions exist (single-entry per account)
        List<TransactionEntity> transactions = em.createQuery(
            "SELECT t FROM TransactionEntity t " +
            "WHERE t.journalId = :journalId " +
            "AND t.transactionDate = :openingDate",
            TransactionEntity.class)
            .setParameter("journalId", result.newJournalId())
            .setParameter("openingDate", openingDate)
            .getResultList();

        assertFalse(transactions.isEmpty(), "Should have opening balance transactions");

        // Opening balance transactions are single-entry (don't need to balance individually)
        for (TransactionEntity tx : transactions) {
            boolean hasOpeningTag = tx.getTags().stream()
                .anyMatch(tag -> "OpeningBalances".equals(tag.getTagKey()));
            if (hasOpeningTag) {
                // Opening balance transactions have exactly 1 entry
                assertEquals(1, tx.getEntries().size(),
                    "Opening balance transaction should have exactly 1 entry");
            }
        }
    }

    @Test
    @Transactional
    void execute_shouldCreateProfitLossTransfer_whenRetainedEarningsProvided() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When - with retained earnings account provided
        NewYearResultDTO result = newYearService.execute(
            sourceJournalId,
            "Test Journal 2026",
            openingDate,
            "3:2970" // Retained earnings account for profit/loss transfer
        );

        // Then
        // Verify profit/loss transfer transaction exists and is balanced
        List<TransactionEntity> transactions = em.createQuery(
            "SELECT t FROM TransactionEntity t " +
            "WHERE t.journalId = :journalId " +
            "AND t.transactionDate = :openingDate",
            TransactionEntity.class)
            .setParameter("journalId", result.newJournalId())
            .setParameter("openingDate", openingDate)
            .getResultList();

        // Debug: print all transactions and their tags
        for (TransactionEntity t : transactions) {
            System.out.println("Transaction: " + t.getDescription() + " Tags: " + 
                t.getTags().stream().map(tag -> tag.getTagKey() + ":" + tag.getTagValue()).collect(java.util.stream.Collectors.joining(", ")));
        }

        // Find the Closing transaction (profit/loss transfer)
        TransactionEntity closingTx = transactions.stream()
            .filter(t -> t.getTags().stream().anyMatch(tag -> "Closing".equals(tag.getTagKey())))
            .findFirst()
            .orElse(null);

        assertNotNull(closingTx, "Should have a Closing transaction for profit/loss transfer");

        // Closing transaction must be balanced
        BigDecimal sum = closingTx.getEntries().stream()
            .map(EntryEntity::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, sum.compareTo(BigDecimal.ZERO),
            "Profit/loss transfer transaction must be balanced");

        // Should have exactly 2 entries (retained earnings and annual profit/loss)
        assertEquals(2, closingTx.getEntries().size(),
            "Profit/loss transfer should have exactly 2 entries");
    }

    @Test
    @Transactional
    void preview_shouldAllowMissingRetainedEarnings() {
        // Given
        setup();
        LocalDate openingDate = LocalDate.of(2026, 1, 1);

        // When - no retained earnings account provided (should not throw)
        NewYearPreviewDTO preview = newYearService.preview(
            sourceJournalId,
            "Test Journal 2026",
            openingDate,
            null // No retained earnings account
        );

        // Then
        assertNotNull(preview);
        assertNull(preview.retainedEarningsFullName());
    }
}
