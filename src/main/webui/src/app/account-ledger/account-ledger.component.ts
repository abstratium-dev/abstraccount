import { Component, OnInit, inject, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Controller, AccountEntryDTO, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

@Component({
  selector: 'app-account-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-ledger.component.html',
  styleUrl: './account-ledger.component.scss'
})
export class AccountLedgerComponent implements OnInit, AfterViewInit {
  @ViewChild('balanceChart') balanceChartRef!: ElementRef<HTMLCanvasElement>;
  
  private controller = inject(Controller);
  private modelService = inject(ModelService);
  private route = inject(ActivatedRoute);
  
  accountId: string = '';
  account: AccountTreeNode | null = null;
  entries: AccountEntryDTO[] = [];
  loading = false;
  error: string | null = null;
  chart: Chart | null = null;
  includeChildren = true; // Default to showing all children
  
  get currentBalance(): number {
    // Current balance is the last entry (newest)
    return this.entries.length > 0 ? this.entries[this.entries.length - 1].runningBalance : 0;
  }
  
  get reversedEntries(): AccountEntryDTO[] {
    // Display newest first, but keep original array in chronological order
    return [...this.entries].reverse();
  }
  
  async onIncludeChildrenChange() {
    // Reload entries when checkbox changes
    await this.loadEntries();
  }

  async ngOnInit() {
    this.accountId = this.route.snapshot.paramMap.get('accountId') || '';
    await this.loadAccountDetails();
    await this.loadEntries();
  }
  
  async loadAccountDetails() {
    try {
      const journalId = this.modelService.getSelectedJournalId();
      if (!journalId) {
        this.error = 'No journal selected';
        return;
      }
      
      this.account = await this.controller.getAccountDetails(journalId, this.accountId);
    } catch (error) {
      console.error('Error loading account details:', error);
      this.error = 'Failed to load account details';
    }
  }

  ngAfterViewInit() {
    if (this.entries.length > 0) {
      this.createChart();
    }
  }

  async loadEntries() {
    this.loading = true;
    this.error = null;
    
    try {
      const journalId = this.modelService.getSelectedJournalId();
      if (!journalId) {
        this.error = 'No journal selected';
        return;
      }
      
      // Keep entries in chronological order (oldest first) for correct running balance calculation
      this.entries = await this.controller.getAccountEntries(journalId, this.accountId, this.includeChildren);
      
      // After entries are loaded, create chart after view updates
      setTimeout(() => {
        if (this.balanceChartRef) {
          this.createChart();
        }
      }, 0);
    } catch (error) {
      console.error('Error loading entries:', error);
      this.error = 'Failed to load entries';
    } finally {
      this.loading = false;
    }
  }

  createChart() {
    if (!this.balanceChartRef || this.entries.length === 0) {
      return;
    }

    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.balanceChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    // Entries are already in chronological order (oldest first)
    const labels = this.entries.map(e => e.transactionDate);
    const data = this.entries.map(e => e.runningBalance);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Balance',
          data: data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0 // Straight lines, not curved
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: this.account ? `${this.account.name} - Balance Over Time` : 'Balance Over Time'
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'month',
              displayFormats: {
                month: 'MMM yyyy'
              }
            },
            ticks: {
              major: {
                enabled: true
              }
            }
          },
          y: {
            beginAtZero: false
          }
        }
      }
    });
  }
}
