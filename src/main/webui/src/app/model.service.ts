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
  private selectedJournalId = signal<string | null>(null);
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
  }

  setTransactions(transactions: TransactionDTO[]) {
    this.transactions.set(transactions);
  }

  setSelectedJournalId(journalId: string | null) {
    this.selectedJournalId.set(journalId);
  }

  getSelectedJournalId(): string | null {
    return this.selectedJournalId();
  }

  getAccounts(): AccountTreeNode[] {
    return this.accounts();
  }

  setAccounts(accounts: AccountTreeNode[]): void {
    this.accounts.set(accounts);
  }
}
