import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../account.service';
import { Controller, JournalMetadataDTO, TransactionDTO, TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { FilterInputComponent } from './filter-input/filter-input.component';
import { TransactionEditModalComponent } from '../transaction-edit-modal/transaction-edit-modal.component';

@Component({
  selector: 'journal',
  imports: [CommonModule, FormsModule, RouterLink, FilterInputComponent, TransactionEditModalComponent],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss'
})
export class JournalComponent implements OnInit {
  selectedJournal: JournalMetadataDTO | null = null;
  transactions: TransactionDTO[] = [];
  loading = false;
  error: string | null = null;
  tags: TagDTO[] = [];
  
  // Filter
  filterString: string = '';

  // Transaction modal
  showTransactionModal = false;
  editingTransactionId: string | null = null;

  // Context menu
  contextMenuTransactionId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };

  modelService = inject(ModelService); // Public for template
  accountService = inject(AccountService); // Public for template
  router = inject(Router);
  controller = inject(Controller);

  constructor() {
    // Watch for selected journal changes
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      const journals = this.modelService.journals$();
      
      if (journalId && journals.length > 0) {
        this.selectedJournal = journals.find(j => j.id === journalId) || null;
        if (this.selectedJournal) {
          this.loadTags();
          this.loadEntries();
        }
      } else {
        this.selectedJournal = null;
        this.transactions = [];
        this.tags = [];
      }
    });
  }

  async ngOnInit(): Promise<void> {
    // Load journals if not already loaded
    if (this.modelService.journals$().length === 0) {
      let journals = await this.controller.listJournals();
      if (journals.length === 0) {
        this.router.navigate(['/upload']);
      } else {
        await this.controller.getAccountTree(this.modelService.selectedJournalId$()!);
      }
    }
  }


  async loadTags(): Promise<void> {
    if (!this.selectedJournal) return;
    
    try {
      this.tags = await this.controller.getTags(this.selectedJournal.id);
    } catch (err: any) {
      console.error('Failed to load tags:', err);
      this.tags = [];
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
        undefined, // startDate (handled by filter)
        undefined, // endDate (handled by filter)
        undefined, // partnerId
        undefined, // status
        this.filterString || undefined
      );
      this.loading = false;
    } catch (err: any) {
      this.error = 'Failed to load transactions: ' + err.message;
      this.loading = false;
    }
  }


  onFilterChange(filter: string): void {
    this.filterString = filter;
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
  
  getAccountLeafName(accountName: string): string {
    // Extract the leaf name from the full account name
    // Format: "1020 Avoirs en banque / Bank Account (asset)"
    // We want just "1020 Avoirs en banque / Bank Account (asset)"
    // The accountName from the backend is already the leaf part
    return accountName;
  }

  getPartnerDisplay(partnerId: string | null, partnerName: string | null): string {
    if (!partnerId) return '';
    if (partnerName) return `${partnerId} - ${partnerName}`;
    return partnerId;
  }

  // Transaction modal methods
  openAddTransactionModal(): void {
    this.editingTransactionId = null;
    this.showTransactionModal = true;
  }

  openEditTransactionModal(transactionId: string): void {
    this.editingTransactionId = transactionId;
    this.showTransactionModal = true;
    this.contextMenuTransactionId = null;
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false;
    this.editingTransactionId = null;
  }

  onTransactionSaved(): void {
    this.loadEntries();
  }

  // Context menu methods
  openContextMenu(event: MouseEvent, transactionId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuTransactionId = transactionId;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
  }

  closeContextMenu(): void {
    this.contextMenuTransactionId = null;
  }

  async deleteTransaction(transactionId: string): Promise<void> {
    if (!this.selectedJournal) return;
    
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await this.controller.deleteTransaction(transactionId, this.selectedJournal.id);
      this.contextMenuTransactionId = null;
      await this.loadEntries();
    } catch (err: any) {
      this.error = 'Failed to delete transaction: ' + err.message;
    }
  }

  sortTags(tags: TagDTO[]): TagDTO[] {
    return [...tags].sort((a, b) => {
      // First compare by key
      const keyCompare = a.key.localeCompare(b.key);
      if (keyCompare !== 0) return keyCompare;
      // If keys are equal, compare by value
      return a.value.localeCompare(b.value);
    });
  }

}
