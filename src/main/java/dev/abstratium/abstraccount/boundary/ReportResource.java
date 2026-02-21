package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.ReportTemplateEntity;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST resource for report template operations.
 */
@Path("/api/report")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class ReportResource {
    
    private static final Logger LOG = Logger.getLogger(ReportResource.class);
    
    @Inject
    EntityManager em;
    
    /**
     * Lists all available report templates.
     * 
     * @return list of report templates
     */
    @GET
    @Path("/templates")
    public List<ReportTemplateDTO> listTemplates() {
        LOG.debug("Listing all report templates");
        
        List<ReportTemplateEntity> templates = em.createQuery(
            "SELECT rt FROM ReportTemplateEntity rt ORDER BY rt.name", 
            ReportTemplateEntity.class
        ).getResultList();
        
        return templates.stream()
            .map(t -> new ReportTemplateDTO(
                t.getId(),
                t.getName(),
                t.getDescription(),
                t.getTemplateType(),
                t.getTemplateContent()
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * Gets a specific report template by ID.
     * 
     * @param templateId the template ID
     * @return report template
     */
    @GET
    @Path("/templates/{templateId}")
    public ReportTemplateDTO getTemplate(@PathParam("templateId") String templateId) {
        LOG.debugf("Getting report template: %s", templateId);
        
        ReportTemplateEntity template = em.find(ReportTemplateEntity.class, templateId);
        if (template == null) {
            throw new jakarta.ws.rs.NotFoundException("Report template not found: " + templateId);
        }
        
        return new ReportTemplateDTO(
            template.getId(),
            template.getName(),
            template.getDescription(),
            template.getTemplateType(),
            template.getTemplateContent()
        );
    }
}
