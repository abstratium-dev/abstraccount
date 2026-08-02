package dev.abstratium.core.filter;

import dev.abstratium.abstraccount.service.JournalLockedException;
import io.quarkiverse.resteasy.problem.HttpProblem;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

/**
 * Maps {@link JournalLockedException} to RFC 7807 Problem Details with HTTP 423 Locked.
 *
 * <p>This ensures that any mutating operation attempted against a locked journal
 * is reported to the client with a clear, structured error response rather than
 * an opaque 500 Internal Server Error. The 423 status code is the standard
 * "Locked" code from RFC 4918 (WebDAV), which is appropriate here.</p>
 */
@Provider
public class JournalLockedExceptionMapper implements ExceptionMapper<JournalLockedException> {

    @Override
    public Response toResponse(JournalLockedException exception) {
        HttpProblem problem = HttpProblem.builder()
            .withStatus(423)
            .withTitle("Journal Locked")
            .withDetail(exception.getMessage())
            .with("journalId", exception.getJournalId())
            .build();
        return problem.toResponse();
    }
}
