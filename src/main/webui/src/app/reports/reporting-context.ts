import { AccountEntryDTO, AccountTreeNode, TransactionDTO, TagDTO } from '../controller';
import { ReportingContext, AccountSummary, TagGroup } from './reporting-types';
import { buildHierarchicalAccountName } from '../account-utils';

// Cache for hierarchical account names to avoid recomputing
const hierarchicalNameCache = new Map<string, string>();

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

  // Helper to get hierarchical account name for an entry (includes parent number prefixes)
  function getHierarchicalAccountName(entry: AccountEntryDTO): string {
    return buildHierarchicalAccountName(entry.accountId, accounts);
  }
  
  // Filter entries by account type
  function getEntriesByAccountType(accountType: string): AccountEntryDTO[] {
    return entries.filter(e => getAccountType(e) === accountType);
  }
  
  // Filter entries by multiple account types
  function getEntriesByAccountTypes(accountTypes: string[]): AccountEntryDTO[] {
    return entries.filter(e => accountTypes.includes(getAccountType(e)));
  }
  
  // Filter entries by account regex pattern (matches against hierarchical account name)
  function getEntriesByAccountRegex(pattern: string): AccountEntryDTO[] {
    const regex = new RegExp(pattern);
    return entries.filter(e => regex.test(getHierarchicalAccountName(e)));
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
  
  // Revenue and expenses - use raw values
  // Revenue is typically negative (credit balance), expenses are positive (debit balance)
  const totalRevenue = getBalanceByAccountType('REVENUE');
  const totalExpenses = getBalanceByAccountType('EXPENSE');
  
  // Net income = Revenue + Expenses (both in raw form)
  // Since revenue is negative and expenses are positive, this gives us the correct net income
  const netIncome = totalRevenue + totalExpenses;
  
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
 * Groups entries by account and calculates summaries.
 * Note: This function does NOT apply sign inversion - that is handled at display time
 * by the applyDisplaySign function in the component.
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
      const amount = entry.amount;
      balance += amount;
      if (amount > 0) {
        debit += amount;
      } else {
        credit += Math.abs(amount);
      }
    });
    
    // Store raw values - sign inversion is applied at display time
    summaries.push({
      accountId,
      accountName: account.name,
      accountType: account.type,
      balance: balance,
      debit: debit,
      credit: credit
    });
  });
  
  // Sort by account name
  return summaries.sort((a, b) => a.accountName.localeCompare(b.accountName));
}

/**
 * Groups transactions by tag value and calculates net amounts per group.
 * The net amount can be filtered to specific accounts using balanceAccountIds or balanceAccountRegex.
 * This is useful for checking if specific accounts (e.g., Accounts Receivable) balance to zero.
 */
