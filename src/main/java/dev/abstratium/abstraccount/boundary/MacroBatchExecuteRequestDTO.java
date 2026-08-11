package dev.abstratium.abstraccount.boundary;

import java.util.Map;

/**
 * DTO for a batch macro execution request.
 *
 * <p>{@code sharedParameters} are applied to every row (typically the account
 * parameters, filled in once for the whole batch). {@code csv} contains one row
 * per transaction to create; its columns correspond, in order, to the macro's
 * parameters that are not already covered by {@code sharedParameters}. The
 * first row is treated as a header (and skipped) if it exactly matches those
 * parameter names.</p>
 */
public record MacroBatchExecuteRequestDTO(
    String macroId,
    String journalId,
    Map<String, String> sharedParameters,
    String csv
) {}
