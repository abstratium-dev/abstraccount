package dev.abstratium.abstraccount.boundary;

import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * Error response DTO returned when an EQL query cannot be parsed.
 */
@RegisterForReflection
public record QueryErrorDTO(String error, String message, int position) {
}
