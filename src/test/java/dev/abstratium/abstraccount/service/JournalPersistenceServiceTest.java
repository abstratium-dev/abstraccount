package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.*;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JournalPersistenceServiceTest {
    
    @Inject
    JournalPersistenceService service;
    
    private String testJournalId;
    
    @BeforeEach
    void setUp() {
        service.deleteAll();
        // Create a test journal for tests that need it
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Test Journal");
        journal.setCurrency("USD");
        testJournalId = service.saveJournal(journal).getId();
    }
    
    @Test
    void testSaveAndLoadJournal() {
        // Delete the setUp journal first
        service.deleteAll();
        
        // Create journal with metadata and commodities
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Test Journal 2");
        journal.setSubtitle("Test Subtitle");
        journal.setLogo("logo.png");
        journal.setCurrency("USD");
        
        Map<String, String> commodities = new HashMap<>();
        commodities.put("USD", "0.00");
        commodities.put("EUR", "0.00");
        journal.setCommodities(commodities);
        
        // Save journal
        JournalEntity saved = service.saveJournal(journal);
        assertNotNull(saved.getId());
        
        // Load journal
        Optional<JournalEntity> loaded = service.findJournalById(saved.getId());
        assertTrue(loaded.isPresent());
        assertEquals("Test Journal 2", loaded.get().getTitle());
        assertEquals("Test Subtitle", loaded.get().getSubtitle());
        assertEquals("logo.png", loaded.get().getLogo());
        assertEquals("USD", loaded.get().getCurrency());
        assertEquals(2, loaded.get().getCommodities().size());
        assertEquals("0.00", loaded.get().getCommodities().get("USD"));
    }
    
    @Test
    void testLoadJournalWhenNoneExists() {
        // Delete the setUp journal first
        service.deleteAll();
        
        List<JournalEntity> journals = service.findAllJournals();
        assertTrue(journals.isEmpty());
    }
    
    @Test
    void testSaveAndLoadAccounts() {
        // Create accounts
        AccountEntity account1 = new AccountEntity();
        account1.setId("1000");
        account1.setName("Cash");
        account1.setType(AccountType.ASSET);
        account1.setNote("Cash account");
        account1.setJournalId(testJournalId);
        
        AccountEntity account2 = new AccountEntity();
        account2.setId("2000");
        account2.setName("CreditCard");
        account2.setType(AccountType.LIABILITY);
        account2.setJournalId(testJournalId);
        
        // Save accounts
        service.saveAccount(account1);
        service.saveAccount(account2);
        
        // Load all accounts
        List<AccountEntity> accounts = service.loadAllAccounts(testJournalId);
        assertEquals(2, accounts.size());
        // Check that both accounts were saved (order may vary)
        assertTrue(accounts.stream().anyMatch(a -> a.getId().equals("1000")));
        assertTrue(accounts.stream().anyMatch(a -> a.getId().equals("2000")));
    }
    
    @Test
    void testLoadAccountByNumber() {
        // Create and save account
        AccountEntity account = new AccountEntity();
        account.setName("Cash");
        
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        service.saveAccount(account);
        
        // Load all and find by id
        List<AccountEntity> accounts = service.loadAllAccounts(testJournalId);
        AccountEntity loaded = accounts.stream()
            .filter(a -> a.getId().equals(account.getId()))
            .findFirst()
            .orElseThrow();
        assertEquals(account.getId(), loaded.getId());
        
        // Verify account was saved
        assertNotNull(loaded.getId());
    }
    
    @Test
    void testSaveAndLoadTransactionWithEntriesAndTags() {
        // Create accounts first
        AccountEntity account1 = new AccountEntity();
        account1.setName("Cash");
        account1.setType(AccountType.ASSET);
        account1.setJournalId(testJournalId);
        AccountEntity savedAccount1 = service.saveAccount(account1);
        
        AccountEntity account2 = new AccountEntity();
        account2.setName("Liabilities");
        account2.setType(AccountType.LIABILITY);
        account2.setJournalId(testJournalId);
        AccountEntity savedAccount2 = service.saveAccount(account2);
        
        // Create transaction
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Test Transaction");
        transaction.setTransactionId("TX001");
        transaction.setJournalId(testJournalId);
        
        // Add entries
        EntryEntity entry1 = new EntryEntity();
        entry1.setAccountId(savedAccount1.getId());
        entry1.setCommodity("USD");
        entry1.setAmount(new BigDecimal("100.00"));
        entry1.setEntryOrder(0);
        transaction.addEntry(entry1);
        
        EntryEntity entry2 = new EntryEntity();
        entry2.setAccountId(savedAccount2.getId());
        entry2.setCommodity("USD");
        entry2.setAmount(new BigDecimal("-100.00"));
        entry2.setEntryOrder(1);
        transaction.addEntry(entry2);
        
        // Add tags
        TagEntity tag1 = new TagEntity();
        tag1.setTagKey("category");
        tag1.setTagValue("groceries");
        transaction.addTag(tag1);
        
        TagEntity tag2 = new TagEntity();
        tag2.setTagKey("location");
        tag2.setTagValue("store");
        transaction.addTag(tag2);
        
        // Save transaction
        TransactionEntity saved = service.saveTransaction(transaction);
        assertNotNull(saved.getId());
        
        // Load entries and get transaction
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertFalse(entries.isEmpty());
        TransactionEntity loaded = entries.get(0).getTransaction();
        assertEquals("Test Transaction", loaded.getDescription());
        assertEquals("TX001", loaded.getTransactionId());
        assertEquals(TransactionStatus.CLEARED, loaded.getStatus());
        
        // Verify entries are eagerly loaded
        assertEquals(2, loaded.getEntries().size());
        assertNotNull(loaded.getEntries().get(0).getAccountId());
        assertEquals(0, new BigDecimal("100.00").compareTo(loaded.getEntries().get(0).getAmount()));
        
        // Verify tags are eagerly loaded
        assertEquals(2, loaded.getTags().size());
        assertTrue(loaded.getTags().stream().anyMatch(t -> t.getTagKey().equals("category")));
        assertTrue(loaded.getTags().stream().anyMatch(t -> t.getTagKey().equals("location")));
    }
    
    @Test
    void testLoadEntriesBetweenDates() {
        // Create transactions on different dates
        createTransactionWithentry(LocalDate.of(2025, 1, 10), "1000", "100.00");
        createTransactionWithentry(LocalDate.of(2025, 1, 15), "2000", "200.00");
        createTransactionWithentry(LocalDate.of(2025, 1, 20), "3000", "300.00");
        createTransactionWithentry(LocalDate.of(2025, 2, 5), "4000", "400.00");
        
        // Load entries for January (from inclusive, to exclusive)
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(3, entries.size());
        // Just verify entries exist with valid account IDs
        for (EntryEntity entry : entries) {
            assertNotNull(entry.getAccountId());
        }
    }
    
    @Test
    void testLoadEntriesBetweenDatesExclusiveEndDate() {
        // Create transaction exactly on the end date
        createTransactionWithentry(LocalDate.of(2025, 2, 1), "1000", "100.00");
        
        // Load entries - should not include the transaction on the end date
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(0, entries.size());
    }
    
    @Test
    void testLoadEntriesBetweenDatesInclusiveStartDate() {
        // Create transaction exactly on the start date
        createTransactionWithentry(LocalDate.of(2025, 1, 1), "1000", "100.00");
        
        // Load entries - should include the transaction on the start date
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(1, entries.size());
        assertNotNull(entries.get(0).getAccountId());
    }
    
    @Test
    void testLoadEntriesBetweenDatesWithNullDates() {
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadEntriesBetweenDates(testJournalId, null, LocalDate.of(2025, 2, 1))
        );
        
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadEntriesBetweenDates(testJournalId, LocalDate.of(2025, 1, 1), null)
        );
    }
    
    @Test
    void testLoadEntriesBetweenDatesWithInvalidRange() {
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadEntriesBetweenDates(
                testJournalId,
                LocalDate.of(2025, 2, 1),
                LocalDate.of(2025, 1, 1)
            )
        );
    }
    
    @Test
    void testLoadTransactionsBetweenDates() {
        // Create transactions on different dates
        createTransactionWithentry(LocalDate.of(2025, 1, 10), "1000", "100.00");
        createTransactionWithentry(LocalDate.of(2025, 1, 15), "2000", "200.00");
        createTransactionWithentry(LocalDate.of(2025, 2, 5), "3000", "300.00");
        
        // Load entries for January and deduplicate to get transactions
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        // Deduplicate to get unique transactions
        List<TransactionEntity> transactions = entries.stream()
            .map(EntryEntity::getTransaction)
            .distinct()
            .toList();
        
        assertEquals(2, transactions.size());
        assertEquals(LocalDate.of(2025, 1, 10), transactions.get(0).getTransactionDate());
        assertEquals(LocalDate.of(2025, 1, 15), transactions.get(1).getTransactionDate());
    }
    
    @Test
    void testLoadTransactionsBetweenDatesWithNullDates() {
        // These tests are covered by loadEntriesBetweenDates tests
        // No need to duplicate them
    }
    
    @Test
    void testLoadTransactionsBetweenDatesWithInvalidRange() {
        // This test is covered by loadEntriesBetweenDates tests
        // No need to duplicate it
    }
    
    @Test
    void testUpdateJournal() {
        // Delete the setUp journal first
        service.deleteAll();
        
        // Create and save journal
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Original Title");
        journal.setCurrency("USD");
        
        JournalEntity saved = service.saveJournal(journal);
        String journalId = saved.getId();
        
        // Update journal
        saved.setTitle("Updated Title");
        saved.setSubtitle("Version 2.0");
        service.saveJournal(saved);
        
        // Load and verify
        Optional<JournalEntity> loaded = service.findJournalById(journalId);
        assertTrue(loaded.isPresent());
        assertEquals(journalId, loaded.get().getId());
        assertEquals("Updated Title", loaded.get().getTitle());
        assertEquals("Version 2.0", loaded.get().getSubtitle());
    }
    
    @Test
    void testUpdateAccount() {
        // Create and save account
        AccountEntity account = new AccountEntity();
        account.setName("Cash");
        
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        
        AccountEntity saved = service.saveAccount(account);
        String accountId = saved.getId();
        
        // Update account
        saved.setNote("Updated note");
        saved.setType(AccountType.CASH);
        service.saveAccount(saved);
        
        // Load and verify
        List<AccountEntity> accounts = service.loadAllAccounts(testJournalId);
        AccountEntity loaded = accounts.stream()
            .filter(a -> a.getId().equals(accountId))
            .findFirst()
            .orElseThrow();
        assertEquals(accountId, loaded.getId());
        assertEquals("Updated note", loaded.getNote());
        assertEquals(AccountType.CASH, loaded.getType());
    }
    
    @Test
    void testUpdateTransaction() {
        // Create account first
        AccountEntity account = new AccountEntity();
        account.setName("Cash");
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        AccountEntity savedAccount = service.saveAccount(account);
        
        // Create and save transaction
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setDescription("Original Description");
        transaction.setJournalId(testJournalId);
        
        EntryEntity entry = new EntryEntity();
        entry.setAccountId(savedAccount.getId());
        entry.setCommodity("USD");
        entry.setAmount(new BigDecimal("100.00"));
        entry.setEntryOrder(0);
        transaction.addEntry(entry);
        
        TransactionEntity saved = service.saveTransaction(transaction);
        String transactionId = saved.getId();
        
        // Update transaction
        saved.setStatus(TransactionStatus.CLEARED);
        saved.setDescription("Updated Description");
        service.saveTransaction(saved);
        
        // Load and verify
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertFalse(entries.isEmpty());
        TransactionEntity loaded = entries.get(0).getTransaction();
        assertEquals(transactionId, loaded.getId());
        assertEquals(TransactionStatus.CLEARED, loaded.getStatus());
        assertEquals("Updated Description", loaded.getDescription());
    }
    
    @Test
    void testDeleteAll() {
        // Delete setUp journal first
        service.deleteAll();
        
        // Create and save data
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Delete Test");
        journal.setCurrency("USD");
        String journalId = service.saveJournal(journal).getId();
        
        AccountEntity account = new AccountEntity();
        account.setId("1000");
        account.setName("Cash");
        account.setType(AccountType.ASSET);
        account.setJournalId(journalId);
        AccountEntity savedAccount = service.saveAccount(account);
        
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Test transaction");
        transaction.setJournalId(journalId);
        EntryEntity entry = new EntryEntity();
        entry.setAccountId(savedAccount.getId());
        entry.setCommodity("USD");
        entry.setAmount(new BigDecimal("100.00"));
        entry.setEntryOrder(0);
        transaction.addEntry(entry);
        service.saveTransaction(transaction);
        
        // Verify data exists
        assertEquals(1, service.findAllJournals().size());
        assertEquals(1, service.loadAllAccounts(journalId).size());
        assertFalse(service.loadEntriesBetweenDates(
            journalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        ).isEmpty());
        
        // Delete all
        service.deleteAll();
        
        // Verify data is deleted
        assertTrue(service.findAllJournals().isEmpty());
        // Can't check accounts without a journal ID
    }
    
    @Test
    void testMultipleEntriesInTransaction() {
        // Create accounts first
        for (int i = 0; i < 5; i++) {
            AccountEntity account = new AccountEntity();
            account.setName("Account" + i);
            account.setType(AccountType.ASSET);
            account.setJournalId(testJournalId);
            service.saveAccount(account);
        }
        
        // Create transaction with multiple entries
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Multi-entry transaction");
        transaction.setJournalId(testJournalId);
        
        // Get the saved accounts and use their IDs
        List<AccountEntity> accounts = service.loadAllAccounts(testJournalId);
        for (int i = 0; i < 5; i++) {
            EntryEntity entry = new EntryEntity();
            entry.setAccountId(accounts.get(i).getId());
            entry.setCommodity("USD");
            entry.setAmount(new BigDecimal(i * 10));
            entry.setEntryOrder(i);
            transaction.addEntry(entry);
        }
        
        service.saveTransaction(transaction);
        
        // Load and verify
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(5, entries.size());
        for (int i = 0; i < 5; i++) {
            assertNotNull(entries.get(i).getAccountId());
            assertEquals(0, new BigDecimal(i * 10).compareTo(entries.get(i).getAmount()));
        }
    }
    
    @Test
    void testentryOrderPreserved() {
        // Create accounts first
        AccountEntity account1 = new AccountEntity();
        account1.setName("Cash");
        account1.setType(AccountType.ASSET);
        account1.setJournalId(testJournalId);
        AccountEntity savedAccount1 = service.saveAccount(account1);
        
        AccountEntity account2 = new AccountEntity();
        account2.setName("Bank");
        account2.setType(AccountType.ASSET);
        account2.setJournalId(testJournalId);
        AccountEntity savedAccount2 = service.saveAccount(account2);
        
        AccountEntity account3 = new AccountEntity();
        account3.setName("Equity");
        account3.setType(AccountType.EQUITY);
        account3.setJournalId(testJournalId);
        AccountEntity savedAccount3 = service.saveAccount(account3);
        
        // Create transaction with entries in specific order
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Order test");
        transaction.setJournalId(testJournalId);
        
        EntryEntity entry1 = new EntryEntity();
        entry1.setAccountId(savedAccount3.getId());
        entry1.setCommodity("USD");
        entry1.setAmount(new BigDecimal("300.00"));
        entry1.setEntryOrder(2);
        transaction.addEntry(entry1);
        
        EntryEntity entry2 = new EntryEntity();
        entry2.setAccountId(savedAccount1.getId());
        entry2.setCommodity("USD");
        entry2.setAmount(new BigDecimal("100.00"));
        entry2.setEntryOrder(0);
        transaction.addEntry(entry2);
        
        EntryEntity entry3 = new EntryEntity();
        entry3.setAccountId(savedAccount2.getId());
        entry3.setCommodity("USD");
        entry3.setAmount(new BigDecimal("200.00"));
        entry3.setEntryOrder(1);
        transaction.addEntry(entry3);
        
        service.saveTransaction(transaction);
        
        // Load and verify order
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(3, entries.size());
        // Verify entries are ordered by entryOrder (0, 1, 2)
        assertEquals(0, new BigDecimal("100.00").compareTo(entries.get(0).getAmount()));
        assertEquals(0, new BigDecimal("200.00").compareTo(entries.get(1).getAmount()));
        assertEquals(0, new BigDecimal("300.00").compareTo(entries.get(2).getAmount()));
    }
    
    @Test
    void testEmptyDateRange() {
        createTransactionWithentry(LocalDate.of(2025, 1, 15), "1000", "100.00");
        
        // Query with same from and to date (empty range)
        List<EntryEntity> entries = service.loadEntriesBetweenDates(
            testJournalId,
            LocalDate.of(2025, 1, 15),
            LocalDate.of(2025, 1, 15)
        );
        
        assertEquals(0, entries.size());
    }
    
    // Helper method to create a simple transaction with one entry
    private void createTransactionWithentry(LocalDate date, String accountNumber, String amount) {
        // Create account first
        AccountEntity account = new AccountEntity();
        account.setName("Test Account");
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        AccountEntity savedAccount = service.saveAccount(account);
        
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(date);
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Test transaction on " + date);
        transaction.setJournalId(testJournalId);
        
        EntryEntity entry = new EntryEntity();
        entry.setAccountId(savedAccount.getId());  // Use the actual account ID
        entry.setCommodity("USD");
        entry.setAmount(new BigDecimal(amount));
        entry.setEntryOrder(0);
        transaction.addEntry(entry);
        
        service.saveTransaction(transaction);
    }
}
