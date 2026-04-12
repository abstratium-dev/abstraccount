import { Injectable } from '@angular/core';
import { AccountTreeNode } from './controller';
import {
  extractAccountNumber as _extractAccountNumber,
  buildHierarchicalPath as _buildHierarchicalPath,
  findAccountById as _findAccountById,
  buildHierarchicalAccountName as _buildHierarchicalAccountName
} from './account-utils';

@Injectable({
  providedIn: 'root'
})
export class AccountService {

  /**
   * Extracts the leading number from account name for display purposes only
   * "1 Assets" -> "1"
   * "100 Bank" -> "100"
   * "2210.001 Person" -> "2210.001"
   */
  extractAccountNumber(name: string): string {
    return _extractAccountNumber(name);
  }

  /**
   * Builds hierarchical path from root to account with numbers and IDs
   * Returns array of {number, id, name} for each ancestor including the account itself
   */
  buildHierarchicalPath(
    accountId: string,
    allAccounts: AccountTreeNode[]
  ): Array<{number: string, id: string, name: string}> {
    return _buildHierarchicalPath(accountId, allAccounts);
  }

  /**
   * Finds an account by ID in the account tree
   */
  findAccountById(accountId: string, accounts: AccountTreeNode[]): AccountTreeNode | null {
    return _findAccountById(accountId, accounts);
  }

  /**
   * Builds the full hierarchical account name with number prefixes from root to account.
   * For example, if account is "1100 Debtors" with parent "110 Receivables" with parent "10 Current Assets"
   * with parent "1 Assets", this returns "1:10:110:1100 Debtors".
   * This is used for account regex matching in reports.
   */
  buildHierarchicalAccountName(
    accountId: string,
    allAccounts: AccountTreeNode[]
  ): string {
    return _buildHierarchicalAccountName(accountId, allAccounts);
  }
}