export function groupTransactionsByTag(
  transactions: TransactionDTO[],
  tagKey: string,
  tagValuePrefix: string | undefined,
  sortColumn: string = 'net',
  sortDirection: 'asc' | 'desc' = 'desc',
  balanceAccountIds?: string[],
  balanceAccountRegex?: string,
  balanceAccountNameRegex?: string,
  accounts?: AccountTreeNode[]
): TagGroup[] {
  console.log('groupTransactionsByTag called:', { 
    transactionCount: transactions.length, 
    tagKey, 
    tagValuePrefix,
    balanceAccountIds,
    balanceAccountRegex,
    balanceAccountNameRegex,
    hasAccounts: !!accounts
  });
  
  // Sample some transaction tags for debugging
  if (transactions.length > 0) {
    console.log('Sample transactions with tags:', transactions.slice(0, 3).map(tx => ({
      id: tx.id,
      tags: tx.tags
    })));
  }
  
  // Filter transactions that have the matching tag
  const matchingTransactions = transactions.filter(tx => {
    const matchingTag = tx.tags.find(tag => {
      if (tag.key !== tagKey) return false;
      if (tagValuePrefix && tag.value) {
        return tag.value.startsWith(tagValuePrefix);
      }
      return true;
    });
    return !!matchingTag;
  });
  
  console.log('Matching transactions:', matchingTransactions.length);

  // Group by tag value
  const groupMap = new Map<string, TagGroup>();

  for (const tx of matchingTransactions) {
    const tag = tx.tags.find(t => {
      if (t.key !== tagKey) return false;
      if (tagValuePrefix && t.value) {
        return t.value.startsWith(tagValuePrefix);
      }
      return true;
    });

    if (!tag || !tag.value) continue;

    const tagValue = tag.value;

    if (!groupMap.has(tagValue)) {
      groupMap.set(tagValue, {
        tagValue,
        transactions: [],
        netAmount: 0,
        partnerId: tx.partnerId,
        partnerName: tx.partnerName,
        firstDate: tx.date,
        commodity: tx.entries[0]?.commodity || ''
      });
    }

    const group = groupMap.get(tagValue)!;
    group.transactions.push(tx);

    // Sum entry amounts to get net - filter by account if specified
    for (const entry of tx.entries) {
      let includeEntry = true;
      
      // Filter by specific account IDs if specified
      if (balanceAccountIds && balanceAccountIds.length > 0) {
        includeEntry = balanceAccountIds.includes(entry.accountId);
      }
      // Or filter by account ID regex if specified
      else if (balanceAccountRegex) {
        const regex = new RegExp(balanceAccountRegex);
        includeEntry = regex.test(entry.accountId);
      }
      // Or filter by account name regex if specified
      // Need to build hierarchical path like "1:10:110:1100 Debtors" to match
      else if (balanceAccountNameRegex && accounts) {
        let hierarchicalName = hierarchicalNameCache.get(entry.accountId);
        if (!hierarchicalName) {
          hierarchicalName = buildHierarchicalAccountName(entry.accountId, accounts);
          hierarchicalNameCache.set(entry.accountId, hierarchicalName);
        }
        const regex = new RegExp(balanceAccountNameRegex);
        includeEntry = regex.test(hierarchicalName);
      }
      // Legacy fallback: direct account name match (without hierarchy)
      else if (balanceAccountNameRegex && entry.accountName) {
        const regex = new RegExp(balanceAccountNameRegex);
        includeEntry = regex.test(entry.accountName);
      }
      
      if (includeEntry) {
        group.netAmount += entry.amount;
      }
    }

    // Update first date if this transaction is earlier
    if (tx.date < group.firstDate) {
      group.firstDate = tx.date;
    }

    // Use first non-null partner
    if (!group.partnerId && tx.partnerId) {
      group.partnerId = tx.partnerId;
      group.partnerName = tx.partnerName;
    }

    // Use commodity from first entry if not set
    if (!group.commodity && tx.entries.length > 0) {
      group.commodity = tx.entries[0].commodity;
    }
  }

  // Convert to array (filtering done by caller based on hideZeroBalances)
  let groups = Array.from(groupMap.values());
  console.log('Groups count:', groups.length);
  for (const g of groups) {
    console.log(`Group ${g.tagValue}: netAmount=${g.netAmount}, txCount=${g.transactions.length}`);
    // Show all entries from first transaction
    if (g.transactions.length > 0) {
      const tx = g.transactions[0];
      console.log(`  First transaction entries (${tx.entries.length}):`);
      for (const e of tx.entries) {
        const matchesId = balanceAccountRegex ? new RegExp(balanceAccountRegex).test(e.accountId) : null;
        let hierarchicalName = accounts ? (hierarchicalNameCache.get(e.accountId) || buildHierarchicalAccountName(e.accountId, accounts)) : e.accountName;
        const matchesHierarchical = balanceAccountNameRegex && accounts ? new RegExp(balanceAccountNameRegex).test(hierarchicalName) : null;
        console.log(`    - accountId: "${e.accountId}", hierarchicalName: "${hierarchicalName?.substring(0, 50)}...", amount: ${e.amount}, matchesHierarchical: ${matchesHierarchical}`);
      }
    }
  }

  // Sort
  groups.sort((a, b) => {
    let comparison = 0;
    switch (sortColumn) {
      case 'net':
        comparison = a.netAmount - b.netAmount;
        break;
      case 'date':
        comparison = a.firstDate.localeCompare(b.firstDate);
        break;
      case 'tagValue':
        comparison = a.tagValue.localeCompare(b.tagValue);
        break;
      case 'partnerName':
        comparison = (a.partnerName || '').localeCompare(b.partnerName || '');
        break;
      default:
        comparison = a.netAmount - b.netAmount;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  return groups;
}
