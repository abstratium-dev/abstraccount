package dev.abstratium.abstraccount.model;

import dev.abstratium.abstraccount.service.JournalParser;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JournalParserTest {
    
    @Inject
    JournalParser parser;
    
    @Test
    void testParseMetadata() {
        String content = """
            ; logo: https://example.com/logo.png
            ; title: Test Company
            ; subtitle: 123 Main St
            ; Currency: CHF
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals("https://example.com/logo.png", journal.logo());
        assertEquals("Test Company", journal.title());
        assertEquals("123 Main St", journal.subtitle());
        assertEquals("CHF", journal.currency());
    }
    
    @Test
    void testParseCommodity() {
        String content = """
            commodity CHF 1000.00
            commodity USD 1000.00
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(2, journal.commodities().size());
        assertEquals("CHF", journal.commodities().get(0).code());
        assertEquals(new BigDecimal("1000.00"), journal.commodities().get(0).displayPrecision());
        assertEquals("USD", journal.commodities().get(1).code());
    }
    
    @Test
    void testParseAccount() {
        String content = """
            account 1 Assets
              ; type:Asset
              ; note:All company assets
            
            account 1 Assets:10 Current Assets
              ; type:Asset
              ; note:Short-term assets
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(2, journal.accounts().size());
        
        Account rootAccount = journal.accounts().get(0);
        assertEquals("1", rootAccount.id());
        assertEquals("Assets", rootAccount.name());
        assertEquals(AccountType.ASSET, rootAccount.type());
        assertEquals("All company assets", rootAccount.note());
        assertNull(rootAccount.parent());
        
        Account childAccount = journal.accounts().get(1);
        assertEquals("10", childAccount.id());
        assertEquals("Current Assets", childAccount.name());
        assertEquals(AccountType.ASSET, childAccount.type());
        assertEquals("Short-term assets", childAccount.note());
        assertEquals(rootAccount, childAccount.parent());
    }
    
    @Test
    void testParseAccountTypes() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Liabilities
              ; type:Liability
            account 3 Equity
              ; type:Equity
            account 4 Revenue
              ; type:Revenue
            account 5 Expenses
              ; type:Expense
            account 6 Cash
              ; type:Cash
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(6, journal.accounts().size());
        assertEquals(AccountType.ASSET, journal.accounts().get(0).type());
        assertEquals(AccountType.LIABILITY, journal.accounts().get(1).type());
        assertEquals(AccountType.EQUITY, journal.accounts().get(2).type());
        assertEquals(AccountType.REVENUE, journal.accounts().get(3).type());
        assertEquals(AccountType.EXPENSE, journal.accounts().get(4).type());
        assertEquals(AccountType.CASH, journal.accounts().get(5).type());
    }
    
    @Test
    void testParseSimpleTransaction() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Equity
              ; type:Equity
            
            2025-01-01 * Opening Balance
                1 Assets    CHF 1000.00
                2 Equity    CHF -1000.00
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(1, journal.transactions().size());
        
        Transaction transaction = journal.transactions().get(0);
        assertEquals(LocalDate.of(2025, 1, 1), transaction.date());
        assertEquals(TransactionStatus.CLEARED, transaction.status());
        assertEquals("Opening Balance", transaction.description());
        assertNull(transaction.id());
        assertEquals(2, transaction.entries().size());
        
        Entry entry1 = transaction.entries().get(0);
        assertEquals("1", entry1.account().id());
        assertEquals("Assets", entry1.account().name());
        assertEquals("CHF", entry1.amount().commodity());
        assertEquals(new BigDecimal("1000.00"), entry1.amount().quantity());
        
        Entry entry2 = transaction.entries().get(1);
        assertEquals("2", entry2.account().id());
        assertEquals("Equity", entry2.account().name());
        assertEquals("CHF", entry2.amount().commodity());
        assertEquals(new BigDecimal("-1000.00"), entry2.amount().quantity());
    }
    
    @Test
    void testParseTransactionWithId() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Liabilities
              ; type:Liability
            
            2025-01-04 * Purchase
                ; id:bcba9da2-81be-4a78-b4a3-fbd856ad7dde
                ; invoice:PI00000017
                1 Assets    CHF 100.00
                2 Liabilities    CHF -100.00
            """;
        
        Journal journal = parser.parse(content);
        
        Transaction transaction = journal.transactions().get(0);
        assertEquals("bcba9da2-81be-4a78-b4a3-fbd856ad7dde", transaction.id());
        assertEquals(1, transaction.tags().size());
        
        // id tag should not be in tags list
        assertEquals("invoice", transaction.tags().get(0).key());
        assertEquals("PI00000017", transaction.tags().get(0).value());
    }
    
    @Test
    void testParseTransactionWithSimpleTags() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Equity
              ; type:Equity
            
            2025-01-01 * Opening Balances
                ; :OpeningBalances:
                1 Assets    CHF 0.00
                2 Equity    CHF 0.00
            """;
        
        Journal journal = parser.parse(content);
        
        Transaction transaction = journal.transactions().get(0);
        assertEquals(1, transaction.tags().size());
        assertTrue(transaction.tags().get(0).isSimple());
        assertEquals("OpeningBalances", transaction.tags().get(0).key());
    }
    
    @Test
    void testParseTransactionStatuses() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Equity
              ; type:Equity
            
            2025-01-01 * Cleared
                1 Assets    CHF 100.00
                2 Equity    CHF -100.00
            
            2025-01-02 ! Pending
                1 Assets    CHF 50.00
                2 Equity    CHF -50.00
            
            2025-01-03 Uncleared
                1 Assets    CHF 25.00
                2 Equity    CHF -25.00
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(3, journal.transactions().size());
        assertEquals(TransactionStatus.CLEARED, journal.transactions().get(0).status());
        assertEquals(TransactionStatus.PENDING, journal.transactions().get(1).status());
        assertEquals(TransactionStatus.UNCLEARED, journal.transactions().get(2).status());
    }
    
    @Test
    void testParseCompleteJournal() {
        String content = """
            ; logo: https://abstratium.dev/logo.png
            ; title: Test Company, UID CHE-123.456.789
            ; subtitle: Main Street 1, 1000 City, Country
            ; Currency: CHF
            
            commodity CHF 1000.00
            
            account 1 Assets
              ; type:Asset
              ; note:Company assets
            
            account 1 Assets:10 Current Assets
              ; type:Asset
            
            account 2 Equity
              ; type:Equity
              ; note:Shareholder equity
            
            2025-01-01 * Opening Balance
                ; :OpeningBalances:
                1 Assets:10 Current Assets    CHF 1000.00
                2 Equity    CHF -1000.00
            
            2025-01-15 * Payment
                ; id:test-id-123
                ; invoice:INV-001
                1 Assets:10 Current Assets    CHF -50.00
                2 Equity    CHF 50.00
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals("https://abstratium.dev/logo.png", journal.logo());
        assertEquals("Test Company, UID CHE-123.456.789", journal.title());
        assertEquals("Main Street 1, 1000 City, Country", journal.subtitle());
        assertEquals("CHF", journal.currency());
        
        assertEquals(1, journal.commodities().size());
        assertEquals(3, journal.accounts().size());
        assertEquals(2, journal.transactions().size());
        
        assertTrue(journal.transactions().get(0).isBalanced());
        assertTrue(journal.transactions().get(1).isBalanced());
    }
    
    @Test
    void testParseNullContent() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse(null));
    }
    
    @Test
    void testParseBlankContent() {
        assertThrows(IllegalArgumentException.class, () -> parser.parse("   "));
    }
    
    @Test
    void testAutoCreatedChildAccountsHaveParents() {
        // Test that when a child account is used in a entry without being declared,
        // it and its parent are auto-created with proper parent-child relationships
        String content = """
            account 1 Assets
              ; type:Asset
            
            2025-01-01 * Opening Balance
                1 Assets:10 Cash:100 Bank    CHF 1000.00
                2 Equity    CHF -1000.00
            """;
        
        Journal journal = parser.parse(content);
        
        // Should have 4 accounts: 1 Assets (declared), 1 Assets:10 Cash (auto-created),
        // 1 Assets:10 Cash:100 Bank (auto-created), 2 Equity (auto-created)
        assertEquals(4, journal.accounts().size());
        
        // Find the accounts
        Account assets = journal.accounts().stream()
            .filter(a -> a.id().equals("1") && a.name().equals("Assets"))
            .findFirst()
            .orElseThrow();
        
        Account cash = journal.accounts().stream()
            .filter(a -> a.id().equals("10") && a.name().equals("Cash"))
            .findFirst()
            .orElseThrow();
        
        Account bank = journal.accounts().stream()
            .filter(a -> a.id().equals("100") && a.name().equals("Bank"))
            .findFirst()
            .orElseThrow();
        
        Account equity = journal.accounts().stream()
            .filter(a -> a.id().equals("2") && a.name().equals("Equity"))
            .findFirst()
            .orElseThrow();
        
        // Verify parent relationships
        assertNull(assets.parent(), "Assets should have no parent");
        assertEquals(assets, cash.parent(), "Cash parent should be Assets");
        assertEquals(cash, bank.parent(), "Bank parent should be Cash");
        assertNull(equity.parent(), "Equity should have no parent");
        
        // Verify account IDs (extracted from last segment)
        assertEquals("1", assets.id());
        assertEquals("10", cash.id());
        assertEquals("100", bank.id());
        assertEquals("2", equity.id());
    }
    
    @Test
    void testParseTransactionWithPartner() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Liabilities
              ; type:Liability
            
            2024-05-27 * P00000002 IFJ Institut für Jungunternehmen AG | Pre-payment to IFJ for paying cantonal fees
                1 Assets    CHF 100.00
                2 Liabilities    CHF -100.00
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(1, journal.transactions().size());
        Transaction transaction = journal.transactions().get(0);
        
        assertEquals(LocalDate.of(2024, 5, 27), transaction.date());
        assertEquals(TransactionStatus.CLEARED, transaction.status());
        assertEquals("P00000002", transaction.partnerId());
        assertEquals("Pre-payment to IFJ for paying cantonal fees", transaction.description());
    }
    
    @Test
    void testParseTransactionWithoutPartner() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Liabilities
              ; type:Liability
            
            2024-05-27 * Pre-payment to IFJ
                1 Assets    CHF 100.00
                2 Liabilities    CHF -100.00
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(1, journal.transactions().size());
        Transaction transaction = journal.transactions().get(0);
        
        assertEquals(LocalDate.of(2024, 5, 27), transaction.date());
        assertEquals(TransactionStatus.CLEARED, transaction.status());
        assertNull(transaction.partnerId());
        assertEquals("Pre-payment to IFJ", transaction.description());
    }
    
    @Test
    void testParseTransactionWithPartnerAndComplexDescription() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Liabilities
              ; type:Liability
            
            2024-05-27 * P00000002 IFJ Institut für Jungunternehmen AG | Pre-payment to IFJ for paying cantonal fees, which they then paid to the canton
                1 Assets    CHF 100.00
                2 Liabilities    CHF -100.00
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(1, journal.transactions().size());
        Transaction transaction = journal.transactions().get(0);
        
        assertEquals(LocalDate.of(2024, 5, 27), transaction.date());
        assertEquals(TransactionStatus.CLEARED, transaction.status());
        assertEquals("P00000002", transaction.partnerId());
        assertEquals("Pre-payment to IFJ for paying cantonal fees, which they then paid to the canton", transaction.description());
    }
    
    @Test
    void testParseTransactionWithCommaSeparatedTags() {
        String content = """
            account 1 Assets
              ; type:Asset
            account 2 Liabilities
              ; type:Liability
            
            2024-01-15 * Payment to supplier
                ; :Payment:, invoice:PI00000002
                1 Assets    CHF -324.30
                2 Liabilities    CHF 324.30
            """;
        
        Journal journal = parser.parse(content);
        
        assertEquals(1, journal.transactions().size());
        Transaction transaction = journal.transactions().get(0);
        
        assertEquals(LocalDate.of(2024, 1, 15), transaction.date());
        assertEquals(TransactionStatus.CLEARED, transaction.status());
        assertEquals("Payment to supplier", transaction.description());
        
        // Verify tags
        assertEquals(2, transaction.tags().size());
        
        // Check for simple tag "Payment"
        assertTrue(transaction.tags().stream()
            .anyMatch(tag -> tag.isSimple() && "Payment".equals(tag.key())));
        
        // Check for key-value tag "invoice:PI00000002"
        assertTrue(transaction.tags().stream()
            .anyMatch(tag -> !tag.isSimple() && "invoice".equals(tag.key()) && "PI00000002".equals(tag.value())));
    }
}
