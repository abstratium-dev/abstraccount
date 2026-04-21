package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.boundary.CloseAccountPreviewDTO;
import dev.abstratium.abstraccount.boundary.CloseBooksPreviewDTO;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.EntryEntity;
import dev.abstratium.abstraccount.entity.TagEntity;
import dev.abstratium.abstraccount.entity.TransactionEntity;
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
import java.util.List;
import java.util.UUID;

/**
 * Service for performing year-end book closing.
 *
 * <p>The service identifies all income/expense accounts (account types REVENUE and EXPENSE)
 * with a non-zero direct balance up to and including the given closing date, and either previews or
 * creates one closing transaction per account that transfers the balance to the designated
 * equity account (e.g. 2979 Annual profit/loss).</p>
 *
 * <p>Both leaf accounts and parent accounts may carry direct balances (a posting in a transaction
 * can reference any level of the account hierarchy), so all levels are checked.</p>
 */
@ApplicationScoped
public class CloseBooksService {

    private static final Logger LOG = Logger.getLogger(CloseBooksService.class);

    @PersistenceContext
    EntityManager em;

    @Inject
    AccountService accountService;

    @Inject
    JournalPersistenceService journalPersistenceService;

    /**
     * Previews the closing entries without persisting anything.
     *
     * @param journalId            the journal to close
     * @param closingDate          the closing date (entries up to and including this date)
     * @param equityCodePath       code path of the equity account to transfer balances to
     * @return preview DTO listing affected accounts and their balances
     */
    @Transactional
    public CloseBooksPreviewDTO preview(String journalId, LocalDate closingDate, String equityCodePath) {
        LOG.debugf("Previewing close-books for journal %s, date %s, equity %s", journalId, closingDate, equityCodePath);

        AccountEntity equityAccount = accountService.findAccountByCodePath(journalId, equityCodePath, null);
        String equityFullName = buildFullAccountName(equityAccount, journalPersistenceService.loadAllAccounts(journalId));

        List<CloseAccountPreviewDTO> previews = buildAccountPreviews(journalId, closingDate);

        return new CloseBooksPreviewDTO(
            previews,
            equityCodePath,
            equityFullName,
            closingDate.format(DateTimeFormatter.ISO_LOCAL_DATE)
        );
    }

    /**
     * Executes the close-books operation, creating one closing transaction per affected account.
     *
     * @param journalId      the journal to close
     * @param closingDate    the closing date
     * @param equityCodePath code path of the equity account to transfer balances to
     * @return list of created transaction IDs
     */
    @Transactional
    public List<String> execute(String journalId, LocalDate closingDate, String equityCodePath) {
        LOG.debugf("Executing close-books for journal %s, date %s, equity %s", journalId, closingDate, equityCodePath);

        AccountEntity equityAccount = accountService.findAccountByCodePath(journalId, equityCodePath, null);

        List<CloseAccountPreviewDTO> previews = buildAccountPreviews(journalId, closingDate);

        List<String> transactionIds = new ArrayList<>();

        for (CloseAccountPreviewDTO preview : previews) {
            String txId = createClosingTransaction(
                journalId, closingDate, preview, equityAccount);
            transactionIds.add(txId);
        }

        LOG.debugf("Created %d closing transactions", transactionIds.size());
        return transactionIds;
    }

