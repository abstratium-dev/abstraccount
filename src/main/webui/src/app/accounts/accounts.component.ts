import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Controller, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';

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
  accountService = inject(AccountService); // Public so template can use it
  
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
}
