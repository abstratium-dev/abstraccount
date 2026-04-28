package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.boundary.NewYearAccountPreviewDTO;
import dev.abstratium.abstraccount.boundary.NewYearPreviewDTO;
import dev.abstratium.abstraccount.boundary.NewYearResultDTO;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
import dev.abstratium.abstraccount.model.AccountType;
import dev.abstratium.abstraccount.model.TransactionStatus;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.jboss.logging.Logger;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service for creating a new year journal by copying accounts from a previous journal
 * and setting opening balances.
 *
 * <p>This implements Phase 4 of the year-end closing process: creating a new journal
 * for the fiscal year with opening balances carried forward from the previous year.</p>
 */
@ApplicationScoped
public class NewYearService {

    private static final Logger LOG = Logger.getLogger(NewYearService.class);

    @PersistenceContext
    EntityManager em;

    @Inject
    JournalPersistenceService journalPersistenceService;

    @Inject
    AccountService accountService;

    /**
     * Previews the new year journal creation without making any changes.
     *
     * @param sourceJournalId          the journal to copy from
     * @param newJournalTitle        the title for the new journal
     * @param openingDate              the date for opening balance transactions
     * @param retainedEarningsCodePath   code path of the retained earnings account (e.g., "2:290:2970")
     * @param annualProfitLossCodePath   code path of the annual profit/loss account (e.g., "2:290:2979")
     * @return preview DTO showing what will be created
     */
    @Transactional
    public NewYearPreviewDTO preview(
            String sourceJournalId,
            String newJournalTitle,
            LocalDate openingDate,
            String retainedEarningsCodePath,
            String annualProfitLossCodePath) {

        LOG.debugf("Previewing new year creation from journal %s", sourceJournalId);

        JournalEntity sourceJournal = em.find(JournalEntity.class, sourceJournalId);
        if (sourceJournal == null) {
            throw new IllegalArgumentException("Source journal not found: " + sourceJournalId);
        }

        List<AccountEntity> sourceAccounts = journalPersistenceService.loadAllAccounts(sourceJournalId);
        List<NewYearAccountPreviewDTO> accountPreviews = new ArrayList<>();

        // Build account ID to code path mapping for retained earnings lookup
        Map<String, String> accountCodePaths = new HashMap<>();
        for (AccountEntity account : sourceAccounts) {
            accountCodePaths.put(account.getId(), buildCodePath(account, sourceAccounts));
        }

        // Look up both equity accounts for profit/loss transfer
        AccountEntity retainedEarningsAccount = null;
        AccountEntity annualProfitLossAccount = null;
        String retainedEarningsFullName = null;
        String annualProfitLossFullName = null;

        if (retainedEarningsCodePath != null && !retainedEarningsCodePath.isBlank()) {
            try {
                retainedEarningsAccount = accountService.findAccountByCodePath(sourceJournalId, retainedEarningsCodePath, null);
                retainedEarningsFullName = buildFullAccountName(retainedEarningsAccount, sourceAccounts);
            } catch (IllegalArgumentException e) {
                LOG.warnf("Retained earnings account not found: %s", retainedEarningsCodePath);
            }
        }

        if (annualProfitLossCodePath != null && !annualProfitLossCodePath.isBlank()) {
            try {
                annualProfitLossAccount = accountService.findAccountByCodePath(sourceJournalId, annualProfitLossCodePath, null);
                annualProfitLossFullName = buildFullAccountName(annualProfitLossAccount, sourceAccounts);
            } catch (IllegalArgumentException e) {
                LOG.warnf("Annual profit/loss account not found: %s", annualProfitLossCodePath);
            }
        }

        // Build account previews with opening balances
        int openingBalanceCount = 0;
        for (AccountEntity account : sourceAccounts) {
            AccountType type = account.getType();
            // Only balance sheet accounts (Assets, Liabilities, Equity) carry forward
            if (type != AccountType.ASSET && type != AccountType.LIABILITY && type != AccountType.EQUITY) {
                continue;
            }

            BigDecimal balance = computeBalance(account.getId(), sourceJournalId, openingDate.minusDays(1));
            String commodity = resolveCommodity(account.getId(), sourceJournalId, openingDate.minusDays(1));

            String codePath = accountCodePaths.get(account.getId());
            String fullName = buildFullAccountName(account, sourceAccounts);

            accountPreviews.add(new NewYearAccountPreviewDTO(
                account.getId(),
                codePath,
                fullName,
                balance,
                commodity
            ));

            // Count non-zero balances for opening balance transactions
            if (balance.compareTo(BigDecimal.ZERO) != 0) {
                openingBalanceCount++;
            }
        }

        return new NewYearPreviewDTO(
            sourceJournalId,
            sourceJournal.getTitle(),
            newJournalTitle != null && !newJournalTitle.isBlank() ? newJournalTitle : sourceJournal.getTitle(),
            openingDate.format(DateTimeFormatter.ISO_LOCAL_DATE),
            retainedEarningsCodePath,
            retainedEarningsFullName,
            annualProfitLossCodePath,
            annualProfitLossFullName,
            accountPreviews,
            sourceAccounts.size(),
            openingBalanceCount
        );
    }

