package dev.abstratium.abstraccount.service;

import dev.abstratium.abstraccount.boundary.CreateJournalRequest;
import dev.abstratium.abstraccount.entity.AccountEntity;
import dev.abstratium.abstraccount.entity.JournalEntity;
import dev.abstratium.abstraccount.entity.ReportTemplateEntity;
import dev.abstratium.abstraccount.model.AccountType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.Map;

@ApplicationScoped
public class JournalCreationService {

    private static final String STARTER_BALANCE_SHEET = """
            {"sections":[
            {"title":"Assets","level":1,"showAccounts":false},
            {"title":"Bank account","level":2,"accountRegex":"^Bank account$"},
            {"title":"Accounts receivable","level":2,"accountRegex":"^Accounts receivable$"},
            {"title":"Total assets","level":2,"accountTypes":["ASSET","CASH"],"showAccounts":false},
            {"title":"Liabilities","level":1,"showAccounts":false},
            {"title":"Accounts payable","level":2,"accountRegex":"^Accounts payable$","invertSign":true},
            {"title":"VAT payable","level":2,"accountRegex":"^VAT payable$","invertSign":true},
            {"title":"Equity","level":1,"showAccounts":false},
            {"title":"Shareholder equity","level":2,"accountRegex":"^Shareholder equity$","invertSign":true},
            {"title":"Retained earnings","level":2,"accountRegex":"^Retained earnings$","invertSign":true},
            {"title":"Current-year profit/loss","level":2,"accountRegex":"^Current-year profit/loss$","includeNetIncome":true,"invertSign":true},
            {"title":"Total liabilities and equity","level":1,"accountTypes":["LIABILITY","EQUITY"],"showAccounts":false,"includeNetIncome":true,"invertSign":true}
            ]}
            """;

    private static final String STARTER_INCOME_STATEMENT = """
            {"sections":[
            {"title":"Revenue","level":1,"showAccounts":false},
            {"title":"Sales revenue","level":2,"accountRegex":"^Sales revenue$","invertSign":true,"showSubtotals":true},
            {"title":"Total revenue","level":2,"accountTypes":["REVENUE"],"showAccounts":false,"invertSign":true},
            {"title":"Expenses","level":1,"showAccounts":false},
            {"title":"Cost of materials and goods","level":2,"accountRegex":"^Cost of materials and goods","showSubtotals":true},
            {"title":"Personnel expenses","level":2,"accountRegex":"^Personnel expenses","showSubtotals":true},
            {"title":"Other operating expenses","level":2,"accountRegex":"^Other operating expenses","showSubtotals":true},
            {"title":"Total expenses","level":2,"accountTypes":["EXPENSE"],"showAccounts":false},
            {"title":"Net Income","level":1,"calculated":"netIncome"}
            ]}
            """;

    @Inject
    JournalPersistenceService journalPersistenceService;

    @Inject
    EntityManager entityManager;

    @Transactional
    public JournalEntity createJournal(CreateJournalRequest request) {
        JournalEntity journal = new JournalEntity();
        journal.setLogo(request.logo());
        journal.setTitle(request.title());
        journal.setSubtitle(request.subtitle());
        journal.setCurrency(request.currency());
        journal.setCommodities(Map.of(request.currency(), "1000.00"));

        JournalEntity savedJournal = journalPersistenceService.saveJournal(journal);
        createStarterChart(savedJournal.getId());
        createStarterReportsIfAbsent();
        return savedJournal;
    }

    private void createStarterReportsIfAbsent() {
        Long reportCount = entityManager.createQuery(
                "SELECT COUNT(rt) FROM ReportTemplateEntity rt", Long.class)
            .getSingleResult();
        if (reportCount > 0) {
            return;
        }

        persistReport("Starter balance sheet", "Balance sheet for the starter chart of accounts", STARTER_BALANCE_SHEET);
        persistReport("Starter income statement", "Income statement for the starter chart of accounts", STARTER_INCOME_STATEMENT);
    }

    private void persistReport(String name, String description, String templateContent) {
        ReportTemplateEntity report = new ReportTemplateEntity();
        report.setName(name);
        report.setDescription(description);
        report.setTemplateContent(templateContent);
        entityManager.persist(report);
    }

    private void createStarterChart(String journalId) {
        AccountEntity assets = createAccount(journalId, "Assets", AccountType.ASSET, null, 0);
        createAccount(journalId, "Bank account", AccountType.CASH, assets.getId(), 1);
        createAccount(journalId, "Accounts receivable", AccountType.ASSET, assets.getId(), 2);

        AccountEntity liabilities = createAccount(journalId, "Liabilities", AccountType.LIABILITY, null, 3);
        createAccount(journalId, "Accounts payable", AccountType.LIABILITY, liabilities.getId(), 4);
        createAccount(journalId, "VAT payable", AccountType.LIABILITY, liabilities.getId(), 5);

        AccountEntity equity = createAccount(journalId, "Equity", AccountType.EQUITY, null, 6);
        createAccount(journalId, "Shareholder equity", AccountType.EQUITY, equity.getId(), 7);
        createAccount(journalId, "Retained earnings", AccountType.EQUITY, equity.getId(), 8);
        createAccount(journalId, "Current-year profit/loss", AccountType.EQUITY, equity.getId(), 9);

        AccountEntity revenue = createAccount(journalId, "Revenue", AccountType.REVENUE, null, 10);
        createAccount(journalId, "Sales revenue", AccountType.REVENUE, revenue.getId(), 11);

        createAccount(journalId, "Cost of materials and goods", AccountType.EXPENSE, null, 12);

        AccountEntity personnelExpenses = createAccount(journalId, "Personnel expenses", AccountType.EXPENSE, null, 13);
        createAccount(journalId, "Salaries", AccountType.EXPENSE, personnelExpenses.getId(), 14);

        AccountEntity operatingExpenses = createAccount(journalId, "Other operating expenses", AccountType.EXPENSE, null, 15);
        createAccount(journalId, "Rent and utilities", AccountType.EXPENSE, operatingExpenses.getId(), 16);
        createAccount(journalId, "IT and communication", AccountType.EXPENSE, operatingExpenses.getId(), 17);
    }

    private AccountEntity createAccount(String journalId, String name, AccountType type, String parentAccountId, int accountOrder) {
        AccountEntity account = new AccountEntity();
        account.setJournalId(journalId);
        account.setName(name);
        account.setType(type);
        account.setParentAccountId(parentAccountId);
        account.setAccountOrder(accountOrder);
        return journalPersistenceService.saveAccount(account);
    }
}
