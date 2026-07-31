package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.ReportTemplateEntity;
import dev.abstratium.abstraccount.service.ReportTemplateImportExportService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    @Inject
    ReportTemplateImportExportService reportTemplateImportExportService;

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
            template.getTemplateContent()
        );
    }

    /**
     * Exports all report templates for the current organisation as YAML.
     *
     * @return the report templates as a YAML document
     */
    @GET
    @Path("/templates/export")
    @Produces("text/yaml")
    public String exportReportTemplates() {
        LOG.info("Exporting report templates as YAML");
        return reportTemplateImportExportService.exportReportTemplates();
    }

    /**
     * Imports one or more report templates from a YAML file.
     *
     * @param yamlContent the YAML file content
     * @param replaceIds optional comma-separated list of existing report template IDs to replace
     * @param autoRename if true, duplicate names not listed in {@code replaceIds}
     *                   are imported with a counter suffix instead of returning a conflict
     * @return a summary of imported report templates, or a 409 conflict if duplicates exist
     */
    @POST
    @Path("/templates/import")
    @Consumes("text/yaml")
    @Produces(MediaType.APPLICATION_JSON)
    public jakarta.ws.rs.core.Response importReportTemplates(String yamlContent,
                                                               @QueryParam("replaceIds") String replaceIds,
                                                               @QueryParam("autoRename") boolean autoRename) {
        LOG.infof("Importing report templates from YAML, replaceIds=%s, autoRename=%s", replaceIds, autoRename);

        try {
            List<String> replaceIdList = parseReplaceIds(replaceIds);
            ImportResult result = reportTemplateImportExportService.importReportTemplates(yamlContent, replaceIdList, autoRename);

            if (!result.conflicts().isEmpty()) {
                Map<String, Object> conflictResponse = new HashMap<>();
                conflictResponse.put("status", "conflict");
                conflictResponse.put("message", "Some imported report template names already exist");
                conflictResponse.put("conflicts", result.conflicts());
                return jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.CONFLICT)
                    .entity(conflictResponse)
                    .type(MediaType.APPLICATION_JSON)
                    .build();
            }

            Map<String, Object> summary = new HashMap<>();
            summary.put("status", "success");
            summary.put("imported", result.importedItems().size());
            summary.put("items", result.importedItems());
            return jakarta.ws.rs.core.Response.ok(summary).build();

        } catch (IllegalArgumentException e) {
            LOG.errorf(e, "Report template import validation failed");
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.BAD_REQUEST)
                .entity(error)
                .type(MediaType.APPLICATION_JSON)
                .build();
        } catch (Exception e) {
            LOG.errorf(e, "Report template import failed");
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            return jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.INTERNAL_SERVER_ERROR)
                .entity(error)
                .type(MediaType.APPLICATION_JSON)
                .build();
        }
    }

    private List<String> parseReplaceIds(String replaceIds) {
        if (replaceIds == null || replaceIds.isBlank()) {
            return List.of();
        }
        return List.of(replaceIds.split(","));
    }
}
