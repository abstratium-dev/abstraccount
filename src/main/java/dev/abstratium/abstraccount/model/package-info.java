/**
 * Data model for plain text accounting journal format.
 * 
 * <p>This package contains immutable DTOs (Data Transfer Objects) implemented as Java Records
 * for representing a plain text accounting journal file format, based on a subset of features
 * from plain text accounting applications.</p>
 * 
 * <h2>Core Entities</h2>
 * <ul>
 *   <li>{@link dev.abstratium.abstraccount.model.Journal} - Root entity containing the entire journal</li>
 *   <li>{@link dev.abstratium.abstraccount.model.Commodity} - Currency/commodity declarations</li>
 *   <li>{@link dev.abstratium.abstraccount.model.Account} - Chart of accounts with hierarchical structure</li>
 *   <li>{@link dev.abstratium.abstraccount.model.Transaction} - Financial transactions</li>
 *   <li>{@link dev.abstratium.abstraccount.model.Posting} - Individual account postings within transactions</li>
 *   <li>{@link dev.abstratium.abstraccount.model.Amount} - Monetary amounts with commodity</li>
 *   <li>{@link dev.abstratium.abstraccount.model.Tag} - Metadata tags</li>
 * </ul>
 * 
 * <h2>Enumerations</h2>
 * <ul>
 *   <li>{@link dev.abstratium.abstraccount.model.AccountType} - Types of accounts (Asset, Liability, etc.)</li>
 *   <li>{@link dev.abstratium.abstraccount.model.TransactionStatus} - Transaction reconciliation status</li>
 * </ul>
 * 
 * <h2>Design Principles</h2>
 * <ul>
 *   <li>All DTOs are immutable Java Records</li>
 *   <li>Collections are made immutable using {@link java.util.List#copyOf}</li>
 *   <li>Validation is performed in compact constructors</li>
 *   <li>BigDecimal is used for monetary amounts to avoid floating-point errors</li>
 *   <li>Jackson annotations support JSON serialization/deserialization</li>
 * </ul>
 * 
 * @see dev.abstratium.abstraccount.model.Journal
 */
package dev.abstratium.abstraccount.model;
