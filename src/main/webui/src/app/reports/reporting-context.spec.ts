import { createReportingContext, groupEntriesByAccount, createCashFlowStatement, createSolvencyCheck } from './reporting-context';
import { AccountEntryDTO, AccountTreeNode } from '../controller';

describe('ReportingContext', () => {
  const mockAccounts: AccountTreeNode[] = [
    {
      id: 'asset1',
      name: 'Cash',
      type: 'ASSET',
      note: null,
      parentId: null,
      accountCode: 1000,
      children: []
    },
    {
      id: 'liability1',
      name: 'Accounts Payable',
      type: 'LIABILITY',
      note: null,
      parentId: null,
      accountCode: 2000,
      children: []
    },
    {
      id: 'revenue1',
      name: 'Sales Revenue',
      type: 'REVENUE',
      note: null,
      parentId: null,
      accountCode: 3000,
      children: []
    },
    {
      id: 'expense1',
      name: 'Office Supplies',
      type: 'EXPENSE',
      note: null,
      parentId: null,
      accountCode: 6000,
      children: []
    }
  ];

  // Hierarchical accounts for testing regex matching with number prefixes
  const hierarchicalAccounts: AccountTreeNode[] = [
    {
      id: 'assets',
      name: '1 Assets',
      type: 'ASSET',
      note: null,
      parentId: null,
      accountCode: 1,
      children: [
        {
          id: 'current-assets',
          name: '10 Current Assets',
          type: 'ASSET',
          note: null,
          parentId: 'assets',
          accountCode: 10,
          children: [
            {
              id: 'receivables',
              name: '110 Accounts Receivable',
              type: 'ASSET',
              note: null,
              parentId: 'current-assets',
              accountCode: 110,
              children: [
                {
                  id: 'debtors',
                  name: '1100 Debtors',
                  type: 'ASSET',
                  note: null,
                  parentId: 'receivables',
                  accountCode: 1100,
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  const hierarchicalEntries: AccountEntryDTO[] = [
    {
      entryId: 'e10',
      transactionId: 't10',
      transactionDate: '2024-01-01',
      description: 'Sale to customer',
      commodity: 'CHF',
      amount: 750,
      runningBalance: 750,
      note: null,
      accountId: 'debtors',
      partnerId: null,
      partnerName: null,
      status: 'CLEARED',
      tags: []
    }
  ];

  const mockEntries: AccountEntryDTO[] = [
    {
      entryId: 'e1',
      transactionId: 't1',
      transactionDate: '2024-01-01',
      description: 'Initial cash',
      commodity: 'CHF',
      amount: 1000,
      runningBalance: 1000,
      note: null,
      accountId: 'asset1',
      partnerId: null,
      partnerName: null,
      status: 'CLEARED',
      tags: []
    },
    {
      entryId: 'e2',
      transactionId: 't2',
      transactionDate: '2024-01-02',
      description: 'Revenue entry',
      commodity: 'CHF',
      amount: -500, // Revenue increases are negative
      runningBalance: 500,
      note: null,
      accountId: 'revenue1',
      partnerId: null,
      partnerName: null,
      status: 'CLEARED',
      tags: []
    },
    {
      entryId: 'e3',
      transactionId: 't3',
      transactionDate: '2024-01-03',
      description: 'Expense entry',
      commodity: 'CHF',
      amount: 100,
      runningBalance: 100,
      note: null,
      accountId: 'expense1',
      partnerId: null,
      partnerName: null,
      status: 'CLEARED',
      tags: []
    },
    {
      entryId: 'e4',
      transactionId: 't4',
      transactionDate: '2024-01-04',
      description: 'Liability entry',
      commodity: 'CHF',
      amount: -200,
      runningBalance: -200,
      note: null,
      accountId: 'liability1',
      partnerId: null,
      partnerName: null,
      status: 'CLEARED',
      tags: []
    }
  ];

  describe('createReportingContext', () => {
    it('should create a reporting context with correct metrics', () => {
      const context = createReportingContext(mockEntries, mockAccounts, null, null);

      expect(context.entries).toEqual(mockEntries);
      expect(context.totalAssets).toBe(1000);
      expect(context.totalLiabilities).toBe(-200);
      expect(context.totalRevenue).toBe(-500); // Raw value (negative for credit)
      expect(context.totalExpenses).toBe(100);
      expect(context.netIncome).toBe(-400); // Revenue (-500) + Expenses (100)
    });

    it('should filter entries by account type', () => {
      const context = createReportingContext(mockEntries, mockAccounts, null, null);

      const assetEntries = context.getEntriesByAccountType('ASSET');
      expect(assetEntries.length).toBe(1);
      expect(assetEntries[0].accountId).toBe('asset1');

      const revenueEntries = context.getEntriesByAccountType('REVENUE');
      expect(revenueEntries.length).toBe(1);
      expect(revenueEntries[0].accountId).toBe('revenue1');
    });

    it('should filter entries by multiple account types', () => {
      const context = createReportingContext(mockEntries, mockAccounts, null, null);

      const entries = context.getEntriesByAccountTypes(['ASSET', 'LIABILITY']);
      expect(entries.length).toBe(2);
      expect(entries.some(e => e.accountId === 'asset1')).toBe(true);
      expect(entries.some(e => e.accountId === 'liability1')).toBe(true);
    });

    it('should calculate balance by account type', () => {
      const context = createReportingContext(mockEntries, mockAccounts, null, null);

      expect(context.getBalanceByAccountType('ASSET')).toBe(1000);
      expect(context.getBalanceByAccountType('REVENUE')).toBe(-500);
      expect(context.getBalanceByAccountType('EXPENSE')).toBe(100);
    });

    it('should calculate balance by multiple account types', () => {
      const context = createReportingContext(mockEntries, mockAccounts, null, null);

      const balance = context.getBalanceByAccountTypes(['REVENUE', 'EXPENSE']);
      expect(balance).toBe(-400); // -500 + 100
    });

    it('should calculate balance by specific account', () => {
      const context = createReportingContext(mockEntries, mockAccounts, null, null);

      expect(context.getBalanceByAccount('asset1')).toBe(1000);
      expect(context.getBalanceByAccount('revenue1')).toBe(-500);
    });

    it('should handle empty entries', () => {
      const context = createReportingContext([], mockAccounts, null, null);

      expect(context.totalAssets).toBe(0);
      expect(context.totalLiabilities).toBe(0);
      expect(context.totalRevenue).toBe(0);
      expect(context.totalExpenses).toBe(0);
      expect(context.netIncome).toBe(0);
    });

    it('should store date filters', () => {
      const context = createReportingContext(
        mockEntries, 
        mockAccounts, 
        '2024-01-01', 
        '2024-12-31'
      );

      expect(context.startDate).toBe('2024-01-01');
      expect(context.endDate).toBe('2024-12-31');
    });
  });

  describe('groupEntriesByAccount', () => {
    it('should group entries by account', () => {
      const summaries = groupEntriesByAccount(mockEntries, mockAccounts);

      expect(summaries.length).toBe(4);
      
      const cashSummary = summaries.find(s => s.accountId === 'asset1');
      expect(cashSummary).toBeDefined();
      expect(cashSummary!.accountName).toBe('Cash');
      expect(cashSummary!.balance).toBe(1000);
    });

    it('should calculate debit and credit correctly', () => {
      const summaries = groupEntriesByAccount(mockEntries, mockAccounts);

      const cashSummary = summaries.find(s => s.accountId === 'asset1');
      expect(cashSummary!.debit).toBe(1000);
      expect(cashSummary!.credit).toBe(0);

      const revenueSummary = summaries.find(s => s.accountId === 'revenue1');
      expect(revenueSummary!.debit).toBe(0);
      expect(revenueSummary!.credit).toBe(500);
    });

    it('should return raw values when invertSign is requested (inversion is applied at display time)', () => {
      const summaries = groupEntriesByAccount(mockEntries, mockAccounts, true);

      const revenueSummary = summaries.find(s => s.accountId === 'revenue1');
      // Raw values are unchanged; the component applies sign inversion at display time
      expect(revenueSummary!.balance).toBe(-500);
      expect(revenueSummary!.debit).toBe(0);
      expect(revenueSummary!.credit).toBe(500);
    });

    it('should sort summaries by account name', () => {
      const summaries = groupEntriesByAccount(mockEntries, mockAccounts);

      expect(summaries[0].accountName).toBe('Accounts Payable');
      expect(summaries[1].accountName).toBe('Cash');
      expect(summaries[2].accountName).toBe('Office Supplies');
      expect(summaries[3].accountName).toBe('Sales Revenue');
    });

    it('should handle empty entries', () => {
      const summaries = groupEntriesByAccount([], mockAccounts);

      expect(summaries.length).toBe(0);
    });

    it('should handle multiple entries for same account', () => {
      const multipleEntries: AccountEntryDTO[] = [
        ...mockEntries,
        {
          entryId: 'e5',
          transactionId: 't5',
          transactionDate: '2024-01-05',
          description: 'More cash',
          commodity: 'CHF',
          amount: 500,
          runningBalance: 1500,
          note: null,
          accountId: 'asset1',
          partnerId: null,
      partnerName: null,
          status: 'CLEARED',
          tags: []
        }
      ];

      const summaries = groupEntriesByAccount(multipleEntries, mockAccounts);

      const cashSummary = summaries.find(s => s.accountId === 'asset1');
      expect(cashSummary!.balance).toBe(1500); // 1000 + 500
    });
  });

  describe('getEntriesByAccountRegex with hierarchical account names', () => {
    it('should match accounts using hierarchical number prefix patterns', () => {
      const context = createReportingContext(hierarchicalEntries, hierarchicalAccounts, null, null);

      // Pattern ^1:10:110 should match "1:10:110:1100 Debtors" (the hierarchical name of account 1100 Debtors)
      const entries = context.getEntriesByAccountRegex('^1:10:110');
      expect(entries.length).toBe(1);
      expect(entries[0].accountId).toBe('debtors');
    });

    it('should match accounts using exact hierarchical number pattern', () => {
      const context = createReportingContext(hierarchicalEntries, hierarchicalAccounts, null, null);

      // Pattern ^1:10:110:1100 should match exactly the debtors account
      const entries = context.getEntriesByAccountRegex('^1:10:110:1100');
      expect(entries.length).toBe(1);
      expect(entries[0].accountId).toBe('debtors');
    });

    it('should not match when pattern does not include correct parent prefix', () => {
      const context = createReportingContext(hierarchicalEntries, hierarchicalAccounts, null, null);

      // Pattern ^110 should NOT match because the hierarchical name is "1:10:110:1100 Debtors", not "1100 Debtors"
      const entries = context.getEntriesByAccountRegex('^110');
      expect(entries.length).toBe(0);
    });

    it('should match parent-level patterns that include all child accounts', () => {
      const context = createReportingContext(hierarchicalEntries, hierarchicalAccounts, null, null);

      // Pattern ^1:10 should match any account under "10 Current Assets" including "1:10:110:1100 Debtors"
      const entries = context.getEntriesByAccountRegex('^1:10');
      expect(entries.length).toBe(1);
      expect(entries[0].accountId).toBe('debtors');
    });
  });

  describe('getEntriesByAccountRegex with flat hierarchical account names', () => {
    // Accounts with pre-built hierarchical names in the account name itself (no parent relationships)
    const flatHierarchicalAccounts: AccountTreeNode[] = [
      {
        id: 'cash1',
        name: '1:10:100:1000 Cash',
        type: 'CASH',
        note: null,
        parentId: null,
        accountCode: 1000,
        children: []
      },
      {
        id: 'ar',
        name: '1:10:110:1100 Accounts Receivable',
        type: 'ASSET',
        note: null,
        parentId: null,
        accountCode: 1100,
        children: []
      }
    ];

    const flatHierarchicalEntries: AccountEntryDTO[] = [
      {
        entryId: 'e20',
        transactionId: 't20',
        transactionDate: '2024-01-01',
        description: 'Cash entry',
        commodity: 'CHF',
        amount: 1000,
        runningBalance: 1000,
        note: null,
        accountId: 'cash1',
        partnerId: null,
        partnerName: null,
        status: 'CLEARED',
        tags: []
      },
      {
        entryId: 'e21',
        transactionId: 't21',
        transactionDate: '2024-01-02',
        description: 'AR entry',
        commodity: 'CHF',
        amount: 750,
        runningBalance: 750,
        note: null,
        accountId: 'ar',
        partnerId: null,
        partnerName: null,
        status: 'CLEARED',
        tags: []
      }
    ];

    it('should match flat accounts with pre-built hierarchical names', () => {
      const context = createReportingContext(flatHierarchicalEntries, flatHierarchicalAccounts, null, null);

      // Pattern ^1:10:100 should match "1:10:100:1000 Cash"
      const cashEntries = context.getEntriesByAccountRegex('^1:10:100');
      expect(cashEntries.length).toBe(1);
      expect(cashEntries[0].accountId).toBe('cash1');

      // Pattern ^1:10:110 should match "1:10:110:1100 Accounts Receivable"
      const arEntries = context.getEntriesByAccountRegex('^1:10:110');
      expect(arEntries.length).toBe(1);
      expect(arEntries[0].accountId).toBe('ar');
    });
  });

  describe('createCashFlowStatement', () => {
    const cashFlowAccounts: AccountTreeNode[] = [
      {
        id: 'assets',
        name: '1 Assets',
        type: 'ASSET',
        note: null,
        parentId: null,
        accountCode: 1,
        children: [
          {
            id: 'current-assets',
            name: '10 Current Assets',
            type: 'ASSET',
            note: null,
            parentId: 'assets',
            accountCode: 10,
            children: [
              {
                id: 'cash',
                name: '100 Cash and cash equivalents',
                type: 'ASSET',
                note: null,
                parentId: 'current-assets',
                accountCode: 100,
                children: [
                  {
                    id: 'bank',
                    name: '1000 Bank Account',
                    type: 'CASH',
                    note: null,
                    parentId: 'cash',
                    accountCode: 1000,
                    children: []
                  }
                ]
              },
              {
                id: 'receivables',
                name: '110 Accounts Receivable',
                type: 'ASSET',
                note: null,
                parentId: 'current-assets',
                accountCode: 110,
                children: [
                  {
                    id: 'trade-receivables',
                    name: '1100 Trade Receivables',
                    type: 'ASSET',
                    note: null,
                    parentId: 'receivables',
                    accountCode: 1100,
                    children: []
                  }
                ]
              },
              {
                id: 'inventory',
                name: '120 Inventories',
                type: 'ASSET',
                note: null,
                parentId: 'current-assets',
                accountCode: 120,
                children: [
                  {
                    id: 'finished-goods',
                    name: '1200 Finished Goods',
                    type: 'ASSET',
                    note: null,
                    parentId: 'inventory',
                    accountCode: 1200,
                    children: []
                  }
                ]
              }
            ]
          },
          {
            id: 'non-current-assets',
            name: '14 Non-current Assets',
            type: 'ASSET',
            note: null,
            parentId: 'assets',
            accountCode: 14,
            children: [
              {
                id: 'fixed-assets',
                name: '150 Fixed Assets',
                type: 'ASSET',
                note: null,
                parentId: 'non-current-assets',
                accountCode: 150,
                children: [
                  {
                    id: 'machinery',
                    name: '1500 Machinery',
                    type: 'ASSET',
                    note: null,
                    parentId: 'fixed-assets',
                    accountCode: 1500,
                    children: []
                  },
                  {
                    id: 'accumulated-depreciation',
                    name: '1509 Accumulated Depreciation',
                    type: 'ASSET',
                    note: null,
                    parentId: 'fixed-assets',
                    accountCode: 1509,
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'liabilities',
        name: '2 Liabilities',
        type: 'LIABILITY',
        note: null,
        parentId: null,
        accountCode: 2,
        children: [
          {
            id: 'current-liabilities',
            name: '20 Current Liabilities',
            type: 'LIABILITY',
            note: null,
            parentId: 'liabilities',
            accountCode: 20,
            children: [
              {
                id: 'accounts-payable',
                name: '200 Accounts Payable',
                type: 'LIABILITY',
                note: null,
                parentId: 'current-liabilities',
                accountCode: 200,
                children: [
                  {
                    id: 'trade-payables',
                    name: '2000 Trade Payables',
                    type: 'LIABILITY',
                    note: null,
                    parentId: 'accounts-payable',
                    accountCode: 2000,
                    children: []
                  }
                ]
              },
              {
                id: 'interest-bearing',
                name: '210 Interest-bearing Short-term Liabilities',
                type: 'LIABILITY',
                note: null,
                parentId: 'current-liabilities',
                accountCode: 210,
                children: [
                  {
                    id: 'bank-loan',
                    name: '2100 Bank Loan',
                    type: 'LIABILITY',
                    note: null,
                    parentId: 'interest-bearing',
                    accountCode: 2100,
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'equity',
        name: '2 Equity',
        type: 'EQUITY',
        note: null,
        parentId: null,
        accountCode: 2,
        children: [
          {
            id: 'share-capital-group',
            name: '28 Share Capital',
            type: 'EQUITY',
            note: null,
            parentId: 'equity',
            accountCode: 28,
            children: [
              {
                id: 'share-capital',
                name: '2800 Share Capital',
                type: 'EQUITY',
                note: null,
                parentId: 'share-capital-group',
                accountCode: 2800,
                children: []
              }
            ]
          }
        ]
      },
      {
        id: 'revenue',
        name: '3 Revenue',
        type: 'REVENUE',
        note: null,
        parentId: null,
        accountCode: 3,
        children: [
          {
            id: 'sales-revenue',
            name: '3200 Sales Revenue',
            type: 'REVENUE',
            note: null,
            parentId: 'revenue',
            accountCode: 3200,
            children: []
          }
        ]
      },
      {
        id: 'expenses',
        name: '6 Other Operating Expenses',
        type: 'EXPENSE',
        note: null,
        parentId: null,
        accountCode: 6,
        children: [
          {
            id: 'depreciation-expense',
            name: '6800 Depreciation',
            type: 'EXPENSE',
            note: null,
            parentId: 'expenses',
            accountCode: 6800,
            children: []
          },
          {
            id: 'other-expense',
            name: '6700 Other Operating Expenses',
            type: 'EXPENSE',
            note: null,
            parentId: 'expenses',
            accountCode: 6700,
            children: []
          }
        ]
      }
    ];

    function makeEntry(
      entryId: string,
      transactionId: string,
      date: string,
      accountId: string,
      amount: number,
      tags: { key: string; value: string }[] = []
    ): AccountEntryDTO {
      return {
        entryId,
        transactionId,
        transactionDate: date,
        description: 'test',
        commodity: 'CHF',
        amount,
        runningBalance: 0,
        note: null,
        accountId,
        partnerId: null,
        partnerName: null,
        status: 'CLEARED',
        tags
      };
    }

    it('should compute an indirect-method cash-flow statement', () => {
      // Opening cash balance on 2024-01-01 (beginning of period), tagged so it
      // is treated as opening cash even though it sits on the period start date.
      const openingEntries = [
        makeEntry('e1', 't1', '2024-01-01', 'bank', 10000, [{ key: 'OpeningBalances', value: '' }]),
        makeEntry('e2', 't1', '2024-01-01', 'share-capital', -10000, [{ key: 'OpeningBalances', value: '' }])
      ];

      // Sales on credit during period: AR +2'000, Revenue -2'000
      const periodEntries = [
        makeEntry('e3', 't2', '2024-06-01', 'trade-receivables', 2000),
        makeEntry('e4', 't2', '2024-06-01', 'sales-revenue', -2000),
        // Cash sale
        makeEntry('e5', 't3', '2024-06-15', 'bank', 3000),
        makeEntry('e6', 't3', '2024-06-15', 'sales-revenue', -3000),
        // Other cash expenses
        makeEntry('e7', 't4', '2024-06-20', 'other-expense', 1000),
        makeEntry('e8', 't4', '2024-06-20', 'bank', -1000),
        // Depreciation (non-cash)
        makeEntry('e9', 't5', '2024-06-30', 'depreciation-expense', 1000),
        makeEntry('e10', 't5', '2024-06-30', 'accumulated-depreciation', -1000),
        // Inventory purchase
        makeEntry('e11', 't6', '2024-07-01', 'finished-goods', 500),
        makeEntry('e12', 't6', '2024-07-01', 'trade-payables', -500),
        // Fixed asset purchase (cash outflow)
        makeEntry('e13', 't7', '2024-07-15', 'machinery', 4000),
        makeEntry('e14', 't7', '2024-07-15', 'bank', -4000),
        // New bank loan (cash inflow)
        makeEntry('e15', 't8', '2024-08-01', 'bank', 3000),
        makeEntry('e16', 't8', '2024-08-01', 'bank-loan', -3000)
      ];

      const allEntries = [...openingEntries, ...periodEntries];
      const context = createReportingContext(
        periodEntries,
        cashFlowAccounts,
        '2024-01-01',
        '2024-12-31',
        allEntries
      );

      const rows = createCashFlowStatement(context, cashFlowAccounts);

      // Net income = revenue (-5000) + expenses (2000) = -3000 (profit 3000)
      expect(context.netIncome).toBe(-3000);

      const titles = rows.map(r => r.title);
      expect(titles).toContain('Operating activities');
      expect(titles).toContain('Investing activities');
      expect(titles).toContain('Financing activities');
      expect(titles).toContain('Reconciliation to cash');

      const operatingHeader = rows.find(r => r.title === 'Operating activities');
      expect(operatingHeader).toBeDefined();
      expect(operatingHeader!.subtitle).toBe('Cash from running the business');

      const investingHeader = rows.find(r => r.title === 'Investing activities');
      expect(investingHeader).toBeDefined();
      expect(investingHeader!.subtitle).toBe('Cash from buying or selling assets');

      const financingHeader = rows.find(r => r.title === 'Financing activities');
      expect(financingHeader).toBeDefined();
      expect(financingHeader!.subtitle).toBe('Cash from loans and owner money');

      const reconciliationHeader = rows.find(r => r.title === 'Reconciliation to cash');
      expect(reconciliationHeader).toBeDefined();
      expect(reconciliationHeader!.subtitle).toBe('Cash balance check');

      const operating = rows.find(r => r.title === 'Total cash from running the business');
      expect(operating).toBeDefined();
      // operating = profit(3000) + depreciation(1000) - AR(2000) - inventory(500) + AP(500) = 2000
      expect(operating!.amount).toBe(2000);

      const investing = rows.find(r => r.title === 'Total cash from buying/selling assets');
      expect(investing).toBeDefined();
      // investing = -machineryChange(4000) = -4000; accumulated depreciation is excluded
      expect(investing!.amount).toBe(-4000);

      const financing = rows.find(r => r.title === 'Total cash from loans and owner money');
      expect(financing).toBeDefined();
      // financing = -loanChange(-3000) = 3000
      expect(financing!.amount).toBe(3000);

      const totalChange = rows.find(r => r.title === 'Total change in cash' && r.level === 4);
      expect(totalChange).toBeDefined();
      expect(totalChange!.amount).toBe(1000);

      const openingCash = rows.find(r => r.title === 'Cash at the start of the period');
      expect(openingCash).toBeDefined();
      expect(openingCash!.amount).toBe(10000);

      const closingCash = rows.find(r => r.title === 'Cash at the end of the period');
      expect(closingCash).toBeDefined();
      expect(closingCash!.amount).toBe(11000);
    });

    it('should hide zero-balance cash-flow lines', () => {
      const entries = [
        makeEntry('e1', 't1', '2024-06-01', 'trade-receivables', 2000),
        makeEntry('e2', 't1', '2024-06-01', 'sales-revenue', -2000)
      ];
      const context = createReportingContext(entries, cashFlowAccounts, '2024-01-01', '2024-12-31', entries);
      const rows = createCashFlowStatement(context, cashFlowAccounts);

      expect(rows.some(r => r.title === 'Depreciation (money set aside, not spent)')).toBe(false);
      expect(rows.some(r => r.title === 'Equipment, machines, furniture bought or sold')).toBe(false);
      expect(rows.some(r => r.title === 'Money put in or taken out by owners')).toBe(false);
    });

    it('should use account mappings from the supplied cashFlowConfig', () => {
      const entries = [
        makeEntry('e1', 't1', '2024-06-01', 'trade-receivables', 2000),
        makeEntry('e2', 't1', '2024-06-01', 'sales-revenue', -2000)
      ];
      const context = createReportingContext(entries, cashFlowAccounts, '2024-01-01', '2024-12-31', entries);
      const customConfig = {
        workingCapital: [
          { title: 'Custom customer debts', includeAccountNameRegex: '^1:10:110' }
        ]
      };

      const rows = createCashFlowStatement(context, cashFlowAccounts, customConfig);

      expect(rows.some(r => r.title === 'Money customers owe us (receivables)')).toBe(false);
      expect(rows.some(r => r.title === 'Custom customer debts')).toBe(true);

      const customLine = rows.find(r => r.title === 'Custom customer debts');
      expect(customLine).toBeDefined();
      expect(customLine!.amount).toBe(-2000);
    });
  });

  describe('createSolvencyCheck', () => {
    function makeSolvencyAccount(id: string, name: string, type: string, parentId: string | null = null, code: number): AccountTreeNode {
      return {
        id,
        name,
        type: type as any,
        note: null,
        parentId,
        accountCode: code,
        children: []
      };
    }

    const solvencyAccounts: AccountTreeNode[] = [
      {
        id: 'assets',
        name: '1 Assets',
        type: 'ASSET',
        note: null,
        parentId: null,
        accountCode: 1,
        children: [
          {
            id: 'current-assets',
            name: '10 Current Assets',
            type: 'ASSET',
            note: null,
            parentId: 'assets',
            accountCode: 10,
            children: [
              {
                id: 'cash',
                name: '100 Cash and cash equivalents',
                type: 'ASSET',
                note: null,
                parentId: 'current-assets',
                accountCode: 100,
                children: [
                  {
                    id: 'bank',
                    name: '1000 Bank Account',
                    type: 'CASH',
                    note: null,
                    parentId: 'cash',
                    accountCode: 1000,
                    children: []
                  }
                ]
              },
              {
                id: 'receivables',
                name: '110 Accounts Receivable',
                type: 'ASSET',
                note: null,
                parentId: 'current-assets',
                accountCode: 110,
                children: [
                  {
                    id: 'trade-receivables',
                    name: '1100 Trade Receivables',
                    type: 'ASSET',
                    note: null,
                    parentId: 'receivables',
                    accountCode: 1100,
                    children: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: 'liabilities',
        name: '2 Liabilities',
        type: 'LIABILITY',
        note: null,
        parentId: null,
        accountCode: 2,
        children: [
          makeSolvencyAccount('payables', '20 Payables', 'LIABILITY', 'liabilities', 20),
          {
            id: 'equity-capital',
            name: '28 Equity capital',
            type: 'EQUITY',
            note: null,
            parentId: 'liabilities',
            accountCode: 28,
            children: [
              makeSolvencyAccount('share-capital', '280 Share capital', 'EQUITY', 'equity-capital', 280)
            ]
          },
          {
            id: 'reserves',
            name: '290 Reserves',
            type: 'EQUITY',
            note: null,
            parentId: 'liabilities',
            accountCode: 290,
            children: [
              makeSolvencyAccount('legal-reserves', '2950 Legal reserves', 'EQUITY', 'reserves', 2950)
            ]
          }
        ]
      },
      makeSolvencyAccount('revenue', '4 Revenue', 'REVENUE', null, 4),
      makeSolvencyAccount('expense', '6 Expenses', 'EXPENSE', null, 6)
    ];

    function makeSolvencyEntry(id: string, accountId: string, amount: number): AccountEntryDTO {
      return {
        entryId: id,
        transactionId: 'tx-' + id,
        transactionDate: '2024-06-01',
        description: 'entry',
        commodity: 'CHF',
        amount,
        runningBalance: amount,
        note: null,
        accountId,
        partnerId: null,
        partnerName: null,
        status: 'CLEARED',
        tags: []
      };
    }

    const swissSolvencyConfig = { receivablesRegex: '^1:10:110', protectedEquityRegex: '^2:28:280|^2:290:2950' };

    it('should flag a solvent company with all KPIs computed', () => {
      const entries = [
        makeSolvencyEntry('e1', 'bank', 10000),
        makeSolvencyEntry('e2', 'trade-receivables', 5000),
        makeSolvencyEntry('e3', 'payables', -3000),
        makeSolvencyEntry('e4', 'share-capital', -20000),
        makeSolvencyEntry('e5', 'legal-reserves', -1000)
      ];
      const context = createReportingContext(entries, solvencyAccounts, null, null);
      const rows = createSolvencyCheck(context, solvencyAccounts, swissSolvencyConfig);

      expect(rows.find(r => r.title === 'Total assets')!.amount).toBe(15000);
      expect(rows.find(r => r.title === 'Total liabilities (debts)')!.amount).toBe(3000);
      expect(rows.find(r => r.title === 'Net assets (distance to over-indebtedness)')!.amount).toBe(12000);
      expect(rows.find(r => r.title === 'Cash and cash equivalents')!.amount).toBe(10000);
      expect(rows.find(r => r.title === 'Receivables')!.amount).toBe(5000);
      expect(rows.find(r => r.title === 'Quick liquid assets (cash + receivables)')!.amount).toBe(15000);
      expect(rows.find(r => r.title === 'Cash available to spend (cash − all liabilities)')!.amount).toBe(7000);
      expect(rows.find(r => r.title === 'Liquid headroom (cash + receivables − all liabilities)')!.amount).toBe(12000);
      expect(rows.find(r => r.title === 'Equity ratio')!.amount).toBeCloseTo(80, 5);

      // Protected equity = share capital 20000 + legal reserves 1000 = 21000
      expect(rows.find(r => r.title === 'Protected equity (share capital + legal reserves)')!.amount).toBe(21000);
      expect(rows.find(r => r.title === 'Capital-loss threshold (half of protected equity)')!.amount).toBe(10500);
      expect(rows.find(r => r.title === 'Distance to capital loss')!.amount).toBe(1500);

      // Every line carries a monitoring note
      expect(rows.every(r => r.note && r.note.length > 0)).toBe(true);

      const statusRow = rows.find(r => r.isStatus);
      expect(statusRow).toBeDefined();
      expect(statusRow!.status).toBe('safe');
    });

    it('should flag a capital loss when net assets fall below half of protected equity', () => {
      const entries = [
        makeSolvencyEntry('e1', 'bank', 10000),
        makeSolvencyEntry('e2', 'trade-receivables', 1000),
        makeSolvencyEntry('e3', 'payables', -3000),
        makeSolvencyEntry('e4', 'share-capital', -20000)
      ];
      const context = createReportingContext(entries, solvencyAccounts, null, null);
      const rows = createSolvencyCheck(context, solvencyAccounts, swissSolvencyConfig);

      // Net assets = 8000, protected equity = 20000, threshold = 10000 -> capital loss
      expect(rows.find(r => r.title === 'Net assets (distance to over-indebtedness)')!.amount).toBe(8000);
      expect(rows.find(r => r.title === 'Capital-loss threshold (half of protected equity)')!.amount).toBe(10000);
      expect(rows.find(r => r.title === 'Distance to capital loss')!.amount).toBe(-2000);

      const statusRow = rows.find(r => r.isStatus);
      expect(statusRow!.status).toBe('warning');
      expect(statusRow!.title).toContain('CAPITAL LOSS');
    });

    it('should flag an over-indebted company with a danger status', () => {
      const entries = [
        makeSolvencyEntry('e1', 'bank', 1000),
        makeSolvencyEntry('e2', 'payables', -3000)
      ];
      const context = createReportingContext(entries, solvencyAccounts, null, null);
      const rows = createSolvencyCheck(context, solvencyAccounts, swissSolvencyConfig);

      expect(rows.find(r => r.title === 'Total assets')!.amount).toBe(1000);
      expect(rows.find(r => r.title === 'Total liabilities (debts)')!.amount).toBe(3000);
      expect(rows.find(r => r.title === 'Net assets (distance to over-indebtedness)')!.amount).toBe(-2000);
      expect(rows.find(r => r.title === 'Cash available to spend (cash − all liabilities)')!.amount).toBe(-2000);
      expect(rows.find(r => r.title === 'Equity ratio')!.amount).toBeCloseTo(-200, 2);

      const statusRow = rows.find(r => r.isStatus);
      expect(statusRow).toBeDefined();
      expect(statusRow!.status).toBe('danger');
      expect(statusRow!.title).toContain('OVER-INDEBTED');
    });

    it('should flag an illiquid company even when still solvent', () => {
      const entries = [
        makeSolvencyEntry('e1', 'bank', 1000),
        makeSolvencyEntry('e2', 'trade-receivables', 5000),
        makeSolvencyEntry('e3', 'payables', -3000),
        makeSolvencyEntry('e4', 'share-capital', -3000)
      ];
      const context = createReportingContext(entries, solvencyAccounts, null, null);
      const rows = createSolvencyCheck(context, solvencyAccounts, swissSolvencyConfig);

      // Assets (6000) > liabilities (3000), so still solvent
      expect(rows.find(r => r.title === 'Net assets (distance to over-indebtedness)')!.amount).toBe(3000);
      // But cash (1000) < liabilities (3000), so illiquid
      expect(rows.find(r => r.title === 'Cash available to spend (cash − all liabilities)')!.amount).toBe(-2000);

      const statusRow = rows.find(r => r.isStatus);
      expect(statusRow!.status).toBe('danger');
      expect(statusRow!.title).toContain('ILLIQUID');
    });

    it('should warn when the equity ratio is thin but no capital loss', () => {
      const entries = [
        makeSolvencyEntry('e1', 'bank', 10000),
        makeSolvencyEntry('e2', 'payables', -9500),
        makeSolvencyEntry('e3', 'share-capital', -500)
      ];
      const context = createReportingContext(entries, solvencyAccounts, null, null);
      const rows = createSolvencyCheck(context, solvencyAccounts, swissSolvencyConfig);

      expect(rows.find(r => r.title === 'Equity ratio')!.amount).toBeCloseTo(5, 2);
      expect(rows.find(r => r.title === 'Cash available to spend (cash − all liabilities)')!.amount).toBe(500);

      const statusRow = rows.find(r => r.isStatus);
      expect(statusRow!.status).toBe('warning');
    });

    it('should report zero receivables when no solvencyConfig is provided', () => {
      const entries = [
        makeSolvencyEntry('e1', 'bank', 10000),
        makeSolvencyEntry('e2', 'trade-receivables', 5000),
        makeSolvencyEntry('e3', 'payables', -3000),
        makeSolvencyEntry('e4', 'share-capital', -12000)
      ];
      const context = createReportingContext(entries, solvencyAccounts, null, null);
      const rows = createSolvencyCheck(context, solvencyAccounts);

      expect(rows.find(r => r.title === 'Receivables')!.amount).toBe(0);
      expect(rows.find(r => r.title === 'Protected equity (share capital + legal reserves)')!.amount).toBe(0);
      expect(rows.find(r => r.title === 'Quick liquid assets (cash + receivables)')!.amount).toBe(10000);
      expect(rows.find(r => r.title === 'Liquid headroom (cash + receivables − all liabilities)')!.amount).toBe(7000);
    });

    it('should use a custom receivablesRegex when provided', () => {
      const customAccounts: AccountTreeNode[] = [
        {
          id: 'assets',
          name: '1 Assets',
          type: 'ASSET',
          note: null,
          parentId: null,
          accountCode: 1,
          children: [
            {
              id: 'current-assets',
              name: '10 Current Assets',
              type: 'ASSET',
              note: null,
              parentId: 'assets',
              accountCode: 10,
              children: [
                {
                  id: 'cash',
                  name: '100 Cash and cash equivalents',
                  type: 'ASSET',
                  note: null,
                  parentId: 'current-assets',
                  accountCode: 100,
                  children: [
                    {
                      id: 'bank',
                      name: '1000 Bank Account',
                      type: 'CASH',
                      note: null,
                      parentId: 'cash',
                      accountCode: 1000,
                      children: []
                    }
                  ]
                },
                {
                  id: 'receivables',
                  name: '110 Accounts Receivable',
                  type: 'ASSET',
                  note: null,
                  parentId: 'current-assets',
                  accountCode: 110,
                  children: [
                    {
                      id: 'trade-receivables',
                      name: '1100 Trade Receivables',
                      type: 'ASSET',
                      note: null,
                      parentId: 'receivables',
                      accountCode: 1100,
                      children: []
                    }
                  ]
                },
                {
                  id: 'other-receivables',
                  name: '130 Other receivables',
                  type: 'ASSET',
                  note: null,
                  parentId: 'current-assets',
                  accountCode: 130,
                  children: []
                }
              ]
            }
          ]
        },
        {
          id: 'liabilities',
          name: '2 Liabilities',
          type: 'LIABILITY',
          note: null,
          parentId: null,
          accountCode: 2,
          children: [
            makeSolvencyAccount('payables', '20 Payables', 'LIABILITY', 'liabilities', 20),
            makeSolvencyAccount('share-capital', '280 Share capital', 'EQUITY', 'liabilities', 280)
          ]
        },
        makeSolvencyAccount('revenue', '4 Revenue', 'REVENUE', null, 4),
        makeSolvencyAccount('expense', '6 Expenses', 'EXPENSE', null, 6)
      ];
      const entries = [
        makeSolvencyEntry('e1', 'bank', 10000),
        makeSolvencyEntry('e2', 'trade-receivables', 5000),
        makeSolvencyEntry('e5', 'other-receivables', 2000),
        makeSolvencyEntry('e3', 'payables', -3000),
        makeSolvencyEntry('e4', 'share-capital', -14000)
      ];
      const context = createReportingContext(entries, customAccounts, null, null);
      const rows = createSolvencyCheck(context, customAccounts, { receivablesRegex: '^1:10:13' });

      // Only the 130 account is matched by ^1:10:13
      expect(rows.find(r => r.title === 'Receivables')!.amount).toBe(2000);
      expect(rows.find(r => r.title === 'Quick liquid assets (cash + receivables)')!.amount).toBe(12000);
    });
  });
});
