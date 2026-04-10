import { Component, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Controller, AccountTreeNode, JournalMetadataDTO, TransactionDTO } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';
import { AccountEditModalComponent } from '../account-edit-modal/account-edit-modal.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, RouterLink, AccountEditModalComponent],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss'
})
export class AccountsComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  accountService = inject(AccountService); // Public so template can use it
  
  accounts = this.modelService.accounts$;
  loading = false;
  error: string | null = null;
  
  journalMetadata: JournalMetadataDTO | null = null;
  accountBalances: Map<string, number> = new Map();

  // Modal state
  showModal = false;
  modalAccountId: string | null = null;
  modalParentAccountId: string | null = null;
  
  // Context menu state
  openMenuId: string | null = null;

  constructor() {
    // Watch for selected journal changes
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      
      if (journalId) {
        this.loadAccounts();
      } else {
        this.error = null;
      }
    });
  }

  isMenuOpen(accountId: string): boolean {
    return this.openMenuId === accountId;
  }

  async ngOnInit() {
    // Accounts will be loaded by the effect when journal is available
  }

  async loadAccounts() {
    this.loading = true;
    this.error = null;
    
    try {
      const journalId = this.modelService.getSelectedJournalId();
      if (!journalId) {
        this.error = 'No journal selected';
        return;
      }
      
      await this.controller.getAccountTree(journalId);

      const [metadata, transactions] = await Promise.all([
        this.controller.getJournalMetadata(journalId),
        this.controller.getTransactions(journalId)
      ]);
      this.journalMetadata = metadata;
      this.accountBalances = this.computeAccountBalances(transactions);
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.error = 'Failed to load accounts';
    } finally {
      this.loading = false;
    }
  }

  private computeAccountBalances(transactions: TransactionDTO[]): Map<string, number> {
    const balances = new Map<string, number>();
    for (const tx of transactions) {
      for (const entry of tx.entries) {
        const current = balances.get(entry.accountId) ?? 0;
        balances.set(entry.accountId, current + entry.amount);
      }
    }
    return balances;
  }

  getAccountBalance(accountId: string): number {
    return this.accountBalances.get(accountId) ?? 0;
  }

  formatBalance(accountId: string): string {
    const balance = this.getAccountBalance(accountId);
    const currency = this.journalMetadata?.currency;
    if (!currency) {
      return balance.toFixed(2);
    }
    const precision = this.journalMetadata?.commodities?.[currency];
    const parsed = precision != null ? parseInt(precision, 10) : NaN;
    const decimals = (!isNaN(parsed) && parsed >= 0 && parsed <= 20) ? parsed : 2;
    const formatted = balance.toFixed(decimals);
    return `${currency} ${formatted}`;
  }

  formatAccountType(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  }
  
  toggleMenu(accountId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openMenuId = this.openMenuId === accountId ? null : accountId;
  }
  
  closeMenu(): void {
    this.openMenuId = null;
  }
  
  openCreateModal(): void {
    this.modalAccountId = null;
    this.modalParentAccountId = null;
    this.showModal = true;
    this.closeMenu();
  }
  
  openEditModal(accountId: string): void {
    this.modalAccountId = accountId;
    this.modalParentAccountId = null;
    this.showModal = true;
    this.closeMenu();
  }
  
  openAddChildModal(parentAccountId: string): void {
    this.modalAccountId = null;
    this.modalParentAccountId = parentAccountId;
    this.showModal = true;
    this.closeMenu();
  }
  
  async deleteAccount(accountId: string): Promise<void> {
    this.closeMenu();
    
    const journalId = this.modelService.getSelectedJournalId();
    if (!journalId) return;
    
    // Check if it's a leaf account
    try {
      const isLeaf = await this.controller.isLeafAccount(accountId);
      if (!isLeaf) {
        alert('Cannot delete an account with children. Please delete child accounts first.');
        return;
      }
    } catch (error) {
      console.error('Error checking if account is leaf:', error);
      alert('Failed to check account status');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
      return;
    }
    
    try {
      await this.controller.deleteAccount(journalId, accountId);
      await this.loadAccounts();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account: ' + (error.error || error.message || 'Unknown error'));
    }
  }
  
  closeModal(): void {
    this.showModal = false;
    this.modalAccountId = null;
    this.modalParentAccountId = null;
  }
  
  async onModalSaved(): Promise<void> {
    await this.loadAccounts();
  }
  
  getJournalId(): string {
    return this.modelService.getSelectedJournalId() || '';
  }
  
  hasChildren(account: AccountTreeNode): boolean {
    return account.children && account.children.length > 0;
  }
}
