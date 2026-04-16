import { CommonModule, KeyValuePipe } from '@angular/common';
import { AfterViewInit, Component, NgZone, effect, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { AccountService } from '../account.service';
import { Controller, EntrySearchDTO } from '../controller';
import type { TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { FilterInputComponent } from '../journal/filter-input/filter-input.component';

Chart.register(...registerables);

export type PivotDimensionId =
  | 'accountType'
  | 'account'
  | 'transaction'
  | 'calendarWeek'
  | 'month'
  | 'quarter'
  | 'year'
  | 'tagKey'
  | 'commodity'
  | 'transactionStatus'
  | 'partner';

export interface PivotDimensionDef {
  id: PivotDimensionId;
  label: string;
  requiresTagKey?: boolean;
}

export interface PivotAmounts {
  debits: number;
  credits: number;
  net: number;
}

export interface PivotSubGroup {
  label: string;
  amounts: PivotAmounts;
}

export interface PivotCell {
  rowKey: string;
  colKey: string;
  totals: PivotAmounts;
  subGroups: PivotSubGroup[];
}

export interface PivotTable {
  rowKeys: string[];
  colKeys: string[];
  cells: Map<string, PivotCell>;
  rowTotals: Map<string, PivotAmounts>;
  colTotals: Map<string, PivotAmounts>;
  grandTotal: PivotAmounts;
  // Representative entries for each dimension key (for linking)
  rowRepresentatives: Map<string, EntrySearchDTO>;
  colRepresentatives: Map<string, EntrySearchDTO>;
  // Group representative for each sub-group label within a cell
  cellGroupRepresentatives: Map<string, Map<string, EntrySearchDTO>>;
}

export interface PivotConfig {
  rowDimension: PivotDimensionId;
  colDimension: PivotDimensionId;
  groupByDimension: PivotDimensionId | 'none';
  tagKeyForRows: string;
  tagKeyForCols: string;
  tagKeyForGroup: string;
  yAxisMin: number | null;
  yAxisMax: number | null;
}

export interface SavedSearchConfig {
  name: string;
  filterString: string;
  pivotConfig: PivotConfig;
  showPivot: boolean;
  showPivotChart?: boolean;
  showEntries: boolean;
  showFilters: boolean;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-entry-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FilterInputComponent, KeyValuePipe],
  templateUrl: './entry-search.component.html',
  styleUrls: ['./entry-search.component.scss']
})
export class EntrySearchComponent implements OnInit, AfterViewInit {
  @ViewChild('pivotChart') pivotChartRef!: ElementRef<HTMLCanvasElement>;

  entries: EntrySearchDTO[] = [];
  loading = false;
  error: string | null = null;
  // Filter — pre-load from storage so the effect and FilterInputComponent agree on the initial value
  filterString = (() => {
    try { return localStorage.getItem('abstraccount:globalEql') ?? ''; } catch { return ''; }
  })();
  private filterInitialized = false;
  tags: TagDTO[] = [];

  showPivot = false;
  pivotTable: PivotTable | null = null;

  showEntries = true;
  showFilters = true;
  showPivotChart = false;

  private chart: Chart | null = null;

  pivotConfig: PivotConfig = {
    rowDimension: 'accountType',
    colDimension: 'month',
    groupByDimension: 'none',
    tagKeyForRows: '',
    tagKeyForCols: '',
    tagKeyForGroup: '',
    yAxisMin: null,
    yAxisMax: null,
  };

  readonly pivotDimensions: PivotDimensionDef[] = [
    { id: 'accountType',       label: 'Account Type' },
    { id: 'account',           label: 'Account' },
    { id: 'transaction',      label: 'Transaction' },
    { id: 'calendarWeek',      label: 'Calendar Week' },
    { id: 'month',             label: 'Month' },
    { id: 'quarter',           label: 'Quarter' },
    { id: 'year',              label: 'Year' },
    { id: 'tagKey',            label: 'Tag (key)', requiresTagKey: true },
    { id: 'commodity',         label: 'Commodity' },
    { id: 'transactionStatus', label: 'Transaction Status' },
    { id: 'partner',           label: 'Partner' },
  ];

  private readonly STORAGE_KEY = 'abstraccount:entrySearch';
  private readonly SAVED_CONFIGS_KEY = 'abstraccount:entrySearch.savedConfigs';

  savedConfigs: SavedSearchConfig[] = [];
  currentConfigName: string | null = null;
  newConfigName = '';

