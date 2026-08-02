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
            {"title":"Cash and cash equivalents","level":2,"accountTypes":["CASH"],"showSubtotals":true},
            {"title":"Other assets","level":2,"accountTypes":["ASSET"],"showSubtotals":true},
            {"title":"Total assets","level":2,"accountTypes":["ASSET","CASH"],"showAccounts":false},
            {"title":"Liabilities","level":1,"showAccounts":false},
            {"title":"Accounts payable","level":2,"accountRegex":"^2:20:200","invertSign":true,"showSubtotals":true},
            {"title":"Other short-term liabilities","level":2,"accountRegex":"^2:20:220","invertSign":true,"showSubtotals":true},
            {"title":"Total liabilities","level":2,"accountTypes":["LIABILITY"],"showAccounts":false,"invertSign":true},
            {"title":"Equity","level":1,"showAccounts":false},
            {"title":"Share capital","level":2,"accountRegex":"^2:28:280","invertSign":true,"showSubtotals":true},
            {"title":"Reserves and retained earnings","level":2,"accountRegex":"^2:290","invertSign":true,"showSubtotals":true},
            {"title":"Current-year profit/loss","level":2,"accountRegex":"^2:290:2979","includeNetIncome":true,"invertSign":true},
            {"title":"Total equity","level":2,"accountTypes":["EQUITY"],"showAccounts":false,"invertSign":true,"includeNetIncome":true},
            {"title":"Total liabilities and equity","level":1,"accountTypes":["LIABILITY","EQUITY"],"showAccounts":false,"includeNetIncome":true,"invertSign":true}
            ]}
            """;

    private static final String STARTER_INCOME_STATEMENT = """
            {"sections":[
            {"title":"Revenue","level":1,"showAccounts":false},
            {"title":"Services revenue","level":2,"accountRegex":"^3:3400","invertSign":true,"showSubtotals":true},
            {"title":"Other operating income","level":2,"accountRegex":"^3:3600","invertSign":true,"showSubtotals":true},
            {"title":"Total revenue","level":2,"accountTypes":["REVENUE"],"showAccounts":false,"invertSign":true},
            {"title":"Expenses","level":1,"showAccounts":false},
            {"title":"Cost of materials and goods","level":2,"accountRegex":"^4 ","showSubtotals":true},
            {"title":"Personnel expenses","level":2,"accountRegex":"^5 ","showSubtotals":true},
            {"title":"Other operating expenses","level":2,"accountRegex":"^6 ","showSubtotals":true},
            {"title":"Non-operating expenses","level":2,"accountRegex":"^8 ","showSubtotals":true},
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
        if (request.commodities() != null && !request.commodities().isEmpty()) {
            journal.setCommodities(request.commodities());
        } else {
            journal.setCommodities(Map.of(request.currency(), "1000.00"));
        }

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
        int order = 0;
        // === EQUITY (2) ===
        AccountEntity equity = createAccount(journalId, "2 Equity", AccountType.EQUITY, null, order++,
            "The owners' claims on the company's assets after liabilities are subtracted.");
        AccountEntity shareholdersEquity = createAccount(journalId, "28 Shareholders Equity", AccountType.EQUITY, equity.getId(), order++,
            "Equity attributable to the shareholders of the company, made up of share capital plus reserves and retained earnings.");
        AccountEntity shareCapital = createAccount(journalId, "280 Share capital", AccountType.EQUITY, shareholdersEquity.getId(), order++,
            "The capital contributed by the shareholders or founders, either at incorporation or through later capital increases.");
        createAccount(journalId, "2800 Share capital", AccountType.EQUITY, shareCapital.getId(), order++,
            "The nominal (registered) value of the shares or foundation capital issued by the company.");
        AccountEntity reserves = createAccount(journalId, "290 Reserves and retained earnings", AccountType.EQUITY, equity.getId(), order++,
            "Reserves built up from prior profits, plus profit or loss carried forward and the profit or loss of the current year.");
        createAccount(journalId, "2950 Legal reserves", AccountType.EQUITY, reserves.getId(), order++,
            "Statutory reserve required by Swiss law: companies must allocate at least 5% of annual profit to this account until it reaches 20% of the share capital.");
        createAccount(journalId, "2970 Profit carried forward", AccountType.EQUITY, reserves.getId(), order++,
            "Accumulated profit or loss from prior years that has not yet been distributed to shareholders or allocated to reserves.");
        createAccount(journalId, "2979 Annual profit or loss", AccountType.EQUITY, reserves.getId(), order++,
            "The net profit or loss generated during the current financial year, before allocation to reserves or distribution as dividends.");

        // === ASSETS (1) ===
        AccountEntity assets = createAccount(journalId, "1 Assets", AccountType.ASSET, null, order++,
            "Everything the company owns, including cash, receivables, inventory and fixed assets.");
        AccountEntity currentAssets = createAccount(journalId, "10 Current Assets", AccountType.ASSET, assets.getId(), order++,
            "Assets expected to be converted into cash, sold or consumed within one business year, such as cash and cash equivalents, accounts receivable, inventory and prepaid expenses.");
        AccountEntity cash = createAccount(journalId, "100 Cash and cash equivalents", AccountType.ASSET, currentAssets.getId(), order++,
            "The most liquid assets held by the company, such as cash on hand, bank balances, postal account balances and short-term deposits that can be quickly converted to cash.");
        createAccount(journalId, "1000 Cash", AccountType.CASH, cash.getId(), order++,
            "Petty cash on hand.");
        createAccount(journalId, "1020 Bank Account", AccountType.CASH, cash.getId(), order++,
            "Money held in the company's bank account(s), as opposed to a loan or overdraft, which would be a liability.");
        AccountEntity receivables = createAccount(journalId, "110 Accounts Receivable", AccountType.ASSET, currentAssets.getId(), order++,
            "Money owed to the company by customers for goods delivered or services rendered that has not yet been paid. Also known as trade receivables or debtors.");
        createAccount(journalId, "1100 Trade receivables", AccountType.ASSET, receivables.getId(), order++,
            "Outstanding customer invoices for goods delivered or services provided. Use this account to record and track amounts owed by individual customers, as opposed to other receivables such as from tax authorities or employees.");
        AccountEntity inventories = createAccount(journalId, "120 Inventories", AccountType.ASSET, currentAssets.getId(), order++,
            "Goods held for resale, raw materials, work in progress, finished goods, and services delivered to customers that have not yet been invoiced.");
        createAccount(journalId, "1200 Inventory of hardware and components", AccountType.ASSET, inventories.getId(), order++,
            "Hardware, components or devices purchased and held in stock for modification, assembly or resale.");
        createAccount(journalId, "130 Receivables from shareholders", AccountType.ASSET, currentAssets.getId(), order++,
            "Amounts owed to the company by its shareholders, such as loans granted to shareholders or unpaid share capital calls.");
        AccountEntity nonCurrentAssets = createAccount(journalId, "14 Non-current assets", AccountType.ASSET, assets.getId(), order++,
            "Long-term assets that are not expected to be converted to cash within one year.");
        createAccount(journalId, "140 Participations", AccountType.ASSET, nonCurrentAssets.getId(), order++,
            "Long-term investments in the shares or capital of other companies, held for strategic purposes rather than short-term trading.");
        createAccount(journalId, "150 Fixed assets", AccountType.ASSET, nonCurrentAssets.getId(), order++,
            "Tangible long-term assets such as machinery, office equipment, furniture and vehicles used in the business.");

        // === LIABILITIES (2) ===
        AccountEntity liabilities = createAccount(journalId, "2 Liabilities", AccountType.LIABILITY, null, order++,
            "What the company owes to creditors, suppliers, banks, tax authorities and others. Includes both short-term (current) and long-term (non-current) liabilities.");
        AccountEntity currentLiabilities = createAccount(journalId, "20 Current liabilities", AccountType.LIABILITY, liabilities.getId(), order++,
            "Obligations the company must settle within 12 months.");
        AccountEntity accountsPayable = createAccount(journalId, "200 Accounts payable", AccountType.LIABILITY, currentLiabilities.getId(), order++,
            "Amounts the company owes to suppliers for goods or services received but not yet paid — typically invoices from vendors.");
        createAccount(journalId, "2000 Accounts payable", AccountType.LIABILITY, accountsPayable.getId(), order++,
            "Amounts owed to individual suppliers (creditors) for goods and services received but not yet paid. The mirror of accounts receivable on the asset side.");
        AccountEntity otherShortTermLiabilities = createAccount(journalId, "220 Other short-term liabilities", AccountType.LIABILITY, currentLiabilities.getId(), order++,
            "Short-term liabilities that don't fit into other categories, such as taxes payable, dividends payable or social insurance contributions.");
        createAccount(journalId, "2208 Direct taxes", AccountType.LIABILITY, otherShortTermLiabilities.getId(), order++,
            "Corporate income tax and capital tax owed to the tax authorities, typically accrued as a provision at year-end.");
        AccountEntity otherSTL = createAccount(journalId, "2210 Other short-term liabilities", AccountType.LIABILITY, otherShortTermLiabilities.getId(), order++,
            "Miscellaneous short-term liabilities, including reimbursements owed to employees for business expenses they paid personally.");
        createAccount(journalId, "2210.001 Staff member", AccountType.LIABILITY, otherSTL.getId(), order++,
            "Amounts owed to an individual staff member for business expenses that they paid personally, to be reimbursed by the company.");
        createAccount(journalId, "230 Transitory liabilities", AccountType.LIABILITY, currentLiabilities.getId(), order++,
            "Accrued expenses and deferred income relating to the period being closed, which will only be invoiced or paid in a later period.");
        createAccount(journalId, "240 Provisions", AccountType.LIABILITY, currentLiabilities.getId(), order++,
            "Amounts set aside for known or probable future obligations or losses, such as warranty claims or legal disputes, where the timing or amount is uncertain.");

        // === REVENUE (3) ===
        AccountEntity revenue = createAccount(journalId, "3 Revenue", AccountType.REVENUE, null, order++,
            "Income earned by the company from its ordinary business activities, such as selling goods or providing services.");
        createAccount(journalId, "3400 Services revenue", AccountType.REVENUE, revenue.getId(), order++,
            "Income earned from providing services to customers, such as consulting, support or other professional services.");
        createAccount(journalId, "3600 Other operating income", AccountType.REVENUE, revenue.getId(), order++,
            "Operating income that doesn't fit under product sales or services revenue, such as income from software subscriptions (SaaS) or licensing.");

        // === EXPENSES (4, 5, 6, 8) ===
        AccountEntity materialsExpenses = createAccount(journalId, "4 Cost of materials and goods", AccountType.EXPENSE, null, order++,
            "Costs of raw materials, components, goods and energy consumed in producing the products or services the company sells.");
        createAccount(journalId, "4000 Purchases of materials and components", AccountType.EXPENSE, materialsExpenses.getId(), order++,
            "Materials and components purchased for assembly, modification or use in producing the company's products.");
        AccountEntity personnelExpenses = createAccount(journalId, "5 Personnel expenses", AccountType.EXPENSE, null, order++,
            "Salaries, wages, social security contributions and other costs related to employing staff.");
        createAccount(journalId, "5000 Salaries", AccountType.EXPENSE, personnelExpenses.getId(), order++,
            "Gross salaries and wages paid to employees.");
        AccountEntity operatingExpenses = createAccount(journalId, "6 Other operating expenses", AccountType.EXPENSE, null, order++,
            "Operating costs that are not related to materials, goods or personnel, such as insurance, administration, IT, marketing, depreciation and financial expenses.");
        createAccount(journalId, "6300 Insurance expense", AccountType.EXPENSE, operatingExpenses.getId(), order++,
            "Premiums for business insurance policies, such as liability, property or building insurance.");
        createAccount(journalId, "6500 Administrative expenses", AccountType.EXPENSE, operatingExpenses.getId(), order++,
            "General administrative costs such as professional fees (legal, accounting, consulting), office supplies, postage and stationery.");
        createAccount(journalId, "6570 IT and computing expenses", AccountType.EXPENSE, operatingExpenses.getId(), order++,
            "Software, hosting, domains, cloud services and IT equipment leasing costs, including subscriptions to online services and cloud platforms.");
        createAccount(journalId, "6700 Other operating expenses", AccountType.EXPENSE, operatingExpenses.getId(), order++,
            "Office supplies, postage, small tools, professional memberships, subscriptions, minor repairs, telephone, licenses and other miscellaneous operating costs.");
        createAccount(journalId, "6800 Depreciation", AccountType.EXPENSE, operatingExpenses.getId(), order++,
            "Annual depreciation of fixed assets, such as machinery, equipment and furniture.");
        createAccount(journalId, "6900 Financial expense", AccountType.EXPENSE, operatingExpenses.getId(), order++,
            "Bank charges, interest paid on loans, and other costs related to financing the business.");
        AccountEntity nonOperatingExpenses = createAccount(journalId, "8 Non-operating expenses", AccountType.EXPENSE, null, order++,
            "Expenses and income that fall outside normal business operations, such as prior-period corrections or extraordinary, one-off items.");
        createAccount(journalId, "8900 Direct taxes", AccountType.EXPENSE, nonOperatingExpenses.getId(), order++,
            "Corporate income tax and capital tax expense for the current financial year.");
    }

    private AccountEntity createAccount(String journalId, String name, AccountType type, String parentAccountId, int accountOrder, String note) {
        AccountEntity account = new AccountEntity();
        account.setJournalId(journalId);
        account.setName(name);
        account.setType(type);
        account.setParentAccountId(parentAccountId);
        account.setAccountOrder(accountOrder);
        account.setNote(note);
        return journalPersistenceService.saveAccount(account);
    }
}
