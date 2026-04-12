package dev.abstratium.abstraccount.boundary;

/**
 * Error response DTO returned when an EQL query cannot be parsed.
 */
public record QueryErrorDTO(String error, String message, int position) {
}
