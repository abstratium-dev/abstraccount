package dev.abstratium.abstraccount.boundary;

import java.util.List;

/**
 * Preview of all closing entries that will be created by a close-books operation.
 */
public record CloseBooksPreviewDTO(
    List<CloseAccountPreviewDTO> accounts,
    String equityAccountCodePath,
    String equityAccountFullName,
    String closingDate
) {}
