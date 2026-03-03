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
      children: []
    },
    {
      id: 'liability1',
      name: 'Accounts Payable',
      type: 'LIABILITY',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'revenue1',
      name: 'Sales Revenue',
      type: 'REVENUE',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'expense1',
      name: 'Office Supplies',
      type: 'EXPENSE',
      note: null,
      parentId: null,
      children: []
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
      status: 'CLEARED'
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
      status: 'CLEARED'
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
      status: 'CLEARED'
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
      status: 'CLEARED'
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

    it('should invert sign when requested', () => {
      const summaries = groupEntriesByAccount(mockEntries, mockAccounts, true);

      const revenueSummary = summaries.find(s => s.accountId === 'revenue1');
      expect(revenueSummary!.balance).toBe(500); // Inverted from -500
      expect(revenueSummary!.debit).toBe(500);
      expect(revenueSummary!.credit).toBe(0);
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
          status: 'CLEARED'
        }
      ];

      const summaries = groupEntriesByAccount(multipleEntries, mockAccounts);

      const cashSummary = summaries.find(s => s.accountId === 'asset1');
      expect(cashSummary!.balance).toBe(1500); // 1000 + 500
    });
  });
});
