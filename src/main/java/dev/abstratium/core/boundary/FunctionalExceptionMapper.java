package dev.abstratium.core.boundary;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Maps ConflictException to HTTP 409 Conflict responses.
 */
@Provider
public class FunctionalExceptionMapper implements ExceptionMapper<FunctionalException> {

    @Override
    public Response toResponse(FunctionalException exception) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorResponse(exception.getErrorCode(), exception.getMessage()))
                .build();
    }
}
