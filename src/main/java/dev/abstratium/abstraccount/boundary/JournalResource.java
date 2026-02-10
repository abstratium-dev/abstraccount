package dev.abstratium.abstraccount.boundary;

import dev.abstratium.abstraccount.model.*;
import dev.abstratium.abstraccount.service.JournalService;
import dev.abstratium.abstraccount.service.TransactionFilter;
import dev.abstratium.abstraccount.service.TransactionFilters;
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
public class JournalResource {
    
    private static final Logger LOG = Logger.getLogger(JournalResource.class);
    private static final String JOURNAL_FILE_PATH = ".ant/abstratium-2025.journal";
    
    @Inject
    JournalService journalService;
    
    @Inject
    JournalParser journalParser;
    
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
}
