import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Controller, CreateAccountRequest, UpdateAccountRequest, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';

@Component({
  selector: 'app-account-edit-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './account-edit-modal.component.html',
  styleUrls: ['./account-edit-modal.component.scss']
})
export class AccountEditModalComponent implements OnInit {
  @Input() accountId: string | null = null;
  @Input() parentAccountId: string | null = null; // For adding child accounts
  @Input() journalId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  controller = inject(Controller);
  modelService = inject(ModelService);

  isNew = true;
  isAddingChild = false;
  loading = false;
  error: string | null = null;

  // Form fields
  name: string = '';
  type: string = 'ASSET';
  note: string = '';
  accountOrder: number | null = null;
  selectedParentId: string | null = null;

  availableTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'CASH'];
  availableParents: AccountTreeNode[] = [];

  ngOnInit(): void {
    this.isNew = !this.accountId;
    this.isAddingChild = this.isNew && !!this.parentAccountId;
    this.selectedParentId = this.parentAccountId;
    
    this.loadAvailableParents();
    
    if (this.accountId) {
      this.loadAccount();
    } else if (this.parentAccountId) {
      // Set default type to parent's type when adding child
      this.setDefaultTypeFromParent();
    }
  }
  
  private setDefaultTypeFromParent(): void {
    if (!this.parentAccountId) return;
    
    const parent = this.modelService.findAccount(this.parentAccountId);
    if (parent) {
      this.type = parent.type;
    }
  }

  async loadAccount(): Promise<void> {
    if (!this.accountId) return;
    
    this.loading = true;
    this.error = null;
    
    try {
      const account = await this.controller.getAccountDetails(this.journalId, this.accountId);
      
      this.name = account.name;
      this.type = account.type;
      this.note = account.note || '';
      this.selectedParentId = account.parentId;
      
      this.loading = false;
    } catch (err: any) {
      this.error = 'Failed to load account: ' + err.message;
      this.loading = false;
    }
  }

  loadAvailableParents(): void {
    const accounts = this.modelService.getAccounts();
    this.availableParents = this.flattenAccounts(accounts);
    
    // Remove the current account from available parents (can't be its own parent)
    if (this.accountId) {
      this.availableParents = this.availableParents.filter(a => a.id !== this.accountId);
      
      // Also remove descendants (to prevent circular references)
      const descendants = this.getDescendants(this.accountId, accounts);
      this.availableParents = this.availableParents.filter(a => !descendants.includes(a.id));
    }
  }

  private flattenAccounts(accounts: AccountTreeNode[]): AccountTreeNode[] {
    const result: AccountTreeNode[] = [];
    
    const flatten = (nodes: AccountTreeNode[]) => {
      for (const node of nodes) {
        result.push(node);
        if (node.children && node.children.length > 0) {
          flatten(node.children);
        }
      }
    };
    
    flatten(accounts);
    return result;
  }

  private getDescendants(accountId: string, accounts: AccountTreeNode[]): string[] {
    const descendants: string[] = [];
    
    const findDescendants = (nodes: AccountTreeNode[]) => {
      for (const node of nodes) {
        if (node.id === accountId) {
          const collectIds = (n: AccountTreeNode) => {
            descendants.push(n.id);
            if (n.children) {
              n.children.forEach(collectIds);
            }
          };
          if (node.children) {
            node.children.forEach(collectIds);
          }
        } else if (node.children) {
          findDescendants(node.children);
        }
      }
    };
    
    findDescendants(accounts);
    return descendants;
  }

  getAccountPath(account: AccountTreeNode): string {
    const accounts = this.modelService.getAccounts();
    const path: string[] = [];
    
    const buildPath = (accountId: string): boolean => {
      const findAccount = (nodes: AccountTreeNode[]): AccountTreeNode | null => {
        for (const node of nodes) {
          if (node.id === accountId) return node;
          if (node.children) {
            const found = findAccount(node.children);
            if (found) return found;
          }
        }
        return null;
      };
      
      const acc = findAccount(accounts);
      if (!acc) return false;
      
      path.unshift(acc.name);
      if (acc.parentId) {
        buildPath(acc.parentId);
      }
      return true;
    };
    
    buildPath(account.id);
    return path.join(' > ');
  }

  async onSave(): Promise<void> {
    this.error = null;
    
    // Validation
    if (!this.name.trim()) {
      this.error = 'Account name is required';
      return;
    }
    
    this.loading = true;
    
    try {
      if (this.isNew) {
        const request: CreateAccountRequest = {
          name: this.name.trim(),
          type: this.type,
          note: this.note.trim() || null,
          parentAccountId: this.selectedParentId,
          journalId: this.journalId,
          accountOrder: this.accountOrder
        };
        
        await this.controller.createAccount(request);
      } else {
        const request: UpdateAccountRequest = {
          name: this.name.trim(),
          type: this.type,
          note: this.note.trim() || null,
          parentAccountId: this.selectedParentId,
          accountOrder: this.accountOrder
        };
        
        await this.controller.updateAccount(this.accountId!, this.journalId, request);
      }
      
      this.saved.emit();
      this.close.emit();
    } catch (err: any) {
      this.error = err.error || err.message || 'Failed to save account';
      this.loading = false;
    }
  }

  onCancel(): void {
    this.close.emit();
  }

  getModalTitle(): string {
    if (this.isAddingChild) {
      return 'Add Child Account';
    }
    return this.isNew ? 'Create New Account' : 'Edit Account';
  }
}
