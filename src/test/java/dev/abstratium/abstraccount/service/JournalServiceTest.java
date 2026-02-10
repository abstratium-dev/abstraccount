package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.model.*;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
class JournalServiceTest {
    
    @Inject
    JournalService journalService;
    
    private Journal testJournal;
    private Account assetsAccount;
    private Account cashAccount;
    private Account equityAccount;
    private Account revenueAccount;
    private Account expenseAccount;
    
    @BeforeEach
    void setUp() {
        // Create test accounts
        assetsAccount = Account.root("1", "1 Assets", AccountType.ASSET, "Company assets");
        cashAccount = Account.child("100", "1 Assets:100 Cash", AccountType.CASH, "Cash on hand", assetsAccount);
        equityAccount = Account.root("2", "2 Equity", AccountType.EQUITY, "Owner equity");
        revenueAccount = Account.root("3", "3 Revenue", AccountType.REVENUE, "Sales revenue");
        expenseAccount = Account.root("4", "4 Expenses", AccountType.EXPENSE, "Operating expenses");
        
        // Create test transactions
        Transaction tx1 = createTransaction(
            LocalDate.of(2025, 1, 1),
            TransactionStatus.CLEARED,
            "Opening Balance",
            List.of(
                Posting.simple(cashAccount, Amount.of("CHF", "1000.00")),
                Posting.simple(equityAccount, Amount.of("CHF", "-1000.00"))
            )
        );
        
        Transaction tx2 = createTransaction(
            LocalDate.of(2025, 1, 15),
            TransactionStatus.CLEARED,
            "Revenue from sales",
            List.of(
                Posting.simple(cashAccount, Amount.of("CHF", "500.00")),
                Posting.simple(revenueAccount, Amount.of("CHF", "-500.00"))
            )
        );
        
        Transaction tx3 = createTransaction(
            LocalDate.of(2025, 1, 20),
            TransactionStatus.CLEARED,
            "Office supplies",
            List.of(
                Posting.simple(expenseAccount, Amount.of("CHF", "150.00")),
                Posting.simple(cashAccount, Amount.of("CHF", "-150.00"))
            )
        );
        
        Transaction tx4 = createTransaction(
            LocalDate.of(2025, 2, 1),
            TransactionStatus.PENDING,
            "Pending sale",
            List.of(
                Posting.simple(cashAccount, Amount.of("CHF", "200.00")),
                Posting.simple(revenueAccount, Amount.of("CHF", "-200.00"))
            )
        );
        
        Commodity chf = new Commodity("CHF", new BigDecimal("1000.00"));
        
        testJournal = new Journal(
            null, null, null, "CHF",
            List.of(chf),
            List.of(assetsAccount, cashAccount, equityAccount, revenueAccount, expenseAccount),
            List.of(tx1, tx2, tx3, tx4)
        );
    }
    
    private Transaction createTransaction(LocalDate date, TransactionStatus status, String description, List<Posting> postings) {
        return Transaction.simple(date, status, description, postings);
    }
    
