package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Comprehensive DTO for entry search view showing all entry details with related transaction, account, and journal info.
 */
public record EntrySearchDTO(
    // Entry fields
    String entryId,
    int entryOrder,
    String entryCommodity,
    BigDecimal entryAmount,
    String entryNote,
    
    // Account fields
    String accountId,
    String accountName,
    String accountType,
    String accountNote,
    String accountParentId,
    
    // Transaction fields
    String transactionId,
    LocalDate transactionDate,
    String transactionStatus,
    String transactionDescription,
    String transactionPartnerId,
    String transactionPartnerName,
    List<TagDTO> transactionTags,
    
    // Journal fields
    String journalId,
    String journalTitle,
    String journalCurrency
) {}
