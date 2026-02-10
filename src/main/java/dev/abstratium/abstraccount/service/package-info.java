/**
 * Service layer for journal operations following the boundary-service-entity pattern.
 * 
 * <p>This package contains service classes and filters for working with journal data,
 * providing business logic for filtering transactions and calculating account balances.</p>
 * 
 * <h2>Core Components</h2>
 * <ul>
 *   <li>{@link dev.abstratium.abstraccount.service.JournalService} - Main service for journal operations</li>
 *   <li>{@link dev.abstratium.abstraccount.service.TransactionFilter} - Functional interface for filtering transactions</li>
 *   <li>{@link dev.abstratium.abstraccount.service.TransactionFilters} - Factory for common transaction filters</li>
 * </ul>
 * 
 * <h2>Key Features</h2>
 * <ul>
 *   <li>Calculate account balances at specific dates</li>
 *   <li>Filter transactions by date, status, account, tags, and description</li>
 *   <li>Combine filters using AND, OR, and NOT operations</li>
 *   <li>Support for multiple commodities/currencies</li>
 *   <li>Validate transaction balance integrity</li>
 * </ul>
 * 
 * <h2>Usage Example</h2>
 * <pre>{@code
 * @Inject
 * JournalService journalService;
 * 
 * // Get account balance at a specific date
 * Map<String, BigDecimal> balance = journalService.getAccountBalance(
 *     journal, account, LocalDate.of(2025, 1, 31)
 * );
 * 
 * // Filter transactions with combined criteria
 * TransactionFilter filter = TransactionFilters.onOrBefore(LocalDate.of(2025, 12, 31))
 *     .and(TransactionFilters.affectingAccount(account))
 *     .and(TransactionFilters.withStatus(TransactionStatus.CLEARED));
 * 
 * List<Transaction> filtered = journalService.filterTransactions(journal, filter);
 * }</pre>
 * 
 * @see dev.abstratium.abstraccount.model
 */
package dev.abstratium.abstraccount.service;
