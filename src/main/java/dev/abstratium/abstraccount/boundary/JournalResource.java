package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.Roles;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.model.*;
import dev.abstratium.abstraccount.service.JournalPersistenceService;
import dev.abstratium.abstraccount.service.JournalService;
import dev.abstratium.abstraccount.service.TransactionFilter;
import dev.abstratium.abstraccount.service.TransactionFilters;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * REST resource for journal operations.
 * Provides endpoints for querying journal data with filtering.
 */
@Path("/api/journal")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed({Roles.USER})
public class JournalResource {
    
    private static final Logger LOG = Logger.getLogger(JournalResource.class);
    private static final String JOURNAL_FILE_PATH = ".ant/abstratium-2025.journal";
    
    @Inject
    JournalService journalService;
    
    @Inject
    JournalParser journalParser;
    
    @Inject
    dev.abstratium.abstraccount.service.JournalModelPersistenceService modelPersistenceService;
    
    @Inject
    JournalPersistenceService journalPersistenceService;
    
    private Journal cachedJournal;
    private long lastModified = 0;
    
    /**
     * Loads the journal from file, using cache if file hasn't changed.
     */
    private Journal loadJournal() {
        try {
            java.nio.file.Path journalPath = java.nio.file.Path.of(JOURNAL_FILE_PATH);
            long currentModified = Files.getLastModifiedTime(journalPath).toMillis();
            
            if (cachedJournal == null || currentModified != lastModified) {
                LOG.infof("Loading journal from %s", journalPath);
                String content = Files.readString(journalPath);
                cachedJournal = journalParser.parse(content);
                lastModified = currentModified;
            }
            
            return cachedJournal;
        } catch (IOException e) {
            LOG.error("Failed to load journal file", e);
            throw new WebApplicationException("Failed to load journal file: " + e.getMessage(), 500);
        }
    }
    
