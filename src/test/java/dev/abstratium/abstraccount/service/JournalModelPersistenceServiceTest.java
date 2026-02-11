package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.entity.*;
import dev.abstratium.abstraccount.model.*;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JournalModelPersistenceServiceTest {
    
    @Inject
    JournalModelPersistenceService modelPersistenceService;
    
    @Inject
    JournalPersistenceService persistenceService;
    
    @BeforeEach
    void setUp() {
        persistenceService.deleteAll();
    }
    
    @Test
    void testPersistJournalModel() {
        // Create a simple journal model
        Account cashAccount = new Account("1000", "Assets:Cash", AccountType.CASH, "Cash account", null);
        Account equityAccount = new Account("3000", "Equity", AccountType.EQUITY, null, null);
        
        Posting posting1 = new Posting(cashAccount, Amount.of("USD", "1000.00"), null, List.of());
        Posting posting2 = new Posting(equityAccount, Amount.of("USD", "-1000.00"), null, List.of());
        
        Transaction transaction = new Transaction(
            LocalDate.of(2025, 1, 15),
            TransactionStatus.CLEARED,
            "Opening Balance",
            "TX001",
            List.of(new Tag("category", "initial")),
            List.of(posting1, posting2)
        );
        
        Journal journal = new Journal(
            "logo.png",
            "Test Journal",
            "Test Subtitle",
            "USD",
            List.of(new Commodity("USD", new BigDecimal("1000.00"))),
            List.of(cashAccount, equityAccount),
            List.of(transaction)
        );
        
        // Persist the model
        modelPersistenceService.persistJournalModel(journal);
        
        // Verify journal was persisted
        Optional<JournalEntity> loadedJournal = persistenceService.loadJournal();
        assertTrue(loadedJournal.isPresent());
        assertEquals("Test Journal", loadedJournal.get().getTitle());
        assertEquals("Test Subtitle", loadedJournal.get().getSubtitle());
        assertEquals("USD", loadedJournal.get().getCurrency());
        assertEquals(1, loadedJournal.get().getCommodities().size());
        
        // Verify accounts were persisted
        List<AccountEntity> accounts = persistenceService.loadAllAccounts();
        assertEquals(2, accounts.size());
        
        Optional<AccountEntity> cashAccountEntity = persistenceService.loadAccountByNumber("1000");
        assertTrue(cashAccountEntity.isPresent());
        assertEquals("Assets:Cash", cashAccountEntity.get().getFullName());
        assertEquals(AccountType.CASH, cashAccountEntity.get().getType());
        
        // Verify transactions were persisted
        List<TransactionEntity> transactions = persistenceService.loadTransactionsBetweenDates(
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        assertEquals(1, transactions.size());
        
        TransactionEntity transactionEntity = transactions.get(0);
        assertEquals("Opening Balance", transactionEntity.getDescription());
        assertEquals("TX001", transactionEntity.getTransactionId());
        assertEquals(TransactionStatus.CLEARED, transactionEntity.getStatus());
        
        // Verify postings
        assertEquals(2, transactionEntity.getPostings().size());
        assertEquals("1000", transactionEntity.getPostings().get(0).getAccountNumber());
        assertEquals("USD", transactionEntity.getPostings().get(0).getCommodity());
        assertEquals(0, new BigDecimal("1000.00").compareTo(transactionEntity.getPostings().get(0).getAmount()));
        
        // Verify tags
        assertEquals(1, transactionEntity.getTags().size());
        assertTrue(transactionEntity.getTags().stream().anyMatch(t -> t.getTagKey().equals("category")));
    }
    
    @Test
    void testPersistJournalModelWithDuplicateAccounts() {
        // Create journal with duplicate account numbers
        Account account1 = new Account("1000", "Assets:Cash", AccountType.CASH, "First occurrence", null);
        Account account1Duplicate = new Account("1000", "Assets:Cash Duplicate", AccountType.ASSET, "Duplicate", null);
        Account account2 = new Account("2000", "Liabilities", AccountType.LIABILITY, null, null);
        
        Journal journal = new Journal(
            null, 
            "Journal with Duplicates", 
            null, 
            "USD", 
            List.of(), 
            List.of(account1, account1Duplicate, account2),  // account1 appears twice
            List.of()
        );
        
        // Persist the model
        modelPersistenceService.persistJournalModel(journal);
        
        // Verify only unique accounts were persisted (first occurrence kept)
        List<AccountEntity> accounts = persistenceService.loadAllAccounts();
        assertEquals(2, accounts.size(), "Should only save 2 unique accounts");
        
        Optional<AccountEntity> account1000 = persistenceService.loadAccountByNumber("1000");
        assertTrue(account1000.isPresent());
        assertEquals("Assets:Cash", account1000.get().getFullName(), "Should keep first occurrence");
        assertEquals("First occurrence", account1000.get().getNote());
    }
    
    @Test
    void testPersistJournalModelDeletesExistingData() {
        // Create and persist first journal
        Account account1 = new Account("1000", "Assets", AccountType.ASSET, null, null);
        Journal journal1 = new Journal(null, "Journal 1", null, "USD", List.of(), List.of(account1), List.of());
        modelPersistenceService.persistJournalModel(journal1);
        
        // Verify first journal
        assertEquals(1, persistenceService.loadAllAccounts().size());
        
        // Create and persist second journal
        Account account2 = new Account("2000", "Liabilities", AccountType.LIABILITY, null, null);
        Journal journal2 = new Journal(null, "Journal 2", null, "EUR", List.of(), List.of(account2), List.of());
        modelPersistenceService.persistJournalModel(journal2);
        
        // Verify old data was deleted and new data persisted
        List<AccountEntity> accounts = persistenceService.loadAllAccounts();
        assertEquals(1, accounts.size());
        assertEquals("2000", accounts.get(0).getAccountNumber());
        assertEquals("Liabilities", accounts.get(0).getFullName());
        
        Optional<JournalEntity> journal = persistenceService.loadJournal();
        assertTrue(journal.isPresent());
        assertEquals("Journal 2", journal.get().getTitle());
        assertEquals("EUR", journal.get().getCurrency());
    }
}
