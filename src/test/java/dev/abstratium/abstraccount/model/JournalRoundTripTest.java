package dev.abstratium.abstraccount.model;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JournalRoundTripTest {
    
    private final JournalParser parser = new JournalParser();
    private final JournalSerializer serializer = new JournalSerializer();
    
    @Test
    void testRoundTripSimpleJournal() {
        String original = """
            ; logo: https://example.com/logo.png
            ; title: Test Company
            ; subtitle: 123 Main St
            ; Currency: CHF
            
            commodity CHF 1000.00
            
            account 1 Assets
              ; type:Asset
              ; note:Company assets
            
            account 2 Equity
              ; type:Equity
            
            2025-01-01 * Opening Balance
                1 Assets    CHF 1000.00
                2 Equity    CHF -1000.00
            """;
        
        // Parse -> Serialize -> Parse
        Journal journal1 = parser.parse(original);
        String serialized = serializer.serialize(journal1);
        Journal journal2 = parser.parse(serialized);
        
        // Verify metadata
        assertEquals(journal1.logo(), journal2.logo());
        assertEquals(journal1.title(), journal2.title());
        assertEquals(journal1.subtitle(), journal2.subtitle());
        assertEquals(journal1.currency(), journal2.currency());
        
        // Verify commodities
        assertEquals(journal1.commodities().size(), journal2.commodities().size());
        assertEquals(journal1.commodities().get(0).code(), journal2.commodities().get(0).code());
        
        // Verify accounts
        assertEquals(journal1.accounts().size(), journal2.accounts().size());
        for (int i = 0; i < journal1.accounts().size(); i++) {
            Account acc1 = journal1.accounts().get(i);
            Account acc2 = journal2.accounts().get(i);
            assertEquals(acc1.accountNumber(), acc2.accountNumber());
            assertEquals(acc1.fullName(), acc2.fullName());
            assertEquals(acc1.type(), acc2.type());
            assertEquals(acc1.note(), acc2.note());
        }
        
        // Verify transactions
        assertEquals(journal1.transactions().size(), journal2.transactions().size());
        Transaction tx1 = journal1.transactions().get(0);
        Transaction tx2 = journal2.transactions().get(0);
        
        assertEquals(tx1.transactionDate(), tx2.transactionDate());
        assertEquals(tx1.status(), tx2.status());
        assertEquals(tx1.description(), tx2.description());
        assertEquals(tx1.postings().size(), tx2.postings().size());
        
        // Verify postings
        for (int i = 0; i < tx1.postings().size(); i++) {
            Posting p1 = tx1.postings().get(i);
            Posting p2 = tx2.postings().get(i);
            assertEquals(p1.account().fullName(), p2.account().fullName());
            assertEquals(p1.amount().commodity(), p2.amount().commodity());
            assertEquals(0, p1.amount().quantity().compareTo(p2.amount().quantity()));
        }
    }
    
    @Test
    void testRoundTripWithTags() {
        String original = """
            account 1 Assets
              ; type:Asset
            
            account 2 Liabilities
              ; type:Liability
            
            2025-01-04 * Purchase
                ; id:test-id-123
                ; invoice:INV-001
                ; :Payment:
                1 Assets    CHF 100.00
                2 Liabilities    CHF -100.00
            """;
        
        Journal journal1 = parser.parse(original);
        String serialized = serializer.serialize(journal1);
        Journal journal2 = parser.parse(serialized);
        
        Transaction tx1 = journal1.transactions().get(0);
        Transaction tx2 = journal2.transactions().get(0);
        
        assertEquals(tx1.id(), tx2.id());
        assertEquals(tx1.tags().size(), tx2.tags().size());
        
        // Verify tags are preserved
        for (int i = 0; i < tx1.tags().size(); i++) {
            Tag tag1 = tx1.tags().get(i);
            Tag tag2 = tx2.tags().get(i);
            assertEquals(tag1.key(), tag2.key());
            assertEquals(tag1.value(), tag2.value());
        }
    }
    
    @Test
    void testRoundTripWithHierarchicalAccounts() {
        String original = """
            account 1 Assets
              ; type:Asset
            
            account 1 Assets:10 Current Assets
              ; type:Asset
            
            account 1 Assets:10 Current Assets:100 Cash
              ; type:Cash
            
            account 2 Equity
              ; type:Equity
            
            2025-01-01 * Opening
                1 Assets:10 Current Assets:100 Cash    CHF 500.00
                2 Equity    CHF -500.00
            """;
        
        Journal journal1 = parser.parse(original);
        String serialized = serializer.serialize(journal1);
        Journal journal2 = parser.parse(serialized);
        
        assertEquals(journal1.accounts().size(), journal2.accounts().size());
        
        // Verify hierarchy is preserved
        Account cash1 = journal1.accounts().get(2);
        Account cash2 = journal2.accounts().get(2);
        
        assertEquals(cash1.fullName(), cash2.fullName());
        assertNotNull(cash1.parent());
        assertNotNull(cash2.parent());
        assertEquals(cash1.parent().fullName(), cash2.parent().fullName());
    }
    
    @Test
    void testRoundTripMultipleTransactions() {
        String original = """
            account 1 Assets
              ; type:Asset
            
            account 2 Equity
              ; type:Equity
            
            account 3 Revenue
              ; type:Revenue
            
            2025-01-01 * Opening
                1 Assets    CHF 1000.00
                2 Equity    CHF -1000.00
            
            2025-01-15 ! Pending Sale
                1 Assets    CHF 200.00
                3 Revenue    CHF -200.00
            
            2025-01-31 Uncleared
                1 Assets    CHF 50.00
                2 Equity    CHF -50.00
            """;
        
        Journal journal1 = parser.parse(original);
        String serialized = serializer.serialize(journal1);
        Journal journal2 = parser.parse(serialized);
        
        assertEquals(3, journal2.transactions().size());
        
        assertEquals(TransactionStatus.CLEARED, journal2.transactions().get(0).status());
        assertEquals(TransactionStatus.PENDING, journal2.transactions().get(1).status());
        assertEquals(TransactionStatus.UNCLEARED, journal2.transactions().get(2).status());
        
        // Verify all transactions are still balanced
        for (Transaction tx : journal2.transactions()) {
            assertTrue(tx.isBalanced(), "Transaction should be balanced: " + tx.description());
        }
    }
    
    @Test
    void testSerializeToParseConsistency() {
        // Create a journal programmatically
        Account assets = Account.root("1", "1 Assets", AccountType.ASSET, "All assets");
        Account equity = Account.root("2", "2 Equity", AccountType.EQUITY, null);
        
        Commodity chf = new Commodity("CHF", new BigDecimal("1000.00"));
        
        Posting posting1 = Posting.simple(assets, Amount.of("CHF", "1500.50"));
        Posting posting2 = Posting.simple(equity, Amount.of("CHF", "-1500.50"));
        
        List<Tag> tags = List.of(
            Tag.keyValue("id", "uuid-123"),
            Tag.simple("Opening")
        );
        
        Transaction transaction = new Transaction(
            LocalDate.of(2025, 2, 15),
            TransactionStatus.CLEARED,
            "Initial Balance",
            "uuid-123",
            tags,
            List.of(posting1, posting2)
        );
        
        Journal original = new Journal(
            "https://test.com/logo.png",
            "Test Corp",
            "Address Line",
            "CHF",
            List.of(chf),
            List.of(assets, equity),
            List.of(transaction)
        );
        
        // Serialize and parse back
        String serialized = serializer.serialize(original);
        Journal parsed = parser.parse(serialized);
        
        // Verify key properties
        assertEquals(original.logo(), parsed.logo());
        assertEquals(original.title(), parsed.title());
        assertEquals(original.subtitle(), parsed.subtitle());
        assertEquals(original.currency(), parsed.currency());
        assertEquals(original.commodities().size(), parsed.commodities().size());
        assertEquals(original.accounts().size(), parsed.accounts().size());
        assertEquals(original.transactions().size(), parsed.transactions().size());
        
        // Verify transaction details
        Transaction originalTx = original.transactions().get(0);
        Transaction parsedTx = parsed.transactions().get(0);
        
        assertEquals(originalTx.transactionDate(), parsedTx.transactionDate());
        assertEquals(originalTx.status(), parsedTx.status());
        assertEquals(originalTx.description(), parsedTx.description());
        assertEquals(originalTx.id(), parsedTx.id());
        
        // Verify amounts are preserved exactly
        assertEquals(
            originalTx.postings().get(0).amount().quantity(),
            parsedTx.postings().get(0).amount().quantity()
        );
    }
    
    @Test
    void testParseToSerializeConsistency() {
        // Start with a string, parse it, serialize it, and compare
        String original = """
            ; Currency: CHF
            
            commodity CHF 1000.00
            
            account 1 Assets
              ; type:Asset
            
            account 2 Equity
              ; type:Equity
            
            2025-03-01 * Test Transaction
                1 Assets    CHF 750.25
                2 Equity    CHF -750.25
            """;
        
        Journal journal = parser.parse(original);
        String serialized = serializer.serialize(journal);
        
        // Parse the serialized version
        Journal reparsed = parser.parse(serialized);
        
        // The reparsed journal should be functionally identical
        assertEquals(journal.currency(), reparsed.currency());
        assertEquals(journal.commodities().size(), reparsed.commodities().size());
        assertEquals(journal.accounts().size(), reparsed.accounts().size());
        assertEquals(journal.transactions().size(), reparsed.transactions().size());
        
        // Verify the transaction is still balanced
        assertTrue(reparsed.transactions().get(0).isBalanced());
    }
    
    @Test
    void testRoundTripPreservesDecimalPrecision() {
        String original = """
            commodity CHF 1000.00
            
            account 1 Assets
              ; type:Asset
            
            account 2 Equity
              ; type:Equity
            
            2025-01-01 * Precision Test
                1 Assets    CHF 123.45
                2 Equity    CHF -123.45
            """;
        
        Journal journal1 = parser.parse(original);
        String serialized = serializer.serialize(journal1);
        Journal journal2 = parser.parse(serialized);
        
        BigDecimal amount1 = journal1.transactions().get(0).postings().get(0).amount().quantity();
        BigDecimal amount2 = journal2.transactions().get(0).postings().get(0).amount().quantity();
        
        assertEquals(0, amount1.compareTo(amount2), "Decimal precision should be preserved");
        assertEquals(amount1.scale(), amount2.scale(), "Decimal scale should be preserved");
    }
}
