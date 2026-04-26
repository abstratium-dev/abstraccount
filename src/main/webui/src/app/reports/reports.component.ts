import { Component, inject, OnInit, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Controller, ReportTemplate, AccountEntryDTO, AccountTreeNode, TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';
import { ReportConfig, ReportSection, ReportSectionResult, AccountSummary, PartnerSummary } from './reporting-types';
import { createReportingContext, groupEntriesByAccount } from './reporting-context';
import { FilterInputComponent } from '../journal/filter-input/filter-input.component';

@Component({
  selector: 'reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FilterInputComponent],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
})
export class ReportsComponent implements OnInit {
  private controller = inject(Controller);
  modelService = inject(ModelService);
  accountService = inject(AccountService);

  readonly netIncomeLabel = 'Net Income';

  templates: Signal<ReportTemplate[]> = this.modelService.reportTemplates$;
  selectedJournalId: Signal<string | null> = this.modelService.selectedJournalId$;
  selectedTemplateId: string | null = null;
  selectedTemplate: ReportTemplate | null = null;
  
  loading = false;
  error: string | null = null;
  
  // Report data
  entries: AccountEntryDTO[] = [];
  reportSections: ReportSectionResult[] = [];
  tags: TagDTO[] = [];
  
  // Filters
  filterText: string = '';
  startDate: string | null = null;
  endDate: string | null = null;
  
  // Display options
  hideZeroBalances = true;

  // Expose Math to template
  Math = Math;

  private readonly STORAGE_KEY = 'abstraccount:reports';
  private readonly GLOBAL_EQL_KEY = 'abstraccount:globalEql';

  constructor() {
    // React to changes in selected journal
    effect(() => {
      const journalId = this.selectedJournalId();
      if (journalId) {
        this.onJournalChange(journalId);
      }
    });
  }

  async ngOnInit() {
    this.loadFromStorage();

    // Load the global EQL filter from storage so it's available before generating report
    this.loadGlobalEql();

    await this.loadTemplates();

    // If we have a stored template ID, select it after templates load
    if (this.selectedTemplateId) {
      const templateExists = this.templates().some(t => t.id === this.selectedTemplateId);
      if (templateExists) {
        await this.onTemplateSelect();
      }
    }
  }

  private loadGlobalEql(): void {
    try {
      const stored = localStorage.getItem(this.GLOBAL_EQL_KEY);
      if (stored !== null) {
        this.filterText = stored;
        this.parseFilter(stored);
      }
    } catch (e) {
      console.error('Failed to load global EQL:', e);
    }
  }

  private async onJournalChange(journalId: string) {
    // Load tags for the new journal
    try {
      this.tags = await this.controller.getTags(journalId);
    } catch (err) {
      console.error('Failed to load tags:', err);
      this.tags = [];
    }

    // Regenerate the report if a template is selected
    if (this.selectedTemplate) {
      await this.generateReport();
    }
  }

  async loadTemplates() {
    this.loading = true;
    this.error = null;
    
    try {
      await this.controller.listReportTemplates();
    } catch (error) {
      console.error('Error loading report templates:', error);
      this.error = 'Failed to load report templates';
    } finally {
      this.loading = false;
    }
  }

  async onTemplateSelect() {
    this.saveToStorage();

    if (!this.selectedTemplateId) {
      this.selectedTemplate = null;
      this.reportSections = [];
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      this.selectedTemplate = await this.controller.getReportTemplate(this.selectedTemplateId);
      await this.generateReport();
    } catch (error) {
      console.error('Error loading template:', error);
      this.error = 'Failed to load template';
    } finally {
      this.loading = false;
    }
  }

  // ===== LOCAL STORAGE PERSISTENCE =====

  /** @internal for testing */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      const data = JSON.parse(stored);

      if (data.selectedTemplateId !== undefined) {
        this.selectedTemplateId = data.selectedTemplateId;
      }
      if (data.hideZeroBalances !== undefined) {
        this.hideZeroBalances = data.hideZeroBalances;
      }
    } catch (e) {
      console.error('Failed to load reports state from localStorage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        selectedTemplateId: this.selectedTemplateId,
        hideZeroBalances: this.hideZeroBalances
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save reports state to localStorage:', e);
    }
  }

  onFilterChange(filter: string) {
    this.filterText = filter;
    this.parseFilter(filter);
    this.generateReport();
  }

  private parseFilter(filter: string) {
    // Parse begin: and end: from filter text
    const beginMatch = filter.match(/begin:(\d{8})/);
    const endMatch = filter.match(/end:(\d{8})/);
    
    if (beginMatch) {
      const dateStr = beginMatch[1];
      this.startDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    } else {
      this.startDate = null;
    }
    
    if (endMatch) {
      const dateStr = endMatch[1];
      this.endDate = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    } else {
      this.endDate = null;
    }
  }

  async generateReport() {
    if (!this.selectedTemplate) {
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      const journalId = this.modelService.getSelectedJournalId();
      if (!journalId) {
        this.error = 'No journal selected';
        return;
      }

      // Load all entries for the selected journal with filters
      this.entries = await this.controller.getEntriesForReport(
        journalId,
        this.startDate || undefined,
        this.endDate || undefined,
        undefined, // accountTypes
        this.filterText || undefined
      );
      
      // Load account tree and tags
      const accounts = await this.controller.getAccountTree(journalId);
      this.tags = await this.controller.getTags(journalId);

      // Create reporting context
      const context = createReportingContext(
        this.entries,
        accounts,
        this.startDate || null,
        this.endDate || null
      );

      // Parse template configuration
      const config: ReportConfig = JSON.parse(this.selectedTemplate.templateContent);

      // Process each section
      this.reportSections = [];
      for (const section of config.sections) {
        const sectionResult = this.processSection(section, context, accounts);
        this.reportSections.push(sectionResult);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      this.error = 'Failed to generate report';
    } finally {
      this.loading = false;
    }
  }

  private groupEntriesByPartner(entries: AccountEntryDTO[], accounts: AccountTreeNode[], sortColumn?: string, sortDirection?: 'asc' | 'desc'): PartnerSummary[] {
    // Filter out entries without partners
    const entriesWithPartners = entries.filter(e => e.partnerId);
    
    // Group by partner
    const partnerMap = new Map<string, { income: number; expenses: number; transactionIds: Set<string> }>();
    
    // Create account type lookup
    const accountTypeMap = new Map<string, string>();
    const addToMap = (node: AccountTreeNode) => {
      accountTypeMap.set(node.id, node.type);
      node.children.forEach(addToMap);
    };
    accounts.forEach(addToMap);
    
    for (const entry of entriesWithPartners) {
      const partnerId = entry.partnerId!;
      const accountType = accountTypeMap.get(entry.accountId) || 'UNKNOWN';
      
      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, { income: 0, expenses: 0, transactionIds: new Set() });
      }
      
      const partnerData = partnerMap.get(partnerId)!;
      partnerData.transactionIds.add(entry.transactionId);
      
      if (accountType === 'REVENUE') {
        // Revenue is stored as negative, so negate it for income
        partnerData.income += -entry.amount;
      } else if (accountType === 'EXPENSE') {
        partnerData.expenses += entry.amount;
      }
    }
    
    // Convert to array and calculate net
    const result: PartnerSummary[] = [];
    for (const [partnerId, data] of partnerMap.entries()) {
      // Find an entry with this partnerId to get the partnerName
      const entryWithPartner = entriesWithPartners.find(e => e.partnerId === partnerId);
      const partnerName = entryWithPartner?.partnerName || partnerId;
      
      result.push({
        partnerId,
        partnerName,
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
        transactionCount: data.transactionIds.size
      });
    }
    
    // Apply sorting
    this.sortPartners(result, sortColumn || 'partnerName', sortDirection || 'asc');
    
    return result;
  }

  private processSection(
    section: ReportSection,
    context: any,
    accounts: AccountTreeNode[]
  ): ReportSectionResult {
    let accountSummaries: AccountSummary[] = [];
    let partnerSummaries: PartnerSummary[] | undefined = undefined;
    let subtotal = 0;
    let commodity = 'CHF'; // Default commodity

    // Extract commodity from entries if available
    if (this.entries.length > 0) {
      commodity = this.entries[0].commodity;
    }

    if (section.groupByPartner) {
      // Group entries by partner with default sorting
      const sortColumn = section.defaultSortColumn || 'partnerName';
      const sortDirection = section.defaultSortDirection || 'asc';
      partnerSummaries = this.groupEntriesByPartner(this.entries, accounts, sortColumn, sortDirection);
      
      // Filter out partners with zero activity if requested
      if (this.hideZeroBalances) {
        partnerSummaries = partnerSummaries.filter(p => !(p.income === 0 && p.expenses === 0 && p.net === 0));
      }
      
      subtotal = partnerSummaries.reduce((sum, p) => sum + p.net, 0);
    } else if (section.calculated === 'netIncome') {
      // Special case for net income
      subtotal = context.netIncome;
    } else if (section.calculated === 'totalAssets') {
      // Special case for total assets
      subtotal = context.totalAssets;
    } else if (section.accountRegex) {
      // Filter entries by account regex pattern
      const sectionEntries = context.getEntriesByAccountRegex(section.accountRegex);
      
      // Group by account
      accountSummaries = groupEntriesByAccount(
        sectionEntries,
        accounts,
        section.invertSign || false
      );

      // Filter out zero balances if requested
      if (this.hideZeroBalances) {
        accountSummaries = accountSummaries.filter(acc => acc.balance !== 0);
      }

      // Calculate subtotal
      subtotal = accountSummaries.reduce((sum, acc) => sum + acc.balance, 0);

      // Add net income if requested
      if (section.includeNetIncome && context.netIncome !== 0) {
        // Add net income as a visible line item (using raw value)
        accountSummaries.push({
          accountId: 'net-income',
          accountName: this.netIncomeLabel,
          accountType: 'EQUITY',
          balance: context.netIncome,  // Use raw value, invert at display time
          debit: 0,
          credit: 0
        });
        subtotal += context.netIncome;
      }
    } else if (section.accountTypes && section.accountTypes.length > 0) {
      // Filter entries by account types
      const sectionEntries = context.getEntriesByAccountTypes(section.accountTypes);
      
      // Group by account
      accountSummaries = groupEntriesByAccount(
        sectionEntries,
        accounts,
        section.invertSign || false
      );

      // Filter out zero balances if requested
      if (this.hideZeroBalances) {
        accountSummaries = accountSummaries.filter(acc => acc.balance !== 0);
      }

      // Calculate subtotal
      subtotal = accountSummaries.reduce((sum, acc) => sum + acc.balance, 0);

      // Add net income if requested
      if (section.includeNetIncome && context.netIncome !== 0) {
        // Add net income as a visible line item (using raw value)
        accountSummaries.push({
          accountId: 'net-income',
          accountName: this.netIncomeLabel,
          accountType: 'EQUITY',
          balance: context.netIncome,  // Use raw value, invert at display time
          debit: 0,
          credit: 0
        });
        subtotal += context.netIncome;
      }
    }

    return {
      title: section.title,
      level: section.level || 3,
      accounts: accountSummaries,
      partners: partnerSummaries,
      subtotal,
      commodity,
      showDebitsCredits: section.showDebitsCredits || false,
      showAccounts: section.showAccounts !== false, // Default to true
      groupByPartner: section.groupByPartner || false,
      invertSign: section.invertSign || false,  // Pass through for display-time inversion
      sortable: section.sortable || false,
      sortColumn: section.defaultSortColumn || null,
      sortDirection: section.defaultSortDirection || 'asc'
    };
  }

  /**
   * Apply sign inversion for display if needed
   */
  applyDisplaySign(value: number, invertSign: boolean): number {
    return invertSign ? -value : value;
  }

  onHideZeroBalancesChange(): void {
    this.saveToStorage();
    this.generateReport();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value === 0 ? 0 : value);
  }

  formatCurrencyWithCommodity(value: number, commodity: string): string {
    return `${this.formatCurrency(value)} ${commodity}`;
  }

  getNetIncomeLabel(value: number): string {
    if (value < 0) {
      return this.netIncomeLabel;
    }
    return 'Net Loss';
  }

  getTotalIncome(partners: PartnerSummary[]): number {
    return partners.reduce((sum, p) => sum + p.income, 0);
  }

  getTotalExpenses(partners: PartnerSummary[]): number {
    return partners.reduce((sum, p) => sum + p.expenses, 0);
  }

  getTotalTransactions(partners: PartnerSummary[]): number {
    return partners.reduce((sum, p) => sum + p.transactionCount, 0);
  }

  /**
   * Sort partners by the specified column
   */
  private sortPartners(partners: PartnerSummary[], column: string, direction: 'asc' | 'desc') {
    partners.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (column) {
        case 'partnerName':
          aVal = a.partnerName;
          bVal = b.partnerName;
          break;
        case 'income':
          aVal = a.income;
          bVal = b.income;
          break;
        case 'expenses':
          aVal = a.expenses;
          bVal = b.expenses;
          break;
        case 'net':
          aVal = a.net;
          bVal = b.net;
          break;
        case 'transactionCount':
          aVal = a.transactionCount;
          bVal = b.transactionCount;
          break;
        default:
          aVal = a.partnerName;
          bVal = b.partnerName;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return direction === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aVal - bVal;
        return direction === 'asc' ? comparison : -comparison;
      }
    });
  }

  /**
   * Handle column header click for sorting
   */
  onColumnSort(sectionIndex: number, column: string) {
    const section = this.reportSections[sectionIndex];
    if (!section.sortable) {
      return;
    }

    // Toggle sort direction if clicking the same column
    if (section.sortColumn === column) {
      section.sortDirection = section.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      section.sortColumn = column;
      section.sortDirection = 'asc';
    }

    // Re-sort the data
    if (section.partners) {
      this.sortPartners(section.partners, section.sortColumn, section.sortDirection);
    }
  }

  /**
   * Get sort indicator for column header
   */
  getSortIndicator(section: ReportSectionResult, column: string): string {
    if (!section.sortable || section.sortColumn !== column) {
      return '';
    }
    return section.sortDirection === 'asc' ? ' ▲' : ' ▼';
  }
}
