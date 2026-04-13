import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccountService } from '../account.service';
import { Controller, EntrySearchDTO, TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { FilterInputComponent } from '../journal/filter-input/filter-input.component';

@Component({
  selector: 'app-entry-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FilterInputComponent],
  templateUrl: './entry-search.component.html',
  styleUrls: ['./entry-search.component.scss']
})
export class EntrySearchComponent implements OnInit {
  entries: EntrySearchDTO[] = [];
  loading = false;
  error: string | null = null;
  filterString = '';
  tags: TagDTO[] = [];

  controller = inject(Controller);
  modelService = inject(ModelService);
  accountService = inject(AccountService);

  private lastJournalId: string | null = null;

  constructor() {
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      if (journalId && journalId !== this.lastJournalId) {
        this.lastJournalId = journalId;
        this.loadTags();
        this.loadEntries();
      }
    });
  }

  ngOnInit(): void {
    this.loadEntries();
  }

  async loadTags(): Promise<void> {
    const journalId = this.modelService.getSelectedJournalId();
    if (!journalId) return;
    try {
      this.tags = await this.controller.getTags(journalId);
    } catch (err) {
      console.error('Failed to load tags for entry search:', err);
    }
  }

  onFilterChange(filter: string): void {
    this.filterString = filter;
    this.loadEntries();
  }

  async loadEntries(): Promise<void> {
    this.loading = true;
    this.error = null;

    const selectedJournalId = this.modelService.getSelectedJournalId();
    if (!selectedJournalId) {
      this.error = 'No journal selected. Please select a journal from the header.';
      this.loading = false;
      return;
    }

    try {
      this.entries = await this.controller.getEntrySearchResults(
        selectedJournalId,
        undefined,
        this.filterString || undefined
      );
      this.loading = false;
    } catch (err: any) {
      const detail = err?.error?.message ?? err.message;
      this.error = 'Failed to load entries: ' + detail;
      this.loading = false;
    }
  }

  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  /**
   * Calculate totals per commodity from the current entries.
   * Returns a map of commodity code to formatted total.
   */
  getCommodityTotals(): Map<string, { total: number; formatted: string }> {
    const totals = new Map<string, number>();
    
    // Sum amounts by commodity
    for (const entry of this.entries) {
      const commodity = entry.entryCommodity || 'UNKNOWN';
      const current = totals.get(commodity) || 0;
      totals.set(commodity, current + entry.entryAmount);
    }
    
    // Format totals based on commodity display precision
    const formattedTotals = new Map<string, { total: number; formatted: string }>();
    const journals = this.modelService.journals$();
    const selectedJournalId = this.modelService.selectedJournalId$();
    const journal = journals.find(j => j.id === selectedJournalId);
    
    totals.forEach((total, commodity) => {
      let decimalPlaces = 2; // default
      
      if (journal && journal.commodities && journal.commodities[commodity]) {
        // Parse display precision like "1000.00" to get decimal places
        const precision = journal.commodities[commodity];
        const match = precision.match(/\.(\d+)$/);
        if (match) {
          decimalPlaces = match[1].length;
        }
      }
      
      formattedTotals.set(commodity, {
        total: total,
        formatted: total.toFixed(decimalPlaces)
      });
    });
    
    return formattedTotals;
  }

  /**
   * Returns true for account types with a debit normal balance (ASSET, EXPENSE, CASH).
   * For these types, positive amounts = debits and negative amounts = credits.
   * For credit-normal types (LIABILITY, EQUITY, REVENUE), the mapping is reversed.
   */
  isDebitNormal(accountType: string): boolean {
    const type = accountType?.toUpperCase();
    return type === 'ASSET' || type === 'EXPENSE' || type === 'CASH';
  }

  /**
   * Get the debit amount for display (always positive or zero).
   * Based on account type and entry amount polarity.
   */
  getDebitAmount(entry: EntrySearchDTO): number {
    const isDebitNormal = this.isDebitNormal(entry.accountType);
    const amount = entry.entryAmount;
    
    if (isDebitNormal) {
      // Debit-normal: positive amounts are debits
      return amount > 0 ? amount : 0;
    } else {
      // Credit-normal: negative amounts are debits (decreases the account)
      return amount < 0 ? Math.abs(amount) : 0;
    }
  }

  /**
   * Get the credit amount for display (always positive or zero).
   * Based on account type and entry amount polarity.
   */
  getCreditAmount(entry: EntrySearchDTO): number {
    const isDebitNormal = this.isDebitNormal(entry.accountType);
    const amount = entry.entryAmount;
    
    if (isDebitNormal) {
      // Debit-normal: negative amounts are credits
      return amount < 0 ? Math.abs(amount) : 0;
    } else {
      // Credit-normal: positive amounts are credits
      return amount > 0 ? amount : 0;
    }
  }

  /**
   * Calculate total debits and credits across all entries, grouped by commodity.
   */
  getDebitCreditTotals(): Map<string, { debits: number; credits: number; net: number }> {
    const totals = new Map<string, { debits: number; credits: number; net: number }>();
    
    for (const entry of this.entries) {
      const commodity = entry.entryCommodity || 'UNKNOWN';
      const current = totals.get(commodity) || { debits: 0, credits: 0, net: 0 };
      
      const debit = this.getDebitAmount(entry);
      const credit = this.getCreditAmount(entry);
      
      totals.set(commodity, {
        debits: current.debits + debit,
        credits: current.credits + credit,
        net: current.net + entry.entryAmount
      });
    }
    
    return totals;
  }

  getTagsDisplay(tags: any[]): string {
    if (!tags || tags.length === 0) return '';
    // Sort tags alphabetically by key, then by value
    const sortedTags = [...tags].sort((a, b) => {
      const keyCompare = a.key.localeCompare(b.key);
      if (keyCompare !== 0) return keyCompare;
      const aVal = a.value || '';
      const bVal = b.value || '';
      return aVal.localeCompare(bVal);
    });
    return sortedTags.map(tag => {
      const val = tag.value;
      // Show just key for null, undefined, empty string, or literal "null"/"undefined" strings
      const isSimple = val === null || val === undefined || val === '' ||
                       val === 'null' || val === 'undefined';
      return isSimple ? tag.key : `${tag.key}:${val}`;
    }).join('\n');
  }

  abbreviateAccountType(type: string): string {
    const map: Record<string, string> = {
      ASSET: 'As', LIABILITY: 'Li', EQUITY: 'Eq',
      REVENUE: 'Re', EXPENSE: 'Ex', CASH: 'Ca'
    };
    return map[type] ?? type.substring(0, 2);
  }

  abbreviateStatus(status: string): string {
    const map: Record<string, string> = {
      CLEARED: 'Cl', PENDING: 'Pe', VOID: 'Vo'
    };
    return map[status] ?? status.substring(0, 2);
  }

  getSelectedJournalName(): string {
    const selectedJournalId = this.modelService.selectedJournalId$();
    if (!selectedJournalId) return 'None';
    
    const journals = this.modelService.journals$();
    const journal = journals.find(j => j.id === selectedJournalId);
    return journal ? journal.title : selectedJournalId;
  }
}
