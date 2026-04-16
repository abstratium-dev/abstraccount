import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, effect, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { AccountEntryDTO, AccountTreeNode, Controller, TagDTO } from '../controller';
import { AccountService } from '../account.service';
import { ModelService } from '../model.service';

Chart.register(...registerables);

@Component({
  selector: 'app-account-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account-ledger.component.html',
  styleUrl: './account-ledger.component.scss'
})
export class AccountLedgerComponent implements OnInit, AfterViewInit {
  @ViewChild('balanceChart') balanceChartRef!: ElementRef<HTMLCanvasElement>;
  
  private controller = inject(Controller);
  modelService = inject(ModelService);
  accountService = inject(AccountService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  accountId: string = '';
  account: AccountTreeNode | null = null;
  entries: AccountEntryDTO[] = [];
  loading = false;
  error: string | null = null;
  chart: Chart | null = null;
  includeChildren = true; // Default to showing all children
  accountNamesToRoot: string[] = [];
  
  get currentBalance(): number {
    // Current balance is the first entry (newest)
    return this.entries.length > 0 ? this.entries[0].runningBalance : 0;
  }

  /**
   * Returns true for account types with a debit normal balance (ASSET, EXPENSE, CASH).
   * For these types, positive amounts = debits and negative amounts = credits.
   * For credit-normal types (LIABILITY, EQUITY, REVENUE), the mapping is reversed.
   */
  get isDebitNormal(): boolean {
    const type = this.account?.type?.toUpperCase();
    return type === 'ASSET' || type === 'EXPENSE' || type === 'CASH';
  }

  /** Label for the sum of positive amounts (increases the account value). */
  get positiveAmountLabel(): string {
    return this.isDebitNormal ? 'Total Debits' : 'Total Credits';
  }

  /** Label for the sum of negative amounts (decreases the account value). */
  get negativeAmountLabel(): string {
    return this.isDebitNormal ? 'Total Credits' : 'Total Debits';
  }

  /** Sum of all positive entry amounts. */
  get totalPositiveAmount(): number {
    return this.entries.reduce((sum, e) => e.amount > 0 ? sum + e.amount : sum, 0);
  }

  /** Sum of all negative entry amounts (returned as a positive number for display). */
  get totalNegativeAmount(): number {
    return this.entries.reduce((sum, e) => e.amount < 0 ? sum + Math.abs(e.amount) : sum, 0);
  }

  get reversedEntries(): AccountEntryDTO[] {
    // they are already sorted in reverse order by the server
    return this.entries;
  }

  constructor() {
    // Subscribe to route parameter changes to handle navigation between different accounts
    // Note: ActivatedRoute observables are automatically cleaned up by Angular, but we use
    // takeUntilDestroyed() to make this explicit and follow best practices
    this.route.paramMap.pipe(
      takeUntilDestroyed()
    ).subscribe(params => {
      const newAccountId = params.get('accountId') || '';
      if (newAccountId && newAccountId !== this.accountId) {
        console.log('[AccountLedgerComponent]: Route param changed from', this.accountId, 'to', newAccountId);
        this.accountId = newAccountId;
        this.reload();
      } else if (newAccountId && !this.accountId) {
        // Initial load
        console.log('[AccountLedgerComponent]: Initial load with accountId', newAccountId);
        this.accountId = newAccountId;
        this.reload();
      }
    });

    // Watch for selected journal changes and reload account data so that we can determine
    // if the account still exists in the new journal
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      if (journalId && this.accountId) {
        const pathBefore = [...this.accountNamesToRoot];
        console.log('[AccountLedgerComponent]: Journal changed, accountId', this.accountId, 'pathBefore', pathBefore.map(name => name.substring(0, name.length > 5 ? 5 : name.length) + (name.length > 5 ? '...' : '')));
        this.reload().then(() => {
          let account = this.modelService.findAccount(this.accountId);
          if(!account) {
            console.log('[AccountLedgerComponent]: Account not found by id, more than '
              + 'likely that the journal changed and we now need to use the path of '
              + 'names to find the equivalent account');
            account = this.modelService.findAccountByFullPath(pathBefore);
            if (account) {
              console.log('[AccountLedgerComponent]: Account found by path; navigating since accountId has changed from ' + this.accountId + ' to ' + account.id);
              this.router.navigate(['/account', account.id, 'ledger']);
            } else {
              console.log('[AccountLedgerComponent]: Account not found by path either, navigating to journal');
              this.router.navigate(['/journal']);
            }
          } else {
            console.info('[AccountLedgerComponent]: Account found by id');
          }
        });
      }
    });
  }

  ngOnInit() {
  }

  async reload() {
    console.log('[AccountLedgerComponent]: Reloading account ' + this.accountId);
    await Promise.all([
      this.loadAccountDetails(),
      this.loadEntries()
    ]);
    this.setFullPathToRoot();
  }

  private setFullPathToRoot() {
    // calculate the full path from the given account up to the root
    this.accountNamesToRoot = [];
    let currentAccountId = this.accountId;
    while (currentAccountId) {
      const account = this.modelService.findAccount(currentAccountId);
      if (account) {
        this.accountNamesToRoot.unshift(account.name);
        currentAccountId = account.parentId || '';
      } else {
        break;
      }
    }
  }
  

  async onIncludeChildrenChange() {
    // Reload entries when checkbox changes
    await this.loadEntries();
  }

  getAccountName(accountId: string): string {
    const account = this.modelService.findAccount(accountId);
    return account ? account.name : accountId;
  }

  navigateToJournalWithTag(tag: TagDTO): void {
    const token = tag.value ? `tag:${tag.key}:${tag.value}` : `tag:${tag.key}`;
    try {
      localStorage.setItem('abstraccount:globalEql', token);
    } catch (e) {
      // ignore
    }
    this.router.navigate(['/journal']);
  }

  navigateToJournalWithPartner(partnerId: string): void {
    try {
      localStorage.setItem('abstraccount:globalEql', `partner:${partnerId}`);
    } catch (e) {
      // ignore
    }
    this.router.navigate(['/journal']);
  }

  getPartnerDisplay(partnerId: string | null, partnerName: string | null): string {
    if (!partnerId) return '';
    if (partnerName) return `${partnerId} - ${partnerName}`;
    return partnerId;
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
