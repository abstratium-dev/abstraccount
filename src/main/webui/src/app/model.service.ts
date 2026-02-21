import { Injectable, signal, Signal } from '@angular/core';
import { JournalMetadataDTO, TransactionDTO, AccountTreeNode } from './controller';

export interface Config {
  logLevel: string;
}

@Injectable({
  providedIn: 'root',
})
export class ModelService {
  private config = signal<Config | null>(null);
  private journals = signal<JournalMetadataDTO[]>([]);
  private transactions = signal<TransactionDTO[]>([]);
  private selectedJournalId = signal<string | null>(localStorage.getItem("journalId") || null);
  private accounts = signal<AccountTreeNode[]>([]);

  config$: Signal<Config | null> = this.config.asReadonly();
  journals$: Signal<JournalMetadataDTO[]> = this.journals.asReadonly();
  transactions$: Signal<TransactionDTO[]> = this.transactions.asReadonly();
  selectedJournalId$: Signal<string | null> = this.selectedJournalId.asReadonly();
  accounts$: Signal<AccountTreeNode[]> = this.accounts.asReadonly();

  setConfig(config: Config) {
    this.config.set(config);
  }

  setJournals(journals: JournalMetadataDTO[]) {
    this.journals.set(journals);
    if (journals.length > 0) {
      // ensure that the selected id is valid
      let selectedJournalId = this.getSelectedJournalId()
      if (!selectedJournalId) {
        selectedJournalId = journals[0].id;
      } else {
        if (!journals.some(j => j.id === selectedJournalId)) {
          selectedJournalId = journals[0].id;
        }
      }
      this.setSelectedJournalId(selectedJournalId);
    }
  }

  setTransactions(transactions: TransactionDTO[]) {
    this.transactions.set(transactions);
  }

  setSelectedJournalId(journalId: string | null) {
    this.selectedJournalId.set(journalId);
    localStorage.setItem("journalId", journalId||'')
  }

  getSelectedJournalId(): string | null {
    return this.selectedJournalId() || localStorage.getItem("journalId") || null;
  }

  getAccounts(): AccountTreeNode[] {
    return this.accounts();
  }

  findAccountByFullPath(fullPath : string[]): AccountTreeNode | null {
    // search through the accounts to find the one that matches the given path
    const accounts = this.accounts();
    for (const account of accounts) {
      if (account.name === fullPath[0]) {
        // found the root account, now search through its children
        let currentAccount: AccountTreeNode | null = account;
        for (let i = 1; i < fullPath.length; i++) {
          if (!currentAccount) {
            return null;
          }
          currentAccount = currentAccount.children.find(child => child.name === fullPath[i]) || null;
        }
        return currentAccount;
      }
    }
    return null;
  }

  /** searches recursively in the trees for the first account it finds with the given id */
  findAccount(accountId: string): AccountTreeNode | null {
    function search(account: AccountTreeNode): AccountTreeNode | null {
      if (account.id === accountId) {
        return account;
      }
      for (const child of account.children) {
        const account = search(child);
        if (account) {
          return account;
        }
      }
      return null;
    }

    const accounts = this.accounts();
    for (const account of accounts) {
      const a = search(account);
      if (a) {
        return a;
      }
    }
    return null;
  }

  setAccounts(accounts: AccountTreeNode[]): void {
    this.accounts.set(accounts);
  }
}
