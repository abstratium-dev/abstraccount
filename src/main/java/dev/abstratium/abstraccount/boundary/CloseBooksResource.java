package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.service.CloseBooksService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * REST resource for year-end book closing operations.
 *
 * <p>Provides two endpoints:
 * <ul>
 *   <li>{@code POST /api/close-books/preview} — returns the list of accounts that would be
 *       closed and their balances, without making any changes.</li>
 *   <li>{@code POST /api/close-books/execute} — creates the closing transactions.</li>
 * </ul>
 */
@Path("/api/close-books")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class CloseBooksResource {

    private static final Logger LOG = Logger.getLogger(CloseBooksResource.class);

    @Inject
    CloseBooksService closeBooksService;

    /**
     * Returns a preview of all closing entries that would be created.
     * No data is modified.
     *
     * @param request the closing request (journalId, closingDate, equityAccountCodePath)
     * @return preview listing affected accounts and their balances
     */
    @POST
    @Path("/preview")
    @Consumes(MediaType.APPLICATION_JSON)
    public CloseBooksPreviewDTO preview(CloseBooksRequestDTO request) {
        LOG.debugf("Preview close-books for journal %s", request.journalId());
        validateRequest(request);
        LocalDate closingDate = parseDate(request.closingDate());
        return closeBooksService.preview(request.journalId(), closingDate, request.equityAccountCodePath());
    }

    /**
     * Executes the close-books operation, creating one closing transaction per affected account.
     *
     * @param request the closing request (journalId, closingDate, equityAccountCodePath)
     * @return result with list of created transaction IDs
     */
    @POST
    @Path("/execute")
    @Consumes(MediaType.APPLICATION_JSON)
    public CloseBooksResultDTO execute(CloseBooksRequestDTO request) {
        LOG.debugf("Execute close-books for journal %s", request.journalId());
        validateRequest(request);
        LocalDate closingDate = parseDate(request.closingDate());
        List<String> ids = closeBooksService.execute(request.journalId(), closingDate, request.equityAccountCodePath());
        return new CloseBooksResultDTO(ids, ids.size());
    }

    private void validateRequest(CloseBooksRequestDTO request) {
        if (request.journalId() == null || request.journalId().isBlank()) {
            throw new BadRequestException("journalId is required");
        }
        if (request.closingDate() == null || request.closingDate().isBlank()) {
            throw new BadRequestException("closingDate is required");
        }
        if (request.equityAccountCodePath() == null || request.equityAccountCodePath().isBlank()) {
            throw new BadRequestException("equityAccountCodePath is required");
        }
    }

    private LocalDate parseDate(String dateStr) {
        try {
            return LocalDate.parse(dateStr);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("closingDate must be in YYYY-MM-DD format: " + dateStr);
        }
    }
}