    @Test
    void testGetAccountBalanceAtSpecificDate() {
        // Balance as of 2025-01-01 (only opening transaction)
        Map<String, BigDecimal> balance1 = journalService.getAccountBalance(
            testJournal, cashAccount, LocalDate.of(2025, 1, 1)
        );
        
        assertEquals(1, balance1.size());
        assertEquals(0, new BigDecimal("1000.00").compareTo(balance1.get("CHF")));
        
        // Balance as of 2025-01-15 (opening + revenue)
        Map<String, BigDecimal> balance2 = journalService.getAccountBalance(
            testJournal, cashAccount, LocalDate.of(2025, 1, 15)
        );
        
        assertEquals(1, balance2.size());
        assertEquals(0, new BigDecimal("1500.00").compareTo(balance2.get("CHF")));
        
        // Balance as of 2025-01-20 (opening + revenue - expense)
        Map<String, BigDecimal> balance3 = journalService.getAccountBalance(
            testJournal, cashAccount, LocalDate.of(2025, 1, 20)
        );
        
        assertEquals(1, balance3.size());
        assertEquals(0, new BigDecimal("1350.00").compareTo(balance3.get("CHF")));
        
        // Balance as of 2025-02-01 (all transactions)
        Map<String, BigDecimal> balance4 = journalService.getAccountBalance(
            testJournal, cashAccount, LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(1, balance4.size());
        assertEquals(0, new BigDecimal("1550.00").compareTo(balance4.get("CHF")));
    }
    
    @Test
    void testGetAccountBalanceByName() {
        Map<String, BigDecimal> balance = journalService.getAccountBalanceByName(
            testJournal, "1 Assets:100 Cash", LocalDate.of(2025, 1, 20)
        );
        
        assertEquals(1, balance.size());
        assertEquals(0, new BigDecimal("1350.00").compareTo(balance.get("CHF")));
    }
    
    @Test
    void testGetAccountBalanceForEquityAccount() {
        // Equity should have negative balance (credit normal)
        Map<String, BigDecimal> balance = journalService.getAccountBalance(
            testJournal, equityAccount, LocalDate.of(2025, 1, 1)
        );
        
        assertEquals(1, balance.size());
        assertEquals(0, new BigDecimal("-1000.00").compareTo(balance.get("CHF")));
    }
    
    @Test
    void testGetAccountBalanceForRevenueAccount() {
        // Revenue should accumulate negative balances
        Map<String, BigDecimal> balance = journalService.getAccountBalance(
            testJournal, revenueAccount, LocalDate.of(2025, 2, 1)
        );
        
        assertEquals(1, balance.size());
        assertEquals(0, new BigDecimal("-700.00").compareTo(balance.get("CHF")));
    }
    
    @Test
    void testGetAccountBalanceForExpenseAccount() {
        Map<String, BigDecimal> balance = journalService.getAccountBalance(
            testJournal, expenseAccount, LocalDate.of(2025, 1, 20)
        );
        
        assertEquals(1, balance.size());
        assertEquals(0, new BigDecimal("150.00").compareTo(balance.get("CHF")));
    }
    
    @Test
    void testGetAccountBalanceBeforeAnyTransactions() {
        Map<String, BigDecimal> balance = journalService.getAccountBalance(
            testJournal, cashAccount, LocalDate.of(2024, 12, 31)
        );
        
        assertTrue(balance.isEmpty(), "Balance should be empty before any transactions");
    }
    
    @Test
    void testFilterTransactionsOnOrBefore() {
        List<Transaction> filtered = journalService.filterTransactions(
            testJournal, TransactionFilters.onOrBefore(LocalDate.of(2025, 1, 15))
        );
        
        assertEquals(2, filtered.size());
        assertEquals("Opening Balance", filtered.get(0).description());
        assertEquals("Revenue from sales", filtered.get(1).description());
    }
    
    @Test
    void testFilterTransactionsBetweenDates() {
        List<Transaction> filtered = journalService.filterTransactions(
            testJournal,
            TransactionFilters.between(LocalDate.of(2025, 1, 10), LocalDate.of(2025, 1, 25))
        );
        
        assertEquals(2, filtered.size());
        assertEquals("Revenue from sales", filtered.get(0).description());
        assertEquals("Office supplies", filtered.get(1).description());
    }
    
    @Test
    void testFilterTransactionsByStatus() {
        List<Transaction> cleared = journalService.filterTransactions(
            testJournal, TransactionFilters.withStatus(TransactionStatus.CLEARED)
        );
        
        assertEquals(3, cleared.size());
        
        List<Transaction> pending = journalService.filterTransactions(
            testJournal, TransactionFilters.withStatus(TransactionStatus.PENDING)
        );
        
        assertEquals(1, pending.size());
        assertEquals("Pending sale", pending.get(0).description());
    }
    
    @Test
    void testFilterTransactionsAffectingAccount() {
        List<Transaction> cashTransactions = journalService.filterTransactions(
            testJournal, TransactionFilters.affectingAccount(cashAccount)
        );
        
        assertEquals(4, cashTransactions.size());
        
        List<Transaction> expenseTransactions = journalService.filterTransactions(
            testJournal, TransactionFilters.affectingAccount(expenseAccount)
        );
        
        assertEquals(1, expenseTransactions.size());
        assertEquals("Office supplies", expenseTransactions.get(0).description());
    }
    
    @Test
    void testFilterTransactionsDescriptionContains() {
        List<Transaction> filtered = journalService.filterTransactions(
            testJournal, TransactionFilters.descriptionContains("revenue")
        );
        
        assertEquals(1, filtered.size());
        assertEquals("Revenue from sales", filtered.get(0).description());
    }
    
    @Test
    void testCombinedFilters() {
        // Find cleared transactions affecting cash account in January
        TransactionFilter combinedFilter = TransactionFilters.withStatus(TransactionStatus.CLEARED)
            .and(TransactionFilters.affectingAccount(cashAccount))
            .and(TransactionFilters.between(LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 31)));
        
        List<Transaction> filtered = journalService.filterTransactions(testJournal, combinedFilter);
        
        assertEquals(3, filtered.size());
    }
    
