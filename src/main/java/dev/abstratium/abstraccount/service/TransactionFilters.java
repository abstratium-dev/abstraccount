package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.model.Account;
import dev.abstratium.abstraccount.model.TransactionStatus;

import java.time.LocalDate;

/**
 * Factory class providing common transaction filters.
 */
public class TransactionFilters {
    
    private TransactionFilters() {
        // Utility class
    }
    
    /**
     * Filter transactions on or before a specific date.
     */
    public static TransactionFilter onOrBefore(LocalDate date) {
        return transaction -> !transaction.date().isAfter(date);
    }
    
    /**
     * Filter transactions on or after a specific date.
     */
    public static TransactionFilter onOrAfter(LocalDate date) {
        return transaction -> !transaction.date().isBefore(date);
    }
    
    /**
     * Filter transactions on a specific date.
     */
    public static TransactionFilter onDate(LocalDate date) {
        return transaction -> transaction.date().equals(date);
    }
    
    /**
     * Filter transactions between two dates (inclusive).
     */
    public static TransactionFilter between(LocalDate startDate, LocalDate endDate) {
        return onOrAfter(startDate).and(onOrBefore(endDate));
    }
    
    /**
     * Filter transactions with a specific status.
     */
    public static TransactionFilter withStatus(TransactionStatus status) {
        return transaction -> transaction.status() == status;
    }
    
    /**
     * Filter transactions that affect a specific account.
     */
    public static TransactionFilter affectingAccount(Account account) {
        return transaction -> transaction.entries().stream()
            .anyMatch(entry -> entry.account().id().equals(account.id()));
    }
    
    /**
     * Filter transactions that affect an account by account id.
     */
    public static TransactionFilter affectingAccountById(String accountId) {
        return transaction -> transaction.entries().stream()
            .anyMatch(entry -> entry.account().id().equals(accountId));
    }
    
    /**
     * Filter transactions with a specific tag key.
     */
    public static TransactionFilter withTag(String tagKey) {
        return transaction -> transaction.hasTag(tagKey);
    }
    
    /**
     * Filter transactions with a specific tag key-value pair.
     */
    public static TransactionFilter withTagValue(String tagKey, String tagValue) {
        return transaction -> tagValue.equals(transaction.getTagValue(tagKey));
    }
    
    /**
     * Filter transactions with a description containing the given text (case-insensitive).
     */
    public static TransactionFilter descriptionContains(String text) {
        return transaction -> transaction.description().toLowerCase().contains(text.toLowerCase());
    }
    
    /**
     * Filter that matches all transactions.
     */
    public static TransactionFilter all() {
        return transaction -> true;
    }
    
    /**
     * Filter that matches no transactions.
     */
    public static TransactionFilter none() {
        return transaction -> false;
    }
}
