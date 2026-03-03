package dev.abstratium.abstraccount.boundary;

import java.util.Map;

/**
 * DTO for macro execution request.
 */
public record MacroExecuteRequestDTO(
    String macroId,
    String journalId,
    Map<String, String> parameters
) {}
