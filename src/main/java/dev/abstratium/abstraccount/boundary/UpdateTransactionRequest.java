package dev.abstratium.abstraccount.boundary;

import java.time.LocalDate;
import java.util.List;

/**
 * Request DTO for updating an existing transaction.
 */
public record UpdateTransactionRequest(
    LocalDate date,
    String status,
    String description,
    String partnerId,
    List<TagDTO> tags,
    List<UpdateEntryRequest> entries
) {}