    /**
     * Executes the new year journal creation.
     *
     * @param sourceJournalId          the journal to copy from
     * @param newJournalTitle        the title for the new journal
     * @param openingDate            the date for opening balance transactions
     * @param retainedEarningsCodePath code path of the retained earnings account (can be null)
     * @return result DTO with information about the created journal
     */
    @Transactional
    public NewYearResultDTO execute(
            String sourceJournalId,
            String newJournalTitle,
            LocalDate openingDate,
            String retainedEarningsCodePath,
            String annualProfitLossCodePath) {

        LOG.infof("Executing new year creation from journal %s", sourceJournalId);

        JournalEntity sourceJournal = em.find(JournalEntity.class, sourceJournalId);
        if (sourceJournal == null) {
            throw new IllegalArgumentException("Source journal not found: " + sourceJournalId);
        }

        // Create new journal with same metadata
        JournalEntity newJournal = new JournalEntity();
        newJournal.setLogo(sourceJournal.getLogo());
        newJournal.setTitle(newJournalTitle != null && !newJournalTitle.isBlank()
            ? newJournalTitle : sourceJournal.getTitle());
        newJournal.setSubtitle(sourceJournal.getSubtitle());
        newJournal.setCurrency(sourceJournal.getCurrency());
        newJournal.setCommodities(new HashMap<>(sourceJournal.getCommodities()));
        em.persist(newJournal);
        LOG.debugf("Created new journal: %s (%s)", newJournal.getTitle(), newJournal.getId());

        // Load source accounts
        List<AccountEntity> sourceAccounts = journalPersistenceService.loadAllAccounts(sourceJournalId);

        // Create account mapping: source ID -> new account
        Map<String, AccountEntity> accountMapping = new HashMap<>();
        Map<String, String> oldIdToNewId = new HashMap<>();

        // First pass: create all accounts without parent references
        for (AccountEntity sourceAccount : sourceAccounts) {
            AccountEntity newAccount = new AccountEntity();
            newAccount.setJournalId(newJournal.getId());
            newAccount.setName(sourceAccount.getName());
            newAccount.setType(sourceAccount.getType());
            newAccount.setNote(sourceAccount.getNote());
            newAccount.setAccountOrder(sourceAccount.getAccountOrder());
            // Don't set parent yet - we'll do that in second pass
            em.persist(newAccount);

            accountMapping.put(sourceAccount.getId(), newAccount);
            oldIdToNewId.put(sourceAccount.getId(), newAccount.getId());
        }

        // Second pass: set parent references using the mapping
        for (AccountEntity sourceAccount : sourceAccounts) {
            if (sourceAccount.getParentAccountId() != null) {
                AccountEntity newAccount = accountMapping.get(sourceAccount.getId());
                String newParentId = oldIdToNewId.get(sourceAccount.getParentAccountId());
                newAccount.setParentAccountId(newParentId);
            }
        }

        LOG.debugf("Copied %d accounts to new journal", sourceAccounts.size());

        // Step 1: Create profit/loss transfer transaction FIRST (before opening balances)
        // This transfers the previous year's profit/loss from 2979 to 2970
        String retainedEarningsTransferId = null;
        AccountEntity sourceAnnualProfitLoss = null;
        if (retainedEarningsCodePath != null && !retainedEarningsCodePath.isBlank() &&
            annualProfitLossCodePath != null && !annualProfitLossCodePath.isBlank()) {
            try {
                AccountEntity sourceRetainedEarnings = accountService.findAccountByCodePath(sourceJournalId, retainedEarningsCodePath, null);
                sourceAnnualProfitLoss = accountService.findAccountByCodePath(sourceJournalId, annualProfitLossCodePath, null);

                AccountEntity newRetainedEarnings = accountMapping.get(sourceRetainedEarnings.getId());
                AccountEntity newAnnualProfitLoss = accountMapping.get(sourceAnnualProfitLoss.getId());

                LOG.debugf("Found accounts for transfer - 2970: %s -> new: %s, 2979: %s -> new: %s",
                    sourceRetainedEarnings.getName(), newRetainedEarnings != null ? newRetainedEarnings.getName() : "null",
                    sourceAnnualProfitLoss.getName(), newAnnualProfitLoss != null ? newAnnualProfitLoss.getName() : "null");

                if (newRetainedEarnings != null && newAnnualProfitLoss != null) {
                    // Create the profit/loss transfer transaction using SOURCE account for balance calculation
                    var result = createProfitLossTransferTransaction(
                        newJournal.getId(),
                        openingDate,
                        newRetainedEarnings,
                        newAnnualProfitLoss,
                        sourceAnnualProfitLoss.getId(),  // Use source account ID for balance lookup
                        sourceJournalId
                    );
                    LOG.debugf("Created profit/loss transfer transaction: %s with balance %s", result.transactionId(), result.balance());
                    retainedEarningsTransferId = result.transactionId();

                    // create opening balance transaction for old profit/loss account, to balance out the transfer that was just created so that 2979 starts at 0 again
                    createOpeningBalanceTransaction(
                        newJournal.getId(),
                        openingDate,
                        result.sourceAnnualProfitLossAccount(),
                        result.balance(),
                        result.commodity()
                    );
                }
            } catch (IllegalArgumentException e) {
                LOG.warnf("Could not create profit/loss transfer: %s", e.getMessage());
            }
        }

        // Step 2: Create opening balance transactions for balance sheet accounts
        int openingBalanceCount = 0;
        for (AccountEntity sourceAccount : sourceAccounts) {
            AccountType type = sourceAccount.getType();
            // Only balance sheet accounts carry forward
            if (type != AccountType.ASSET && type != AccountType.LIABILITY && type != AccountType.EQUITY && type != AccountType.CASH) {
                continue;
            }

            // Skip the annual profit/loss account (normally 2979) - its balance was transferred to 2970 and it was set to zero above
            if (sourceAnnualProfitLoss != null && sourceAccount.getId().equals(sourceAnnualProfitLoss.getId())) {
                LOG.debugf("Skipping annual profit/loss account %s from opening balances (balance transferred to 2970)", sourceAccount.getName());
                continue;
            }

            BigDecimal balance = computeBalance(sourceAccount.getId(), sourceJournalId, openingDate.minusDays(1));
            if (balance.compareTo(BigDecimal.ZERO) == 0) {
                continue; // Skip zero balances
            }

            String commodity = resolveCommodity(sourceAccount.getId(), sourceJournalId, openingDate.minusDays(1));
            AccountEntity newAccount = accountMapping.get(sourceAccount.getId());

            createOpeningBalanceTransaction(newJournal.getId(), openingDate, newAccount, balance, commodity);
            openingBalanceCount++;
        }

        LOG.debugf("Created %d opening balance transactions", openingBalanceCount);

        return new NewYearResultDTO(
            newJournal.getId(),
            newJournal.getTitle(),
            sourceAccounts.size(),
            openingBalanceCount,
            retainedEarningsTransferId
        );
    }

