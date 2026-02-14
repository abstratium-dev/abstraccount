package dev.abstratium.abstraccount.model;

import jakarta.enterprise.context.ApplicationScoped;

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
    private static final Pattern POSTING_PATTERN = Pattern.compile("^\\s{4}(.+?)\\s{2,}(\\S+)\\s+(-?\\S+)$");
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
                String fullName = accountMatcher.group(1);
                String accountNumber = extractAccountNumber(fullName);
                
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
                Account parent = findParentAccount(fullName, accountMap);
                Account account = new Account(accountNumber, fullName, type, note, parent);
                accounts.add(account);
                accountMap.put(fullName, account);
                
                i++;
                continue;
            }
            
            // Parse transactions
            Matcher transactionMatcher = TRANSACTION_PATTERN.matcher(line.trim());
            if (transactionMatcher.matches()) {
                LocalDate date = LocalDate.parse(transactionMatcher.group(1), DATE_FORMATTER);
                String statusStr = transactionMatcher.group(2);
                TransactionStatus status = parseTransactionStatus(statusStr);
                String description = transactionMatcher.group(3);
                
                // Extract partner ID from description (first word after pipe separator)
                String partnerId = null;
                if (description.contains("|")) {
                    String[] parts = description.split("\\|", 2);
                    if (parts.length > 1) {
                        String partnerPart = parts[1].trim();
                        if (!partnerPart.isEmpty()) {
                            // Extract first word as partner ID
                            String[] words = partnerPart.split("\\s+", 2);
                            partnerId = words[0];
                        }
                    }
                }
                
                // Look ahead for transaction tags
                List<Tag> transactionTags = new ArrayList<>();
                String transactionId = null;
                
                while (i + 1 < lines.length && lines[i + 1].trim().startsWith(";")) {
                    i++;
                    String tagLine = lines[i].trim().substring(1).trim(); // Remove leading ;
                    
                    // Parse tags
                    if (tagLine.startsWith(":") && tagLine.endsWith(":")) {
                        // Simple tag
                        String tagKey = tagLine.substring(1, tagLine.length() - 1);
                        transactionTags.add(Tag.simple(tagKey));
                    } else {
                        // Key-value tag
                        Matcher tagMatcher = METADATA_PATTERN.matcher(";" + tagLine);
                        if (tagMatcher.matches()) {
                            String key = tagMatcher.group(1).trim();
                            String value = tagMatcher.group(2).trim();
                            
                            if ("id".equalsIgnoreCase(key)) {
                                transactionId = value;
                            }
                            transactionTags.add(Tag.keyValue(key, value));
                        }
                    }
                }
                
                // Parse postings
                List<Posting> postings = new ArrayList<>();
                while (i + 1 < lines.length) {
                    String postingLine = lines[i + 1];
                    
                    // Check for ellipsis
                    if (ELLIPSIS_PATTERN.matcher(postingLine).matches()) {
                        i++;
                        continue;
                    }
                    
                    Matcher postingMatcher = POSTING_PATTERN.matcher(postingLine);
                    if (postingMatcher.matches()) {
                        String accountName = postingMatcher.group(1).trim();
                        String commodity = postingMatcher.group(2);
                        String amountStr = postingMatcher.group(3);
                        
                        Account account = accountMap.get(accountName);
                        if (account == null) {
                            // Account not declared, create a minimal one
                            String accNumber = extractAccountNumber(accountName);
                            Account parent = findOrCreateParentAccount(accountName, accountMap, accounts);
                            account = new Account(accNumber, accountName, AccountType.ASSET, null, parent);
                            accountMap.put(accountName, account);
                            accounts.add(account);
                        }
                        
                        Amount amount = Amount.of(commodity, amountStr);
                        postings.add(Posting.simple(account, amount));
                        i++;
                    } else {
                        break;
                    }
                }
                
                if (!postings.isEmpty()) {
                    Transaction transaction = new Transaction(date, status, description, partnerId, transactionId, transactionTags, postings);
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
    
    private String extractAccountNumber(String fullName) {
        // Extract the account number from the last segment after the last colon
        // For "1 Assets:10 Cash", this returns "10"
        // For "1 Assets", this returns "1"
        // For "2 Liabilities:220 Other:2210.001 Person", this returns "2210.001"
        String accountName = extractAccountName(fullName);
        
        // Extract the leading number (including decimals) from the account name
        String[] parts = accountName.split("\\s+", 2);
        if (parts.length > 0 && parts[0].matches("\\d+(\\.\\d+)?")) {
            return parts[0];
        }
        return "0";
    }
    
    private String extractAccountName(String fullName) {
        // Extract just the account's own name (last segment) from the full hierarchical name
        // For "1 Assets:10 Cash:100 Bank", this returns "100 Bank"
        // For "1 Assets", this returns "1 Assets"
        int lastColon = fullName.lastIndexOf(':');
        return lastColon > 0 ? fullName.substring(lastColon + 1) : fullName;
    }
    
    private Account findParentAccount(String fullName, Map<String, Account> accountMap) {
        // Find parent by removing the last segment after the last colon
        int lastColon = fullName.lastIndexOf(':');
        if (lastColon > 0) {
            String parentName = fullName.substring(0, lastColon);
            return accountMap.get(parentName);
        }
        return null;
    }
    
    private Account findOrCreateParentAccount(String fullName, Map<String, Account> accountMap, List<Account> accounts) {
        // Find parent by removing the last segment after the last colon
        int lastColon = fullName.lastIndexOf(':');
        if (lastColon > 0) {
            String parentName = fullName.substring(0, lastColon);
            Account parent = accountMap.get(parentName);
            
            if (parent == null) {
                // Parent doesn't exist, create it recursively
                String parentNumber = extractAccountNumber(parentName);
                Account grandparent = findOrCreateParentAccount(parentName, accountMap, accounts);
                parent = new Account(parentNumber, parentName, AccountType.ASSET, null, grandparent);
                accountMap.put(parentName, parent);
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
