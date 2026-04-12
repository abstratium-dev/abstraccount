import { AccountTreeNode } from './controller';

/**
 * Extracts the leading number from account name.
 * "1 Assets" -> "1"
 * "100 Bank" -> "100"
 * "2210.001 Person" -> "2210.001"
 */
export function extractAccountNumber(name: string): string {
  const match = name.match(/^(\d+(?:\.\d+)?)\s/);
  return match ? match[1] : '';
}

/**
 * Builds hierarchical path from root to account with numbers.
 * Returns array of {number, id, name} for each ancestor including the account itself.
 */
export function buildHierarchicalPath(
  accountId: string,
  allAccounts: AccountTreeNode[]
): Array<{ number: string; id: string; name: string }> {
  const path: Array<{ number: string; id: string; name: string }> = [];

  const findAccountAndParents = (
    targetId: string,
    nodes: AccountTreeNode[],
    ancestors: AccountTreeNode[] = []
  ): AccountTreeNode[] | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return [...ancestors, node];
      }
      if (node.children) {
        const found = findAccountAndParents(targetId, node.children, [...ancestors, node]);
        if (found) return found;
      }
    }
    return null;
  };

  const chain = findAccountAndParents(accountId, allAccounts);
  if (chain) {
    for (const account of chain) {
      const number = extractAccountNumber(account.name);
      if (number) {
        path.push({ number, id: account.id, name: account.name });
      }
    }
  }

  return path;
}

/**
 * Finds an account by ID in the account tree.
 */
export function findAccountById(
  accountId: string,
  accounts: AccountTreeNode[]
): AccountTreeNode | null {
  for (const account of accounts) {
    if (account.id === accountId) {
      return account;
    }
    if (account.children) {
      const found = findAccountById(accountId, account.children);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Builds the full hierarchical account name with number prefixes from root to account.
 * For example, if account is "1100 Debtors" with parent "110 Receivables" with parent "10 Current Assets"
 * with parent "1 Assets", this returns "1:10:110:1100 Debtors".
 * This is used for account regex matching in reports.
 */
export function buildHierarchicalAccountName(
  accountId: string,
  allAccounts: AccountTreeNode[]
): string {
  const path = buildHierarchicalPath(accountId, allAccounts);
  if (path.length === 0) {
    const account = findAccountById(accountId, allAccounts);
    return account?.name || '';
  }

  // Build the hierarchical number prefix (e.g., "1:10:110:1100")
  const numberPrefix = path.map(p => p.number).join(':');

  // Get the leaf account's name without its own number
  const leafAccount = path[path.length - 1];
  const leafName = leafAccount.name.replace(/^\d+(?:\.\d+)?\s*/, '');

  return `${numberPrefix} ${leafName}`;
}
