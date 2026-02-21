import { createReportingContext, groupEntriesByAccount } from './reporting-context';
import { AccountEntryDTO, AccountTreeNode } from '../controller';

describe('Balance Sheet Structure', () => {
  const mockAccounts: AccountTreeNode[] = [
    {
      id: 'cash1',
      name: '1:10:100:1000 Cash',
      type: 'CASH',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'cash2',
      name: '1:10:100:1020 Bank',
      type: 'CASH',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'asset1',
      name: '1:10:110:1100 Accounts Receivable',
      type: 'ASSET',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'asset2',
      name: '1:10:120:1200 Inventory',
      type: 'ASSET',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'liability1',
      name: '2:20:200:2000 Accounts Payable',
      type: 'LIABILITY',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'equity1',
      name: '2:28:280:2800 Share Capital',
      type: 'EQUITY',
      note: null,
      parentId: null,
      children: []
    }
  ];

  const mockEntries: AccountEntryDTO[] = [
    // Cash accounts
    {
      entryId: 'e1',
      transactionId: 't1',
      transactionDate: '2024-01-01',
      description: 'Cash entry',
      commodity: 'CHF',
      amount: 1000,
      runningBalance: 1000,
      note: null,
      accountId: 'cash1',
      partnerId: null,
      status: 'CLEARED'
    },
    {
      entryId: 'e2',
      transactionId: 't2',
      transactionDate: '2024-01-02',
      description: 'Bank entry',
      commodity: 'CHF',
      amount: 5000,
      runningBalance: 5000,
      note: null,
      accountId: 'cash2',
      partnerId: null,
      status: 'CLEARED'
    },
    // Asset accounts
    {
      entryId: 'e3',
      transactionId: 't3',
      transactionDate: '2024-01-03',
      description: 'AR entry',
      commodity: 'CHF',
      amount: 2000,
      runningBalance: 2000,
      note: null,
      accountId: 'asset1',
      partnerId: null,
      status: 'CLEARED'
    },
    {
      entryId: 'e4',
      transactionId: 't4',
      transactionDate: '2024-01-04',
      description: 'Inventory entry',
      commodity: 'CHF',
      amount: 3000,
      runningBalance: 3000,
      note: null,
      accountId: 'asset2',
      partnerId: null,
      status: 'CLEARED'
    },
    // Liability
    {
      entryId: 'e5',
      transactionId: 't5',
      transactionDate: '2024-01-05',
      description: 'AP entry',
      commodity: 'CHF',
      amount: -1500,
      runningBalance: -1500,
      note: null,
      accountId: 'liability1',
      partnerId: null,
      status: 'CLEARED'
    },
    // Equity
    {
      entryId: 'e6',
      transactionId: 't6',
      transactionDate: '2024-01-06',
      description: 'Capital entry',
      commodity: 'CHF',
      amount: -8500,
      runningBalance: -8500,
      note: null,
      accountId: 'equity1',
      partnerId: null,
      status: 'CLEARED'
    }
  ];

  it('should calculate correct totals for hierarchical balance sheet', () => {
    const context = createReportingContext(mockEntries, mockAccounts, null, null);

    // Cash section
    const cashEntries = context.getEntriesByAccountType('CASH');
    const cashAccounts = groupEntriesByAccount(cashEntries, mockAccounts, false);
    const cashTotal = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    expect(cashTotal).toBe(6000); // 1000 + 5000

    // Other Assets section
    const assetEntries = context.getEntriesByAccountType('ASSET');
    const assetAccounts = groupEntriesByAccount(assetEntries, mockAccounts, false);
    const assetTotal = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    expect(assetTotal).toBe(5000); // 2000 + 3000

    // Total Assets (Cash + Assets)
    const allAssetEntries = context.getEntriesByAccountTypes(['CASH', 'ASSET']);
    const allAssetAccounts = groupEntriesByAccount(allAssetEntries, mockAccounts, false);
    const totalAssets = allAssetAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    expect(totalAssets).toBe(11000); // 6000 + 5000

    // Liabilities
    const liabilityEntries = context.getEntriesByAccountType('LIABILITY');
    const liabilityAccounts = groupEntriesByAccount(liabilityEntries, mockAccounts, false);
    const liabilityTotal = liabilityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    expect(liabilityTotal).toBe(-1500);

    // Equity
    const equityEntries = context.getEntriesByAccountType('EQUITY');
    const equityAccounts = groupEntriesByAccount(equityEntries, mockAccounts, false);
    const equityTotal = equityAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    expect(equityTotal).toBe(-8500);

    // Total Liabilities and Equity
    const totalLiabilitiesAndEquity = liabilityTotal + equityTotal;
    expect(totalLiabilitiesAndEquity).toBe(-10000); // -1500 + -8500

    // Balance sheet equation: Assets = Liabilities + Equity + Net Income
    // Net income should be the difference
    const netIncome = context.netIncome;
    const balanceCheck = totalAssets + totalLiabilitiesAndEquity + netIncome;
    expect(balanceCheck).toBe(0); // Should balance
  });

  it('should support regex filtering for specific account ranges', () => {
    const context = createReportingContext(mockEntries, mockAccounts, null, null);

    // Filter for accounts starting with "1:10:100" (cash accounts)
    const cashRegexEntries = context.getEntriesByAccountRegex('^1:10:100:');
    expect(cashRegexEntries.length).toBe(2); // cash1 and cash2

    // Filter for accounts starting with "1:10:1[12]" (AR and Inventory)
    const assetRegexEntries = context.getEntriesByAccountRegex('^1:10:1[12]');
    expect(assetRegexEntries.length).toBe(2); // asset1 and asset2

    // Filter for liability accounts "2:20"
    const liabilityRegexEntries = context.getEntriesByAccountRegex('^2:20:');
    expect(liabilityRegexEntries.length).toBe(1);

    // Filter for equity accounts "2:28"
    const equityRegexEntries = context.getEntriesByAccountRegex('^2:28:');
    expect(equityRegexEntries.length).toBe(1);
  });
});
