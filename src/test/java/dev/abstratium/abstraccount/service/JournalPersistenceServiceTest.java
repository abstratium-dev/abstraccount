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
        Optional<JournalEntity> loaded = service.loadJournal();
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
        
        Optional<JournalEntity> loaded = service.loadJournal();
        assertFalse(loaded.isPresent());
    }
    
    @Test
    void testSaveAndLoadAccounts() {
        // Create accounts
        AccountEntity account1 = new AccountEntity();
        account1.setAccountNumber("1000");
        account1.setFullName("Assets:Cash");
        account1.setType(AccountType.ASSET);
        account1.setNote("Cash account");
        account1.setJournalId(testJournalId);
        
        AccountEntity account2 = new AccountEntity();
        account2.setAccountNumber("2000");
        account2.setFullName("Liabilities:CreditCard");
        account2.setType(AccountType.LIABILITY);
        account2.setParentAccountNumber("2000");
        account2.setJournalId(testJournalId);
        
        // Save accounts
        service.saveAccount(account1);
        service.saveAccount(account2);
        
        // Load all accounts
        List<AccountEntity> accounts = service.loadAllAccounts();
        assertEquals(2, accounts.size());
        assertEquals("1000", accounts.get(0).getAccountNumber());
        assertEquals("2000", accounts.get(1).getAccountNumber());
    }
    
    @Test
    void testLoadAccountByNumber() {
        // Create and save account
        AccountEntity account = new AccountEntity();
        account.setAccountNumber("1000");
        account.setFullName("Assets:Cash");
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        service.saveAccount(account);
        
        // Load by number
        Optional<AccountEntity> loaded = service.loadAccountByNumber("1000");
        assertTrue(loaded.isPresent());
        assertEquals("Assets:Cash", loaded.get().getFullName());
        
        // Try non-existent account
        Optional<AccountEntity> notFound = service.loadAccountByNumber("9999");
        assertFalse(notFound.isPresent());
    }
    
    @Test
    void testLoadAccountByFullName() {
        // Create and save account
        AccountEntity account = new AccountEntity();
        account.setAccountNumber("1000");
        account.setFullName("Assets:Cash");
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        service.saveAccount(account);
        
        // Load by full name
        Optional<AccountEntity> loaded = service.loadAccountByFullName("Assets:Cash");
        assertTrue(loaded.isPresent());
        assertEquals("1000", loaded.get().getAccountNumber());
        
        // Try non-existent account
        Optional<AccountEntity> notFound = service.loadAccountByFullName("NonExistent");
        assertFalse(notFound.isPresent());
    }
    
    @Test
    void testSaveAndLoadTransactionWithPostingsAndTags() {
        // Create transaction
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Test Transaction");
        transaction.setTransactionId("TX001");
        transaction.setJournalId(testJournalId);
        
        // Add postings
        PostingEntity posting1 = new PostingEntity();
        posting1.setAccountNumber("1000");
        posting1.setCommodity("USD");
        posting1.setAmount(new BigDecimal("100.00"));
        posting1.setPostingOrder(0);
        transaction.addPosting(posting1);
        
        PostingEntity posting2 = new PostingEntity();
        posting2.setAccountNumber("2000");
        posting2.setCommodity("USD");
        posting2.setAmount(new BigDecimal("-100.00"));
        posting2.setPostingOrder(1);
        transaction.addPosting(posting2);
        
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
        
        // Load transactions
        List<TransactionEntity> transactions = service.loadTransactionsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(1, transactions.size());
        TransactionEntity loaded = transactions.get(0);
        assertEquals("Test Transaction", loaded.getDescription());
        assertEquals("TX001", loaded.getTransactionId());
        assertEquals(TransactionStatus.CLEARED, loaded.getStatus());
        
        // Verify postings are eagerly loaded
        assertEquals(2, loaded.getPostings().size());
        assertEquals("1000", loaded.getPostings().get(0).getAccountNumber());
        assertEquals(0, new BigDecimal("100.00").compareTo(loaded.getPostings().get(0).getAmount()));
        
        // Verify tags are eagerly loaded
        assertEquals(2, loaded.getTags().size());
        assertTrue(loaded.getTags().stream().anyMatch(t -> t.getTagKey().equals("category")));
        assertTrue(loaded.getTags().stream().anyMatch(t -> t.getTagKey().equals("location")));
    }
    
    @Test
    void testLoadPostingsBetweenDates() {
        // Create transactions on different dates
        createTransactionWithPosting(LocalDate.of(2025, 1, 10), "1000", "100.00");
        createTransactionWithPosting(LocalDate.of(2025, 1, 15), "2000", "200.00");
        createTransactionWithPosting(LocalDate.of(2025, 1, 20), "3000", "300.00");
        createTransactionWithPosting(LocalDate.of(2025, 2, 5), "4000", "400.00");
        
        // Load postings for January (from inclusive, to exclusive)
        List<PostingEntity> postings = service.loadPostingsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(3, postings.size());
        assertEquals("1000", postings.get(0).getAccountNumber());
        assertEquals("2000", postings.get(1).getAccountNumber());
        assertEquals("3000", postings.get(2).getAccountNumber());
    }
    
    @Test
    void testLoadPostingsBetweenDatesExclusiveEndDate() {
        // Create transaction exactly on the end date
        createTransactionWithPosting(LocalDate.of(2025, 2, 1), "1000", "100.00");
        
        // Load postings - should not include the transaction on the end date
        List<PostingEntity> postings = service.loadPostingsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(0, postings.size());
    }
    
    @Test
    void testLoadPostingsBetweenDatesInclusiveStartDate() {
        // Create transaction exactly on the start date
        createTransactionWithPosting(LocalDate.of(2025, 1, 1), "1000", "100.00");
        
        // Load postings - should include the transaction on the start date
        List<PostingEntity> postings = service.loadPostingsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(1, postings.size());
        assertEquals("1000", postings.get(0).getAccountNumber());
    }
    
    @Test
    void testLoadPostingsBetweenDatesWithNullDates() {
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadPostingsBetweenDates(null, LocalDate.of(2025, 2, 1))
        );
        
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadPostingsBetweenDates(LocalDate.of(2025, 1, 1), null)
        );
    }
    
    @Test
    void testLoadPostingsBetweenDatesWithInvalidRange() {
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadPostingsBetweenDates(
                LocalDate.of(2025, 2, 1),
                LocalDate.of(2025, 1, 1)
            )
        );
    }
    
    @Test
    void testLoadTransactionsBetweenDates() {
        // Create transactions on different dates
        createTransactionWithPosting(LocalDate.of(2025, 1, 10), "1000", "100.00");
        createTransactionWithPosting(LocalDate.of(2025, 1, 15), "2000", "200.00");
        createTransactionWithPosting(LocalDate.of(2025, 2, 5), "3000", "300.00");
        
        // Load transactions for January
        List<TransactionEntity> transactions = service.loadTransactionsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(2, transactions.size());
        assertEquals(LocalDate.of(2025, 1, 10), transactions.get(0).getTransactionDate());
        assertEquals(LocalDate.of(2025, 1, 15), transactions.get(1).getTransactionDate());
    }
    
    @Test
    void testLoadTransactionsBetweenDatesWithNullDates() {
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadTransactionsBetweenDates(null, LocalDate.of(2025, 2, 1))
        );
        
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadTransactionsBetweenDates(LocalDate.of(2025, 1, 1), null)
        );
    }
    
    @Test
    void testLoadTransactionsBetweenDatesWithInvalidRange() {
        assertThrows(IllegalArgumentException.class, () -> 
            service.loadTransactionsBetweenDates(
                LocalDate.of(2025, 2, 1),
                LocalDate.of(2025, 1, 1)
            )
        );
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
        Optional<JournalEntity> loaded = service.loadJournal();
        assertTrue(loaded.isPresent());
        assertEquals(journalId, loaded.get().getId());
        assertEquals("Updated Title", loaded.get().getTitle());
        assertEquals("Version 2.0", loaded.get().getSubtitle());
    }
    
    @Test
    void testUpdateAccount() {
        // Create and save account
        AccountEntity account = new AccountEntity();
        account.setAccountNumber("1000");
        account.setFullName("Assets:Cash");
        account.setType(AccountType.ASSET);
        account.setJournalId(testJournalId);
        
        AccountEntity saved = service.saveAccount(account);
        String accountId = saved.getId();
        
        // Update account
        saved.setNote("Updated note");
        saved.setType(AccountType.CASH);
        service.saveAccount(saved);
        
        // Load and verify
        Optional<AccountEntity> loaded = service.loadAccountByNumber("1000");
        assertTrue(loaded.isPresent());
        assertEquals(accountId, loaded.get().getId());
        assertEquals("Updated note", loaded.get().getNote());
        assertEquals(AccountType.CASH, loaded.get().getType());
    }
    
    @Test
    void testUpdateTransaction() {
        // Create and save transaction
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setDescription("Original Description");
        transaction.setJournalId(testJournalId);
        
        PostingEntity posting = new PostingEntity();
        posting.setAccountNumber("1000");
        posting.setCommodity("USD");
        posting.setAmount(new BigDecimal("100.00"));
        posting.setPostingOrder(0);
        transaction.addPosting(posting);
        
        TransactionEntity saved = service.saveTransaction(transaction);
        String transactionId = saved.getId();
        
        // Update transaction
        saved.setStatus(TransactionStatus.CLEARED);
        saved.setDescription("Updated Description");
        service.saveTransaction(saved);
        
        // Load and verify
        List<TransactionEntity> loaded = service.loadTransactionsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(1, loaded.size());
        assertEquals(transactionId, loaded.get(0).getId());
        assertEquals(TransactionStatus.CLEARED, loaded.get(0).getStatus());
        assertEquals("Updated Description", loaded.get(0).getDescription());
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
        account.setAccountNumber("1000");
        account.setFullName("Assets:Cash");
        account.setType(AccountType.ASSET);
        account.setJournalId(journalId);
        service.saveAccount(account);
        
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Test transaction");
        transaction.setJournalId(journalId);
        PostingEntity posting = new PostingEntity();
        posting.setAccountNumber("1000");
        posting.setCommodity("USD");
        posting.setAmount(new BigDecimal("100.00"));
        posting.setPostingOrder(0);
        transaction.addPosting(posting);
        service.saveTransaction(transaction);
        
        // Verify data exists
        assertTrue(service.loadJournal().isPresent());
        assertEquals(1, service.loadAllAccounts().size());
        assertEquals(1, service.loadTransactionsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        ).size());
        
        // Delete all
        service.deleteAll();
        
        // Verify data is deleted
        assertFalse(service.loadJournal().isPresent());
        assertEquals(0, service.loadAllAccounts().size());
        assertEquals(0, service.loadTransactionsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        ).size());
    }
    
    @Test
    void testMultiplePostingsInTransaction() {
        // Create transaction with multiple postings
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Multi-posting transaction");
        transaction.setJournalId(testJournalId);
        
        for (int i = 0; i < 5; i++) {
            PostingEntity posting = new PostingEntity();
            posting.setAccountNumber("100" + i);
            posting.setCommodity("USD");
            posting.setAmount(new BigDecimal(i * 10));
            posting.setPostingOrder(i);
            transaction.addPosting(posting);
        }
        
        service.saveTransaction(transaction);
        
        // Load and verify
        List<PostingEntity> postings = service.loadPostingsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(5, postings.size());
        for (int i = 0; i < 5; i++) {
            assertEquals("100" + i, postings.get(i).getAccountNumber());
            assertEquals(0, new BigDecimal(i * 10).compareTo(postings.get(i).getAmount()));
        }
    }
    
    @Test
    void testPostingOrderPreserved() {
        // Create transaction with postings in specific order
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(LocalDate.of(2025, 1, 15));
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Order test");
        transaction.setJournalId(testJournalId);
        
        PostingEntity posting1 = new PostingEntity();
        posting1.setAccountNumber("3000");
        posting1.setCommodity("USD");
        posting1.setAmount(new BigDecimal("300.00"));
        posting1.setPostingOrder(2);
        transaction.addPosting(posting1);
        
        PostingEntity posting2 = new PostingEntity();
        posting2.setAccountNumber("1000");
        posting2.setCommodity("USD");
        posting2.setAmount(new BigDecimal("100.00"));
        posting2.setPostingOrder(0);
        transaction.addPosting(posting2);
        
        PostingEntity posting3 = new PostingEntity();
        posting3.setAccountNumber("2000");
        posting3.setCommodity("USD");
        posting3.setAmount(new BigDecimal("200.00"));
        posting3.setPostingOrder(1);
        transaction.addPosting(posting3);
        
        service.saveTransaction(transaction);
        
        // Load and verify order
        List<PostingEntity> postings = service.loadPostingsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(3, postings.size());
        assertEquals("1000", postings.get(0).getAccountNumber());
        assertEquals("2000", postings.get(1).getAccountNumber());
        assertEquals("3000", postings.get(2).getAccountNumber());
    }
    
    @Test
    void testEmptyDateRange() {
        createTransactionWithPosting(LocalDate.of(2025, 1, 15), "1000", "100.00");
        
        // Query with same from and to date (empty range)
        List<PostingEntity> postings = service.loadPostingsBetweenDates(
            LocalDate.of(2025, 1, 15),
            LocalDate.of(2025, 1, 15)
        );
        
        assertEquals(0, postings.size());
    }
    
    // Helper method to create a simple transaction with one posting
    private void createTransactionWithPosting(LocalDate date, String accountNumber, String amount) {
        TransactionEntity transaction = new TransactionEntity();
        transaction.setTransactionDate(date);
        transaction.setStatus(TransactionStatus.CLEARED);
        transaction.setDescription("Test transaction on " + date);
        transaction.setJournalId(testJournalId);
        
        PostingEntity posting = new PostingEntity();
        posting.setAccountNumber(accountNumber);
        posting.setCommodity("USD");
        posting.setAmount(new BigDecimal(amount));
        posting.setPostingOrder(0);
        transaction.addPosting(posting);
        
        service.saveTransaction(transaction);
    }
}
