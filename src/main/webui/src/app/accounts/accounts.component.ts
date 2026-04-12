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

  // Collapse state (runtime: by id; persisted: by name)
  collapsedIds: Set<string> = new Set();
  private accountNameById: Map<string, string> = new Map();

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
      this.accountNameById = this.buildNameMap(this.accounts());
      this.restoreCollapsedFromStorage();
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.error = 'Failed to load accounts';
    } finally {
      this.loading = false;
    }
  }

  private buildNameMap(nodes: AccountTreeNode[]): Map<string, string> {
    const map = new Map<string, string>();
    const traverse = (list: AccountTreeNode[]) => {
      for (const node of list) {
        map.set(node.id, node.name);
        if (node.children?.length) traverse(node.children);
      }
    };
    traverse(nodes);
    return map;
  }

  private localStorageKey(): string {
    const journalId = this.modelService.getSelectedJournalId() ?? 'default';
    return `collapsed-accounts:${journalId}`;
  }

  private restoreCollapsedFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.localStorageKey());
      if (!raw) return;
      const names: string[] = JSON.parse(raw);
      const nameSet = new Set(names);
      this.collapsedIds = new Set(
        [...this.accountNameById.entries()]
          .filter(([, name]) => nameSet.has(name))
          .map(([id]) => id)
      );
    } catch {
      this.collapsedIds = new Set();
    }
  }

  private persistCollapsedToStorage(): void {
    try {
      const names = [...this.collapsedIds]
        .map(id => this.accountNameById.get(id))
        .filter((name): name is string => name !== undefined);
      localStorage.setItem(this.localStorageKey(), JSON.stringify(names));
    } catch {
      // localStorage unavailable — silently ignore
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

  private getSubtreeBalance(account: AccountTreeNode): number {
    let total = this.accountBalances.get(account.id) ?? 0;
    for (const child of (account.children ?? [])) {
      total += this.getSubtreeBalance(child);
    }
    return total;
  }

  getDisplayBalance(account: AccountTreeNode): number {
    if (this.collapsedIds.has(account.id)) {
      return this.getSubtreeBalance(account);
    }
    return this.accountBalances.get(account.id) ?? 0;
  }

  isCollapsed(accountId: string): boolean {
    return this.collapsedIds.has(accountId);
  }

  toggleCollapse(accountId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.collapsedIds.has(accountId)) {
      this.collapsedIds.delete(accountId);
    } else {
      this.collapsedIds.add(accountId);
    }
    this.persistCollapsedToStorage();
  }

  formatBalanceValue(balance: number): string {
    const currency = this.journalMetadata?.currency;
    if (!currency) {
      return balance.toFixed(2);
    }
    const precision = this.journalMetadata?.commodities?.[currency];
    const parsed = precision != null ? parseInt(precision, 10) : NaN;
    const decimals = (!isNaN(parsed) && parsed >= 0 && parsed <= 20) ? parsed : 2;
    return `${currency} ${balance.toFixed(decimals)}`;
  }

  formatBalance(accountId: string): string {
    return this.formatBalanceValue(this.getAccountBalance(accountId));
  }

  formatDisplayBalance(account: AccountTreeNode): string {
    return this.formatBalanceValue(this.getDisplayBalance(account));
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
