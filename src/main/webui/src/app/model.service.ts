import { Injectable, signal, Signal } from '@angular/core';
import { JournalMetadataDTO, TransactionDTO, AccountTreeNode, ReportTemplate, MacroDTO } from './controller';

export interface Config {
  logLevel: string;
  warningMessage: string;
  warningBgColor: string;
  brandLogoUrl: string;
  brandLogoAlt: string;
  brandName: string;
  legalContent: string | null;
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
  private reportTemplates = signal<ReportTemplate[]>([]);
  private macros = signal<MacroDTO[]>([]);
  private warningMessage = signal<string>('');
  private warningBgColor = signal<string>('#fff3cd');
  private readonly defaultBrandLogoUrl = 'https://abstratium.dev/abstratium-logo-small.png';
  private readonly defaultBrandLogoAlt = 'Abstratium Logo';
  private readonly defaultBrandName = 'ABSTRATIUM';

  private brandLogoUrl = signal<string>(this.defaultBrandLogoUrl);
  private brandLogoAlt = signal<string>(this.defaultBrandLogoAlt);
  private brandName = signal<string>(this.defaultBrandName);
  private legalContent = signal<string | null>(null);

  legalContent$: Signal<string | null> = this.legalContent.asReadonly();

  config$: Signal<Config | null> = this.config.asReadonly();
  journals$: Signal<JournalMetadataDTO[]> = this.journals.asReadonly();
  transactions$: Signal<TransactionDTO[]> = this.transactions.asReadonly();
  selectedJournalId$: Signal<string | null> = this.selectedJournalId.asReadonly();
  accounts$: Signal<AccountTreeNode[]> = this.accounts.asReadonly();
  reportTemplates$: Signal<ReportTemplate[]> = this.reportTemplates.asReadonly();
  macros$: Signal<MacroDTO[]> = this.macros.asReadonly();
  warningMessage$: Signal<string> = this.warningMessage.asReadonly();
  warningBgColor$: Signal<string> = this.warningBgColor.asReadonly();
  brandLogoUrl$: Signal<string> = this.brandLogoUrl.asReadonly();
  brandLogoAlt$: Signal<string> = this.brandLogoAlt.asReadonly();
  brandName$: Signal<string> = this.brandName.asReadonly();

  setConfig(config: Config) {
    this.config.set(config);
    if (config.warningMessage === '-') {
      this.warningMessage.set('');
    } else {
      this.warningMessage.set(config.warningMessage);
    }
    this.warningBgColor.set(config.warningBgColor);
    this.brandLogoUrl.set(config.brandLogoUrl || this.defaultBrandLogoUrl);
    this.brandLogoAlt.set(config.brandLogoAlt || this.defaultBrandLogoAlt);
    this.brandName.set(config.brandName || this.defaultBrandName);
    this.legalContent.set(config.legalContent ?? null);
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

  setReportTemplates(templates: ReportTemplate[]): void {
    this.reportTemplates.set(templates);
  }

  setMacros(macros: MacroDTO[]): void {
    this.macros.set(macros);
  }
}
