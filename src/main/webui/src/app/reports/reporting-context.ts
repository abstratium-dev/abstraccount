import { AccountEntryDTO, AccountTreeNode, TransactionDTO, TagDTO } from '../controller';
import { ReportingContext, AccountSummary, TagGroup, CashFlowRow } from './reporting-types';
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
  endDate: string | null,
  allEntries?: AccountEntryDTO[]
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

  // Calculate balance for accounts matching a hierarchical account-name regex
  function getBalanceByAccountRegex(pattern: string): number {
    const regex = new RegExp(pattern);
    return entries
      .filter(e => regex.test(getHierarchicalAccountName(e)))
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

  // Opening/closing cash balances for cash-flow reporting.
  // allEntries contains every entry up to the report end date; entries is the
  // subset inside the selected date range. When no date range is selected we
  // still keep openingCash at 0 because the period starts at the journal origin.
  let openingCash = 0;
  let closingCash = 0;
  function isOpeningBalance(entry: AccountEntryDTO): boolean {
    return entry.tags?.some(tag => tag.key === 'OpeningBalances') ?? false;
  }
  if (allEntries && allEntries.length > 0) {
    for (const entry of allEntries) {
      if (isCashAccount(entry)) {
        closingCash += entry.amount;
        if (startDate && (entry.transactionDate < startDate || isOpeningBalance(entry))) {
          openingCash += entry.amount;
        }
      }
    }
  } else {
    // Without historical entries we fall back to the entries in the period;
    // this still gives a correct *change* in cash even if absolute balances
    // cannot be reconciled.
    for (const entry of entries) {
      if (isCashAccount(entry)) {
        closingCash += entry.amount;
      }
    }
  }

  function isCashAccount(entry: AccountEntryDTO): boolean {
    const account = accountMap.get(entry.accountId);
    return account?.type === 'CASH';
  }
  
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
    openingCash,
    closingCash,
    getEntriesByAccountType,
    getEntriesByAccountTypes,
    getEntriesByAccountRegex,
    getBalanceByAccountType,
    getBalanceByAccountTypes,
    getBalanceByAccount,
    getBalanceByAccountRegex
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

/**
 * Builds an indirect-method cash-flow statement from a reporting context.
 *
 * The returned rows use the Swiss SME format: operating activities start from
 * net income and add back non-cash items and working-capital timing differences,
 * then investing and financing activities are listed, then the movement is
 * reconciled against opening and closing cash.
 *
 * Positive amounts are cash inflows, negative amounts are cash outflows.
 *
 * The account regexes used here match the default chart of accounts created by
 * JournalCreationService. If an account is not present in a journal the
 * corresponding line simply shows zero.
 */
export function createCashFlowStatement(
  context: ReportingContext,
  accounts: AccountTreeNode[]
): CashFlowRow[] {
  const rows: CashFlowRow[] = [];

  function addLine(title: string, amount: number, level: number = 2): void {
    if (amount !== 0) {
      rows.push({ title, amount, level, isSubtotal: false });
    }
  }

  function addSubtotal(title: string, amount: number, level: number = 3): void {
    rows.push({ title, amount, level, isSubtotal: true });
  }

  // Sum entries whose hierarchical account name matches `includePattern` but
  // does not match the optional `excludePattern`. This lets us separate gross
  // fixed-asset movements from accumulated depreciation.
  function netChangeByRegex(includePattern: string, excludePattern?: string): number {
    const includeRegex = new RegExp(includePattern);
    const excludeRegex = excludePattern ? new RegExp(excludePattern) : null;
    return context.entries
      .filter(e => {
        const name = buildHierarchicalAccountName(e.accountId, accounts);
        return includeRegex.test(name) && (!excludeRegex || !excludeRegex.test(name));
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }

  // --- Operating activities ---
  rows.push({ title: 'Operating activities', amount: 0, level: 1, isSubtotal: false });

  // Net income is stored with reversed accounting signs in this application
  // (revenue is negative, expenses are positive), so a profit is a negative
  // number. For the cash-flow statement we display it as a positive inflow.
  addLine('Net income / loss for the period', -context.netIncome);

  // Non-cash charges that reduced profit without moving cash.
  const depreciation = context.getBalanceByAccountRegex('^6:6800');
  addLine('Depreciation and value adjustments', depreciation);

  // Changes in working capital. The cash effect is the opposite of the
  // accounting change (an increase in an asset ties up cash; an increase in a
  // liability frees cash).
  const receivablesChange = context.getBalanceByAccountRegex('^1:10:110');
  const inventoryChange = context.getBalanceByAccountRegex('^1:10:120');
  const otherReceivablesChange = context.getBalanceByAccountRegex('^1:10:130');
  const payablesChange = context.getBalanceByAccountRegex('^2:20:200');
  const otherPayablesChange = context.getBalanceByAccountRegex('^2:20:220');
  const transitoryLiabilitiesChange = context.getBalanceByAccountRegex('^2:20:23');
  const provisionsChange = context.getBalanceByAccountRegex('^2:20:24');

  addLine('Increase / decrease in trade receivables', -receivablesChange);
  addLine('Increase / decrease in inventories', -inventoryChange);
  addLine('Increase / decrease in other short-term receivables', -otherReceivablesChange);
  addLine('Increase / decrease in trade payables', -payablesChange);
  addLine('Increase / decrease in other short-term liabilities', -otherPayablesChange);
  addLine('Increase / decrease in transitory liabilities (passive accruals)', -transitoryLiabilitiesChange);
  addLine('Increase / decrease in provisions', -provisionsChange);

  const operatingCashFlow = -context.netIncome
    + depreciation
    - receivablesChange - inventoryChange - otherReceivablesChange
    - payablesChange - otherPayablesChange - transitoryLiabilitiesChange - provisionsChange;
  addSubtotal('Cash flow from operating activities', operatingCashFlow);

  // --- Investing activities ---
  rows.push({ title: 'Investing activities', amount: 0, level: 1, isSubtotal: false });

  // The net change in fixed-asset accounts during the period equals purchases
  // minus disposals (depreciation is booked against separate expense/accumulated
  // depreciation accounts and therefore does not appear here).
  const participationsChange = netChangeByRegex('^1:14:140', '^1:14:140:1409');
  const fixedAssetsChange = netChangeByRegex('^1:14:150', '^1:14:150:1509');

  addLine('Investments / disinvestments in participations', -participationsChange);
  addLine('Investments / disinvestments in tangible fixed assets', -fixedAssetsChange);

  const investingCashFlow = -participationsChange - fixedAssetsChange;
  addSubtotal('Cash flow from investing activities', investingCashFlow);

  // --- Financing activities ---
  rows.push({ title: 'Financing activities', amount: 0, level: 1, isSubtotal: false });

  // Debt principal movements and share-capital injections/reductions.
  // Dividends and own-share transactions are not separately identified here
  // because they require specific accounts/tags in the chart of accounts.
  const debtChange = context.getBalanceByAccountRegex('^2:20:210');
  const shareCapitalChange = context.getBalanceByAccountRegex('^2:28:280');

  addLine('Increase / repayment of financial debts', -debtChange);
  addLine('Issue / reduction of share capital', -shareCapitalChange);

  const financingCashFlow = -debtChange - shareCapitalChange;
  addSubtotal('Cash flow from financing activities', financingCashFlow);

  // --- Total change in cash ---
  const totalChange = operatingCashFlow + investingCashFlow + financingCashFlow;
  addSubtotal('Increase / decrease in cash', totalChange, 4);

  // --- Reconciliation to cash balances ---
  rows.push({ title: 'Reconciliation to cash', amount: 0, level: 1, isSubtotal: false });
  addLine('Opening cash and cash equivalents', context.openingCash ?? 0);
  addLine('Closing cash and cash equivalents', context.closingCash ?? 0);
  addSubtotal('Increase / decrease in cash', (context.closingCash ?? 0) - (context.openingCash ?? 0), 4);

  return rows;
}
