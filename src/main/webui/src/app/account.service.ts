import { Injectable } from '@angular/core';
import { AccountTreeNode } from './controller';

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
    const match = name.match(/^(\d+(?:\.\d+)?)\s/);
    return match ? match[1] : '';
  }

  /**
   * Builds hierarchical path from root to account with numbers and IDs
   * Returns array of {number, id, name} for each ancestor including the account itself
   */
  buildHierarchicalPath(
    accountId: string, 
    allAccounts: AccountTreeNode[]
  ): Array<{number: string, id: string, name: string}> {
    const path: Array<{number: string, id: string, name: string}> = [];
    
    // Find the account and build parent chain
    const findAccountAndParents = (
      targetId: string, 
      nodes: AccountTreeNode[], 
      ancestors: AccountTreeNode[] = []
    ): AccountTreeNode[] | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          // Found it - return ancestors plus this node
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
        const number = this.extractAccountNumber(account.name);
        if (number) {
          path.push({ number, id: account.id, name: account.name });
        }
      }
    }
    
    return path;
  }

  /**
   * Finds an account by ID in the account tree
   */
  findAccountById(accountId: string, accounts: AccountTreeNode[]): AccountTreeNode | null {
    for (const account of accounts) {
      if (account.id === accountId) {
        return account;
      }
      if (account.children) {
        const found = this.findAccountById(accountId, account.children);
        if (found) return found;
      }
    }
    return null;
  }
}
