import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JournalApiService, AccountSummaryDTO, PostingDTO, AccountBalanceDTO, JournalMetadataDTO } from './journal-api.service';

interface GroupedTransaction {
  date: string;
  description: string;
  tags: string[];
  postings: PostingDTO[];
}

@Component({
  selector: 'journal',
  imports: [CommonModule, FormsModule],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss'
})
export class JournalComponent implements OnInit {
  journals: JournalMetadataDTO[] = [];
  selectedJournal: JournalMetadataDTO | null = null;
  postings: PostingDTO[] = [];
  groupedTransactions: GroupedTransaction[] = [];
  loading = false;
  error: string | null = null;
  
  // Filters
  startDate: string = '';
  endDate: string = '';
  status: string = '';

  constructor(private journalApi: JournalApiService) {}

  ngOnInit(): void {
    this.loadJournals();
  }

  loadJournals(): void {
    this.loading = true;
    this.error = null;
    
    this.journalApi.listJournals().subscribe({
      next: (journals) => {
        this.journals = journals;
        this.loading = false;
        // Auto-select if only one journal
        if (journals.length === 1) {
          this.selectedJournal = journals[0];
          this.onJournalSelected();
        }
      },
      error: (err) => {
        this.error = 'Failed to load journals: ' + err.message;
        this.loading = false;
      }
    });
  }

  onJournalSelected(): void {
    if (this.selectedJournal) {
      this.loadPostings();
    } else {
      this.postings = [];
    }
  }


  loadPostings(): void {
    if (!this.selectedJournal) return;
    
    this.loading = true;
    this.error = null;
    
    // Load all postings for the journal (no account filter)
    this.journalApi.getAllPostings(
      this.startDate || undefined,
      this.endDate || undefined,
      this.status || undefined
    ).subscribe({
      next: (postings) => {
        // Sort by date descending (newest first)
        this.postings = postings.sort((a, b) => 
          new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
        
        // Group postings by transaction
        this.groupedTransactions = this.groupPostingsByTransaction(this.postings);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load postings: ' + err.message;
        this.loading = false;
      }
    });
  }
  
  groupPostingsByTransaction(postings: PostingDTO[]): GroupedTransaction[] {
    const transactionMap = new Map<string, GroupedTransaction>();
    
    for (const posting of postings) {
      const key = `${posting.transactionDate}_${posting.transactionDescription}_${posting.transactionId || ''}`;
      
      if (!transactionMap.has(key)) {
        transactionMap.set(key, {
          date: posting.transactionDate,
          description: posting.transactionDescription,
          tags: [], // Tags would need to be added to PostingDTO if available
          postings: []
        });
      }
      
      transactionMap.get(key)!.postings.push(posting);
    }
    
    return Array.from(transactionMap.values());
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
  
  formatDateISO(dateString: string): string {
    // Return date in ISO format (YYYY-MM-DD)
    return dateString;
  }
  
  getShortAccountNumber(accountNumber: string): string {
    // Extract just the parent account number (first part before space or colon)
    const parts = accountNumber.split(/[\s:]/);
    return parts[0];
  }

}
