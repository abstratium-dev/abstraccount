import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Controller, JournalMetadataDTO, TransactionDTO, EntryDTO } from '../controller';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';

@Component({
  selector: 'journal',
  imports: [CommonModule, FormsModule],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss'
})
export class JournalComponent implements OnInit {
  journals: JournalMetadataDTO[] = [];
  selectedJournal: JournalMetadataDTO | null = null;
  transactions: TransactionDTO[] = [];
  loading = false;
  error: string | null = null;
  
  // Filters
  startDate: string = '';
  endDate: string = '';
  status: string = '';

  private confirmDialog = inject(ConfirmDialogService);

  constructor(private controller: Controller) {}

  ngOnInit(): void {
    this.loadJournals();
  }

  async loadJournals(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      this.journals = await this.controller.listJournals();
      this.loading = false;
      
      // Auto-select if only one journal
      if (this.journals.length === 1) {
        this.selectedJournal = this.journals[0];
        await this.loadEntries();
      }
    } catch (err: any) {
      this.error = 'Failed to load journals: ' + err.message;
      this.loading = false;
    }
  }

  onJournalSelected(): void {
    if (this.selectedJournal) {
      this.loadEntries();
    } else {
      this.transactions = [];
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

  async deleteJournal(): Promise<void> {
    if (!this.selectedJournal) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete Journal',
      message: `Are you sure you want to delete journal "${this.selectedJournal.title}"? This will permanently delete all accounts, transactions, entries, and tags associated with this journal. This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger'
    });

    if (!confirmed) return;

    this.loading = true;
    this.error = null;

    try {
      await this.controller.deleteJournal(this.selectedJournal.id);
      
      // Reload journals list
      await this.loadJournals();
      
      // Clear selected journal and transactions
      this.selectedJournal = null;
      this.transactions = [];
      
    } catch (err: any) {
      this.error = 'Failed to delete journal: ' + err.message;
    } finally {
      this.loading = false;
    }
  }

}
