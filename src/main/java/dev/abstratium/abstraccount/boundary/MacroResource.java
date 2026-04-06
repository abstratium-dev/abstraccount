package dev.abstratium.abstraccount.boundary;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.MacroEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.Entry;
import dev.abstratium.abstraccount.model.Journal;
import dev.abstratium.abstraccount.model.Tag;
import dev.abstratium.abstraccount.model.Transaction;
import dev.abstratium.abstraccount.service.AccountService;
import dev.abstratium.abstraccount.service.JournalParser;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import dev.abstratium.abstraccount.service.MacroService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    AccountService accountService;
    
    @Inject
    JournalParser journalParser;
    
    @Inject
    JournalPersistenceService journalPersistenceService;
    
    @Inject
    ObjectMapper objectMapper;
    
    /**
     * Gets all macros.
     * Macros are independent of journals.
     * 
     * @return list of macros
     */
    @GET
    public List<MacroDTO> getAllMacros() {
        LOG.debug("Getting all macros");
        
        List<MacroEntity> entities = macroService.loadAllMacros();
        List<MacroDTO> dtos = new ArrayList<>();
        
        for (MacroEntity entity : entities) {
            dtos.add(toDTO(entity));
        }
        
        return dtos;
    }
    
    /**
     * Gets a single macro by ID.
     * 
     * @param macroId the macro ID
     * @return the macro
     */
    @GET
    @Path("/{macroId}")
    public MacroDTO getMacro(@PathParam("macroId") String macroId) {
        LOG.debugf("Getting macro: %s", macroId);
        
        MacroEntity entity = macroService.loadMacro(macroId);
        LOG.debugf("Loaded macro entity: %s (null=%s)", entity != null ? entity.getId() : "null", entity == null);
        
        if (entity == null) {
            LOG.debugf("Throwing NotFoundException for macroId: %s", macroId);
            throw new jakarta.ws.rs.NotFoundException("Macro not found");
        }
        
        LOG.debugf("Returning DTO for macro: %s", entity.getId());
        return toDTO(entity);
    }
    
    /**
     * Creates a new macro.
     * 
     * @param dto the macro to create
     * @return the created macro
     */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    public MacroDTO createMacro(MacroDTO dto) {
        LOG.debugf("Creating macro: %s", dto.name());
        
        MacroEntity entity = toEntity(dto);
        MacroEntity created = macroService.createMacro(entity);
        return toDTO(created);
    }
    
    /**
     * Updates an existing macro.
     * 
     * @param macroId the macro ID
     * @param dto the updated macro
     * @return the updated macro
     */
    @PUT
    @Path("/{macroId}")
    @Consumes(MediaType.APPLICATION_JSON)
    public MacroDTO updateMacro(
            @PathParam("macroId") String macroId,
            MacroDTO dto) {
        LOG.debugf("Updating macro: %s", macroId);
        
        MacroEntity existing = macroService.loadMacro(macroId);
        if (existing == null) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found");
        }
        
        MacroEntity entity = toEntity(dto);
        entity.setId(macroId);
        entity.setCreatedDate(existing.getCreatedDate());
        
        MacroEntity updated = macroService.updateMacro(entity);
        return toDTO(updated);
    }
    
    /**
     * Executes a macro by replacing placeholders and creating a transaction.
     * 
     * @param request the execution request containing macroId, journalId, and parameter values
     * @return the ID of the created transaction
     */
    @POST
    @Path("/execute")
    @Consumes(MediaType.APPLICATION_JSON)
    public String executeMacro(MacroExecuteRequestDTO request) {
        LOG.debugf("Executing macro: %s for journal: %s", request.macroId(), request.journalId());
        
        // Load the macro
        MacroEntity macro = macroService.loadMacro(request.macroId());
        if (macro == null) {
            throw new NotFoundException("Macro not found");
        }
        
        // Execute macro to generate transaction text
        String transactionText = macroService.executeMacro(macro, request.parameters(), request.journalId());
        LOG.debugf("Generated transaction text:\n%s", transactionText);
        
        // Extract account code paths from the transaction text before parsing
        // This is needed because the parser will generate UUIDs for undeclared accounts
        Map<String, String> accountCodePaths = extractAccountCodePaths(transactionText, request.parameters());
        
        // Parse the transaction text
        // We need to wrap it in a minimal journal structure for the parser
        String journalContent = "; title: Macro Execution\n" +
                               "; currency: CHF\n" +
                               "commodity CHF 0.01\n\n" +
                               transactionText;
        
        Journal journal = journalParser.parse(journalContent);
        
        if (journal.transactions().isEmpty()) {
            throw new WebApplicationException("Failed to parse transaction from macro", 400);
        }
        
        Transaction transaction = journal.transactions().get(0);
        
        // Convert Transaction model to TransactionEntity
        // Pass macro for parameter filter validation and account code paths
        TransactionEntity entity;
        try {
            entity = convertToEntity(transaction, request.journalId(), macro, request.parameters(), accountCodePaths);
        } catch (JsonProcessingException e) {
            LOG.errorf(e, "Failed to parse macro parameters");
            throw new WebApplicationException("Failed to parse macro parameters", 400);
        }
        
        // Save the transaction
        TransactionEntity saved = journalPersistenceService.saveTransaction(entity);
        
        LOG.debugf("Created transaction: %s", saved.getId());
        return saved.getId();
    }
    
    /**
     * Deletes a macro.
     * 
     * @param macroId the macro ID
     */
    @DELETE
    @Path("/{macroId}")
    public jakarta.ws.rs.core.Response deleteMacro(@PathParam("macroId") String macroId) {
        LOG.debugf("Deleting macro: %s", macroId);
        
        MacroEntity existing = macroService.loadMacro(macroId);
        if (existing == null) {
            throw new jakarta.ws.rs.NotFoundException("Macro not found");
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
    
    /**
     * Extracts account code paths from transaction text.
     * Returns a map of account name (as it appears in parser) to code path.
     * The parser extracts the account identifier from the entry line, which could be:
     * - Just a code path like "1:10:100:1020"
     * - A full account name like "2 Passif / Equity:290 Réserves..."
     */
    private Map<String, String> extractAccountCodePaths(String transactionText, Map<String, String> parameters) {
        Map<String, String> accountCodePaths = new java.util.HashMap<>();
        
        // Find all account parameters (those with code paths like "1:10:100:1020")
        for (Map.Entry<String, String> param : parameters.entrySet()) {
            String value = param.getValue();
            // Check if this looks like a code path (contains colons)
            if (value != null && value.contains(":")) {
                // The account appears in the transaction text as the full code path
                accountCodePaths.put(value, value);
                
                // Also map the last segment (e.g., "1020" or "6900") to the full path
                // because the parser extracts just the last part as the account name
                String[] parts = value.split(":");
                String lastSegment = parts[parts.length - 1];
                accountCodePaths.put(lastSegment, value);
            }
        }
        
        // Also extract account paths directly from the transaction text
        // Pattern: account identifier followed by whitespace and amount
        // Account identifier can be a code path or a full account name
        Pattern entryPattern = Pattern.compile("^\\s+(.+?)\\s+CHF\\s+[-]?[0-9.]+", Pattern.MULTILINE);
        Matcher matcher = entryPattern.matcher(transactionText);
        while (matcher.find()) {
            String accountIdentifier = matcher.group(1).trim();
            
            // Extract the code path from the account identifier
            // If it starts with a digit followed by colon, it's a hierarchical path
            if (accountIdentifier.matches("^\\d+.*")) {
                // Extract just the numeric codes, ignoring descriptions
                String codePath = extractCodePathFromFullName(accountIdentifier);
                if (codePath != null && !codePath.isEmpty()) {
                    // Map the full identifier to the code path
                    accountCodePaths.put(accountIdentifier, codePath);
                    
                    // Also map just the last segment
                    String[] parts = codePath.split(":");
                    String lastSegment = parts[parts.length - 1];
                    accountCodePaths.put(lastSegment, codePath);
                }
            }
        }
        
        return accountCodePaths;
    }
    
    /**
     * Extracts the code path from a full account name.
     * Example: "2 Passif / Equity:290 Réserves...:2979 Bénéfice..." -> "2:290:2979"
     */
    private String extractCodePathFromFullName(String fullName) {
        StringBuilder codePath = new StringBuilder();
        String[] segments = fullName.split(":");
        
        for (String segment : segments) {
            segment = segment.trim();
            // Extract the leading numeric code
            Matcher codeMatcher = Pattern.compile("^(\\d+)").matcher(segment);
            if (codeMatcher.find()) {
                if (codePath.length() > 0) {
                    codePath.append(":");
                }
                codePath.append(codeMatcher.group(1));
            }
        }
        
        return codePath.toString();
    }
    
    /**
     * Converts a Transaction model to a TransactionEntity.
     * Resolves account code paths to account IDs and validates against macro parameter filters.
     */
    private TransactionEntity convertToEntity(Transaction transaction, String journalId, MacroEntity macro, Map<String, String> parameters, Map<String, String> accountCodePaths) throws JsonProcessingException {
        TransactionEntity entity = new TransactionEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setJournalId(journalId);
        entity.setTransactionDate(transaction.date());
        entity.setStatus(transaction.status());
        entity.setDescription(transaction.description());
        entity.setPartnerId(transaction.partnerId());
        entity.setTransactionId(transaction.id());
        
        // Parse macro parameters to get filters
        List<MacroParameterDTO> macroParams = objectMapper.readValue(
            macro.getParameters(),
            new TypeReference<List<MacroParameterDTO>>() {}
        );
        Map<String, String> paramFilters = new java.util.HashMap<>();
        for (MacroParameterDTO param : macroParams) {
            if (param.type().equals("account") && param.filter() != null) {
                paramFilters.put(param.name(), param.filter());
            }
        }
        
        // Add tags
        for (Tag tag : transaction.tags()) {
            TagEntity tagEntity = new TagEntity();
            tagEntity.setId(UUID.randomUUID().toString());
            tagEntity.setTransaction(entity);
            tagEntity.setTagKey(tag.key());
            tagEntity.setTagValue(tag.value());
            entity.addTag(tagEntity);
        }
        
        // Post-process: If there's an invoice_numbers parameter with comma-separated values,
        // split them and create individual invoice tags
        String invoiceNumbers = parameters.get("invoice_numbers");
        if (invoiceNumbers != null && !invoiceNumbers.trim().isEmpty()) {
            String[] invoices = invoiceNumbers.split(",");
            for (String invoice : invoices) {
                String trimmedInvoice = invoice.trim();
                if (!trimmedInvoice.isEmpty()) {
                    TagEntity invoiceTag = new TagEntity();
                    invoiceTag.setId(UUID.randomUUID().toString());
                    invoiceTag.setTransaction(entity);
                    invoiceTag.setTagKey("invoice");
                    invoiceTag.setTagValue(trimmedInvoice);
                    entity.addTag(invoiceTag);
                }
            }
        }
        
        // Add entries - resolve account code paths to IDs
        int entryOrder = 0;
        for (Entry entry : transaction.entries()) {
            EntryEntity entryEntity = new EntryEntity();
            entryEntity.setId(UUID.randomUUID().toString());
            entryEntity.setTransaction(entity);
            
            // The parser created a UUID for the account, but we need the actual code path
            // The account name from the parser contains the code path (e.g., "1:10:100:1020")
            String accountName = entry.account().name();
            
            // Look up the code path from our extracted map
            String accountCodePath = accountCodePaths.get(accountName);
            
            if (accountCodePath == null) {
                // If not in the map, the account name itself might be the code path
                accountCodePath = accountName;
            }
            
            // Find which parameter this account came from to get the filter
            String filter = null;
            for (Map.Entry<String, String> paramEntry : parameters.entrySet()) {
                if (paramEntry.getValue().equals(accountCodePath)) {
                    filter = paramFilters.get(paramEntry.getKey());
                    break;
                }
            }
            
            // Resolve code path to account ID
            dev.abstratium.abstraccount.entity.AccountEntity accountEntity = 
                accountService.findAccountByCodePath(journalId, accountCodePath, filter);
            
            entryEntity.setAccountId(accountEntity.getId());
            entryEntity.setCommodity(entry.amount().commodity());
            entryEntity.setAmount(entry.amount().quantity());
            entryEntity.setNote(entry.note());
            entryEntity.setEntryOrder(entryOrder++);
            entity.addEntry(entryEntity);
        }
        
        return entity;
    }
}
