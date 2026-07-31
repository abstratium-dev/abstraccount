package dev.abstratium.abstraccount.boundary;

import java.util.List;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.service.EntityRevisionDto;
import dev.abstratium.abstraccount.service.HistoryService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * REST resource for querying Envers audit history.
 */
@Path("/api/history")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class HistoryResource {

    @Inject
    HistoryService historyService;

    /**
     * Returns the revision history of a single entity instance.
     *
     * @param entityType the entity type name (e.g., "journal", "account", "transaction")
     * @param entityId the entity primary key
     * @return chronological list of revisions
     */
    @GET
    @Path("/entity/{entityType}/{entityId}")
    @Transactional
    public List<EntityRevisionDto> getEntityHistory(
            @PathParam("entityType") String entityType,
            @PathParam("entityId") String entityId) {
        return historyService.getEntityHistory(entityType, entityId);
    }
}