    /**
     * Creates an opening balance transaction for a single account.
     * This is a single-entry transaction that records the account's opening balance.
     * The opening balances transaction does not need to balance individually - the
     * books balance across all opening entries together.
     */
    private void createOpeningBalanceTransaction(
            String journalId,
            LocalDate openingDate,
            AccountEntity account,
            BigDecimal balance,
            String commodity) {

        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journalId);
        tx.setTransactionDate(openingDate);
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Opening balance: " + account.getName());

        // Tag: OpeningBalances:
        TagEntity openingTag = new TagEntity();
        openingTag.setId(UUID.randomUUID().toString());
        openingTag.setTagKey("OpeningBalances");
        openingTag.setTagValue("");
        openingTag.setTransaction(tx);
        tx.addTag(openingTag);

        // Single entry with the balance
        EntryEntity entry = new EntryEntity();
        entry.setId(UUID.randomUUID().toString());
        entry.setTransaction(tx);
        entry.setAccountId(account.getId());
        entry.setCommodity(commodity);
        entry.setAmount(balance);
        entry.setEntryOrder(0);
        tx.addEntry(entry);

        em.persist(tx);
    }

    record ProfitLossTransferResult(String transactionId, BigDecimal balance, String commodity, AccountEntity sourceAnnualProfitLossAccount) {}

    /**
     * Creates a balanced transaction that transfers the annual profit/loss
     * from account (normally 2979) to the retained earnings account (normally 2970).
     * This matches the Swiss accounting practice from the YEAR_END_CLOSING_GUIDE.
     */
    private ProfitLossTransferResult createProfitLossTransferTransaction(
            String journalId,
            LocalDate openingDate,
            AccountEntity retainedEarningsAccount,
            AccountEntity annualProfitLossAccount,
            String sourceAnnualProfitLossAccountId,  // Source account ID for balance lookup
            String sourceJournalId) {

        // Get the profit/loss balance from the SOURCE account (not the new account which has no transactions yet)
        BigDecimal profitLossBalance = computeBalance(sourceAnnualProfitLossAccountId, sourceJournalId, openingDate.minusDays(1));
        LOG.debugf("Profit/loss balance from source account %s: %s", sourceAnnualProfitLossAccountId, profitLossBalance);

        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journalId);
        tx.setTransactionDate(openingDate);
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Transfer of Annual Profit/Loss from previous year");

        // Tag: Closing:
        TagEntity closingTag = new TagEntity();
        closingTag.setId(UUID.randomUUID().toString());
        closingTag.setTagKey("Closing");
        closingTag.setTagValue("");
        closingTag.setTransaction(tx);
        tx.addTag(closingTag);

        String commodity = resolveCommodity(sourceAnnualProfitLossAccountId, sourceJournalId, openingDate.minusDays(1));

        // Entry 1: Annual profit/loss account (normally 2979) is set to last years value
        EntryEntity profitLossEntry = new EntryEntity();
        profitLossEntry.setId(UUID.randomUUID().toString());
        profitLossEntry.setTransaction(tx);
        profitLossEntry.setAccountId(annualProfitLossAccount.getId());
        profitLossEntry.setCommodity(commodity);
        profitLossEntry.setAmount(profitLossBalance.negate());
        profitLossEntry.setEntryOrder(0);
        tx.addEntry(profitLossEntry);

        // Entry 2: Retained earnings account (normally 2970) receives the profit/loss
        EntryEntity retainedEarningsEntry = new EntryEntity();
        retainedEarningsEntry.setId(UUID.randomUUID().toString());
        retainedEarningsEntry.setTransaction(tx);
        retainedEarningsEntry.setAccountId(retainedEarningsAccount.getId());
        retainedEarningsEntry.setCommodity(commodity);
        retainedEarningsEntry.setAmount(profitLossBalance);
        retainedEarningsEntry.setEntryOrder(1);
        tx.addEntry(retainedEarningsEntry);

        em.persist(tx);
        return new ProfitLossTransferResult(tx.getId(), profitLossBalance, commodity, annualProfitLossAccount);
    }

    /**
     * Computes the net balance of an account from all entries up to and including the given date.
     */
    private BigDecimal computeBalance(String accountId, String journalId, LocalDate upToDate) {
        List<BigDecimal> results = em.createQuery(
            "SELECT SUM(e.amount) FROM EntryEntity e " +
            "JOIN e.transaction t " +
            "WHERE e.accountId = :accountId " +
            "AND t.journalId = :journalId " +
            "AND t.transactionDate <= :upToDate",
            BigDecimal.class)
            .setParameter("accountId", accountId)
            .setParameter("journalId", journalId)
            .setParameter("upToDate", upToDate)
            .getResultList();

        if (results.isEmpty() || results.get(0) == null) {
            return BigDecimal.ZERO;
        }
        return results.get(0);
    }

    /**
     * Resolves the commodity used for an account by looking at existing entries.
     * Falls back to "CHF" if no entries exist.
     */
    private String resolveCommodity(String accountId, String journalId, LocalDate upToDate) {
        List<String> commodities = em.createQuery(
            "SELECT e.commodity FROM EntryEntity e " +
            "JOIN e.transaction t " +
            "WHERE e.accountId = :accountId " +
            "AND t.journalId = :journalId " +
            "AND t.transactionDate <= :upToDate " +
            "ORDER BY t.transactionDate DESC",
            String.class)
            .setParameter("accountId", accountId)
            .setParameter("journalId", journalId)
            .setParameter("upToDate", upToDate)
            .setMaxResults(1)
            .getResultList();

        return commodities.isEmpty() ? "CHF" : commodities.get(0);
    }

    /**
     * Builds the hierarchical code path for an account.
     */
    private String buildCodePath(AccountEntity account, List<AccountEntity> allAccounts) {
        List<String> codes = new ArrayList<>();
        AccountEntity current = account;

        while (current != null) {
            String name = current.getName();
            String code = name.indexOf(' ') > -1 ? name.substring(0, name.indexOf(' ')) : name;
            codes.add(0, code);

            String parentId = current.getParentAccountId();
            current = null;
            if (parentId != null) {
                for (AccountEntity acc : allAccounts) {
                    if (acc.getId().equals(parentId)) {
                        current = acc;
                        break;
                    }
                }
            }
        }

        return String.join(":", codes);
    }

    /**
     * Builds the full colon-separated account name path.
     */
    private String buildFullAccountName(AccountEntity account, List<AccountEntity> allAccounts) {
        List<String> names = new ArrayList<>();
        AccountEntity current = account;

        while (current != null) {
            names.add(0, current.getName());

            String parentId = current.getParentAccountId();
            current = null;
            if (parentId != null) {
                for (AccountEntity acc : allAccounts) {
                    if (acc.getId().equals(parentId)) {
                        current = acc;
                        break;
                    }
                }
            }
        }

        return String.join(":", names);
    }
}
