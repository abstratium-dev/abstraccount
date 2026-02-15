package dev.abstratium.abstraccount.service;

import jakarta.enterprise.context.ApplicationScoped;

import dev.abstratium.abstraccount.model.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parser for plain text accounting journal format.
 * Converts journal file content (as a string) into Journal model objects.
 */
@ApplicationScoped
public class JournalParser {
    
    private static final Pattern METADATA_PATTERN = Pattern.compile("^;\\s*([^:]+):\\s*(.*)$");
    private static final Pattern COMMODITY_PATTERN = Pattern.compile("^commodity\\s+(\\S+)\\s+(\\S+)$");
    private static final Pattern ACCOUNT_PATTERN = Pattern.compile("^account\\s+(.+)$");
    private static final Pattern TRANSACTION_PATTERN = Pattern.compile("^(\\d{4}-\\d{2}-\\d{2})\\s+([*!]?)\\s*(.+)$");
    private static final Pattern ENTRY_PATTERN = Pattern.compile("^\\s{4}(.+?)\\s{2,}(\\S+)\\s+(-?\\S+)$");
    private static final Pattern ELLIPSIS_PATTERN = Pattern.compile("^\\s{4}\\.\\.\\.$");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    
    /**
     * Parses a journal file content string into a Journal object.
     */
    public Journal parse(String content) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Content cannot be null or blank");
        }
        
        String[] lines = content.split("\\r?\\n");
        
        String logo = null;
        String title = null;
        String subtitle = null;
        String currency = null;
        List<Commodity> commodities = new ArrayList<>();
        List<Account> accounts = new ArrayList<>();
        Map<String, Account> accountMap = new HashMap<>();
        List<Transaction> transactions = new ArrayList<>();
        
        int i = 0;
        while (i < lines.length) {
            String line = lines[i];
            
            // Skip empty lines and separator comments
            if (line.isBlank() || line.trim().startsWith("; ====")) {
                i++;
                continue;
            }
            
            // Parse metadata comments
            if (line.trim().startsWith(";")) {
                Matcher metaMatcher = METADATA_PATTERN.matcher(line.trim());
                if (metaMatcher.matches()) {
                    String key = metaMatcher.group(1).trim();
                    String value = metaMatcher.group(2).trim();
                    
                    switch (key.toLowerCase()) {
                        case "logo" -> logo = value;
                        case "title" -> title = value;
                        case "subtitle" -> subtitle = value;
                        case "currency" -> currency = value;
                    }
                }
                i++;
                continue;
            }
            
            // Parse commodity declarations
            Matcher commodityMatcher = COMMODITY_PATTERN.matcher(line.trim());
            if (commodityMatcher.matches()) {
                String code = commodityMatcher.group(1);
                BigDecimal precision = new BigDecimal(commodityMatcher.group(2));
                commodities.add(new Commodity(code, precision));
                i++;
                continue;
            }
            
            // Parse account declarations
            Matcher accountMatcher = ACCOUNT_PATTERN.matcher(line.trim());
            if (accountMatcher.matches()) {
                String fullPath = accountMatcher.group(1);
                String accountId = extractAccountNumber(fullPath);
                String accountName = extractAccountName(fullPath);
                
                // Look ahead for type and note
                AccountType type = AccountType.ASSET; // default
                String note = null;
                
                while (i + 1 < lines.length && lines[i + 1].trim().startsWith(";")) {
                    i++;
                    Matcher typeMatcher = METADATA_PATTERN.matcher(lines[i].trim());
                    if (typeMatcher.matches()) {
                        String key = typeMatcher.group(1).trim();
                        String value = typeMatcher.group(2).trim();
                        
                        if ("type".equalsIgnoreCase(key)) {
                            type = parseAccountType(value);
                        } else if ("note".equalsIgnoreCase(key)) {
                            note = value;
                        }
                    }
                }
                
                // Determine parent account
                Account parent = findParentAccount(fullPath, accountMap);
                Account account = parent == null 
                    ? Account.root(accountId, accountName, type, note)
                    : Account.child(accountId, accountName, type, note, parent);
                accounts.add(account);
                accountMap.put(fullPath, account);
                
                i++;
                continue;
            }
            
            // Parse transactions
            Matcher transactionMatcher = TRANSACTION_PATTERN.matcher(line.trim());
            if (transactionMatcher.matches()) {
                LocalDate date = LocalDate.parse(transactionMatcher.group(1), DATE_FORMATTER);
                String statusStr = transactionMatcher.group(2);
                TransactionStatus status = parseTransactionStatus(statusStr);
                String fullDescription = transactionMatcher.group(3);
                
                // Extract partner ID and description
                // Format: "P00000002 IFJ Institut für Jungunternehmen AG | Pre-payment to IFJ"
                // Partner is before the pipe, description is after
                String partnerId = null;
                String description = fullDescription;
                
                if (fullDescription.contains("|")) {
                    String[] parts = fullDescription.split("\\|", 2);
                    String partnerPart = parts[0].trim();
                    description = parts.length > 1 ? parts[1].trim() : fullDescription;
                    
                    if (!partnerPart.isEmpty()) {
                        // Extract first word as partner ID
                        String[] words = partnerPart.split("\\s+", 2);
                        partnerId = words[0];
                    }
                }
                
                // Look ahead for transaction tags
                List<Tag> transactionTags = new ArrayList<>();
                String transactionId = null;
                
                while (i + 1 < lines.length && lines[i + 1].trim().startsWith(";")) {
                    i++;
                    String tagLine = lines[i].trim().substring(1).trim(); // Remove leading ;
                    
                    // Split by comma to handle multiple tags on one line
                    String[] tagParts = tagLine.split(",");
                    
                    for (String tagPart : tagParts) {
                        tagPart = tagPart.trim();
                        if (tagPart.isEmpty()) {
                            continue;
                        }
                        
                        // Parse tags
                        if (tagPart.startsWith(":") && tagPart.endsWith(":")) {
                            // Simple tag
                            String tagKey = tagPart.substring(1, tagPart.length() - 1);
                            transactionTags.add(Tag.simple(tagKey));
                        } else {
                            // Key-value tag
                            Matcher tagMatcher = METADATA_PATTERN.matcher(";" + tagPart);
                            if (tagMatcher.matches()) {
                                String key = tagMatcher.group(1).trim();
                                String value = tagMatcher.group(2).trim();
                                
                                if ("id".equalsIgnoreCase(key)) {
                                    transactionId = value;
                                    // Don't add id tag to the tags list
                                } else {
                                    transactionTags.add(Tag.keyValue(key, value));
                                }
                            }
                        }
                    }
                }
                
                // Parse entries
                List<Entry> entries = new ArrayList<>();
                while (i + 1 < lines.length) {
                    String entryLine = lines[i + 1];
                    
                    // Check for ellipsis
                    if (ELLIPSIS_PATTERN.matcher(entryLine).matches()) {
                        i++;
                        continue;
                    }
                    
                    Matcher entryMatcher = ENTRY_PATTERN.matcher(entryLine);
                    if (entryMatcher.matches()) {
                        String accountName = entryMatcher.group(1).trim();
                        String commodity = entryMatcher.group(2);
                        String amountStr = entryMatcher.group(3);
                        
                        Account account = accountMap.get(accountName);
                        if (account == null) {
                            // Account not declared, create a minimal one
                            String accId = extractAccountNumber(accountName);
                            String accName = extractAccountName(accountName);
                            Account parent = findOrCreateParentAccount(accountName, accountMap, accounts);
                            account = parent == null
                                ? Account.root(accId, accName, AccountType.ASSET, null)
                                : Account.child(accId, accName, AccountType.ASSET, null, parent);
                            accountMap.put(accountName, account);
                            accounts.add(account);
                        }
                        
                        Amount amount = Amount.of(commodity, amountStr);
                        entries.add(Entry.simple(account, amount));
                        i++;
                    } else {
                        break;
                    }
                }
                
                if (!entries.isEmpty()) {
                    Transaction transaction = new Transaction(date, status, description, partnerId, transactionId, transactionTags, entries);
                    transactions.add(transaction);
                }
                
                i++;
                continue;
            }
            
            i++;
        }
        
        // Use default currency if not specified
        if (currency == null) {
            currency = "CHF";
        }
        
        return new Journal(logo, title, subtitle, currency, commodities, accounts, transactions);
    }
    
    private String extractAccountNumber(String fullPath) {
        // Extract the account number from the last segment after the last colon
        // For "1 Assets:10 Cash", this returns "10"
        // For "1 Assets", this returns "1"
        // For "2 Liabilities:220 Other:2210.001 Person", this returns "2210.001"
        int lastColon = fullPath.lastIndexOf(':');
        String segment = lastColon > 0 ? fullPath.substring(lastColon + 1) : fullPath;
        
        // Extract the leading number (including decimals) from the segment
        String[] parts = segment.split("\\s+", 2);
        if (parts.length > 0 && parts[0].matches("\\d+(\\.\\d+)?")) {
            return parts[0];
        }
        return "0";
    }
    
    private String extractAccountName(String fullPath) {
        // Extract just the account's own name (last segment) from the full hierarchical path
        // For "1 Assets:10 Cash:100 Bank", this returns "Bank"
        // For "1 Assets", this returns "Assets"
        int lastColon = fullPath.lastIndexOf(':');
        String segment = lastColon > 0 ? fullPath.substring(lastColon + 1) : fullPath;
        
        // Remove the leading number from the segment
        // "100 Bank" becomes "Bank"
        // "1 Assets" becomes "Assets"
        String[] parts = segment.split("\\s+", 2);
        if (parts.length > 1 && parts[0].matches("\\d+(\\.\\d+)?")) {
            return parts[1];
        }
        return segment;
    }
    
    private Account findParentAccount(String fullPath, Map<String, Account> accountMap) {
        // Find parent by removing the last segment after the last colon
        int lastColon = fullPath.lastIndexOf(':');
        if (lastColon > 0) {
            String parentPath = fullPath.substring(0, lastColon);
            return accountMap.get(parentPath);
        }
        return null;
    }
    
    private Account findOrCreateParentAccount(String fullPath, Map<String, Account> accountMap, List<Account> accounts) {
        // Find parent by removing the last segment after the last colon
        int lastColon = fullPath.lastIndexOf(':');
        if (lastColon > 0) {
            String parentPath = fullPath.substring(0, lastColon);
            Account parent = accountMap.get(parentPath);
            
            if (parent == null) {
                // Parent doesn't exist, create it recursively
                String parentId = extractAccountNumber(parentPath);
                String parentName = extractAccountName(parentPath);
                Account grandparent = findOrCreateParentAccount(parentPath, accountMap, accounts);
                parent = grandparent == null
                    ? Account.root(parentId, parentName, AccountType.ASSET, null)
                    : Account.child(parentId, parentName, AccountType.ASSET, null, grandparent);
                accountMap.put(parentPath, parent);
                accounts.add(parent);
            }
            
            return parent;
        }
        return null;
    }
    
    private AccountType parseAccountType(String typeStr) {
        return switch (typeStr.toUpperCase()) {
            case "ASSET" -> AccountType.ASSET;
            case "LIABILITY" -> AccountType.LIABILITY;
            case "EQUITY" -> AccountType.EQUITY;
            case "REVENUE" -> AccountType.REVENUE;
            case "EXPENSE" -> AccountType.EXPENSE;
            case "CASH" -> AccountType.CASH;
            default -> AccountType.ASSET;
        };
    }
    
    private TransactionStatus parseTransactionStatus(String statusStr) {
        return switch (statusStr) {
            case "*" -> TransactionStatus.CLEARED;
            case "!" -> TransactionStatus.PENDING;
            default -> TransactionStatus.UNCLEARED;
        };
    }
}
