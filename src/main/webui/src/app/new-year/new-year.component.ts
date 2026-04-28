import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Controller,
  NewYearPreviewDTO,
  NewYearResultDTO,
  NewYearAccountPreviewDTO,
  AccountTreeNode
} from '../controller';
import { ModelService } from '../model.service';
import { AutocompleteComponent, AutocompleteOption } from '../core/autocomplete/autocomplete.component';

@Component({
  selector: 'new-year',
  imports: [CommonModule, FormsModule, AutocompleteComponent],
  templateUrl: './new-year.component.html',
  styleUrl: './new-year.component.scss'
})
export class NewYearComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  private router = inject(Router);

  openingDate: string = '';
  newJournalTitle: string = '';
  retainedEarningsCodePath: string = '';
  annualProfitLossCodePath: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  preview: NewYearPreviewDTO | null = null;
  showConfirmDialog: boolean = false;

  constructor() {
    const now = new Date();
    // Default to January 1st of next year
    const nextYear = now.getFullYear() + 1;
    this.openingDate = `${nextYear}-01-01`;

    // Set default title based on current journal
    this.setDefaultTitle();
  }

  async ngOnInit(): Promise<void> {
    // Ensure we have journal metadata loaded for the default title
    await this.loadCurrentJournalMetadata();
  }

  private async loadCurrentJournalMetadata(): Promise<void> {
    const journalId = this.journalId;
    if (journalId) {
      try {
        const metadata = await this.controller.getJournalMetadata(journalId);
        if (!this.newJournalTitle) {
          this.newJournalTitle = metadata.title;
        }
      } catch (error) {
        console.error('Error loading journal metadata:', error);
      }
    }
  }

  private setDefaultTitle(): void {
    const journals = this.modelService.journals$();
    const selectedId = this.journalId;
    if (selectedId && journals.length > 0) {
      const currentJournal = journals.find(j => j.id === selectedId);
      if (currentJournal) {
        this.newJournalTitle = currentJournal.title;
      }
    }
  }

  get journalId(): string | null {
    return this.modelService.selectedJournalId$();
  }

  get currentJournalTitle(): string {
    const journals = this.modelService.journals$();
    const selectedId = this.journalId;
    if (selectedId && journals.length > 0) {
      const currentJournal = journals.find(j => j.id === selectedId);
      return currentJournal?.title || '';
    }
    return '';
  }

  fetchAccountsForRetainedEarnings(): (searchTerm: string) => Promise<{value: string, label: string}[]> {
    return this.fetchAccounts();
  }

  fetchAccountsForAnnualProfitLoss(): (searchTerm: string) => Promise<{value: string, label: string}[]> {
    return this.fetchAccounts();
  }

  private fetchAccounts(): (searchTerm: string) => Promise<{value: string, label: string}[]> {
    return async (searchTerm: string) => {
      const accounts = this.modelService.getAccounts();
      const flatAccounts: {value: string, label: string}[] = [];

      const flatten = (accountList: AccountTreeNode[], codePath: string[] = []) => {
        for (const acct of accountList) {
          const code = acct.name.indexOf(' ') > -1 ? acct.name.substring(0, acct.name.indexOf(' ')) : acct.name;
          const currentCodePath = [...codePath, code];
          const fullCode = currentCodePath.join(':');
          const nameWithoutCode = acct.name.indexOf(' ') > -1 ? acct.name.substring(acct.name.indexOf(' ')) : '';
          const label = `${fullCode} ${nameWithoutCode}`;

          if (!searchTerm || label.toLowerCase().includes(searchTerm.toLowerCase())) {
            flatAccounts.push({ value: fullCode, label: label.trim() });
          }

          if (acct.children && acct.children.length > 0) {
            flatten(acct.children, currentCodePath);
          }
        }
      };

      flatten(accounts);
      return flatAccounts;
    };
  }

  async previewNewYear(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.preview = null;

    if (!this.journalId) {
      this.errorMessage = 'No journal selected.';
      return;
    }
    if (!this.openingDate) {
      this.errorMessage = 'Opening date is required.';
      return;
    }
    if (!this.retainedEarningsCodePath || this.retainedEarningsCodePath.trim() === '') {
      this.errorMessage = 'Retained earnings account (2970) is required.';
      return;
    }
    if (!this.annualProfitLossCodePath || this.annualProfitLossCodePath.trim() === '') {
      this.errorMessage = 'Annual profit/loss account (2979) is required.';
      return;
    }

    this.isLoading = true;
    try {
      this.preview = await this.controller.previewNewYear({
        sourceJournalId: this.journalId,
        newJournalTitle: this.newJournalTitle,
        openingDate: this.openingDate,
        retainedEarningsCodePath: this.retainedEarningsCodePath,
        annualProfitLossCodePath: this.annualProfitLossCodePath
      });

      if (this.preview.accounts.length === 0) {
        this.errorMessage = 'No accounts found to copy to the new journal.';
        this.preview = null;
      } else {
        this.showConfirmDialog = true;
      }
    } catch (error: any) {
      console.error('Error previewing new year:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to preview new year creation. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async executeNewYear(): Promise<void> {
    if (!this.journalId || !this.preview) return;

    this.isLoading = true;
    this.errorMessage = '';
    try {
      const result: NewYearResultDTO = await this.controller.executeNewYear({
        sourceJournalId: this.journalId,
        newJournalTitle: this.newJournalTitle,
        openingDate: this.openingDate,
        retainedEarningsCodePath: this.retainedEarningsCodePath,
        annualProfitLossCodePath: this.annualProfitLossCodePath
      });

      this.showConfirmDialog = false;
      this.preview = null;
      this.successMessage = `Successfully created new journal "${result.newJournalTitle}" with ${result.accountCount} accounts and ${result.openingBalanceCount} opening balance transactions.`;
      await this.router.navigate(['/journal']);
    } catch (error: any) {
      console.error('Error executing new year:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to create new year journal.';
      this.showConfirmDialog = false;
    } finally {
      this.isLoading = false;
    }
  }

  cancelConfirm(): void {
    this.showConfirmDialog = false;
    this.preview = null;
  }

  formatBalance(account: NewYearAccountPreviewDTO): string {
    return `${account.commodity} ${account.openingBalance.toFixed(2)}`;
  }

  getNonZeroBalanceAccounts(): NewYearAccountPreviewDTO[] {
    if (!this.preview) return [];
    return this.preview.accounts.filter(a => a.openingBalance !== 0);
  }
}
