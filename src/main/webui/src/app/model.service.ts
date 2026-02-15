import { Injectable, signal, Signal } from '@angular/core';
import { JournalMetadataDTO, TransactionDTO } from './controller';

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

  config$: Signal<Config | null> = this.config.asReadonly();
  journals$: Signal<JournalMetadataDTO[]> = this.journals.asReadonly();
  transactions$: Signal<TransactionDTO[]> = this.transactions.asReadonly();

  setConfig(config: Config) {
    this.config.set(config);
  }

  setJournals(journals: JournalMetadataDTO[]) {
    this.journals.set(journals);
  }

  setTransactions(transactions: TransactionDTO[]) {
    this.transactions.set(transactions);
  }
}
