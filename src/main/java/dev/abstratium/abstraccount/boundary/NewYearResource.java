package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.service.NewYearService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;

/**
 * REST resource for new year journal creation operations.
 *
 * <p>Provides two endpoints:
 * <ul>
 *   <li>{@code POST /api/new-year/preview} — returns the list of accounts that would be
 *       copied and their opening balances, without making any changes.</li>
 *   <li>{@code POST /api/new-year/execute} — creates the new journal with copied accounts
 *       and opening balance transactions.</li>
 * </ul>
 */
@Path("/api/new-year")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class NewYearResource {

    private static final Logger LOG = Logger.getLogger(NewYearResource.class);

    @Inject
    NewYearService newYearService;

    /**
     * Returns a preview of the new year journal creation.
     * No data is modified.
     *
     * @param request the new year request (sourceJournalId, newJournalTitle, openingDate, retainedEarningsCodePath, annualProfitLossCodePath)
     * @return preview showing accounts to be copied and their opening balances
     */
    @POST
    @Path("/preview")
    @Consumes(MediaType.APPLICATION_JSON)
    public NewYearPreviewDTO preview(NewYearRequestDTO request) {
        LOG.debugf("Preview new year from journal %s", request.sourceJournalId());
        validateRequest(request);
        LocalDate openingDate = parseDate(request.openingDate());
        return newYearService.preview(
            request.sourceJournalId(),
            request.newJournalTitle(),
            openingDate,
            request.retainedEarningsCodePath(),
            request.annualProfitLossCodePath()
        );
    }

    /**
     * Executes the new year journal creation.
     * Creates a new journal, copies all accounts, and creates opening balance transactions.
     *
     * @param request the new year request (sourceJournalId, newJournalTitle, openingDate, retainedEarningsCodePath, annualProfitLossCodePath)
     * @return result with information about the created journal
     */
    @POST
    @Path("/execute")
    @Consumes(MediaType.APPLICATION_JSON)
    public NewYearResultDTO execute(NewYearRequestDTO request) {
        LOG.infof("Execute new year from journal %s", request.sourceJournalId());
        validateRequest(request);
        LocalDate openingDate = parseDate(request.openingDate());
        return newYearService.execute(
            request.sourceJournalId(),
            request.newJournalTitle(),
            openingDate,
            request.retainedEarningsCodePath(),
            request.annualProfitLossCodePath()
        );
    }

    private void validateRequest(NewYearRequestDTO request) {
        if (request.sourceJournalId() == null || request.sourceJournalId().isBlank()) {
            throw new BadRequestException("sourceJournalId is required");
        }
        if (request.openingDate() == null || request.openingDate().isBlank()) {
            throw new BadRequestException("openingDate is required");
        }
    }

    private LocalDate parseDate(String dateStr) {
        try {
            return LocalDate.parse(dateStr);
        } catch (DateTimeParseException e) {
            throw new BadRequestException("openingDate must be in YYYY-MM-DD format: " + dateStr);
        }
    }
}
