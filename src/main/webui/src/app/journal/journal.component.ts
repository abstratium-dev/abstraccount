import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JournalApiService, AccountSummaryDTO, PostingDTO, AccountBalanceDTO } from './journal-api.service';

@Component({
  selector: 'journal',
  imports: [CommonModule, FormsModule],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss'
})
export class JournalComponent implements OnInit {
  accounts: AccountSummaryDTO[] = [];
  selectedAccount: string | null = null;
  postings: PostingDTO[] = [];
  balance: AccountBalanceDTO | null = null;
  loading = false;
  error: string | null = null;
  
  // Filters
  startDate: string = '';
  endDate: string = '';
  status: string = '';

  constructor(private journalApi: JournalApiService) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  loadAccounts(): void {
    this.loading = true;
    this.error = null;
    
    this.journalApi.getAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load accounts: ' + err.message;
        this.loading = false;
      }
    });
  }

  onAccountSelected(): void {
    if (this.selectedAccount) {
      this.loadPostings();
      this.loadBalance();
    } else {
      this.postings = [];
      this.balance = null;
    }
  }

  loadPostings(): void {
    if (!this.selectedAccount) return;
    
    this.loading = true;
    this.error = null;
    
    this.journalApi.getAccountPostings(
      this.selectedAccount,
      this.startDate || undefined,
      this.endDate || undefined,
      this.status || undefined
    ).subscribe({
      next: (postings) => {
        this.postings = postings;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load postings: ' + err.message;
        this.loading = false;
      }
    });
  }

  loadBalance(): void {
    if (!this.selectedAccount) return;
    
    this.journalApi.getAccountBalance(this.selectedAccount).subscribe({
      next: (balance) => {
        this.balance = balance;
      },
      error: (err) => {
        console.error('Failed to load balance:', err);
      }
    });
  }

  applyFilters(): void {
    this.loadPostings();
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.status = '';
    this.loadPostings();
  }

  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getBalanceString(): string {
    if (!this.balance || !this.balance.balances) return '';
    
    return Object.entries(this.balance.balances)
      .map(([commodity, amount]) => `${commodity} ${this.formatAmount(amount)}`)
      .join(', ');
  }
}
