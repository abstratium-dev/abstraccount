package dev.abstratium.abstraccount.model;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JournalParserTest {
    
    private final JournalParser parser = new JournalParser();
    
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
        assertEquals("1", rootAccount.accountNumber());
        assertEquals("1 Assets", rootAccount.fullName());
        assertEquals(AccountType.ASSET, rootAccount.type());
        assertEquals("All company assets", rootAccount.note());
        assertNull(rootAccount.parent());
        
        Account childAccount = journal.accounts().get(1);
        assertEquals("1", childAccount.accountNumber());
        assertEquals("1 Assets:10 Current Assets", childAccount.fullName());
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
        assertEquals(LocalDate.of(2025, 1, 1), transaction.transactionDate());
        assertEquals(TransactionStatus.CLEARED, transaction.status());
        assertEquals("Opening Balance", transaction.description());
        assertNull(transaction.id());
        assertEquals(2, transaction.postings().size());
        
        Posting posting1 = transaction.postings().get(0);
        assertEquals("1 Assets", posting1.account().fullName());
        assertEquals("CHF", posting1.amount().commodity());
        assertEquals(new BigDecimal("1000.00"), posting1.amount().quantity());
        
        Posting posting2 = transaction.postings().get(1);
        assertEquals("2 Equity", posting2.account().fullName());
        assertEquals("CHF", posting2.amount().commodity());
        assertEquals(new BigDecimal("-1000.00"), posting2.amount().quantity());
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
        assertEquals(2, transaction.tags().size());
        
        assertEquals("id", transaction.tags().get(0).key());
        assertEquals("bcba9da2-81be-4a78-b4a3-fbd856ad7dde", transaction.tags().get(0).value());
        
        assertEquals("invoice", transaction.tags().get(1).key());
        assertEquals("PI00000017", transaction.tags().get(1).value());
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
}
