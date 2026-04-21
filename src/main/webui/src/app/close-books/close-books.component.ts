import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Controller,
  CloseBooksPreviewDTO,
  CloseBooksResultDTO,
  CloseAccountPreviewDTO
} from '../controller';
import { ModelService } from '../model.service';
import { AutocompleteComponent, AutocompleteOption } from '../core/autocomplete/autocomplete.component';

@Component({
  selector: 'close-books',
  imports: [CommonModule, FormsModule, AutocompleteComponent],
  templateUrl: './close-books.component.html',
  styleUrl: './close-books.component.scss'
})
export class CloseBooksComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  private router = inject(Router);

  closingDate: string = '';
  equityAccountCodePath: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  preview: CloseBooksPreviewDTO | null = null;
  showConfirmDialog: boolean = false;

  constructor() {
    const now = new Date();
    this.closingDate = `${now.getFullYear()}-12-31`;
  }

  ngOnInit(): void {}

  get journalId(): string | null {
    return this.modelService.selectedJournalId$();
  }

  fetchAccountsForEquity(): (searchTerm: string) => Promise<AutocompleteOption[]> {
    return async (searchTerm: string): Promise<AutocompleteOption[]> => {
      const accounts = this.modelService.getAccounts();
      const flatAccounts: AutocompleteOption[] = [];

      const flatten = (accts: any[], codePath: string[] = []) => {
        for (const acct of accts) {
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

  async previewClose(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';
    this.preview = null;

    if (!this.journalId) {
      this.errorMessage = 'No journal selected.';
      return;
    }
    if (!this.closingDate) {
      this.errorMessage = 'Closing date is required.';
      return;
    }
    if (!this.equityAccountCodePath) {
      this.errorMessage = 'Equity account (e.g. 2:290:2979) is required.';
      return;
    }

    this.isLoading = true;
    try {
      this.preview = await this.controller.previewCloseBooks({
        journalId: this.journalId,
        closingDate: this.closingDate,
        equityAccountCodePath: this.equityAccountCodePath
      });

      if (this.preview.accounts.length === 0) {
        this.errorMessage = 'No income or expense accounts have a non-zero balance on the selected date. Nothing to close.';
        this.preview = null;
      } else {
        this.showConfirmDialog = true;
      }
    } catch (error: any) {
      console.error('Error previewing close-books:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to preview closing entries. Please check the equity account code path.';
    } finally {
      this.isLoading = false;
    }
  }

  async executeClose(): Promise<void> {
    if (!this.journalId || !this.preview) return;

    this.isLoading = true;
    this.errorMessage = '';
    try {
      const result: CloseBooksResultDTO = await this.controller.executeCloseBooks({
        journalId: this.journalId,
        closingDate: this.closingDate,
        equityAccountCodePath: this.equityAccountCodePath
      });

      this.showConfirmDialog = false;
      this.preview = null;
      this.successMessage = `Successfully created ${result.transactionCount} closing transaction(s).`;
      await this.router.navigate(['/journal']);
    } catch (error: any) {
      console.error('Error executing close-books:', error);
      this.errorMessage = error?.error?.message || error?.message || 'Failed to execute closing entries.';
      this.showConfirmDialog = false;
    } finally {
      this.isLoading = false;
    }
  }

  cancelConfirm(): void {
    this.showConfirmDialog = false;
    this.preview = null;
  }

  formatBalance(account: CloseAccountPreviewDTO): string {
    return `${account.commodity} ${account.balance.toFixed(2)}`;
  }
}