    @Test
    void testGetTransactionsForAccount() {
        List<Transaction> transactions = journalService.getTransactionsForAccount(testJournal, revenueAccount);
        
        assertEquals(2, transactions.size());
        assertTrue(transactions.stream().allMatch(tx -> 
            tx.postings().stream().anyMatch(p -> p.account().equals(revenueAccount))
        ));
    }
    
    @Test
    void testGetTransactionsInDateRange() {
        List<Transaction> transactions = journalService.getTransactionsInDateRange(
            testJournal,
            LocalDate.of(2025, 1, 15),
            LocalDate.of(2025, 1, 20)
        );
        
        assertEquals(2, transactions.size());
    }
    
    @Test
    void testGetAllAccountBalances() {
        Map<String, Map<String, BigDecimal>> allBalances = journalService.getAllAccountBalances(
            testJournal, LocalDate.of(2025, 1, 20)
        );
        
        // Should have balances for cash, equity, revenue, and expense accounts
        assertTrue(allBalances.containsKey("1 Assets:100 Cash"));
        assertTrue(allBalances.containsKey("2 Equity"));
        assertTrue(allBalances.containsKey("3 Revenue"));
        assertTrue(allBalances.containsKey("4 Expenses"));
        
        // Verify cash balance
        assertEquals(0, new BigDecimal("1350.00").compareTo(allBalances.get("1 Assets:100 Cash").get("CHF")));
    }
    
    @Test
    void testFindUnbalancedTransactions() {
        List<Transaction> unbalanced = journalService.findUnbalancedTransactions(testJournal);
        
        assertTrue(unbalanced.isEmpty(), "All test transactions should be balanced");
    }
    
    @Test
    void testFindUnbalancedTransactionsWithUnbalancedData() {
        // Create an unbalanced transaction
        Transaction unbalancedTx = Transaction.simple(
            LocalDate.of(2025, 3, 1),
            TransactionStatus.CLEARED,
            "Unbalanced",
            List.of(
                Posting.simple(cashAccount, Amount.of("CHF", "100.00")),
                Posting.simple(equityAccount, Amount.of("CHF", "-50.00"))
            )
        );
        
        Journal journalWithUnbalanced = new Journal(
            null, null, null, "CHF",
            testJournal.commodities(),
            testJournal.accounts(),
            List.of(unbalancedTx)
        );
        
        List<Transaction> unbalanced = journalService.findUnbalancedTransactions(journalWithUnbalanced);
        
        assertEquals(1, unbalanced.size());
        assertEquals("Unbalanced", unbalanced.get(0).description());
    }
    
    @Test
    void testMultipleCommodities() {
        // Create transactions with multiple commodities
        Transaction multiCommodityTx = Transaction.simple(
            LocalDate.of(2025, 1, 5),
            TransactionStatus.CLEARED,
            "Multi-currency",
            List.of(
                Posting.simple(cashAccount, Amount.of("CHF", "100.00")),
                Posting.simple(cashAccount, Amount.of("USD", "50.00")),
                Posting.simple(equityAccount, Amount.of("CHF", "-100.00")),
                Posting.simple(equityAccount, Amount.of("USD", "-50.00"))
            )
        );
        
        Journal multiCommodityJournal = new Journal(
            null, null, null, "CHF",
            testJournal.commodities(),
            testJournal.accounts(),
            List.of(multiCommodityTx)
        );
        
        Map<String, BigDecimal> balance = journalService.getAccountBalance(
            multiCommodityJournal, cashAccount, LocalDate.of(2025, 1, 5)
        );
        
        assertEquals(2, balance.size());
        assertEquals(0, new BigDecimal("100.00").compareTo(balance.get("CHF")));
        assertEquals(0, new BigDecimal("50.00").compareTo(balance.get("USD")));
    }
    
    @Test
    void testNullJournalThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
            journalService.getAccountBalance(null, cashAccount, LocalDate.now())
        );
    }
    
    @Test
    void testNullAccountThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
            journalService.getAccountBalance(testJournal, null, LocalDate.now())
        );
    }
    
    @Test
    void testNullDateThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
            journalService.getAccountBalance(testJournal, cashAccount, null)
        );
    }
    
    @Test
    void testNullFilterThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
            journalService.filterTransactions(testJournal, null)
        );
    }
    
    @Test
    void testAccountNotFoundThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
            journalService.getAccountBalanceByName(testJournal, "NonExistent Account", LocalDate.now())
        );
    }
}
