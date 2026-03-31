package dev.abstratium.abstraccount.boundary;

import java.time.LocalDate;
import java.util.List;

/**
 * Request DTO for creating a new transaction.
 */
public record CreateTransactionRequest(
    String journalId,
    LocalDate date,
    String status,
    String description,
    String partnerId,
    List<TagDTO> tags,
    List<CreateEntryRequest> entries
) {}
