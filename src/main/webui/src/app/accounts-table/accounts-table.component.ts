import { Component, OnInit, inject, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Controller, AccountTreeNode, JournalMetadataDTO, TransactionDTO, TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';
import { AccountEditModalComponent } from '../account-edit-modal/account-edit-modal.component';
import { FilterInputComponent } from '../journal/filter-input/filter-input.component';

interface FlattenedAccount {
  id: string;
  name: string;
  type: string;
  note: string | null;
  depth: number;
  children: AccountTreeNode[];
  parentId: string | null;
}

@Component({
  selector: 'app-accounts-table',
  standalone: true,
  imports: [CommonModule, RouterLink, AccountEditModalComponent, FilterInputComponent],
  templateUrl: './accounts-table.component.html',
  styleUrl: './accounts-table.component.scss'
})
export class AccountsTableComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  accountService = inject(AccountService);

  accounts = this.modelService.accounts$;
  loading = false;
  error: string | null = null;

  journalMetadata: JournalMetadataDTO | null = null;
  accountBalances: Map<string, number> = new Map();

  // Filter — pre-load from storage so the effect and FilterInputComponent agree on the initial value
  filterString: string = (() => {
    try { return localStorage.getItem('abstraccount:globalEql') ?? ''; } catch { return ''; }
  })();
  private filterInitialized = false;
  tags: TagDTO[] = [];

  // Modal state
  showModal = false;
  modalAccountId: string | null = null;
  modalParentAccountId: string | null = null;

  // Context menu state
  openMenuId: string | null = null;

  @ViewChild(FilterInputComponent) filterInput!: FilterInputComponent;

  // Collapse state
  collapsedIds: Set<string> = new Set();
  private accountNameById: Map<string, string> = new Map();
  private parentMap: Map<string, string | null> = new Map();

  // Hide zero-balance accounts toggle
  hideZeroBalance = false;

  flattenedAccounts: FlattenedAccount[] = [];

  constructor() {
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();

      if (journalId) {
        this.loadAccounts();
        this.loadTags();
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
    // If FilterInputComponent had nothing in localStorage it will not emit filterChange,
    // so we must trigger the initial load ourselves.
    if (!this.filterInitialized && this.modelService.getSelectedJournalId()) {
      this.filterInitialized = true;
    }
  }

  async loadTags(): Promise<void> {
    const journalId = this.modelService.getSelectedJournalId();
    if (!journalId) return;

    try {
      this.tags = await this.controller.getTags(journalId);
    } catch (err: any) {
      console.error('Failed to load tags:', err);
      this.tags = [];
    }
  }

  onFilterChange(filter: string): void {
    this.filterString = filter;
    this.filterInitialized = true;
    setTimeout(() => this.loadAccounts());
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
        this.controller.getTransactions(
          journalId,
          undefined, // startDate (handled by filter)
          undefined, // endDate (handled by filter)
          undefined, // partnerId
          undefined, // status
          this.filterString || undefined
        )
      ]);
      this.journalMetadata = metadata;
      this.accountBalances = this.computeAccountBalances(transactions);
      this.buildParentMap(this.accounts());
      this.accountNameById = this.buildNameMap(this.accounts());
      this.restoreCollapsedFromStorage();
      this.restoreHideZeroBalanceFromStorage();
      this.flattenAccounts();
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.error = 'Failed to load accounts';
    } finally {
      this.loading = false;
    }
  }

  private localStorageKey(): string {
    const journalId = this.modelService.getSelectedJournalId() ?? 'default';
    return `collapsed-accounts-table:${journalId}`;
  }

  private hideZeroBalanceKey(): string {
    const journalId = this.modelService.getSelectedJournalId() ?? 'default';
    return `hide-zero-balance:${journalId}`;
  }

  private restoreHideZeroBalanceFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.hideZeroBalanceKey());
      this.hideZeroBalance = stored === 'true';
    } catch {
      this.hideZeroBalance = false;
    }
  }

  private persistHideZeroBalanceToStorage(): void {
    try {
      localStorage.setItem(this.hideZeroBalanceKey(), String(this.hideZeroBalance));
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  toggleHideZeroBalance(): void {
    this.hideZeroBalance = !this.hideZeroBalance;
    this.persistHideZeroBalanceToStorage();
  }

  private getSubtreeBalance(accountId: string): number {
    const node = this.findAccountTreeNode(accountId);
    if (!node) return this.accountBalances.get(accountId) ?? 0;
    return this.getSubtreeBalanceRecursive(node);
  }

  isZeroBalance(account: FlattenedAccount): boolean {
    const balance = this.getDisplayBalance(account.id);
    const isZero = Math.abs(balance) < 0.0001;
    return isZero;
  }

  shouldShowAccount(account: FlattenedAccount): boolean {
    // First check if hidden by collapsed ancestor
    if (this.isHiddenByCollapsedAncestor(account)) {
      return false;
    }

    // If hideZeroBalance is enabled, check if this account has zero balance
    if (this.hideZeroBalance && this.isZeroBalance(account)) {
      return false;
    }

    return true;
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

  private buildParentMap(nodes: AccountTreeNode[], parentId: string | null = null): void {
    for (const node of nodes) {
      this.parentMap.set(node.id, parentId);
      if (node.children?.length) {
        this.buildParentMap(node.children, node.id);
      }
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

  private getAncestorCount(accountId: string): number {
    let count = 0;
    let currentId = this.parentMap.get(accountId);
    while (currentId !== null && currentId !== undefined) {
      count++;
      currentId = this.parentMap.get(currentId);
    }
    return count;
  }

  private flattenAccounts(): void {
    const flattened: FlattenedAccount[] = [];

    const traverse = (nodes: AccountTreeNode[], parentId: string | null) => {
      for (const node of nodes) {
        const depth = this.getAncestorCount(node.id);
        flattened.push({
          id: node.id,
          name: node.name,
          type: node.type,
          note: node.note,
          depth: depth,
          children: node.children || [],
          parentId: parentId
        });
        if (node.children && node.children.length > 0) {
          traverse(node.children, node.id);
        }
      }
    };
    traverse(this.accounts(), null);
    this.flattenedAccounts = flattened;
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

  areAllExpanded(): boolean {
    return this.collapsedIds.size === 0;
  }

  areAllCollapsed(): boolean {
    const accountsWithChildren = this.flattenedAccounts.filter(a => a.children.length > 0);
    if (accountsWithChildren.length === 0) return false;
    return accountsWithChildren.every(a => this.collapsedIds.has(a.id));
  }

  toggleAll(): void {
    const accountsWithChildren = this.flattenedAccounts.filter(a => a.children.length > 0);
    if (accountsWithChildren.length === 0) return;

    if (this.areAllCollapsed()) {
      // Expand all
      this.collapsedIds.clear();
    } else {
      // Collapse all
      for (const account of accountsWithChildren) {
        this.collapsedIds.add(account.id);
      }
    }
    this.persistCollapsedToStorage();
  }

  isHiddenByCollapsedAncestor(account: FlattenedAccount): boolean {
    let currentId: string | null | undefined = account.parentId;
    while (currentId !== null && currentId !== undefined) {
      if (this.collapsedIds.has(currentId)) {
        return true;
      }
      currentId = this.parentMap.get(currentId);
    }
    return false;
  }

  private getSubtreeBalanceRecursive(node: AccountTreeNode): number {
    let total = this.accountBalances.get(node.id) ?? 0;
    for (const child of (node.children ?? [])) {
      total += this.getSubtreeBalanceRecursive(child);
    }
    return total;
  }

  private findAccountTreeNode(accountId: string, nodes: AccountTreeNode[] = this.accounts()): AccountTreeNode | null {
    for (const node of nodes) {
      if (node.id === accountId) return node;
      if (node.children?.length) {
        const found = this.findAccountTreeNode(accountId, node.children);
        if (found) return found;
      }
    }
    return null;
  }

  getDisplayBalance(accountId: string): number {
    if (this.collapsedIds.has(accountId)) {
      const node = this.findAccountTreeNode(accountId);
      if (node) {
        return this.getSubtreeBalanceRecursive(node);
      }
    }
    return this.accountBalances.get(accountId) ?? 0;
  }

  formatDisplayBalance(accountId: string): string {
    return this.formatBalanceValue(this.getDisplayBalance(accountId));
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
    // Defer closing the menu to allow the click action to complete
    setTimeout(() => this.closeMenu(), 0);
  }

  openAddChildModal(parentAccountId: string): void {
    this.modalAccountId = null;
    this.modalParentAccountId = parentAccountId;
    this.showModal = true;
    // Defer closing the menu to allow the click action to complete
    setTimeout(() => this.closeMenu(), 0);
  }

  async deleteAccount(accountId: string): Promise<void> {
    this.closeMenu();

    const journalId = this.modelService.getSelectedJournalId();
    if (!journalId) return;

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

  hasChildren(account: FlattenedAccount): boolean {
    return account.children && account.children.length > 0;
  }
}
