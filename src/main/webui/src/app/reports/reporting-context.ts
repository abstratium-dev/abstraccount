import { AccountEntryDTO, AccountTreeNode } from '../controller';
import { ReportingContext, AccountSummary } from './reporting-types';

/**
 * Creates a reporting context from account entries and account tree.
 * The context provides calculated financial metrics and helper methods for filtering/aggregating.
 */
export function createReportingContext(
  entries: AccountEntryDTO[],
  accounts: AccountTreeNode[],
  startDate: string | null,
  endDate: string | null
): ReportingContext {
  
  // Build account lookup map
  const accountMap = new Map<string, AccountTreeNode>();
  function addToMap(node: AccountTreeNode) {
    accountMap.set(node.id, node);
    node.children.forEach(addToMap);
  }
  accounts.forEach(addToMap);
  
  // Helper to get account type for an entry
  function getAccountType(entry: AccountEntryDTO): string {
    const account = accountMap.get(entry.accountId);
    return account?.type || 'UNKNOWN';
  }
  
  // Helper to get account name for an entry
  function getAccountName(entry: AccountEntryDTO): string {
    const account = accountMap.get(entry.accountId);
    return account?.name || '';
  }
  
  // Filter entries by account type
  function getEntriesByAccountType(accountType: string): AccountEntryDTO[] {
    return entries.filter(e => getAccountType(e) === accountType);
  }
  
  // Filter entries by multiple account types
  function getEntriesByAccountTypes(accountTypes: string[]): AccountEntryDTO[] {
    return entries.filter(e => accountTypes.includes(getAccountType(e)));
  }
  
  // Filter entries by account regex pattern
  function getEntriesByAccountRegex(pattern: string): AccountEntryDTO[] {
    const regex = new RegExp(pattern);
    return entries.filter(e => regex.test(getAccountName(e)));
  }
  
  // Calculate balance for a specific account type
  function getBalanceByAccountType(accountType: string): number {
    return getEntriesByAccountType(accountType)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }
  
  // Calculate balance for multiple account types
  function getBalanceByAccountTypes(accountTypes: string[]): number {
    return getEntriesByAccountTypes(accountTypes)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }
  
  // Calculate balance for a specific account
  function getBalanceByAccount(accountId: string): number {
    return entries
      .filter(e => e.accountId === accountId)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }
  
  // Calculate standard financial metrics
  const totalAssets = getBalanceByAccountType('ASSET');
  const totalLiabilities = getBalanceByAccountType('LIABILITY');
  const totalEquity = getBalanceByAccountType('EQUITY');
  
  // Revenue and expenses are typically stored as negative for increases
  // We need to invert them for reporting purposes
  const totalRevenue = -getBalanceByAccountType('REVENUE');
  const totalExpenses = getBalanceByAccountType('EXPENSE');
  
  // Net income = Revenue - Expenses
  const netIncome = totalRevenue - totalExpenses;
  
  return {
    entries,
    startDate,
    endDate,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalRevenue,
    totalExpenses,
    netIncome,
    getEntriesByAccountType,
    getEntriesByAccountTypes,
    getEntriesByAccountRegex,
    getBalanceByAccountType,
    getBalanceByAccountTypes,
    getBalanceByAccount
  };
}

/**
 * Groups entries by account and calculates summaries
 */
export function groupEntriesByAccount(
  entries: AccountEntryDTO[],
  accounts: AccountTreeNode[],
  invertSign: boolean = false
): AccountSummary[] {
  // Build account lookup map
  const accountMap = new Map<string, AccountTreeNode>();
  function addToMap(node: AccountTreeNode) {
    accountMap.set(node.id, node);
    node.children.forEach(addToMap);
  }
  accounts.forEach(addToMap);
  
  // Group entries by account
  const accountGroups = new Map<string, AccountEntryDTO[]>();
  entries.forEach(entry => {
    const existing = accountGroups.get(entry.accountId) || [];
    existing.push(entry);
    accountGroups.set(entry.accountId, existing);
  });
  
  // Calculate summaries
  const summaries: AccountSummary[] = [];
  accountGroups.forEach((accountEntries, accountId) => {
    const account = accountMap.get(accountId);
    if (!account) return;
    
    let balance = 0;
    let debit = 0;
    let credit = 0;
    
    accountEntries.forEach(entry => {
      const amount = invertSign ? -entry.amount : entry.amount;
      balance += amount;
      if (amount > 0) {
        debit += amount;
      } else {
        credit += Math.abs(amount);
      }
    });
    
    summaries.push({
      accountId,
      accountName: account.name,
      accountType: account.type,
      balance,
      debit,
      credit
    });
  });
  
  // Sort by account name
  return summaries.sort((a, b) => a.accountName.localeCompare(b.accountName));
}