    /**
     * Builds the list of account previews: all accounts of type REVENUE or EXPENSE
     * with a non-zero direct balance up to the closing date.
     * Both leaf accounts and parent accounts are included, since a posting may reference
     * any level of the account hierarchy.
     */
    private List<CloseAccountPreviewDTO> buildAccountPreviews(String journalId, LocalDate closingDate) {
        List<AccountEntity> allAccounts = journalPersistenceService.loadAllAccounts(journalId);

        List<CloseAccountPreviewDTO> previews = new ArrayList<>();

        for (AccountEntity account : allAccounts) {
            dev.abstratium.abstraccount.model.AccountType type = account.getType();
            if (type != dev.abstratium.abstraccount.model.AccountType.REVENUE
                    && type != dev.abstratium.abstraccount.model.AccountType.EXPENSE) {
                continue;
            }

            BigDecimal balance = computeBalance(account.getId(), journalId, closingDate);
            if (balance.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            String codePath = buildCodePath(account, allAccounts);
            String fullName = buildFullAccountName(account, allAccounts);
            String commodity = resolveCommodity(account.getId(), journalId, closingDate);

            previews.add(new CloseAccountPreviewDTO(
                account.getId(),
                codePath,
                fullName,
                balance,
                commodity
            ));
        }

        return previews;
    }

    /**
     * Creates a single closing transaction for one account.
     *
     * <p>The transaction debits/credits the income or expense account back to zero,
     * with the offsetting entry in the equity account. Each transaction is tagged
     * with {@code Closing:} (empty tag value).</p>
     *
     * <p>For an expense account with a positive (debit) balance of X:
     * <pre>
     *   equity account    CHF +X   (debit equity to absorb the expense)
     *   expense account   CHF -X   (credit expense account to zero it)
     * </pre>
     * For a revenue account with a negative (credit) balance of X (stored as negative):
     * <pre>
     *   equity account    CHF X    (credit equity to absorb the revenue)
     *   revenue account   CHF -X   (debit revenue account to zero it)
     * </pre>
     * In both cases the equity entry amount = balance, and the account entry = -balance,
     * which keeps the transaction balanced.</p>
     */
    private String createClosingTransaction(
            String journalId,
            LocalDate closingDate,
            CloseAccountPreviewDTO preview,
            AccountEntity equityAccount) {

        String accountTypeName = resolveAccountTypeName(preview.accountId());

        TransactionEntity tx = new TransactionEntity();
        tx.setJournalId(journalId);
        tx.setTransactionDate(closingDate);
        tx.setStatus(TransactionStatus.CLEARED);
        tx.setDescription("Close " + accountTypeName + " account " + preview.accountFullName());

        // Tag: Closing: (empty value)
        TagEntity closingTag = new TagEntity();
        closingTag.setId(UUID.randomUUID().toString());
        closingTag.setTagKey("Closing");
        closingTag.setTagValue("");
        closingTag.setTransaction(tx);
        tx.addTag(closingTag);

        // Entry 1: equity account — receives balance (negated for revenue, direct for expense)
        EntryEntity equityEntry = new EntryEntity();
        equityEntry.setId(UUID.randomUUID().toString());
        equityEntry.setTransaction(tx);
        equityEntry.setAccountId(equityAccount.getId());
        equityEntry.setCommodity(preview.commodity());
        equityEntry.setAmount(preview.balance());
        equityEntry.setEntryOrder(0);
        tx.addEntry(equityEntry);

        // Entry 2: income/expense account — zeroed out
        EntryEntity accountEntry = new EntryEntity();
        accountEntry.setId(UUID.randomUUID().toString());
        accountEntry.setTransaction(tx);
        accountEntry.setAccountId(preview.accountId());
        accountEntry.setCommodity(preview.commodity());
        accountEntry.setAmount(preview.balance().negate());
        accountEntry.setEntryOrder(1);
        tx.addEntry(accountEntry);

        em.persist(tx);
        LOG.debugf("Persisted closing transaction %s for account %s", tx.getId(), preview.accountFullName());
        return tx.getId();
    }

    /**
     * Computes the net balance of an account from all entries up to and including closingDate.
     */
    private BigDecimal computeBalance(String accountId, String journalId, LocalDate closingDate) {
        List<BigDecimal> results = em.createQuery(
            "SELECT SUM(e.amount) FROM EntryEntity e " +
            "JOIN e.transaction t " +
            "WHERE e.accountId = :accountId " +
            "AND t.journalId = :journalId " +
            "AND t.transactionDate <= :closingDate",
            BigDecimal.class)
            .setParameter("accountId", accountId)
            .setParameter("journalId", journalId)
            .setParameter("closingDate", closingDate)
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
    private String resolveCommodity(String accountId, String journalId, LocalDate closingDate) {
        List<String> commodities = em.createQuery(
            "SELECT e.commodity FROM EntryEntity e " +
            "JOIN e.transaction t " +
            "WHERE e.accountId = :accountId " +
            "AND t.journalId = :journalId " +
            "AND t.transactionDate <= :closingDate " +
            "ORDER BY t.transactionDate DESC",
            String.class)
            .setParameter("accountId", accountId)
            .setParameter("journalId", journalId)
            .setParameter("closingDate", closingDate)
            .setMaxResults(1)
            .getResultList();

        return commodities.isEmpty() ? "CHF" : commodities.get(0);
    }

    /**
     * Resolves a human-readable account type name (expense or revenue).
     */
    private String resolveAccountTypeName(String accountId) {
        AccountEntity account = em.find(AccountEntity.class, accountId);
        if (account == null) return "account";
        return switch (account.getType()) {
            case REVENUE -> "revenue";
            case EXPENSE -> "expense";
            default -> "account";
        };
    }

    /**
     * Builds the hierarchical code path (e.g. "6:6570:6570.001") for an account.
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
     * Builds the full colon-separated account name path (e.g. "6 Charges:6570 IT charges:6570.001 Domain Names").
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
