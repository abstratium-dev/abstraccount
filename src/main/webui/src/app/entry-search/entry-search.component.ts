import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Controller, EntrySearchDTO, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';
import { AutocompleteComponent, AutocompleteOption } from '../core/autocomplete/autocomplete.component';

@Component({
  selector: 'app-entry-search',
  standalone: true,
  imports: [CommonModule, FormsModule, AutocompleteComponent],
  templateUrl: './entry-search.component.html',
  styleUrls: ['./entry-search.component.scss']
})
export class EntrySearchComponent implements OnInit {
  entries: EntrySearchDTO[] = [];
  loading = false;
  error: string | null = null;
  
  // Filter fields (journalId is taken from modelService, not from filters)
  filters = {
    accountIdOrPattern: '', // Can be account ID or regex pattern
    transactionId: '',
    startDate: '',
    endDate: '',
    partnerId: '',
    status: '',
    commodity: '',
    minAmount: undefined as number | undefined,
    maxAmount: undefined as number | undefined,
    accountType: ''
  };
  
  includeChildAccounts = false;
  selectedAccountId: string | null = null;
  selectedTags: Array<{spec: string; isNegation: boolean}> = [];
  selectedPartnerId: string | null = null;
  tagNegationMode = false;
  
  controller = inject(Controller);
  modelService = inject(ModelService);
  accountService = inject(AccountService);

  private lastJournalId: string | null = null;

