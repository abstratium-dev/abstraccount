import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Controller } from '../controller';
import { ModelService } from '../model.service';

export interface AccountTreeNode {
  id: string;
  name: string;
  type: string;
  note: string | null;
  children: AccountTreeNode[];
}

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss'
})
export class AccountsComponent implements OnInit {
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  
  accounts: AccountTreeNode[] = [];
  loading = false;
  error: string | null = null;

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
      
      this.accounts = await this.controller.getAccountTree(journalId);
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

  extractAccountNumber(name: string): string {
    // Extract the leading number from account name for display purposes only
    // "1 Assets" -> "1"
    // "100 Bank" -> "100"
    // "2210.001 Person" -> "2210.001"
    const match = name.match(/^(\d+(?:\.\d+)?)\s/);
    return match ? match[1] : '';
  }

  buildHierarchicalPath(account: AccountTreeNode, allAccounts: AccountTreeNode[]): Array<{number: string, id: string}> {
    // Build path from root to this account with numbers and IDs
    const path: Array<{number: string, id: string}> = [];
    
    // Find parent chain
    const findParents = (acc: AccountTreeNode): AccountTreeNode[] => {
      const parents: AccountTreeNode[] = [];
      const findInTree = (nodes: AccountTreeNode[], targetId: string): AccountTreeNode | null => {
        for (const node of nodes) {
          if (node.id === targetId) return node;
          if (node.children) {
            const found = findInTree(node.children, targetId);
            if (found) return found;
          }
        }
        return null;
      };
      
      let current: AccountTreeNode | null = acc;
      while (current) {
        parents.unshift(current);
        // Find parent by looking for node that has current as child
        let parentFound: AccountTreeNode | null = null;
        for (const root of allAccounts) {
          const checkNode = (node: AccountTreeNode): boolean => {
            if (node.children) {
              for (const child of node.children) {
                if (child.id === current!.id) {
                  parentFound = node;
                  return true;
                }
                if (checkNode(child)) return true;
              }
            }
            return false;
          };
          if (checkNode(root)) break;
        }
        current = parentFound;
      }
      return parents;
    };
    
    const parents = findParents(account);
    for (const parent of parents) {
      const number = this.extractAccountNumber(parent.name);
      if (number) {
        path.push({ number, id: parent.id });
      }
    }
    
    return path;
  }
}
