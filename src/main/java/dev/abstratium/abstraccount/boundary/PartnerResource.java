package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.model.PartnerData;
import dev.abstratium.abstraccount.service.TagService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST resource for partner data and tag operations.
 */
@Path("/api")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class PartnerResource {
    
    private static final Logger LOG = Logger.getLogger(PartnerResource.class);
    
    @Inject
    PartnerDataAdapter partnerDataAdapter;
    
    @Inject
    TagService tagService;
    
    /**
     * Search for partners by name or number.
     * Returns active partners only.
     * 
     * @param searchTerm optional search term to filter partners
     * @return list of matching partners
     */
    @GET
    @Path("/partners/search")
    public List<PartnerDTO> searchPartners(@QueryParam("q") String searchTerm) {
        LOG.debugf("Searching partners with term: %s", searchTerm);
        
        List<PartnerData> allPartners = partnerDataAdapter.getAllPartners();
        
        // Filter to active partners only
        List<PartnerData> activePartners = allPartners.stream()
            .filter(PartnerData::active)
            .collect(Collectors.toList());
        
        // Apply search filter if provided
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            String lowerSearchTerm = searchTerm.trim().toLowerCase();
            activePartners = activePartners.stream()
                .filter(p -> 
                    p.partnerNumber().toLowerCase().contains(lowerSearchTerm) ||
                    p.name().toLowerCase().contains(lowerSearchTerm)
                )
                .collect(Collectors.toList());
        }
        
        // Convert to DTOs and sort by partner number
        return activePartners.stream()
            .sorted((a, b) -> a.partnerNumber().compareTo(b.partnerNumber()))
            .map(p -> new PartnerDTO(p.partnerNumber(), p.name()))
            .collect(Collectors.toList());
    }
    
    /**
     * Get a specific partner by number.
     * 
     * @param partnerNumber the partner number
     * @return the partner data
     */
    @GET
    @Path("/partners/{partnerNumber}")
    public PartnerDTO getPartner(@PathParam("partnerNumber") String partnerNumber) {
        LOG.debugf("Getting partner: %s", partnerNumber);
        
        return partnerDataAdapter.getPartner(partnerNumber)
            .filter(PartnerData::active)
            .map(p -> new PartnerDTO(p.partnerNumber(), p.name()))
            .orElseThrow(() -> new NotFoundException("Partner not found: " + partnerNumber));
    }
    
    /**
     * Search for invoice numbers by prefix.
     * Returns invoice tag values in descending order (newest first).
     * 
     * @param journalId the journal ID
     * @param prefix optional prefix to filter invoice numbers
     * @return list of invoice numbers
     */
    @GET
    @Path("/invoices/search")
    public List<String> searchInvoices(
            @QueryParam("journalId") String journalId,
            @QueryParam("prefix") String prefix) {
        LOG.debugf("Searching invoices with prefix: %s in journal: %s", prefix, journalId);
        
        if (journalId == null || journalId.isEmpty()) {
            throw new BadRequestException("journalId is required");
        }
        
        return tagService.searchTagValues(journalId, "invoice", prefix);
    }
}
