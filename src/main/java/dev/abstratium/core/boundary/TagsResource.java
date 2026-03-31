package dev.abstratium.core.boundary;

import java.util.List;

import org.jboss.logging.Logger;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/**
 * REST resource for global tag operations.
 * Provides endpoints for retrieving tag information across all journals.
 */
@Path("/api/core/tags")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class TagsResource {
    
    private static final Logger LOG = Logger.getLogger(TagsResource.class);
    
    @Inject
    JournalPersistenceService journalPersistenceService;
    
    /**
     * Gets all distinct tag keys across all journals.
     * This is useful for autocomplete and suggestion features.
     * 
     * @return list of unique tag keys
     */
    @GET
    @Path("/keys")
    public List<String> getAllTagKeys() {
        LOG.debug("Fetching all distinct tag keys");
        return journalPersistenceService.getAllDistinctTagKeys();
    }
}
