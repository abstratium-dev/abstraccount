package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.model.*;
import jakarta.enterprise.context.ApplicationScoped;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service class for journal operations following the boundary-service-entity pattern.
 * Provides business logic for working with journals, including filtering and balance calculations.
 */
@ApplicationScoped
public class JournalService {
    
    /**
     * Filters transactions from a journal based on the given filter.
     * 
     * @param journal the journal to filter
     * @param filter the filter to apply
     * @return list of transactions matching the filter
     */
    public List<Transaction> filterTransactions(Journal journal, TransactionFilter filter) {
        if (journal == null) {
            throw new IllegalArgumentException("Journal cannot be null");
        }
        if (filter == null) {
            throw new IllegalArgumentException("Filter cannot be null");
        }
        
        return journal.transactions().stream()
            .filter(filter::matches)
            .sorted((t1, t2) -> t2.transactionDate().compareTo(t1.transactionDate()))
            .toList();
    }
    
    /**
     * Calculates the balance of a specific account at a given date.
     * Includes all transactions on or before the specified date.
     * 
     * @param journal the journal containing the transactions
     * @param account the account to calculate balance for
     * @param asOfDate the date to calculate balance as of (inclusive)
     * @return map of commodity to balance amount
     */
    public Map<String, BigDecimal> getAccountBalance(Journal journal, Account account, LocalDate asOfDate) {
        if (journal == null) {
            throw new IllegalArgumentException("Journal cannot be null");
        }
        if (account == null) {
            throw new IllegalArgumentException("Account cannot be null");
        }
        if (asOfDate == null) {
            throw new IllegalArgumentException("Date cannot be null");
        }
        
        TransactionFilter filter = TransactionFilters.onOrBefore(asOfDate)
            .and(TransactionFilters.affectingAccount(account));
        
        List<Transaction> relevantTransactions = filterTransactions(journal, filter);
        
        return calculateBalanceFromTransactions(relevantTransactions, account);
    }
    
    /**
     * Calculates the balance of an account by name at a given date.
     * 
     * @param journal the journal containing the transactions
     * @param accountName the full name of the account
     * @param asOfDate the date to calculate balance as of (inclusive)
     * @return map of commodity to balance amount
     */
    public Map<String, BigDecimal> getAccountBalanceByName(Journal journal, String accountName, LocalDate asOfDate) {
        if (accountName == null || accountName.isBlank()) {
            throw new IllegalArgumentException("Account name cannot be null or blank");
        }
        
        Account account = journal.findAccount(accountName)
            .orElseGet(() -> journal.accounts().stream()
                .filter(a -> a.fullName().equals(accountName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + accountName)));
        
        return getAccountBalance(journal, account, asOfDate);
    }
    
    /**
     * Calculates the current balance of an account (as of today).
     * 
     * @param journal the journal containing the transactions
     * @param account the account to calculate balance for
     * @return map of commodity to balance amount
     */
    public Map<String, BigDecimal> getCurrentAccountBalance(Journal journal, Account account) {
        return getAccountBalance(journal, account, LocalDate.now());
    }
    
    /**
     * Calculates balances for all accounts at a specific date.
     * 
     * @param journal the journal containing the transactions
     * @param asOfDate the date to calculate balances as of
     * @return map of account full name to commodity-balance map
     */
    public Map<String, Map<String, BigDecimal>> getAllAccountBalances(Journal journal, LocalDate asOfDate) {
        if (journal == null) {
            throw new IllegalArgumentException("Journal cannot be null");
        }
        if (asOfDate == null) {
            throw new IllegalArgumentException("Date cannot be null");
        }
        
        Map<String, Map<String, BigDecimal>> balances = new HashMap<>();
        
        for (Account account : journal.accounts()) {
            Map<String, BigDecimal> accountBalance = getAccountBalance(journal, account, asOfDate);
            if (!accountBalance.isEmpty()) {
                balances.put(account.fullName(), accountBalance);
            }
        }
        
        return balances;
    }
    
    /**
     * Gets all transactions affecting a specific account.
     * 
     * @param journal the journal to search
     * @param account the account to find transactions for
     * @return list of transactions affecting the account
     */
    public List<Transaction> getTransactionsForAccount(Journal journal, Account account) {
        return filterTransactions(journal, TransactionFilters.affectingAccount(account));
    }
    
    /**
     * Gets all transactions within a date range.
     * 
     * @param journal the journal to search
     * @param startDate the start date (inclusive)
     * @param endDate the end date (inclusive)
     * @return list of transactions in the date range
     */
    public List<Transaction> getTransactionsInDateRange(Journal journal, LocalDate startDate, LocalDate endDate) {
        return filterTransactions(journal, TransactionFilters.between(startDate, endDate));
    }
    
    /**
     * Validates that all transactions in the journal are balanced.
     * 
     * @param journal the journal to validate
     * @return list of unbalanced transactions (empty if all are balanced)
     */
    public List<Transaction> findUnbalancedTransactions(Journal journal) {
        if (journal == null) {
            throw new IllegalArgumentException("Journal cannot be null");
        }
        
        return journal.transactions().stream()
            .filter(tx -> !tx.isBalanced())
            .sorted((t1, t2) -> t2.transactionDate().compareTo(t1.transactionDate()))
            .toList();
    }
    
    /**
     * Helper method to calculate balance from a list of transactions for a specific account.
     */
    private Map<String, BigDecimal> calculateBalanceFromTransactions(List<Transaction> transactions, Account account) {
        Map<String, BigDecimal> balances = new HashMap<>();
        
        for (Transaction transaction : transactions) {
            for (var posting : transaction.postings()) {
                if (posting.account().fullName().equals(account.fullName())) {
                    String commodity = posting.amount().commodity();
                    BigDecimal currentBalance = balances.getOrDefault(commodity, BigDecimal.ZERO);
                    balances.put(commodity, currentBalance.add(posting.amount().quantity()));
                }
            }
        }
        
        return balances;
    }
}
