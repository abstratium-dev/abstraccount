package dev.abstratium.abstraccount.boundary;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.jboss.logging.Logger;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.adapters.PartnerDataAdapter;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.TransactionStatus;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * REST resource for transaction CRUD operations.
 */
@Path("/api/transaction")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class TransactionResource {
    
    private static final Logger LOG = Logger.getLogger(TransactionResource.class);
    
    @Inject
    EntityManager entityManager;
    
    @Inject
    JournalPersistenceService journalPersistenceService;
    
    @Inject
    PartnerDataAdapter partnerDataAdapter;
    
    /**
     * Creates a new transaction with entries and tags.
     * 
     * @param request the transaction creation request
     * @return the created transaction DTO
     */
    @POST
    @Transactional
    public TransactionDTO createTransaction(CreateTransactionRequest request) {
        LOG.infof("Creating new transaction for journal: %s", request.journalId());
        
        // CRITICAL: Validate that entries sum to zero
        validateEntriesBalance(request.entries());
        
        try {
            // Validate journal exists
            journalPersistenceService.findJournalById(request.journalId())
                .orElseThrow(() -> new WebApplicationException("Journal not found: " + request.journalId(), 404));
            
            // Create transaction entity
            TransactionEntity transaction = new TransactionEntity();
            transaction.setJournalId(request.journalId());
            transaction.setTransactionDate(request.date());
            transaction.setStatus(TransactionStatus.valueOf(request.status()));
            transaction.setDescription(request.description());
            transaction.setPartnerId(request.partnerId());
            transaction.setTransactionOrder(System.currentTimeMillis());
            
            // Add entries
            if (request.entries() != null) {
                for (CreateEntryRequest entryReq : request.entries()) {
                    EntryEntity entry = new EntryEntity();
                    entry.setEntryOrder(entryReq.entryOrder());
                    entry.setAccountId(entryReq.accountId());
                    entry.setCommodity(entryReq.commodity());
                    entry.setAmount(entryReq.amount());
                    entry.setNote(entryReq.note());
                    transaction.addEntry(entry);
                }
            }
            
            // Add tags
            if (request.tags() != null) {
                for (TagDTO tagDto : request.tags()) {
                    TagEntity tag = new TagEntity();
                    tag.setTagKey(tagDto.key());
                    tag.setTagValue(tagDto.value());
                    transaction.addTag(tag);
                }
            }
            
            // Persist
            TransactionEntity saved = journalPersistenceService.saveTransaction(transaction);
            
            LOG.infof("Successfully created transaction: %s", saved.getId());
            
            // Convert to DTO and return
            return toDTO(saved);
            
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            LOG.error("Failed to create transaction", e);
            throw new WebApplicationException("Failed to create transaction: " + e.getMessage(), 
                Response.Status.BAD_REQUEST);
        }
    }
    
    /**
     * Gets a single transaction by ID.
     * 
     * @param transactionId the transaction ID
     * @return the transaction DTO
     */
    @GET
    @Path("/{transactionId}")
    @Transactional
    public TransactionDTO getTransaction(@PathParam("transactionId") String transactionId) {
        LOG.debugf("Getting transaction: %s", transactionId);
        
        TransactionEntity transaction = entityManager.find(TransactionEntity.class, transactionId);
        if (transaction == null) {
            throw new WebApplicationException("Transaction not found: " + transactionId, 404);
        }
        
        return toDTO(transaction);
    }
    
    /**
     * Updates an existing transaction.
     * 
     * @param transactionId the transaction ID
     * @param request the update request
     * @return the updated transaction DTO
     */
    @PUT
    @Path("/{transactionId}")
    @Transactional
    public TransactionDTO updateTransaction(
            @PathParam("transactionId") String transactionId,
            UpdateTransactionRequest request) {
        LOG.infof("Updating transaction: %s", transactionId);
        
        // CRITICAL: Validate that entries sum to zero
        validateUpdateEntriesBalance(request.entries());
        
        try {
            // Find existing transaction
            TransactionEntity transaction = entityManager.find(TransactionEntity.class, transactionId);
            if (transaction == null) {
                throw new WebApplicationException("Transaction not found: " + transactionId, 404);
            }
            
            // Update basic fields
            transaction.setTransactionDate(request.date());
            transaction.setStatus(TransactionStatus.valueOf(request.status()));
            transaction.setDescription(request.description());
            transaction.setPartnerId(request.partnerId());
            
            // Update entries - remove old ones and add new ones
            // Clear existing entries
            new ArrayList<>(transaction.getEntries()).forEach(transaction::removeEntry);
            
            // Add new entries
            if (request.entries() != null) {
                for (UpdateEntryRequest entryReq : request.entries()) {
                    EntryEntity entry;
                    if (entryReq.id() != null) {
                        // Try to reuse existing entry if ID is provided
                        entry = entityManager.find(EntryEntity.class, entryReq.id());
                        if (entry == null || entry.getTransaction() == null || !entry.getTransaction().getId().equals(transactionId)) {
                            // Create new if not found or belongs to different transaction
                            entry = new EntryEntity();
                        }
                    } else {
                        entry = new EntryEntity();
                    }
                    
                    entry.setEntryOrder(entryReq.entryOrder());
                    entry.setAccountId(entryReq.accountId());
                    entry.setCommodity(entryReq.commodity());
                    entry.setAmount(entryReq.amount());
                    entry.setNote(entryReq.note());
                    transaction.addEntry(entry);
                }
            }
            
            // Update tags - remove old ones and add new ones
            new HashSet<>(transaction.getTags()).forEach(transaction::removeTag);
            
            if (request.tags() != null) {
                for (TagDTO tagDto : request.tags()) {
                    TagEntity tag = new TagEntity();
                    tag.setTagKey(tagDto.key());
                    tag.setTagValue(tagDto.value());
                    transaction.addTag(tag);
                }
            }
            
            // Persist changes
            TransactionEntity updated = entityManager.merge(transaction);
            
            LOG.infof("Successfully updated transaction: %s", transactionId);
            
            return toDTO(updated);
            
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            LOG.error("Failed to update transaction", e);
            throw new WebApplicationException("Failed to update transaction: " + e.getMessage(), 
                Response.Status.BAD_REQUEST);
        }
    }
    
    /**
     * Deletes a transaction.
     * 
     * @param transactionId the transaction ID
     * @return confirmation message
     */
    @DELETE
    @Path("/{transactionId}")
    @Transactional
    public Map<String, Object> deleteTransaction(@PathParam("transactionId") String transactionId) {
        LOG.infof("Deleting transaction: %s", transactionId);
        
        try {
            TransactionEntity transaction = entityManager.find(TransactionEntity.class, transactionId);
            if (transaction == null) {
                throw new WebApplicationException("Transaction not found: " + transactionId, 404);
            }
            
            String description = transaction.getDescription();
            entityManager.remove(transaction);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Transaction deleted successfully");
            response.put("transactionId", transactionId);
            response.put("description", description);
            
            LOG.infof("Successfully deleted transaction: %s", transactionId);
            return response;
            
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            LOG.error("Failed to delete transaction", e);
            throw new WebApplicationException("Failed to delete transaction: " + e.getMessage(), 
                Response.Status.INTERNAL_SERVER_ERROR);
        }
    }
    
    /**
     * Converts a TransactionEntity to a TransactionDTO.
     */
    /**
     * Validates that create entries sum to zero.
     * Throws WebApplicationException if validation fails.
     */
    private void validateEntriesBalance(List<CreateEntryRequest> entries) {
        if (entries == null || entries.isEmpty()) {
            throw new WebApplicationException("Transaction must have at least one entry", 400);
        }
        
        BigDecimal sum = entries.stream()
            .map(CreateEntryRequest::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Allow for small rounding errors
        if (sum.abs().compareTo(new BigDecimal("0.001")) > 0) {
            throw new WebApplicationException(
                "Transaction entries must sum to zero. Current sum: " + sum, 
                400
            );
        }
    }
    
    /**
     * Validates that update entries sum to zero.
     * Throws WebApplicationException if validation fails.
     */
    private void validateUpdateEntriesBalance(List<UpdateEntryRequest> entries) {
        if (entries == null || entries.isEmpty()) {
            throw new WebApplicationException("Transaction must have at least one entry", 400);
        }
        
        BigDecimal sum = entries.stream()
            .map(UpdateEntryRequest::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Allow for small rounding errors
        if (sum.abs().compareTo(new BigDecimal("0.001")) > 0) {
            throw new WebApplicationException(
                "Transaction entries must sum to zero. Current sum: " + sum, 
                400
            );
        }
    }

    private TransactionDTO toDTO(TransactionEntity transaction) {
        // Load accounts for this journal to join with entries
        List<dev.abstratium.abstraccount.entity.AccountEntity> accounts = 
            journalPersistenceService.loadAllAccounts(transaction.getJournalId());
        Map<String, dev.abstratium.abstraccount.entity.AccountEntity> accountMap = accounts.stream()
            .collect(Collectors.toMap(
                dev.abstratium.abstraccount.entity.AccountEntity::getId,
                acc -> acc
            ));
        
        // Convert tags
        List<TagDTO> tags = transaction.getTags().stream()
            .map(tag -> new TagDTO(tag.getTagKey(), tag.getTagValue()))
            .collect(Collectors.toList());
        
        // Convert entries
        List<EntryDTO> entries = transaction.getEntries().stream()
            .sorted((a, b) -> Integer.compare(a.getEntryOrder(), b.getEntryOrder()))
            .map(entry -> {
                dev.abstratium.abstraccount.entity.AccountEntity account = accountMap.get(entry.getAccountId());
                return new EntryDTO(
                    entry.getId(),
                    entry.getEntryOrder(),
                    entry.getAccountId(),
                    account != null ? account.getName() : "",
                    account != null ? account.getType().name() : "",
                    entry.getCommodity(),
                    entry.getAmount(),
                    entry.getNote()
                );
            })
            .collect(Collectors.toList());
        
        String partnerId = transaction.getPartnerId();
        String partnerName = partnerId != null 
            ? partnerDataAdapter.getPartner(partnerId)
                .map(p -> p.name())
                .orElse(null)
            : null;
        
        return new TransactionDTO(
            transaction.getId(),
            transaction.getTransactionDate(),
            transaction.getStatus().name(),
            transaction.getDescription(),
            partnerId,
            partnerName,
            tags,
            entries
        );
    }
}
