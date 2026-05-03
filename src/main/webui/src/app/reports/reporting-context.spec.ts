import { createReportingContext, groupEntriesByAccount } from './reporting-context';
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
});
