package dev.abstratium.abstraccount.boundary;

import java.time.LocalDate;
import java.util.List;

/**
 * DTO for Transaction entity matching the data model.
 */
public record TransactionDTO(
    String id,
    LocalDate date,
    String status,
    String description,
    String partnerId,
    List<TagDTO> tags,
    List<EntryDTO> entries
) {}
