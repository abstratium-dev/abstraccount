import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Controller, AccountTreeNode } from '../controller';
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
  
  // Modal state
  showModal = false;
  modalAccountId: string | null = null;
  modalParentAccountId: string | null = null;
  
  // Context menu state
  openMenuId: string | null = null;

  isMenuOpen(accountId: string): boolean {
    return this.openMenuId === accountId;
  }

  async ngOnInit() {
    await this.loadAccounts();
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
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.error = 'Failed to load accounts';
    } finally {
      this.loading = false;
    }
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
