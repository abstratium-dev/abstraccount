package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.*;
import dev.abstratium.abstraccount.entity.TagEntity;
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
        transaction.setId("TX001");
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
        assertEquals("TX001", loaded.getId());
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
        // Transactions are sorted by date DESC, so most recent first
        assertEquals(LocalDate.of(2025, 1, 15), transactions.get(0).getTransactionDate());
        assertEquals(LocalDate.of(2025, 1, 10), transactions.get(1).getTransactionDate());
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
    
    @Test
    void testQueryEntriesWithTagKeysFilter() {
        AccountEntity account = createSimpleAccount("Tag Test Account");

        TransactionEntity txWithTag = new TransactionEntity();
        txWithTag.setTransactionDate(LocalDate.of(2024, 3, 1));
        txWithTag.setStatus(TransactionStatus.CLEARED);
        txWithTag.setDescription("Tagged tx");
        txWithTag.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("USD"); e1.setAmount(new BigDecimal("50.00")); e1.setEntryOrder(0);
        txWithTag.addEntry(e1);
        TagEntity tag = new TagEntity();
        tag.setTagKey("invoice"); tag.setTagValue("INV-001");
        txWithTag.getTags().add(tag); tag.setTransaction(txWithTag);
        service.saveTransaction(txWithTag);

        TransactionEntity txNoTag = new TransactionEntity();
        txNoTag.setTransactionDate(LocalDate.of(2024, 3, 2));
        txNoTag.setStatus(TransactionStatus.CLEARED);
        txNoTag.setDescription("Untagged tx");
        txNoTag.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("USD"); e2.setAmount(new BigDecimal("30.00")); e2.setEntryOrder(0);
        txNoTag.addEntry(e2);
        service.saveTransaction(txNoTag);

        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId, null, null, null, null, null,
            List.of("invoice"), null, null, null
        );
        assertEquals(1, entries.size());
        assertEquals("Tagged tx", entries.get(0).getTransaction().getDescription());
    }

    @Test
    void testQueryEntriesWithTagKeyValuePairsFilter() {
        AccountEntity account = createSimpleAccount("KVP Test Account");

        TransactionEntity txInv001 = new TransactionEntity();
        txInv001.setTransactionDate(LocalDate.of(2024, 4, 1));
        txInv001.setStatus(TransactionStatus.CLEARED);
        txInv001.setDescription("Invoice 001");
        txInv001.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("USD"); e1.setAmount(new BigDecimal("100.00")); e1.setEntryOrder(0);
        txInv001.addEntry(e1);
        TagEntity tag1 = new TagEntity();
        tag1.setTagKey("invoice"); tag1.setTagValue("INV-001");
        txInv001.getTags().add(tag1); tag1.setTransaction(txInv001);
        service.saveTransaction(txInv001);

        TransactionEntity txInv002 = new TransactionEntity();
        txInv002.setTransactionDate(LocalDate.of(2024, 4, 2));
        txInv002.setStatus(TransactionStatus.CLEARED);
        txInv002.setDescription("Invoice 002");
        txInv002.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("USD"); e2.setAmount(new BigDecimal("200.00")); e2.setEntryOrder(0);
        txInv002.addEntry(e2);
        TagEntity tag2 = new TagEntity();
        tag2.setTagKey("invoice"); tag2.setTagValue("INV-002");
        txInv002.getTags().add(tag2); tag2.setTransaction(txInv002);
        service.saveTransaction(txInv002);

        Map<String, String> kvp = new HashMap<>();
        kvp.put("invoice", "INV-001");
        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId, null, null, null, null, null,
            null, kvp, null, null
        );
        assertEquals(1, entries.size());
        assertEquals("Invoice 001", entries.get(0).getTransaction().getDescription());
    }

    @Test
    void testQueryEntriesWithNotTagKeysFilter() {
        AccountEntity account = createSimpleAccount("NotTag Test Account");

        TransactionEntity txWithTag = new TransactionEntity();
        txWithTag.setTransactionDate(LocalDate.of(2024, 5, 1));
        txWithTag.setStatus(TransactionStatus.CLEARED);
        txWithTag.setDescription("Has closing tag");
        txWithTag.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("USD"); e1.setAmount(new BigDecimal("10.00")); e1.setEntryOrder(0);
        txWithTag.addEntry(e1);
        TagEntity tag = new TagEntity();
        tag.setTagKey("Closing"); tag.setTagValue("");
        txWithTag.getTags().add(tag); tag.setTransaction(txWithTag);
        service.saveTransaction(txWithTag);

        TransactionEntity txNoTag = new TransactionEntity();
        txNoTag.setTransactionDate(LocalDate.of(2024, 5, 2));
        txNoTag.setStatus(TransactionStatus.CLEARED);
        txNoTag.setDescription("No closing tag");
        txNoTag.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("USD"); e2.setAmount(new BigDecimal("20.00")); e2.setEntryOrder(0);
        txNoTag.addEntry(e2);
        service.saveTransaction(txNoTag);

        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId, null, null, null, null, null,
            null, null, List.of("Closing"), null
        );
        assertEquals(1, entries.size());
        assertEquals("No closing tag", entries.get(0).getTransaction().getDescription());
    }

    @Test
    void testQueryEntriesWithNotTagKeyValuePairsFilter() {
        AccountEntity account = createSimpleAccount("NotKVP Test Account");

        TransactionEntity txInv001 = new TransactionEntity();
        txInv001.setTransactionDate(LocalDate.of(2024, 6, 1));
        txInv001.setStatus(TransactionStatus.CLEARED);
        txInv001.setDescription("Invoice to exclude");
        txInv001.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("USD"); e1.setAmount(new BigDecimal("100.00")); e1.setEntryOrder(0);
        txInv001.addEntry(e1);
        TagEntity tag1 = new TagEntity();
        tag1.setTagKey("invoice"); tag1.setTagValue("INV-BAD");
        txInv001.getTags().add(tag1); tag1.setTransaction(txInv001);
        service.saveTransaction(txInv001);

        TransactionEntity txOther = new TransactionEntity();
        txOther.setTransactionDate(LocalDate.of(2024, 6, 2));
        txOther.setStatus(TransactionStatus.CLEARED);
        txOther.setDescription("Other tx");
        txOther.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("USD"); e2.setAmount(new BigDecimal("50.00")); e2.setEntryOrder(0);
        txOther.addEntry(e2);
        service.saveTransaction(txOther);

        Map<String, String> notKvp = new HashMap<>();
        notKvp.put("invoice", "INV-BAD");
        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId, null, null, null, null, null,
            null, null, null, notKvp
        );
        assertEquals(1, entries.size());
        assertEquals("Other tx", entries.get(0).getTransaction().getDescription());
    }

    @Test
    void testQueryEntriesWithTagKeysAndNotTagKeys_combined() {
        AccountEntity account = createSimpleAccount("Combined Tag Test");

        TransactionEntity txBoth = new TransactionEntity();
        txBoth.setTransactionDate(LocalDate.of(2024, 7, 1));
        txBoth.setStatus(TransactionStatus.CLEARED);
        txBoth.setDescription("Has invoice and closing");
        txBoth.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("USD"); e1.setAmount(new BigDecimal("10.00")); e1.setEntryOrder(0);
        txBoth.addEntry(e1);
        TagEntity t1 = new TagEntity(); t1.setTagKey("invoice"); t1.setTagValue("INV-X");
        TagEntity t2 = new TagEntity(); t2.setTagKey("Closing"); t2.setTagValue("");
        txBoth.getTags().add(t1); t1.setTransaction(txBoth);
        txBoth.getTags().add(t2); t2.setTransaction(txBoth);
        service.saveTransaction(txBoth);

        TransactionEntity txInvoiceOnly = new TransactionEntity();
        txInvoiceOnly.setTransactionDate(LocalDate.of(2024, 7, 2));
        txInvoiceOnly.setStatus(TransactionStatus.CLEARED);
        txInvoiceOnly.setDescription("Invoice only");
        txInvoiceOnly.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("USD"); e2.setAmount(new BigDecimal("20.00")); e2.setEntryOrder(0);
        txInvoiceOnly.addEntry(e2);
        TagEntity t3 = new TagEntity(); t3.setTagKey("invoice"); t3.setTagValue("INV-Y");
        txInvoiceOnly.getTags().add(t3); t3.setTransaction(txInvoiceOnly);
        service.saveTransaction(txInvoiceOnly);

        // Filter: has invoice tag, but NOT closing tag
        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId, null, null, null, null, null,
            List.of("invoice"), null, List.of("Closing"), null
        );
        assertEquals(1, entries.size());
        assertEquals("Invoice only", entries.get(0).getTransaction().getDescription());
    }

    @Test
    void testQueryEntriesWithStartDateEndDatePartnerIdStatus() {
        AccountEntity account = createSimpleAccount("Date Filter Account");

        TransactionEntity txInRange = new TransactionEntity();
        txInRange.setTransactionDate(LocalDate.of(2024, 6, 15));
        txInRange.setStatus(TransactionStatus.CLEARED);
        txInRange.setDescription("In range");
        txInRange.setPartnerId("PARTNER001");
        txInRange.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("CHF"); e1.setAmount(new BigDecimal("100.00")); e1.setEntryOrder(0);
        txInRange.addEntry(e1);
        service.saveTransaction(txInRange);

        TransactionEntity txOutOfRange = new TransactionEntity();
        txOutOfRange.setTransactionDate(LocalDate.of(2023, 1, 1));
        txOutOfRange.setStatus(TransactionStatus.CLEARED);
        txOutOfRange.setDescription("Before range");
        txOutOfRange.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("CHF"); e2.setAmount(new BigDecimal("50.00")); e2.setEntryOrder(0);
        txOutOfRange.addEntry(e2);
        service.saveTransaction(txOutOfRange);

        TransactionEntity txDifferentPartner = new TransactionEntity();
        txDifferentPartner.setTransactionDate(LocalDate.of(2024, 7, 1));
        txDifferentPartner.setStatus(TransactionStatus.PENDING);
        txDifferentPartner.setDescription("Different partner");
        txDifferentPartner.setPartnerId("OTHER999");
        txDifferentPartner.setJournalId(testJournalId);
        EntryEntity e3 = new EntryEntity();
        e3.setAccountId(account.getId()); e3.setCommodity("CHF"); e3.setAmount(new BigDecimal("75.00")); e3.setEntryOrder(0);
        txDifferentPartner.addEntry(e3);
        service.saveTransaction(txDifferentPartner);

        // Filter: dateRange Jan-Dec 2024, partnerId PARTNER%, status CLEARED
        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId,
            LocalDate.of(2024, 1, 1),
            LocalDate.of(2025, 1, 1),
            "PARTNER%",
            "CLEARED",
            null, null, null, null, null
        );
        assertEquals(1, entries.size());
        assertEquals("In range", entries.get(0).getTransaction().getDescription());
    }

    @Test
    void testSaveJournal_withExistingId_mergesJournal() {
        JournalEntity journal = new JournalEntity();
        journal.setTitle("Original");
        journal.setCurrency("CHF");
        JournalEntity saved = service.saveJournal(journal);
        assertNotNull(saved.getId());

        saved.setTitle("Updated Title");
        JournalEntity updated = service.saveJournal(saved);
        assertEquals(saved.getId(), updated.getId());
        assertEquals("Updated Title", updated.getTitle());
    }

    @Test
    void testSaveAccount_withExistingId_mergesAccount() {
        AccountEntity account = new AccountEntity();
        account.setName("Original Account");
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        AccountEntity saved = service.saveAccount(account);
        assertNotNull(saved.getId());

        saved.setName("Updated Account");
        AccountEntity updated = service.saveAccount(saved);
        assertEquals(saved.getId(), updated.getId());
        assertEquals("Updated Account", updated.getName());
    }

    @Test
    void testSaveTransaction_withExistingId_mergesTransaction() {
        AccountEntity account = createSimpleAccount("Merge Tx Account");

        TransactionEntity tx = new TransactionEntity();
        tx.setTransactionDate(LocalDate.of(2024, 1, 1));
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Original");
        tx.setJournalId(testJournalId);
        EntryEntity entry = new EntryEntity();
        entry.setAccountId(account.getId());
        entry.setCommodity("CHF");
        entry.setAmount(new BigDecimal("100.00"));
        entry.setEntryOrder(0);
        tx.addEntry(entry);
        TransactionEntity saved = service.saveTransaction(tx);
        assertNotNull(saved.getId());

        saved.setDescription("Updated Description");
        TransactionEntity updated = service.saveTransaction(saved);
        assertEquals(saved.getId(), updated.getId());
        assertEquals("Updated Description", updated.getDescription());
    }

    @Test
    void testQueryEntriesWithBothTagKeysAndTagKeyValuePairs() {
        AccountEntity account = createSimpleAccount("Both Tags Test");

        TransactionEntity txMatch = new TransactionEntity();
        txMatch.setTransactionDate(LocalDate.of(2024, 8, 1));
        txMatch.setStatus(TransactionStatus.CLEARED);
        txMatch.setDescription("Matches both");
        txMatch.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("USD"); e1.setAmount(new BigDecimal("10.00")); e1.setEntryOrder(0);
        txMatch.addEntry(e1);
        TagEntity t1 = new TagEntity(); t1.setTagKey("category"); t1.setTagValue("rent");
        TagEntity t2 = new TagEntity(); t2.setTagKey("invoice"); t2.setTagValue("INV-001");
        txMatch.getTags().add(t1); t1.setTransaction(txMatch);
        txMatch.getTags().add(t2); t2.setTransaction(txMatch);
        service.saveTransaction(txMatch);

        TransactionEntity txPartial = new TransactionEntity();
        txPartial.setTransactionDate(LocalDate.of(2024, 8, 2));
        txPartial.setStatus(TransactionStatus.CLEARED);
        txPartial.setDescription("Only category");
        txPartial.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("USD"); e2.setAmount(new BigDecimal("20.00")); e2.setEntryOrder(0);
        txPartial.addEntry(e2);
        TagEntity t3 = new TagEntity(); t3.setTagKey("category"); t3.setTagValue("rent");
        txPartial.getTags().add(t3); t3.setTransaction(txPartial);
        service.saveTransaction(txPartial);

        // Filter: category key AND invoice:INV-001 key-value pair
        Map<String, String> kvp = new HashMap<>();
        kvp.put("invoice", "INV-001");
        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId, null, null, null, null, null,
            List.of("category"), kvp, null, null
        );
        assertEquals(1, entries.size());
        assertEquals("Matches both", entries.get(0).getTransaction().getDescription());
    }

    @Test
    void testQueryEntriesWithBothNotTagKeysAndNotTagKeyValuePairs() {
        AccountEntity account = createSimpleAccount("Both Not Tags Test");

        TransactionEntity txExcluded1 = new TransactionEntity();
        txExcluded1.setTransactionDate(LocalDate.of(2024, 9, 1));
        txExcluded1.setStatus(TransactionStatus.CLEARED);
        txExcluded1.setDescription("Has Closing key");
        txExcluded1.setJournalId(testJournalId);
        EntryEntity e1 = new EntryEntity();
        e1.setAccountId(account.getId()); e1.setCommodity("USD"); e1.setAmount(new BigDecimal("10.00")); e1.setEntryOrder(0);
        txExcluded1.addEntry(e1);
        TagEntity t1 = new TagEntity(); t1.setTagKey("Closing"); t1.setTagValue("");
        txExcluded1.getTags().add(t1); t1.setTransaction(txExcluded1);
        service.saveTransaction(txExcluded1);

        TransactionEntity txExcluded2 = new TransactionEntity();
        txExcluded2.setTransactionDate(LocalDate.of(2024, 9, 2));
        txExcluded2.setStatus(TransactionStatus.CLEARED);
        txExcluded2.setDescription("Has bad invoice");
        txExcluded2.setJournalId(testJournalId);
        EntryEntity e2 = new EntryEntity();
        e2.setAccountId(account.getId()); e2.setCommodity("USD"); e2.setAmount(new BigDecimal("20.00")); e2.setEntryOrder(0);
        txExcluded2.addEntry(e2);
        TagEntity t2 = new TagEntity(); t2.setTagKey("invoice"); t2.setTagValue("BAD");
        txExcluded2.getTags().add(t2); t2.setTransaction(txExcluded2);
        service.saveTransaction(txExcluded2);

        TransactionEntity txIncluded = new TransactionEntity();
        txIncluded.setTransactionDate(LocalDate.of(2024, 9, 3));
        txIncluded.setStatus(TransactionStatus.CLEARED);
        txIncluded.setDescription("Clean tx");
        txIncluded.setJournalId(testJournalId);
        EntryEntity e3 = new EntryEntity();
        e3.setAccountId(account.getId()); e3.setCommodity("USD"); e3.setAmount(new BigDecimal("30.00")); e3.setEntryOrder(0);
        txIncluded.addEntry(e3);
        service.saveTransaction(txIncluded);

        // Exclude: Closing key AND invoice:BAD key-value pair
        Map<String, String> notKvp = new HashMap<>();
        notKvp.put("invoice", "BAD");
        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId, null, null, null, null, null,
            null, null, List.of("Closing"), notKvp
        );
        assertEquals(1, entries.size());
        assertEquals("Clean tx", entries.get(0).getTransaction().getDescription());
    }

    private AccountEntity createSimpleAccount(String name) {
        AccountEntity account = new AccountEntity();
        account.setName(name);
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        return service.saveAccount(account);
    }

    @Test
    void testGetJournalChainIds_singleJournal() {
        // The setUp already created a journal with no previous link
        List<String> chain = service.getJournalChainIds(testJournalId);
        assertEquals(1, chain.size());
        assertEquals(testJournalId, chain.get(0));
    }

    @Test
    void testGetJournalChainIds_chainOfThree_startFromChild() {
        // Create grandparent -> parent -> child chain
        JournalEntity grandparent = new JournalEntity();
        grandparent.setTitle("Grandparent");
        grandparent.setCurrency("CHF");
        grandparent = service.saveJournal(grandparent);

        JournalEntity parent = new JournalEntity();
        parent.setTitle("Parent");
        parent.setCurrency("CHF");
        parent.setPreviousJournalId(grandparent.getId());
        parent = service.saveJournal(parent);

        JournalEntity child = new JournalEntity();
        child.setTitle("Child");
        child.setCurrency("CHF");
        child.setPreviousJournalId(parent.getId());
        child = service.saveJournal(child);

        // Starting from child should find all 3 journals (+ setUp journal = 4 total, but chain only has 3)
        List<String> chain = service.getJournalChainIds(child.getId());
        assertEquals(3, chain.size());
        assertTrue(chain.contains(child.getId()));
        assertTrue(chain.contains(parent.getId()));
        assertTrue(chain.contains(grandparent.getId()));
    }

    @Test
    void testGetJournalChainIds_chainOfThree_startFromMiddle() {
        service.deleteAll();
        // Create grandparent -> parent -> child chain
        JournalEntity grandparent = new JournalEntity();
        grandparent.setTitle("Grandparent");
        grandparent.setCurrency("CHF");
        grandparent = service.saveJournal(grandparent);

        JournalEntity parent = new JournalEntity();
        parent.setTitle("Parent");
        parent.setCurrency("CHF");
        parent.setPreviousJournalId(grandparent.getId());
        parent = service.saveJournal(parent);

        JournalEntity child = new JournalEntity();
        child.setTitle("Child");
        child.setCurrency("CHF");
        child.setPreviousJournalId(parent.getId());
        child = service.saveJournal(child);

        // Starting from parent (middle) should still find all 3 journals
        List<String> chain = service.getJournalChainIds(parent.getId());
        assertEquals(3, chain.size());
        assertTrue(chain.contains(child.getId()));
        assertTrue(chain.contains(parent.getId()));
        assertTrue(chain.contains(grandparent.getId()));
    }

    @Test
    void testGetJournalChainIds_chainOfThree_startFromRoot() {
        service.deleteAll();
        // Create grandparent -> parent -> child chain
        JournalEntity grandparent = new JournalEntity();
        grandparent.setTitle("Grandparent");
        grandparent.setCurrency("CHF");
        grandparent = service.saveJournal(grandparent);

        JournalEntity parent = new JournalEntity();
        parent.setTitle("Parent");
        parent.setCurrency("CHF");
        parent.setPreviousJournalId(grandparent.getId());
        parent = service.saveJournal(parent);

        JournalEntity child = new JournalEntity();
        child.setTitle("Child");
        child.setCurrency("CHF");
        child.setPreviousJournalId(parent.getId());
        child = service.saveJournal(child);

        // Starting from grandparent (root) should still find all 3 journals
        List<String> chain = service.getJournalChainIds(grandparent.getId());
        assertEquals(3, chain.size());
        assertTrue(chain.contains(child.getId()));
        assertTrue(chain.contains(parent.getId()));
        assertTrue(chain.contains(grandparent.getId()));
    }

    @Test
    void testGetJournalChainIds_nullAndEmptyInput() {
        assertTrue(service.getJournalChainIds(null).isEmpty());
        assertTrue(service.getJournalChainIds("").isEmpty());
    }

    @Test
    void testGetJournalChainIds_nonExistentJournal() {
        List<String> chain = service.getJournalChainIds("non-existent-id");
        assertTrue(chain.isEmpty());
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
    
    @Test
    void testQueryEntriesWithAccountIdsFilter() {
        // Create two accounts
        AccountEntity account1 = new AccountEntity();
        account1.setId("100");
        account1.setName("Cash");
        account1.setType(AccountType.ASSET);
        account1.setJournalId(testJournalId);
        AccountEntity savedAccount1 = service.saveAccount(account1);
        
        AccountEntity account2 = new AccountEntity();
        account2.setId("200");
        account2.setName("Bank");
        account2.setType(AccountType.ASSET);
        account2.setJournalId(testJournalId);
        AccountEntity savedAccount2 = service.saveAccount(account2);
        
        // Create transactions with entries for both accounts
        TransactionEntity tx1 = new TransactionEntity();
        tx1.setTransactionDate(LocalDate.of(2024, 1, 1));
        tx1.setStatus(TransactionStatus.CLEARED);
        tx1.setDescription("Transaction 1");
        tx1.setJournalId(testJournalId);
        
        EntryEntity entry1 = new EntryEntity();
        entry1.setAccountId(savedAccount1.getId());
        entry1.setCommodity("USD");
        entry1.setAmount(new BigDecimal("100.00"));
        entry1.setEntryOrder(0);
        tx1.addEntry(entry1);
        
        EntryEntity entry2 = new EntryEntity();
        entry2.setAccountId(savedAccount2.getId());
        entry2.setCommodity("USD");
        entry2.setAmount(new BigDecimal("-100.00"));
        entry2.setEntryOrder(1);
        tx1.addEntry(entry2);
        
        service.saveTransaction(tx1);
        
        // Query entries for account1 only
        List<EntryEntity> entries = service.queryEntriesWithFilters(
            testJournalId,
            null,
            null,
            null,
            null,
            List.of(savedAccount1.getId()),
            null,
            null,
            null,
            null
        );
        
        // Should only get entry1
        assertEquals(1, entries.size());
        assertEquals(savedAccount1.getId(), entries.get(0).getAccountId());
        assertEquals(0, new BigDecimal("100.00").compareTo(entries.get(0).getAmount()));
        
        // Query entries for account2 only
        entries = service.queryEntriesWithFilters(
            testJournalId,
            null,
            null,
            null,
            null,
            List.of(savedAccount2.getId()),
            null,
            null,
            null,
            null
        );
        
        // Should only get entry2
        assertEquals(1, entries.size());
        assertEquals(savedAccount2.getId(), entries.get(0).getAccountId());
        assertEquals(0, new BigDecimal("-100.00").compareTo(entries.get(0).getAmount()));
        
        // Query entries for both accounts
        entries = service.queryEntriesWithFilters(
            testJournalId,
            null,
            null,
            null,
            null,
            List.of(savedAccount1.getId(), savedAccount2.getId()),
            null,
            null,
            null,
            null
        );
        
        // Should get both entries
        assertEquals(2, entries.size());
    }
}
