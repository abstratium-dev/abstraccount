package dev.abstratium.abstraccount.boundary;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.MacroEntity;
import dev.abstratium.abstraccount.service.MacroService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;

/**
 * REST resource for macro operations.
 */
@Path("/api/macro")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class MacroResource {
    
    private static final Logger LOG = Logger.getLogger(MacroResource.class);
    
    @Inject
    MacroService macroService;
    
    @Inject
    ObjectMapper objectMapper;
    
    /**
     * Gets all macros for a given journal.
     * 
     * @param journalId the journal ID
     * @return list of macros
     */
    @GET
    @Path("/{journalId}")
    public List<MacroDTO> getAllMacros(@PathParam("journalId") String journalId) {
        LOG.debugf("Getting all macros for journal: %s", journalId);
        
        List<MacroEntity> entities = macroService.loadAllMacros(journalId);
        List<MacroDTO> dtos = new ArrayList<>();
        
        for (MacroEntity entity : entities) {
            dtos.add(toDTO(entity));
        }
        
        return dtos;
    }
    
    /**
     * Gets a single macro by ID.
     * 
     * @param journalId the journal ID
     * @param macroId the macro ID
     * @return the macro
     */
    @GET
    @Path("/{journalId}/macro/{macroId}")
    public MacroDTO getMacro(
            @PathParam("journalId") String journalId,
            @PathParam("macroId") String macroId) {
        LOG.debugf("Getting macro: %s for journal: %s", macroId, journalId);
        
        MacroEntity entity = macroService.loadMacro(macroId);
        if (entity == null) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found");
        }
        if (!entity.getJournalId().equals(journalId)) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found in this journal");
        }
        
        return toDTO(entity);
    }
    
    /**
     * Creates a new macro.
     * 
     * @param journalId the journal ID
     * @param dto the macro to create
     * @return the created macro
     */
    @POST
    @Path("/{journalId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public MacroDTO createMacro(
            @PathParam("journalId") String journalId,
            MacroDTO dto) {
        LOG.debugf("Creating macro: %s for journal: %s", dto.name(), journalId);
        
        MacroEntity entity = toEntity(dto);
        entity.setJournalId(journalId);
        
        MacroEntity created = macroService.createMacro(entity);
        return toDTO(created);
    }
    
    /**
     * Updates an existing macro.
     * 
     * @param journalId the journal ID
     * @param macroId the macro ID
     * @param dto the updated macro
     * @return the updated macro
     */
    @PUT
    @Path("/{journalId}/macro/{macroId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public MacroDTO updateMacro(
            @PathParam("journalId") String journalId,
            @PathParam("macroId") String macroId,
            MacroDTO dto) {
        LOG.debugf("Updating macro: %s for journal: %s", macroId, journalId);
        
        MacroEntity existing = macroService.loadMacro(macroId);
        if (existing == null) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found");
        }
        if (!existing.getJournalId().equals(journalId)) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found in this journal");
        }
        
        MacroEntity entity = toEntity(dto);
        entity.setId(macroId);
        entity.setJournalId(journalId);
        entity.setCreatedDate(existing.getCreatedDate());
        
        MacroEntity updated = macroService.updateMacro(entity);
        return toDTO(updated);
    }
    
    /**
     * Deletes a macro.
     * 
     * @param journalId the journal ID
     * @param macroId the macro ID
     */
    @DELETE
    @Path("/{journalId}/macro/{macroId}")
    public jakarta.ws.rs.core.Response deleteMacro(
            @PathParam("journalId") String journalId,
            @PathParam("macroId") String macroId) {
        LOG.debugf("Deleting macro: %s for journal: %s", macroId, journalId);
        
        MacroEntity existing = macroService.loadMacro(macroId);
        if (existing == null) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found");
        }
        if (!existing.getJournalId().equals(journalId)) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found in this journal");
        }
        
        macroService.deleteMacro(macroId);
        return jakarta.ws.rs.core.Response.noContent().build();
    }
    
    /**
     * Converts a MacroEntity to a MacroDTO.
     */
    private MacroDTO toDTO(MacroEntity entity) {
        try {
            List<MacroParameterDTO> parameters = objectMapper.readValue(
                entity.getParameters(),
                new TypeReference<List<MacroParameterDTO>>() {}
            );
            
            MacroValidationDTO validation = null;
            if (entity.getValidation() != null && !entity.getValidation().isEmpty()) {
                validation = objectMapper.readValue(
                    entity.getValidation(),
                    MacroValidationDTO.class
                );
            }
            
            return new MacroDTO(
                entity.getId(),
                entity.getJournalId(),
                entity.getName(),
                entity.getDescription(),
                parameters,
                entity.getTemplate(),
                validation,
                entity.getNotes(),
                entity.getCreatedDate().toString(),
                entity.getModifiedDate().toString()
            );
        } catch (JsonProcessingException e) {
            LOG.errorf(e, "Failed to parse JSON for macro: %s", entity.getId());
            throw new WebApplicationException("Failed to parse macro data", 500);
        }
    }
    
    /**
     * Converts a MacroDTO to a MacroEntity.
     */
    private MacroEntity toEntity(MacroDTO dto) {
        try {
            MacroEntity entity = new MacroEntity();
            if (dto.id() != null) {
                entity.setId(dto.id());
            }
            entity.setName(dto.name());
            entity.setDescription(dto.description());
            entity.setParameters(objectMapper.writeValueAsString(dto.parameters()));
            entity.setTemplate(dto.template());
            
            if (dto.validation() != null) {
                entity.setValidation(objectMapper.writeValueAsString(dto.validation()));
            }
            
            entity.setNotes(dto.notes());
            
            return entity;
        } catch (JsonProcessingException e) {
            LOG.errorf(e, "Failed to serialize JSON for macro: %s", dto.name());
            throw new WebApplicationException("Failed to serialize macro data", 400);
        }
    }
}
