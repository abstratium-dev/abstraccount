package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.model.CreatePartnerResult;
import dev.abstratium.abstraccount.model.ImportPartnersResult;
import dev.abstratium.abstraccount.model.PartnerData;
import dev.abstratium.abstraccount.service.TagService;
import dev.abstratium.core.service.CurrentOrgContext;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
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
    CurrentOrgContext currentOrgContext;

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
        String orgId = currentOrgContext.getOrgId();
        LOG.debugf("Searching partners with term: %s for org: %s", searchTerm, orgId);

        List<PartnerData> allPartners = partnerDataAdapter.getAllPartners(orgId);
        
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
        String orgId = currentOrgContext.getOrgId();
        LOG.debugf("Getting partner: %s for org: %s", partnerNumber, orgId);

        return partnerDataAdapter.getPartner(orgId, partnerNumber)
            .filter(PartnerData::active)
            .map(p -> new PartnerDTO(p.partnerNumber(), p.name()))
            .orElseThrow(() -> new NotFoundException("Partner not found: " + partnerNumber));
    }

    /**
     * Create a new partner.
     *
     * <p>The partner number is assigned by the backend as the next available
     * number (gap-filling). If a partner with the same name already exists,
     * the duplicate is skipped and a warning is returned in the response.</p>
     *
     * @param request the create request containing the partner name
     * @return response with the created partner number, name, and any warnings
     */
    @POST
    @Path("/partners")
    public CreatePartnerResponseDTO createPartner(CreatePartnerRequestDTO request) {
        String orgId = currentOrgContext.getOrgId();
        LOG.debugf("Creating partner for org: %s, name: %s", orgId, request.name());

        if (request.name() == null || request.name().isBlank()) {
            throw new BadRequestException("Partner name is required");
        }

        CreatePartnerResult result = partnerDataAdapter.addPartner(orgId, request.name());

        return new CreatePartnerResponseDTO(
            result.partner().partnerNumber(),
            result.partner().name(),
            result.warnings()
        );
    }

    /**
     * Export all partners for the current organisation as a CSV file.
     *
     * <p>The response body is the raw CSV content (text/csv) in the same format
     * accepted by {@link #importPartners}, including the header line and one
     * row per partner (active and inactive) sorted by partner number.</p>
     *
     * @return the CSV content
     */
    @GET
    @Path("/partners/export")
    @Produces({MediaType.TEXT_PLAIN, "text/csv"})
    public Response exportPartners() {
        String orgId = currentOrgContext.getOrgId();
        LOG.infof("Exporting partners as CSV for org: %s", orgId);

        String csv = partnerDataAdapter.exportPartners(orgId);
        return Response.ok(csv)
            .header("Content-Disposition", "attachment; filename=\"partners.csv\"")
            .build();
    }

    /**
     * Replace all partners for the current organisation from an imported CSV file.
     *
     * <p>The request body is the raw CSV content (text/csv). The backend fully
     * validates the content before overwriting the organisation's partner file.
     * If validation fails the response is HTTP 400 with the list of errors and
     * the existing file is left unchanged.</p>
     *
     * <p><b>Warning:</b> this replaces all existing partners. Transactions only
     * store the partner number, so after a replace they may refer to different
     * partners than before.</p>
     *
     * @param csvContent the raw CSV content, including the header line
     * @return response with the imported count and any validation errors
     */
    @POST
    @Path("/partners/import")
    @Consumes({MediaType.TEXT_PLAIN, "text/csv"})
    public Response importPartners(String csvContent) {
        String orgId = currentOrgContext.getOrgId();
        LOG.infof("Importing partners from CSV for org: %s (%d bytes)", orgId,
            csvContent == null ? 0 : csvContent.length());

        ImportPartnersResult result = partnerDataAdapter.replacePartners(orgId, csvContent);

        ImportPartnersResponseDTO body = new ImportPartnersResponseDTO(result.importedCount(), result.errors());
        if (!result.isValid()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(body).build();
        }

        return Response.ok(body).build();
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
