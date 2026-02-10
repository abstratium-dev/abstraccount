package dev.abstratium.abstraccount.model;

import java.time.format.DateTimeFormatter;

/**
 * Serializer for plain text accounting journal format.
 * Converts Journal model objects into journal file content (as a string).
 */
public class JournalSerializer {
    
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final String SEPARATOR = "; ============================================================================";
    
    /**
     * Serializes a Journal object into journal file format.
     */
    public String serialize(Journal journal) {
        if (journal == null) {
            throw new IllegalArgumentException("Journal cannot be null");
        }
        
        StringBuilder sb = new StringBuilder();
        
        // Write metadata
        if (journal.logo() != null) {
            sb.append("; logo: ").append(journal.logo()).append("\n");
        }
        if (journal.title() != null) {
            sb.append("; title: ").append(journal.title()).append("\n");
        }
        if (journal.subtitle() != null) {
            sb.append("; subtitle: ").append(journal.subtitle()).append("\n");
        }
        if (journal.currency() != null) {
            sb.append("; Currency: ").append(journal.currency()).append("\n");
        }
        
        // Blank line after metadata
        if (journal.logo() != null || journal.title() != null || 
            journal.subtitle() != null || journal.currency() != null) {
            sb.append("\n");
        }
        
        // Write commodity declarations
        if (!journal.commodities().isEmpty()) {
            for (Commodity commodity : journal.commodities()) {
                sb.append("commodity ").append(commodity.code())
                  .append(" ").append(commodity.displayPrecision().toPlainString())
                  .append("\n");
            }
            sb.append("\n");
        }
        
        // Write account declarations
        if (!journal.accounts().isEmpty()) {
            sb.append(SEPARATOR).append("\n");
            sb.append("; ACCOUNT DECLARATIONS WITH TYPE ANNOTATIONS\n");
            sb.append(SEPARATOR).append("\n");
            sb.append("\n");
            
            for (Account account : journal.accounts()) {
                sb.append("account ").append(account.fullName()).append("\n");
                sb.append("  ; type:").append(account.type().name().charAt(0))
                  .append(account.type().name().substring(1).toLowerCase())
                  .append("\n");
                
                if (account.note() != null) {
                    sb.append("  ; note:").append(account.note()).append("\n");
                }
                sb.append("\n");
            }
        }
        
        // Write transactions
        if (!journal.transactions().isEmpty()) {
            sb.append(SEPARATOR).append("\n");
            sb.append("; TRANSACTIONS\n");
            sb.append(SEPARATOR).append("\n");
            sb.append("\n");
            
            for (Transaction transaction : journal.transactions()) {
                // Transaction header
                sb.append(transaction.transactionDate().format(DATE_FORMATTER))
                  .append(" ")
                  .append(formatTransactionStatus(transaction.status()))
                  .append(" ")
                  .append(transaction.description())
                  .append("\n");
                
                // Transaction tags
                for (Tag tag : transaction.tags()) {
                    if (tag.isSimple()) {
                        sb.append("    ; :").append(tag.key()).append(":\n");
                    } else {
                        sb.append("    ; ").append(tag.key()).append(":")
                          .append(tag.value()).append("\n");
                    }
                }
                
                // Postings
                for (Posting posting : transaction.postings()) {
                    sb.append("    ");
                    sb.append(posting.account().fullName());
                    
                    // Pad to align amounts (minimum 4 spaces)
                    int padding = Math.max(4, 80 - posting.account().fullName().length() - 
                                          posting.amount().commodity().length() - 
                                          posting.amount().quantity().toPlainString().length());
                    sb.append(" ".repeat(padding));
                    
                    sb.append(posting.amount().commodity())
                      .append(" ")
                      .append(posting.amount().quantity().toPlainString())
                      .append("\n");
                    
                    // Posting tags
                    for (Tag tag : posting.tags()) {
                        if (tag.isSimple()) {
                            sb.append("        ; :").append(tag.key()).append(":\n");
                        } else {
                            sb.append("        ; ").append(tag.key()).append(":")
                              .append(tag.value()).append("\n");
                        }
                    }
                }
                
                sb.append("\n");
            }
        }
        
        return sb.toString();
    }
    
    private String formatTransactionStatus(TransactionStatus status) {
        return switch (status) {
            case CLEARED -> "*";
            case PENDING -> "!";
            case UNCLEARED -> "";
        };
    }
}
