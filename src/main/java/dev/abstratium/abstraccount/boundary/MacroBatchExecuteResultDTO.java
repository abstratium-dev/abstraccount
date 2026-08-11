package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * Result of a batch macro execution. Rows are processed independently: valid
 * rows are posted as transactions, invalid rows are skipped and reported here
 * with a warning so the caller can fix and resubmit just those rows.
 */
public record MacroBatchExecuteResultDTO(
    int totalRows,
    int successCount,
    int failureCount,
    List<MacroBatchRowResultDTO> results
) {}