    /**
     * Gets all accounts in the journal.
     */
    @GET
    @Path("/accounts")
    public List<AccountSummaryDTO> getAccounts() {
        Journal journal = loadJournal();
        
        return journal.accounts().stream()
            .map(account -> new AccountSummaryDTO(
                account.accountNumber(),
                account.fullName(),
                account.type().name(),
                account.note()
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * Gets the balance for a specific account.
     * 
     * @param accountName the full account name
     * @param asOfDate optional date (defaults to today)
     */
    @GET
    @Path("/accounts/{accountName}/balance")
    public AccountBalanceDTO getAccountBalance(
            @PathParam("accountName") String accountName,
            @QueryParam("asOfDate") String asOfDate) {
        
        Journal journal = loadJournal();
        LocalDate date = asOfDate != null ? LocalDate.parse(asOfDate) : LocalDate.now();
        
        Account account = journal.accounts().stream()
            .filter(a -> a.fullName().equals(accountName))
            .findFirst()
            .orElseThrow(() -> new WebApplicationException("Account not found: " + accountName, 404));
        
        Map<String, BigDecimal> balances = journalService.getAccountBalance(journal, account, date);
        
        return new AccountBalanceDTO(
            account.accountNumber(),
            account.fullName(),
            account.type().name(),
            balances
        );
    }
    
    /**
     * Gets postings for a specific account with optional filtering.
     * 
     * @param accountName the full account name
     * @param startDate optional start date filter
     * @param endDate optional end date filter
     * @param status optional transaction status filter
     */
    @GET
    @Path("/accounts/{accountName}/postings")
    public List<PostingDTO> getAccountPostings(
            @PathParam("accountName") String accountName,
            @QueryParam("startDate") String startDate,
            @QueryParam("endDate") String endDate,
            @QueryParam("status") String status) {
        
        Journal journal = loadJournal();
        
        Account account = journal.accounts().stream()
            .filter(a -> a.fullName().equals(accountName))
            .findFirst()
            .orElseThrow(() -> new WebApplicationException("Account not found: " + accountName, 404));
        
        // Build filter
        TransactionFilter filter = TransactionFilters.affectingAccount(account);
        
        if (startDate != null && endDate != null) {
            filter = filter.and(TransactionFilters.between(
                LocalDate.parse(startDate),
                LocalDate.parse(endDate)
            ));
        } else if (startDate != null) {
            filter = filter.and(TransactionFilters.onOrAfter(LocalDate.parse(startDate)));
        } else if (endDate != null) {
            filter = filter.and(TransactionFilters.onOrBefore(LocalDate.parse(endDate)));
        }
        
        if (status != null) {
            TransactionStatus txStatus = TransactionStatus.valueOf(status.toUpperCase());
            filter = filter.and(TransactionFilters.withStatus(txStatus));
        }
        
        List<Transaction> transactions = journalService.filterTransactions(journal, filter);
        
        // Convert to PostingDTOs with running balance
        List<PostingDTO> postingDTOs = new ArrayList<>();
        Map<String, BigDecimal> runningBalances = new HashMap<>();
        
        for (Transaction transaction : transactions) {
            for (Posting posting : transaction.postings()) {
                if (posting.account().fullName().equals(accountName)) {
                    String commodity = posting.amount().commodity();
                    BigDecimal currentBalance = runningBalances.getOrDefault(commodity, BigDecimal.ZERO);
                    currentBalance = currentBalance.add(posting.amount().quantity());
                    runningBalances.put(commodity, currentBalance);
                    
                    postingDTOs.add(new PostingDTO(
                        transaction.transactionDate(),
                        transaction.status().name(),
                        transaction.description(),
                        transaction.id(),
                        posting.account().accountNumber(),
                        posting.account().fullName(),
                        posting.account().type().name(),
                        commodity,
                        posting.amount().quantity(),
                        currentBalance
                    ));
                }
            }
        }
        
        return postingDTOs;
    }
    
    /**
     * Gets all postings across all accounts with optional filtering.
     * 
     * @param startDate optional start date filter
     * @param endDate optional end date filter
     * @param status optional transaction status filter
     * @param accountName optional account name filter
     */
    @GET
    @Path("/postings")
    public List<PostingDTO> getAllPostings(
            @QueryParam("startDate") String startDate,
            @QueryParam("endDate") String endDate,
            @QueryParam("status") String status,
            @QueryParam("accountName") String accountName) {
        
        Journal journal = loadJournal();
        
        // Build filter
        TransactionFilter filter = TransactionFilters.all();
        
        if (startDate != null && endDate != null) {
            filter = filter.and(TransactionFilters.between(
                LocalDate.parse(startDate),
                LocalDate.parse(endDate)
            ));
        } else if (startDate != null) {
            filter = filter.and(TransactionFilters.onOrAfter(LocalDate.parse(startDate)));
        } else if (endDate != null) {
            filter = filter.and(TransactionFilters.onOrBefore(LocalDate.parse(endDate)));
        }
        
        if (status != null) {
            TransactionStatus txStatus = TransactionStatus.valueOf(status.toUpperCase());
            filter = filter.and(TransactionFilters.withStatus(txStatus));
        }
        
        if (accountName != null) {
            filter = filter.and(TransactionFilters.affectingAccountByName(accountName));
        }
        
        List<Transaction> transactions = journalService.filterTransactions(journal, filter);
        
        // Convert to PostingDTOs
        List<PostingDTO> postingDTOs = new ArrayList<>();
        
        for (Transaction transaction : transactions) {
            for (Posting posting : transaction.postings()) {
                // Only include if account filter matches or no filter
                if (accountName == null || posting.account().fullName().equals(accountName)) {
                    postingDTOs.add(new PostingDTO(
                        transaction.transactionDate(),
                        transaction.status().name(),
                        transaction.description(),
                        transaction.id(),
                        posting.account().accountNumber(),
                        posting.account().fullName(),
                        posting.account().type().name(),
                        posting.amount().commodity(),
                        posting.amount().quantity(),
                        null // Running balance not calculated for all postings view
                    ));
                }
            }
        }
        
        return postingDTOs;
    }
    
    /**
     * Gets balances for all accounts.
     * 
     * @param asOfDate optional date (defaults to today)
     */
    @GET
    @Path("/balances")
    public List<AccountBalanceDTO> getAllBalances(@QueryParam("asOfDate") String asOfDate) {
        Journal journal = loadJournal();
        LocalDate date = asOfDate != null ? LocalDate.parse(asOfDate) : LocalDate.now();
        
        Map<String, Map<String, BigDecimal>> allBalances = journalService.getAllAccountBalances(journal, date);
        
        return journal.accounts().stream()
            .filter(account -> allBalances.containsKey(account.fullName()))
            .map(account -> new AccountBalanceDTO(
                account.accountNumber(),
                account.fullName(),
                account.type().name(),
                allBalances.get(account.fullName())
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * Gets a list of all journals (metadata only, no accounts or transactions).
     * 
     * @return list of journal metadata
     */
    @GET
    @Path("/list")
    public List<JournalMetadataDTO> listJournals() {
        LOG.debug("Listing all journals");
        
        List<JournalEntity> journals = journalPersistenceService.findAllJournals();
        
        return journals.stream()
            .map(j -> new JournalMetadataDTO(
                j.getId(),
                j.getTitle(),
                j.getSubtitle(),
                j.getCurrency(),
                j.getCommodities()
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * Gets metadata for a specific journal by ID.
     * 
     * @param journalId the journal ID
     * @return journal metadata
     */
    @GET
    @Path("/{journalId}/metadata")
    public JournalMetadataDTO getJournalMetadata(@PathParam("journalId") String journalId) {
        LOG.debugf("Getting metadata for journal: %s", journalId);
        
        JournalEntity journal = journalPersistenceService.findJournalById(journalId)
            .orElseThrow(() -> new WebApplicationException("Journal not found: " + journalId, 404));
        
        return new JournalMetadataDTO(
            journal.getId(),
            journal.getTitle(),
            journal.getSubtitle(),
            journal.getCurrency(),
            journal.getCommodities()
        );
    }
    
    /**
     * Uploads and persists a journal file.
     * Parses the journal content and stores all data (journal metadata, accounts, transactions) in the database.
     * 
     * @param journalContent the journal file content as a string
     * @return a summary of what was persisted
     */
    @POST
    @Path("/upload")
    @Consumes(MediaType.TEXT_PLAIN)
    @RolesAllowed({Roles.USER})
    public Map<String, Object> uploadJournal(String journalContent) {
        LOG.infof("Uploading journal, content length: %d", journalContent.length());
        
        try {
            // Parse the journal
            Journal journal = journalParser.parse(journalContent);
            
            // Persist to database
            modelPersistenceService.persistJournalModel(journal);
            
            // Clear cache to force reload
            cachedJournal = null;
            lastModified = 0;
            
            // Return summary
            Map<String, Object> summary = new HashMap<>();
            summary.put("title", journal.title());
            summary.put("accountCount", journal.accounts().size());
            summary.put("transactionCount", journal.transactions().size());
            summary.put("commodityCount", journal.commodities().size());
            summary.put("status", "success");
            
            LOG.infof("Successfully uploaded journal: %s", journal.title());
            return summary;
            
        } catch (Exception e) {
            LOG.error("Failed to upload journal", e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage());
            throw new WebApplicationException(
                jakarta.ws.rs.core.Response.status(jakarta.ws.rs.core.Response.Status.BAD_REQUEST)
                    .entity(error)
                    .build()
            );
        }
    }
}
