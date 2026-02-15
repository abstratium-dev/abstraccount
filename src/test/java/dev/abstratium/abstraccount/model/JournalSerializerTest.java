package dev.abstratium.abstraccount.model;

import dev.abstratium.abstraccount.service.JournalSerializer;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JournalSerializerTest {
    
    private final JournalSerializer serializer = new JournalSerializer();
    
    @Test
    void testSerializeMetadata() {
        Journal journal = new Journal(
            "https://example.com/logo.png",
            "Test Company",
            "123 Main St",
            "CHF",
            List.of(),
            List.of(),
            List.of()
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("; logo: https://example.com/logo.png"));
        assertTrue(result.contains("; title: Test Company"));
        assertTrue(result.contains("; subtitle: 123 Main St"));
        assertTrue(result.contains("; Currency: CHF"));
    }
    
    @Test
    void testSerializeCommodity() {
        Commodity chf = new Commodity("CHF", new BigDecimal("1000.00"));
        Commodity usd = new Commodity("USD", new BigDecimal("1000.000"));
        
        Journal journal = new Journal(
            null, null, null, "CHF",
            List.of(chf, usd),
            List.of(),
            List.of()
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("commodity CHF 1000.00"));
        assertTrue(result.contains("commodity USD 1000.000"));
    }
    
    @Test
    void testSerializeAccount() {
        Account rootAccount = Account.root("1", "Assets", AccountType.ASSET, "All assets");
        Account childAccount = Account.child("10", "Current Assets", AccountType.ASSET, "Short-term", rootAccount);
        
        Journal journal = new Journal(
            null, null, null, "CHF",
            List.of(),
            List.of(rootAccount, childAccount),
            List.of()
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("account 1 Assets"));
        assertTrue(result.contains("  ; type:Asset"));
        assertTrue(result.contains("  ; note:All assets"));
        assertTrue(result.contains("account 1 Assets:10 Current Assets"));
        assertTrue(result.contains("  ; note:Short-term"));
    }
    
    @Test
    void testSerializeAccountTypes() {
        List<Account> accounts = List.of(
            Account.root("1", "Assets", AccountType.ASSET, null),
            Account.root("2", "Liabilities", AccountType.LIABILITY, null),
            Account.root("3", "Equity", AccountType.EQUITY, null),
            Account.root("4", "Revenue", AccountType.REVENUE, null),
            Account.root("5", "Expenses", AccountType.EXPENSE, null),
            Account.root("6", "Cash", AccountType.CASH, null)
        );
        
        Journal journal = new Journal(
            null, null, null, "CHF",
            List.of(),
            accounts,
            List.of()
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("  ; type:Asset"));
        assertTrue(result.contains("  ; type:Liability"));
        assertTrue(result.contains("  ; type:Equity"));
        assertTrue(result.contains("  ; type:Revenue"));
        assertTrue(result.contains("  ; type:Expense"));
        assertTrue(result.contains("  ; type:Cash"));
    }
    
    @Test
    void testSerializeSimpleTransaction() {
        Account assets = Account.root("1", "Assets", AccountType.ASSET, null);
        Account equity = Account.root("2", "Equity", AccountType.EQUITY, null);
        
        Entry entry1 = Entry.simple(assets, Amount.of("CHF", "1000.00"));
        Entry entry2 = Entry.simple(equity, Amount.of("CHF", "-1000.00"));
        
        Transaction transaction = Transaction.simple(
            LocalDate.of(2025, 1, 1),
            TransactionStatus.CLEARED,
            "Opening Balance",
            List.of(entry1, entry2)
        );
        
        Journal journal = new Journal(
            null, null, null, "CHF",
            List.of(),
            List.of(assets, equity),
            List.of(transaction)
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("2025-01-01 * Opening Balance"));
        assertTrue(result.contains("1 Assets"));
        assertTrue(result.contains("CHF 1000.00"));
        assertTrue(result.contains("2 Equity"));
        assertTrue(result.contains("CHF -1000.00"));
    }
    
    @Test
    void testSerializeTransactionWithId() {
        Account assets = Account.root("1", "Assets", AccountType.ASSET, null);
        Account liabilities = Account.root("2", "Liabilities", AccountType.LIABILITY, null);
        
        Entry entry1 = Entry.simple(assets, Amount.of("CHF", "100.00"));
        Entry entry2 = Entry.simple(liabilities, Amount.of("CHF", "-100.00"));
        
        List<Tag> tags = List.of(
            Tag.keyValue("id", "bcba9da2-81be-4a78-b4a3-fbd856ad7dde"),
            Tag.keyValue("invoice", "PI00000017")
        );
        
        Transaction transaction = new Transaction(
            LocalDate.of(2025, 1, 4),
            TransactionStatus.CLEARED,
            "Purchase",
            null, // partnerId
            "bcba9da2-81be-4a78-b4a3-fbd856ad7dde",
            tags,
            List.of(entry1, entry2)
        );
        
        Journal journal = new Journal(
            null, null, null, "CHF",
            List.of(),
            List.of(assets, liabilities),
            List.of(transaction)
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("2025-01-04 * Purchase"));
        assertTrue(result.contains("; id:bcba9da2-81be-4a78-b4a3-fbd856ad7dde"));
        assertTrue(result.contains("; invoice:PI00000017"));
    }
    
    @Test
    void testSerializeTransactionWithSimpleTags() {
        Account assets = Account.root("1", "Assets", AccountType.ASSET, null);
        Account equity = Account.root("2", "Equity", AccountType.EQUITY, null);
        
        Entry entry1 = Entry.simple(assets, Amount.of("CHF", "0.00"));
        Entry entry2 = Entry.simple(equity, Amount.of("CHF", "0.00"));
        
        List<Tag> tags = List.of(Tag.simple("OpeningBalances"));
        
        Transaction transaction = new Transaction(
            LocalDate.of(2025, 1, 1),
            TransactionStatus.CLEARED,
            "Opening Balances",
            null, // partnerId
            null, // id
            tags,
            List.of(entry1, entry2)
        );
        
        Journal journal = new Journal(
            null, null, null, "CHF",
            List.of(),
            List.of(assets, equity),
            List.of(transaction)
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("; :OpeningBalances:"));
    }
    
    @Test
    void testSerializeTransactionStatuses() {
        Account assets = Account.root("1", "Assets", AccountType.ASSET, null);
        Account equity = Account.root("2", "Equity", AccountType.EQUITY, null);
        
        Entry entry1 = Entry.simple(assets, Amount.of("CHF", "100.00"));
        Entry entry2 = Entry.simple(equity, Amount.of("CHF", "-100.00"));
        
        Transaction cleared = Transaction.simple(
            LocalDate.of(2025, 1, 1),
            TransactionStatus.CLEARED,
            "Cleared",
            List.of(entry1, entry2)
        );
        
        Transaction pending = Transaction.simple(
            LocalDate.of(2025, 1, 2),
            TransactionStatus.PENDING,
            "Pending",
            List.of(entry1, entry2)
        );
        
        Transaction uncleared = Transaction.simple(
            LocalDate.of(2025, 1, 3),
            TransactionStatus.UNCLEARED,
            "Uncleared",
            List.of(entry1, entry2)
        );
        
        Journal journal = new Journal(
            null, null, null, "CHF",
            List.of(),
            List.of(assets, equity),
            List.of(cleared, pending, uncleared)
        );
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("2025-01-01 * Cleared"));
        assertTrue(result.contains("2025-01-02 ! Pending"));
        assertTrue(result.contains("2025-01-03  Uncleared"));
    }
    
    @Test
    void testSerializeNullJournal() {
        assertThrows(IllegalArgumentException.class, () -> serializer.serialize(null));
    }
    
    @Test
    void testSerializeMinimalJournal() {
        Journal journal = Journal.minimal("USD");
        
        String result = serializer.serialize(journal);
        
        assertTrue(result.contains("; Currency: USD"));
        assertFalse(result.contains("logo"));
        assertFalse(result.contains("title"));
    }
}
