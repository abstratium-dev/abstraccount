import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Controller, JournalMetadataDTO, TransactionDTO, EntryDTO } from '../controller';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';

@Component({
  selector: 'journal',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss'
})
export class JournalComponent implements OnInit {
  selectedJournal: JournalMetadataDTO | null = null;
  transactions: TransactionDTO[] = [];
  loading = false;
  error: string | null = null;
  
  // Filters
  startDate: string = '';
  endDate: string = '';
  status: string = '';

  private confirmDialog = inject(ConfirmDialogService);
  modelService = inject(ModelService); // Public for template
  accountService = inject(AccountService); // Public for template

  constructor(private controller: Controller) {
    // Watch for selected journal changes
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      const journals = this.modelService.journals$();
      
      if (journalId && journals.length > 0) {
        this.selectedJournal = journals.find(j => j.id === journalId) || null;
        if (this.selectedJournal) {
          this.loadEntries();
        }
      } else {
        this.selectedJournal = null;
        this.transactions = [];
      }
    });
  }

  ngOnInit(): void {
    // Load journals if not already loaded
    if (this.modelService.journals$().length === 0) {
      this.controller.listJournals();
    }
  }


  async loadEntries(): Promise<void> {
    if (!this.selectedJournal) return;
    
    this.loading = true;
    this.error = null;
    
    try {
      // Load transactions for the journal
      this.transactions = await this.controller.getTransactions(
        this.selectedJournal.id,
        this.startDate || undefined,
        this.endDate || undefined,
        undefined, // partnerId
        this.status || undefined
      );
      this.loading = false;
    } catch (err: any) {
      this.error = 'Failed to load transactions: ' + err.message;
      this.loading = false;
    }
  }


  applyFilters(): void {
    this.loadEntries();
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.status = '';
    this.loadEntries();
  }

  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }
  
  formatDateISO(dateString: string): string {
    // Return date in ISO format (YYYY-MM-DD)
    return dateString;
  }
  
  getAccountNumberOnly(accountNumber: string): string {
    // Extract just the account number (first word)
    const parts = accountNumber.split(/[\s:]/);
    return parts[0];
  }
  
  getAccountHierarchy(accountNumber: string): string {
    // Extract hierarchy from account number
    // E.g., "1020" -> "1:10:100:1020"
    // E.g., "6570.001" -> "6:65:657:6570:6570.001"
    const num = accountNumber.trim();
    if (num.length === 0) return num;
    
    // Split by dots to handle decimal parts
    const segments = num.split('.');
    const parts: string[] = [];
    
    // Process the main part (before any dot)
    const mainPart = segments[0];
    for (let i = 1; i <= mainPart.length; i++) {
      parts.push(mainPart.substring(0, i));
    }
    
    // Add the full number if it has decimal parts
    if (segments.length > 1) {
      parts.push(num);
    }
    
    return parts.join(':');
  }
  
  getAccountLeafName(accountName: string): string {
    // Extract the leaf name from the full account name
    // Format: "1020 Avoirs en banque / Bank Account (asset)"
    // We want just "1020 Avoirs en banque / Bank Account (asset)"
    // The accountName from the backend is already the leaf part
    return accountName;
  }

}
