package dev.abstratium.abstraccount.boundary;

import java.time.Instant;

/**
 * DTO for attachment metadata (no binary content - see the dedicated
 * download endpoint for that).
 */
public record AttachmentDTO(
    String id,
    String transactionId,
    String fileName,
    String contentType,
    long sizeBytes,
    Instant uploadedAt,
    String uploadedBy
) {}