  controller = inject(Controller);
  modelService = inject(ModelService);
  accountService = inject(AccountService);
  private ngZone = inject(NgZone);
  private router = inject(Router);

  private lastJournalId: string | null = null;

  constructor() {
    effect(() => {
      const journalId = this.modelService.selectedJournalId$();
      if (journalId && journalId !== this.lastJournalId) {
        this.lastJournalId = journalId;
        this.loadTags();
        if (this.filterInitialized) {
          this.loadEntries();
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadFromStorage();
    this.loadSavedConfigs();
    // If FilterInputComponent had nothing in localStorage it will not emit filterChange,
    // so we must trigger the initial load ourselves.
    if (!this.filterInitialized) {
      this.filterInitialized = true;
      setTimeout(() => this.loadEntries());
    }
  }

  ngAfterViewInit(): void {
    if (this.showPivotChart && this.pivotTable) {
      this.createPivotChart();
    }
  }

  // ===== SAVED CONFIGURATIONS =====

  loadSavedConfigs(): void {
    try {
      const stored = localStorage.getItem(this.SAVED_CONFIGS_KEY);
      if (stored) {
        this.savedConfigs = JSON.parse(stored);
      } else {
        this.savedConfigs = [];
      }
    } catch (e) {
      console.error('Failed to load saved configs:', e);
      this.savedConfigs = [];
    }
  }

  private saveConfigsList(): void {
    try {
      localStorage.setItem(this.SAVED_CONFIGS_KEY, JSON.stringify(this.savedConfigs));
    } catch (e) {
      console.error('Failed to save configs list:', e);
    }
  }

  saveAsNewConfig(name: string): void {
    if (!name.trim()) return;
    const trimmedName = name.trim();

    const existingIndex = this.savedConfigs.findIndex(c => c.name === trimmedName);
    const now = new Date().toISOString();
    const newConfig: SavedSearchConfig = {
      name: trimmedName,
      filterString: this.filterString,
      pivotConfig: { ...this.pivotConfig },
      showPivot: this.showPivot,
      showPivotChart: this.showPivotChart,
      showEntries: this.showEntries,
      showFilters: this.showFilters,
      createdAt: now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      if (!confirm(`Configuration "${trimmedName}" already exists. Overwrite?`)) {
        return;
      }
      this.savedConfigs[existingIndex] = newConfig;
    } else {
      this.savedConfigs.push(newConfig);
    }

    this.saveConfigsList();
    this.currentConfigName = trimmedName;
    this.newConfigName = '';
  }

  async loadConfig(name: string): Promise<void> {
    const config = this.savedConfigs.find(c => c.name === name);
    if (!config) return;

    this.filterString = config.filterString;
    this.pivotConfig = { ...config.pivotConfig };
    this.showPivot = config.showPivot;
    this.showPivotChart = config.showPivotChart ?? false;
    this.showEntries = config.showEntries;
    this.showFilters = config.showFilters;
    this.currentConfigName = config.name;

    this.saveToStorage();
    await this.loadEntries();
    if (this.showPivot) {
      this.pivotTable = this.buildPivot();
      if (this.showPivotChart) {
        setTimeout(() => this.createPivotChart(), 0);
      }
    }
  }

  updateCurrentConfig(): void {
    if (!this.currentConfigName) return;

    const index = this.savedConfigs.findIndex(c => c.name === this.currentConfigName);
    if (index < 0) return;

    this.savedConfigs[index] = {
      ...this.savedConfigs[index],
      filterString: this.filterString,
      pivotConfig: { ...this.pivotConfig },
      showPivot: this.showPivot,
      showPivotChart: this.showPivotChart,
      showEntries: this.showEntries,
      showFilters: this.showFilters,
      updatedAt: new Date().toISOString()
    };

    this.saveConfigsList();
  }

  deleteConfig(name: string): void {
    if (!confirm(`Delete configuration "${name}"?`)) {
      return;
    }

    this.savedConfigs = this.savedConfigs.filter(c => c.name !== name);
    this.saveConfigsList();

    if (this.currentConfigName === name) {
      this.currentConfigName = null;
    }
  }

  clearConfigSelection(): void {
    this.currentConfigName = null;
    this.newConfigName = '';
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
      // Rebuild pivot if visible to reflect new filtered entries
      if (this.showPivot) {
        this.pivotTable = this.buildPivot();
        if (this.showPivotChart) {
          setTimeout(() => this.createPivotChart(), 0);
        }
      }
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

  getTagKeysForDimension(): string[] {
    const keys = new Set<string>();
    for (const entry of this.entries) {
      for (const tag of entry.transactionTags ?? []) {
        if (tag.key) keys.add(tag.key);
      }
    }
    return Array.from(keys).sort();
  }

  getDimensionLabel(dimId: PivotDimensionId | 'none'): string {
    if (dimId === 'none') return 'None (simple sum)';
    return this.pivotDimensions.find(d => d.id === dimId)?.label ?? dimId;
  }

  private getISOWeek(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  extractDimensionValue(entry: EntrySearchDTO, dimId: PivotDimensionId, tagKey: string): string {
    const date = new Date(entry.transactionDate);
    switch (dimId) {
      case 'accountType':
        return entry.accountType || '(none)';
      case 'account':
        return entry.accountName || entry.accountId;
      case 'transaction':
        return entry.transactionId;
      case 'calendarWeek':
        return this.getISOWeek(date);
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter': {
        const q = Math.ceil((date.getMonth() + 1) / 3);
        return `${date.getFullYear()}-Q${q}`;
      }
      case 'year':
        return String(date.getFullYear());
      case 'tagKey': {
        const match = entry.transactionTags?.find(t => t.key === tagKey);
        return match ? (match.value ?? tagKey) : '(none)';
      }
      case 'commodity':
        return entry.entryCommodity || '(none)';
      case 'transactionStatus':
        return entry.transactionStatus || '(none)';
      case 'partner':
        return entry.transactionPartnerName || entry.transactionPartnerId || '(none)';
      default:
        return '(unknown)';
    }
  }

  buildPivot(): PivotTable {
    const cfg = this.pivotConfig;
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const cellMap = new Map<string, { totals: PivotAmounts; groups: Map<string, PivotAmounts> }>();
    // Track representatives for linking
    const rowRepresentatives = new Map<string, EntrySearchDTO>();
    const colRepresentatives = new Map<string, EntrySearchDTO>();
    const cellGroupRepresentatives = new Map<string, Map<string, EntrySearchDTO>>();

    for (const entry of this.entries) {
      const rowKey = this.extractDimensionValue(entry, cfg.rowDimension, cfg.tagKeyForRows);
      const colKey = this.extractDimensionValue(entry, cfg.colDimension, cfg.tagKeyForCols);
      const cellKey = `${rowKey}||${colKey}`;

      rowSet.add(rowKey);
      colSet.add(colKey);

      // Store first entry as representative for this row/col key
      if (!rowRepresentatives.has(rowKey)) rowRepresentatives.set(rowKey, entry);
      if (!colRepresentatives.has(colKey)) colRepresentatives.set(colKey, entry);

      const debit = this.getDebitAmount(entry);
      const credit = this.getCreditAmount(entry);
      const net = entry.entryAmount;

      if (!cellMap.has(cellKey)) {
        cellMap.set(cellKey, { totals: { debits: 0, credits: 0, net: 0 }, groups: new Map() });
        cellGroupRepresentatives.set(cellKey, new Map());
      }
      const cell = cellMap.get(cellKey)!;
      const groupReps = cellGroupRepresentatives.get(cellKey)!;
      cell.totals.debits += debit;
      cell.totals.credits += credit;
      cell.totals.net += net;

      if (cfg.groupByDimension !== 'none') {
        const groupKey = this.extractDimensionValue(entry, cfg.groupByDimension, cfg.tagKeyForGroup);
        if (!cell.groups.has(groupKey)) {
          cell.groups.set(groupKey, { debits: 0, credits: 0, net: 0 });
        }
        // Store first entry as representative for this group within this cell
        if (!groupReps.has(groupKey)) groupReps.set(groupKey, entry);
        const g = cell.groups.get(groupKey)!;
        g.debits += debit;
        g.credits += credit;
        g.net += net;
      }
    }

    const rowKeys = Array.from(rowSet).sort();
    const colKeys = Array.from(colSet).sort();

    const cells = new Map<string, PivotCell>();
    for (const [cellKey, raw] of cellMap) {
      const [rowKey, colKey] = cellKey.split('||');
      const subGroups: PivotSubGroup[] = Array.from(raw.groups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([label, amounts]) => ({ label, amounts }));
      cells.set(cellKey, { rowKey, colKey, totals: raw.totals, subGroups });
    }

    const rowTotals = new Map<string, PivotAmounts>();
    for (const rowKey of rowKeys) {
      const agg: PivotAmounts = { debits: 0, credits: 0, net: 0 };
      for (const colKey of colKeys) {
        const c = cells.get(`${rowKey}||${colKey}`);
        if (c) { agg.debits += c.totals.debits; agg.credits += c.totals.credits; agg.net += c.totals.net; }
      }
      rowTotals.set(rowKey, agg);
    }

    const colTotals = new Map<string, PivotAmounts>();
    for (const colKey of colKeys) {
      const agg: PivotAmounts = { debits: 0, credits: 0, net: 0 };
      for (const rowKey of rowKeys) {
        const c = cells.get(`${rowKey}||${colKey}`);
        if (c) { agg.debits += c.totals.debits; agg.credits += c.totals.credits; agg.net += c.totals.net; }
      }
      colTotals.set(colKey, agg);
    }

    const grandTotal: PivotAmounts = { debits: 0, credits: 0, net: 0 };
    for (const a of rowTotals.values()) {
      grandTotal.debits += a.debits;
      grandTotal.credits += a.credits;
      grandTotal.net += a.net;
    }

    return { rowKeys, colKeys, cells, rowTotals, colTotals, grandTotal, rowRepresentatives, colRepresentatives, cellGroupRepresentatives };
  }

  getPivotCell(rowKey: string, colKey: string): PivotCell | null {
    return this.pivotTable?.cells.get(`${rowKey}||${colKey}`) ?? null;
  }

  getRowRepresentative(rowKey: string): EntrySearchDTO | null {
    return this.pivotTable?.rowRepresentatives.get(rowKey) ?? null;
  }

  getColRepresentative(colKey: string): EntrySearchDTO | null {
    return this.pivotTable?.colRepresentatives.get(colKey) ?? null;
  }

  /**
   * Returns the display label for a pivot dimension key.
   * For 'transaction', shows the description instead of the raw ID.
   */
  getDimensionDisplayLabel(dimId: PivotDimensionId, key: string, representative: EntrySearchDTO | null): string {
    if (dimId === 'transaction') {
      return representative?.transactionDescription || key;
    }
    return key;
  }

  getGroupRepresentative(rowKey: string, colKey: string, groupLabel: string): EntrySearchDTO | null {
    const cellKey = `${rowKey}||${colKey}`;
    return this.pivotTable?.cellGroupRepresentatives.get(cellKey)?.get(groupLabel) ?? null;
  }

  /**
   * Build hierarchical path for an account using the representative entry.
   * Returns array of {id, number} for parent accounts, excluding the leaf.
   */
  buildAccountPathForEntry(entry: EntrySearchDTO | null): Array<{id: string; number: string}> {
    if (!entry) return [];
    return this.accountService.buildHierarchicalPath(entry.accountId, this.modelService.accounts$());
  }

  /**
   * Extract account number from accountName (e.g., "1100 Cash" -> "1100").
   */
  getAccountNumber(accountName: string): string {
    if (!accountName) return '';
    const spaceIdx = accountName.indexOf(' ');
    return spaceIdx > 0 ? accountName.substring(0, spaceIdx) : accountName;
  }

  /**
   * Extract account display name from accountName (e.g., "1100 Cash" -> "Cash").
   */
  getAccountDisplayName(accountName: string): string {
    if (!accountName) return '';
    const spaceIdx = accountName.indexOf(' ');
    return spaceIdx > 0 ? accountName.substring(spaceIdx) : accountName;
  }

  // ===== LOCAL STORAGE PERSISTENCE =====

  /** @internal for testing */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      const data = JSON.parse(stored);

      if (data.showEntries !== undefined) {
        this.showEntries = data.showEntries;
      }
      if (data.showFilters !== undefined) {
        this.showFilters = data.showFilters;
      }
      if (data.showPivot !== undefined) {
        this.showPivot = data.showPivot;
      }
      if (data.pivotConfig) {
        this.pivotConfig = { ...this.pivotConfig, ...data.pivotConfig };
      }
      if (data.showPivotChart !== undefined) {
        this.showPivotChart = data.showPivotChart;
      }
    } catch (e) {
      console.error('Failed to load entry search state from localStorage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        showEntries: this.showEntries,
        showFilters: this.showFilters,
        showPivot: this.showPivot,
        showPivotChart: this.showPivotChart,
        pivotConfig: this.pivotConfig
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save entry search state to localStorage:', e);
    }
  }

  onFilterChange(filter: string): void {
    this.filterString = filter;
    this.filterInitialized = true;
    setTimeout(() => this.loadEntries());
  }

  navigateToJournalWithPartner(partnerId: string): void {
    try {
      localStorage.setItem('abstraccount:globalEql', `partner:${partnerId}`);
    } catch (e) {
      // ignore
    }
    this.router.navigate(['/journal']);
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

  toggleEntries(): void {
    this.showEntries = !this.showEntries;
    this.saveToStorage();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.saveToStorage();
  }

  togglePivot(): void {
    this.showPivot = !this.showPivot;
    this.saveToStorage();
    if (this.showPivot) {
      this.pivotTable = this.buildPivot();
      if (this.showPivotChart) {
        setTimeout(() => this.createPivotChart(), 0);
      }
    } else {
      this.destroyPivotChart();
      this.showPivotChart = false;
      this.saveToStorage();
    }
  }

  onPivotConfigChange(): void {
    this.saveToStorage();
    if (this.showPivot) {
      this.pivotTable = this.buildPivot();
      if (this.showPivotChart) {
        setTimeout(() => this.createPivotChart(), 0);
      }
    }
  }

  // ===== PIVOT CHART =====

  togglePivotChart(): void {
    this.showPivotChart = !this.showPivotChart;
    this.saveToStorage();
    if (this.showPivotChart && this.pivotTable) {
      setTimeout(() => this.createPivotChart(), 0);
    }
  }

  private destroyPivotChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  createPivotChart(): void {
    if (!this.pivotChartRef || !this.pivotTable) {
      return;
    }

    this.destroyPivotChart();

    const ctx = this.pivotChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.pivotTable.colKeys;
    const rowKeys = this.pivotTable.rowKeys;

    // Generate distinct colors for each row line
    const colors = this.generateChartColors(rowKeys.length);

    // Build datasets - one per row, plus a total line
    const rowDatasets = rowKeys.map((rowKey, index) => {
      const data = labels.map(colKey => {
        const cell = this.pivotTable!.cells.get(`${rowKey}||${colKey}`);
        return cell ? cell.totals.net : 0;
      });

      return {
        label: rowKey,
        data,
        borderColor: colors[index],
        backgroundColor: colors[index] + '20', // Add transparency
        tension: 0.1,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6
      };
    });

    // Add total dataset showing column totals
    const totalData = labels.map(colKey => {
      const colTotal = this.pivotTable!.colTotals.get(colKey);
      return colTotal ? colTotal.net : 0;
    });

    const totalDataset = {
      label: 'Total',
      data: totalData,
      borderColor: 'rgb(0, 0, 0)',
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderWidth: 3,
      tension: 0.1,
      fill: false,
      pointRadius: 5,
      pointHoverRadius: 7,
      order: -1 // Ensure total renders on top
    };

    const datasets = [totalDataset, ...rowDatasets];

    const chartTitle = `${this.getDimensionLabel(this.pivotConfig.rowDimension)} vs ${this.getDimensionLabel(this.pivotConfig.colDimension)} - Net Balance`;
    const xAxisLabel = this.getDimensionLabel(this.pivotConfig.colDimension);
    const yMin = this.pivotConfig.yAxisMin !== null ? this.pivotConfig.yAxisMin : undefined;
    const yMax = this.pivotConfig.yAxisMax !== null ? this.pivotConfig.yAxisMax : undefined;

    // Run outside Angular zone so Chart.js resize observers don't trigger change detection
    this.ngZone.runOutsideAngular(() => {
      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: chartTitle
            },
            legend: {
              display: true,
              position: 'right',
              labels: {
                boxWidth: 12,
                font: {
                  size: 11
                }
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context) => {
                  const value = context.parsed.y as number;
                  return `${context.dataset.label}: ${value.toFixed(2)}`;
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: xAxisLabel
              }
            },
            y: {
              beginAtZero: false,
              min: yMin,
              max: yMax,
              title: {
                display: true,
                text: 'Net Balance'
              }
            }
          },
          interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
          }
        }
      });
    });
  }

  private generateChartColors(count: number): string[] {
    const baseColors = [
      'rgb(75, 192, 192)',   // teal
      'rgb(255, 99, 132)',   // red
      'rgb(54, 162, 235)',   // blue
      'rgb(255, 206, 86)',   // yellow
      'rgb(153, 102, 255)',  // purple
      'rgb(255, 159, 64)',   // orange
      'rgb(199, 199, 199)',  // gray
      'rgb(83, 102, 255)',   // indigo
      'rgb(255, 99, 255)',   // pink
      'rgb(99, 255, 132)',   // green
      'rgb(255, 180, 0)',    // gold
      'rgb(0, 128, 128)',    // dark cyan
    ];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }
}
