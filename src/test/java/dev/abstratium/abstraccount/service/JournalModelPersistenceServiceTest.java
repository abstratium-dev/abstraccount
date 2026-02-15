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
        Account cashAccount = Account.root("1000", "Cash", AccountType.CASH, "Cash account");
        Account equityAccount = Account.root("3000", "Equity", AccountType.EQUITY, null);
        
        Entry entry1 = Entry.simple(cashAccount, Amount.of("USD", "1000.00"));
        Entry entry2 = Entry.simple(equityAccount, Amount.of("USD", "-1000.00"));
        
        Transaction transaction = new Transaction(
            LocalDate.of(2025, 1, 15),
            TransactionStatus.CLEARED,
            "Opening Balance",
            null, // partnerId
            "TX001",
            List.of(new Tag("category", "initial")),
            List.of(entry1, entry2)
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
        List<JournalEntity> journals = persistenceService.findAllJournals();
        assertEquals(1, journals.size());
        JournalEntity loadedJournal = journals.get(0);
        assertEquals("Test Journal", loadedJournal.getTitle());
        assertEquals("Test Subtitle", loadedJournal.getSubtitle());
        assertEquals("USD", loadedJournal.getCurrency());
        assertEquals(1, loadedJournal.getCommodities().size());
        String journalId = loadedJournal.getId();
        
        // Verify accounts were persisted
        List<AccountEntity> accounts = persistenceService.loadAllAccounts(journalId);
        assertEquals(2, accounts.size());
        
        AccountEntity cashAccountEntity = accounts.stream()
            .filter(a -> a.getId().equals("1000"))
            .findFirst()
            .orElseThrow();
        assertEquals("1000", cashAccountEntity.getId());
        assertEquals(AccountType.CASH, cashAccountEntity.getType());
        
        // Verify transactions were persisted
        List<EntryEntity> entries = persistenceService.loadEntriesBetweenDates(
            journalId,
            LocalDate.of(2025, 1, 1),
            LocalDate.of(2025, 2, 1)
        );
        assertFalse(entries.isEmpty());
        TransactionEntity transactionEntity = entries.get(0).getTransaction();
        
        assertEquals("Opening Balance", transactionEntity.getDescription());
        assertEquals("TX001", transactionEntity.getTransactionId());
        assertEquals(TransactionStatus.CLEARED, transactionEntity.getStatus());
        
        // Verify entries
        assertEquals(2, transactionEntity.getEntries().size());
        // Note: Entry now stores accountId, but we need to verify it was set correctly
        // The accountId should be the ID of the account with number "1000"
        assertNotNull(transactionEntity.getEntries().get(0).getAccountId());
        assertEquals("USD", transactionEntity.getEntries().get(0).getCommodity());
        assertEquals(0, new BigDecimal("1000.00").compareTo(transactionEntity.getEntries().get(0).getAmount()));
        
        // Verify tags
        assertEquals(1, transactionEntity.getTags().size());
        assertTrue(transactionEntity.getTags().stream().anyMatch(t -> t.getTagKey().equals("category")));
    }
    
    @Test
    void testPersistJournalModelWithDuplicateAccounts() {
        // Create journal with duplicate account IDs
        Account account1 = Account.root("1000", "Cash", AccountType.CASH, "First occurrence");
        Account account1Duplicate = Account.root("1000", "Cash", AccountType.ASSET, "Duplicate");
        Account account2 = Account.root("2000", "Liabilities", AccountType.LIABILITY, null);
        
        Journal journal = new Journal(
            null, 
            "Journal with Duplicates", 
            null, 
            "USD", 
            List.of(), 
            List.of(account1, account1Duplicate, account2),  // account1 appears twice with same full name
            List.of()
        );
        
        // Persist the model
        modelPersistenceService.persistJournalModel(journal);
        
        // Verify accounts were persisted
        List<JournalEntity> journals = persistenceService.findAllJournals();
        String journalId = journals.get(0).getId();
        List<AccountEntity> accounts = persistenceService.loadAllAccounts(journalId);
        assertEquals(2, accounts.size(), "Should save 2 accounts");
        
        AccountEntity account1000 = accounts.stream()
            .filter(a -> a.getId().equals("1000"))
            .findFirst()
            .orElseThrow();
        assertEquals("1000", account1000.getId());
        assertEquals("First occurrence", account1000.getNote());
    }
    
    @Test
    void testPersistJournalModelDeletesExistingData() {
        // Create and persist first journal
        Account account1 = Account.root("1000", "Assets", AccountType.ASSET, null);
        Journal journal1 = new Journal(null, "Journal 1", null, "USD", List.of(), List.of(account1), List.of());
        modelPersistenceService.persistJournalModel(journal1);
        
        // Verify first journal
        List<JournalEntity> journals1 = persistenceService.findAllJournals();
        assertEquals(1, journals1.size());
        String journal1Id = journals1.get(0).getId();
        assertEquals(1, persistenceService.loadAllAccounts(journal1Id).size());
        
        // Create and persist second journal
        Account account2 = Account.root("2000", "Liabilities", AccountType.LIABILITY, null);
        Journal journal2 = new Journal(null, "Journal 2", null, "EUR", List.of(), List.of(account2), List.of());
        modelPersistenceService.persistJournalModel(journal2);
        
        // Verify we now have 2 journals
        List<JournalEntity> journals2 = persistenceService.findAllJournals();
        assertEquals(2, journals2.size());
        
        // Find journal 2
        JournalEntity journal2Entity = journals2.stream()
            .filter(j -> "Journal 2".equals(j.getTitle()))
            .findFirst()
            .orElseThrow();
        assertEquals("Journal 2", journal2Entity.getTitle());
        assertEquals("EUR", journal2Entity.getCurrency());
        
        // Verify each journal has its own accounts
        List<AccountEntity> journal2Accounts = persistenceService.loadAllAccounts(journal2Entity.getId());
        assertEquals(1, journal2Accounts.size());
        assertEquals("2000", journal2Accounts.get(0).getId());
    }
}