  constructor() {
    // Watch for journal selection changes and reload entries
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      // Only reload if journal actually changed
      if (journalId && journalId !== this.lastJournalId) {
        this.lastJournalId = journalId;
        this.loadEntries();
      }
    });
  }

  ngOnInit(): void {
    this.loadEntries();
  }

  /**
   * Fetch partner options for autocomplete based on search term.
   */
  fetchPartnerOptions = async (searchTerm: string): Promise<AutocompleteOption[]> => {
    try {
      const partners = await this.controller.searchPartners(searchTerm);
      return partners.map(p => ({
        value: p.partnerNumber,
        label: `${p.partnerNumber} - ${p.name}`
      }));
    } catch (error) {
      console.error('Error fetching partner options:', error);
      return [];
    }
  };

  /**
   * Handle partner selection from autocomplete.
   */
  onPartnerSelected(option: AutocompleteOption | null): void {
    this.selectedPartnerId = option ? option.value : null;
    this.filters.partnerId = this.selectedPartnerId || '';
  }

  /**
   * Fetch tag options for autocomplete based on search term.
   */
  fetchTagOptions = async (searchTerm: string): Promise<AutocompleteOption[]> => {
    const journalId = this.modelService.selectedJournalId$();
    if (!journalId) {
      return [];
    }

    try {
      // Get all tags from the backend
      const allTags = await this.controller.getEntrySearchTags(journalId);
      
      // Build regex pattern with implicit wildcards unless user specifies anchors
      let pattern = searchTerm;
      if (searchTerm && !searchTerm.startsWith('^') && !searchTerm.endsWith('$')) {
        // Add implicit wildcards
        const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = '.*' + escapedTerm + '.*';
      } else if (searchTerm) {
        // User specified anchors, escape everything except ^ and $
        pattern = searchTerm.replace(/[.*+?{}()|[\]\\]/g, (match) => {
          return match === '^' || match === '$' ? match : '\\' + match;
        });
      }

      // Filter tags by pattern
      const regex = new RegExp(pattern, 'i');
      const matchingTags = allTags.filter(tag => regex.test(tag));
      
      // Limit to first 50 results
      return matchingTags.slice(0, 50).map(tag => ({
        value: tag,
        label: tag
      }));
    } catch (error) {
      console.error('Error fetching tag options:', error);
      return [];
    }
  };

  /**
   * Handle tag selection from autocomplete - adds to the chips list.
   */
  onTagSelected(option: AutocompleteOption | null): void {
    if (option && option.value) {
      this.addTagSpec(option.value);
    }
  }

  /**
   * Handle free text tag entry - allows regex patterns.
   */
  onTagFreeTextEntered(text: string): void {
    if (text && text.trim()) {
      this.addTagSpec(text.trim());
    }
  }

  /**
   * Add a tag specification to the selected tags list.
   */
  private addTagSpec(tagValue: string): void {
    const tagSpec = this.tagNegationMode ? `not:${tagValue}` : tagValue;
    // Avoid duplicates
    if (!this.selectedTags.some(t => t.spec === tagSpec)) {
      this.selectedTags.push({
        spec: tagSpec,
        isNegation: this.tagNegationMode
      });
      this.loadEntries();
    }
  }

  /**
   * Remove a tag from the selected tags list.
   */
  removeTag(index: number): void {
    this.selectedTags.splice(index, 1);
    this.loadEntries();
  }

  /**
   * Clear all selected tags.
   */
  clearAllTags(): void {
    this.selectedTags = [];
    this.loadEntries();
  }

  /**
   * Toggle negation mode for tag selection.
   */
  toggleTagNegationMode(): void {
    this.tagNegationMode = !this.tagNegationMode;
  }

  /**
   * Get display label for a tag spec.
   */
  getTagDisplay(tag: {spec: string; isNegation: boolean}): string {
    if (tag.isNegation) {
      return `NOT ${tag.spec.substring(4)}`; // Remove 'not:' prefix for display
    }
    return tag.spec;
  }

  /**
   * Fetch account options for autocomplete.
   * Supports regex matching against account ID or full path.
   * Automatically adds wildcards unless ^ or $ are used.
   */
  fetchAccountOptions = async (searchTerm: string): Promise<AutocompleteOption[]> => {
    const accounts = this.modelService.getAccounts();
    const options: AutocompleteOption[] = [];
    
    if (!searchTerm || searchTerm.trim() === '') {
      // Return all accounts if no search term
      const collectAll = (nodes: AccountTreeNode[]) => {
        for (const account of nodes) {
          const path = this.accountService.buildHierarchicalPath(account.id, accounts);
          const fullPath = path.map(p => p.name).join(' : ');
          options.push({
            value: account.id,
            label: `${account.id} - ${fullPath}`
          });
          if (account.children && account.children.length > 0) {
            collectAll(account.children);
          }
        }
      };
      collectAll(accounts);
      options.sort((a, b) => a.label.localeCompare(b.label));
      return options.slice(0, 50); // Limit to 50 results
    }
    
    // Build regex from search term (case insensitive)
    let regexPattern = searchTerm;
    
    // Check if user explicitly used ^ or $
    const hasStartAnchor = regexPattern.startsWith('^');
    const hasEndAnchor = regexPattern.endsWith('$');
    
    // If no anchors, add implicit wildcards for partial matching
    if (!hasStartAnchor && !hasEndAnchor) {
      // Escape special regex chars except ^ and $
      regexPattern = regexPattern.replace(/[.*+?{}()|[\]\\]/g, '\\$&');
      // Add implicit wildcards
      regexPattern = '.*' + regexPattern + '.*';
    } else {
      // User used anchors, escape other special chars but keep ^ and $
      regexPattern = regexPattern.replace(/[.*+?{}()|[\]\\]/g, '\\$&');
      // Restore the anchors
      if (hasStartAnchor) {
        regexPattern = '^' + regexPattern.substring(2); // Remove escaped ^
      }
      if (hasEndAnchor) {
        regexPattern = regexPattern.substring(0, regexPattern.length - 2) + '$'; // Remove escaped $
      }
    }
    
    let regex: RegExp;
    try {
      regex = new RegExp(regexPattern, 'i');
    } catch (e) {
      // If invalid regex, escape everything and try again
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp('.*' + escaped + '.*', 'i');
    }
    
    // Recursively search through account tree
    const searchAccounts = (nodes: AccountTreeNode[]) => {
      for (const account of nodes) {
        const path = this.accountService.buildHierarchicalPath(account.id, accounts);
        const fullPath = path.map(p => p.name).join(' : ');
        
        // Match against account ID or full path
        if (regex.test(account.id) || regex.test(fullPath)) {
          options.push({
            value: account.id,
            label: `${account.id} - ${fullPath}`
          });
        }
        
        // Search children
        if (account.children && account.children.length > 0) {
          searchAccounts(account.children);
        }
      }
    };
    
    searchAccounts(accounts);
    
    // Sort by label
    options.sort((a, b) => a.label.localeCompare(b.label));
    
    return options;
  }

  onAccountSelected(option: AutocompleteOption | null): void {
    if (option) {
      this.selectedAccountId = option.value;
      this.filters.accountIdOrPattern = option.value;
    } else {
      this.selectedAccountId = null;
      this.filters.accountIdOrPattern = '';
    }
    this.loadEntries();
  }

  async loadEntries(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      // Get selected journal from model service
      const selectedJournalId = this.modelService.getSelectedJournalId();
      
      if (!selectedJournalId) {
        this.error = 'No journal selected. Please select a journal from the header.';
        this.loading = false;
        return;
      }
      
      // Build filter object with only non-empty values
      const activeFilters: any = {
        journalId: selectedJournalId
      };
      
      // Handle account filtering
      if (this.selectedAccountId) {
        // Use the selected account ID from autocomplete
        const accountIds = this.getAccountIdsForFilter(this.selectedAccountId);
        if (accountIds.length > 0) {
          // Backend expects accountId as a single value, so we'll filter client-side if multiple
          if (accountIds.length === 1) {
            activeFilters.accountId = accountIds[0];
          } else {
            // Will filter client-side after fetching
            activeFilters._clientFilterAccountIds = accountIds;
          }
        }
      }
      
      // Add other filters
      Object.entries(this.filters).forEach(([key, value]) => {
        if (key !== 'accountIdOrPattern' && value !== '' && value !== undefined) {
          activeFilters[key] = value;
        }
      });
      
      // Add tag filters as list
      if (this.selectedTags.length > 0) {
        activeFilters.tagList = this.selectedTags.map(t => t.spec);
      }
      
      console.log('Entry search filters:', activeFilters);
      let entries = await this.controller.getEntrySearchResults(activeFilters);
      console.log('Entries received:', entries.length);
      
      // Client-side filtering for multiple account IDs
      if (activeFilters._clientFilterAccountIds) {
        const accountIds = activeFilters._clientFilterAccountIds;
        entries = entries.filter(entry => accountIds.includes(entry.accountId));
      }
      
      this.entries = entries;
      this.loading = false;
    } catch (err: any) {
      this.error = 'Failed to load entries: ' + err.message;
      this.loading = false;
    }
  }

  /**
   * Get list of account IDs to filter by, including children if checkbox is selected
   */
  private getAccountIdsForFilter(accountIdOrPattern: string): string[] {
    const accounts = this.modelService.getAccounts();
    const accountIds: string[] = [];
    
    // If it's a direct account ID match
    const account = this.accountService.findAccountById(accountIdOrPattern, accounts);
    if (account) {
      accountIds.push(account.id);
      
      // Include children if checkbox is selected
      if (this.includeChildAccounts) {
        this.collectChildAccountIds(account, accountIds);
      }
    }
    
    return accountIds;
  }

  /**
   * Recursively collect all child account IDs
   */
  private collectChildAccountIds(account: AccountTreeNode, accountIds: string[]): void {
    if (account.children) {
      for (const child of account.children) {
        accountIds.push(child.id);
        this.collectChildAccountIds(child, accountIds);
      }
    }
  }

  clearFilters(): void {
    this.filters = {
      accountIdOrPattern: '',
      transactionId: '',
      startDate: '',
      endDate: '',
      partnerId: '',
      status: '',
      commodity: '',
      minAmount: undefined,
      maxAmount: undefined,
      accountType: ''
    };
    this.selectedAccountId = null;
    this.selectedTags = [];
    this.tagNegationMode = false;
    this.selectedPartnerId = null;
    this.includeChildAccounts = false;
    this.loadEntries();
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
    }).join(', ');
  }

  getSelectedJournalName(): string {
    const selectedJournalId = this.modelService.selectedJournalId$();
    if (!selectedJournalId) return 'None';
    
    const journals = this.modelService.journals$();
    const journal = journals.find(j => j.id === selectedJournalId);
    return journal ? journal.title : selectedJournalId;
  }
}
