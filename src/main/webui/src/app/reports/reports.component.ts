import { Component, inject, OnInit, Signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Controller, ReportTemplate, AccountEntryDTO, AccountTreeNode, TagDTO, TransactionDTO } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';
import { ReportConfig, ReportSection, ReportSectionResult, AccountSummary, PartnerSummary, TagGroup } from './reporting-types';
import { createReportingContext, groupEntriesByAccount, groupTransactionsByTag } from './reporting-context';
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
  transactions: TransactionDTO[] = [];
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

      // Parse template configuration first to check if we need journal chain
      const config: ReportConfig = JSON.parse(this.selectedTemplate.templateContent);
      
      // Check if any section requires loading from the entire journal chain
      const useJournalChain = config.sections.some(s => s.useJournalChain);
      
      let accounts: AccountTreeNode[];
      
      if (useJournalChain) {
        // Load ALL journals first to ensure we have the complete chain
        const allJournals = await this.controller.listJournals();
        console.log('Loaded all journals:', allJournals.length, allJournals.map(j => ({ id: j.id, previous: j.previousJournalId })));
        
        // Get all journals in the chain
        const chainIds = this.getJournalChainIds(journalId, allJournals);
        console.log('Report loading for journal chain:', chainIds);

        // Load and merge account trees from ALL journals in the chain
        // (account UUIDs are different when journals are copied)
        accounts = await this.loadAndMergeAccountsFromChain(chainIds);
        console.log('Loaded merged accounts from chain:', accounts.length);
        
        // Load tags from all journals in the chain
        this.tags = await this.loadTagsFromChain(chainIds);
        console.log('Loaded tags from chain:', this.tags.length);

        // Load transactions from entire journal chain
        this.transactions = await this.loadTransactionsFromChain(chainIds, allJournals);
      } else {
        // Standard: load only from current journal
        console.log('Report loading for current journal only:', journalId);
        
        accounts = await this.controller.getAccountTree(journalId);
        console.log('Loaded accounts from current journal:', accounts.length);
        
        this.tags = await this.controller.getTags(journalId);
        console.log('Loaded tags from current journal:', this.tags.length);
        
        this.transactions = await this.controller.getTransactions(
          journalId,
          this.startDate || undefined,
          this.endDate || undefined,
          undefined,
          undefined,
          this.filterText || undefined
        );
        console.log('Loaded transactions from current journal:', this.transactions.length);
      }
      
      // For entries, flatten from all transactions
      this.entries = this.flattenEntriesFromTransactions(this.transactions);

      // Create reporting context
      const context = createReportingContext(
        this.entries,
        accounts,
        this.startDate || null,
        this.endDate || null
      );

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

  /**
   * Loads transactions from all journals in the chain.
   */
  private async loadTransactionsFromChain(chainIds: string[], journals: any[]): Promise<TransactionDTO[]> {
    // Build a map of journal IDs to titles (journal has 'title' field, not 'name')
    const journalMap = new Map(journals.map(j => [j.id, j.title || j.id]));
    
    // Load transactions from all journals in the chain
    const allTransactions: TransactionDTO[] = [];
    for (const id of chainIds) {
      try {
        console.log(`Loading transactions for journal ${id}...`);
        const txs = await this.controller.getTransactions(
          id,
          this.startDate || undefined,
          this.endDate || undefined,
          undefined,
          undefined,
          this.filterText || undefined
        );
        console.log(`Loaded ${txs.length} transactions from journal ${id}`);
        
        // Add journal info to each transaction
        const journalName = journalMap.get(id) || id;
        for (const tx of txs) {
          tx.journalId = id;
          tx.journalName = journalName;
        }
        
        allTransactions.push(...txs);
      } catch (err) {
        console.error(`Failed to load transactions for journal ${id}:`, err);
      }
    }
    
    console.log(`Total transactions loaded: ${allTransactions.length}`);
    return allTransactions;
  }

  /**
   * Gets all journal IDs in the chain from the root to the starting journal.
   * Walks backwards to find the root, then builds the chain from root to current.
   */
  private getJournalChainIds(startingJournalId: string, journals: any[]): string[] {
    console.log('getJournalChainIds input:', { startingJournalId, journalCount: journals.length, journals: journals.map(j => ({ id: j.id, previousJournalId: j.previousJournalId })) });
    
    const byId = new Map(journals.map(j => [j.id, j]));
    const byPrevId = new Map(journals.filter(j => j.previousJournalId).map(j => [j.previousJournalId, j]));
    
    console.log('byId keys:', Array.from(byId.keys()));
    console.log('byPrevId keys:', Array.from(byPrevId.keys()));
    
    // First, walk backwards to find the root (ultimate ancestor)
    const visited = new Set<string>();
    let currentId: string | null = startingJournalId;
    let iterations = 0;
    
    while (currentId && !visited.has(currentId) && iterations < 100) {
      visited.add(currentId);
      const journal = byId.get(currentId);
      console.log(`Walking backwards: currentId=${currentId}, found journal=${!!journal}, previousJournalId=${journal?.previousJournalId}`);
      currentId = journal?.previousJournalId || null;
      iterations++;
    }
    
    const visitedArray = Array.from(visited);
    console.log('Visited set after backwards walk:', visitedArray);
    
    // Find the root (the earliest ancestor - last journal visited in backwards walk)
    // When walking backwards from current journal, the last one visited is the root
    let rootId: string | null = visitedArray[visitedArray.length - 1] || null;
    
    // Verify: root should have no previousJournalId
    const rootJournal = rootId ? byId.get(rootId) : null;
    if (rootJournal?.previousJournalId) {
      // If the last visited still has a parent, something is wrong - fall back to starting journal
      console.warn('Last visited journal still has parent, using starting journal as root');
      rootId = startingJournalId;
    }
    
    console.log('Root ID found:', rootId);
    
    // If no root found, use the starting journal
    if (!rootId) {
      rootId = startingJournalId;
    }
    
    // Walk forward from root to build the chain in chronological order
    const chainIds: string[] = [];
    const forwardVisited = new Set<string>();
    currentId = rootId;
    iterations = 0;
    
    while (currentId && !forwardVisited.has(currentId) && iterations < 100) {
      chainIds.push(currentId);
      forwardVisited.add(currentId);
      // Find the next journal (the one that has currentId as its previousJournalId)
      const nextJournal = journals.find(j => j.previousJournalId === currentId);
      console.log(`Walking forward: currentId=${currentId}, nextJournal found=${!!nextJournal}, nextId=${nextJournal?.id}`);
      currentId = nextJournal?.id || null;
      iterations++;
    }
    
    console.log('Final chainIds:', chainIds);
    return chainIds;
  }

  /**
   * Loads tags from all journals in the chain.
   */
  private async loadTagsFromChain(chainIds: string[]): Promise<TagDTO[]> {
    const allTags: TagDTO[] = [];
    const seenKeys = new Set<string>();
    
    for (const journalId of chainIds) {
      try {
        const tags = await this.controller.getTags(journalId);
        for (const tag of tags) {
          const tagKey = `${tag.key}:${tag.value}`;
          if (!seenKeys.has(tagKey)) {
            seenKeys.add(tagKey);
            allTags.push(tag);
          }
        }
      } catch (err) {
        console.error(`Failed to load tags for journal ${journalId}:`, err);
      }
    }
    
    return allTags;
  }

  /**
   * Flattens entries from transactions into AccountEntryDTO array.
   */
  private flattenEntriesFromTransactions(transactions: TransactionDTO[]): AccountEntryDTO[] {
    const entries: AccountEntryDTO[] = [];
    
    for (const tx of transactions) {
      for (const entry of tx.entries) {
        entries.push({
          entryId: entry.id,
          transactionId: tx.id,
          transactionDate: tx.date,
          description: tx.description,
          commodity: entry.commodity,
          amount: entry.amount,
          runningBalance: 0,
          note: entry.note,
          accountId: entry.accountId,
          partnerId: tx.partnerId,
          partnerName: tx.partnerName,
          status: tx.status,
          tags: tx.tags ?? []
        });
      }
    }
    
    return entries;
  }

  /**
   * Loads account trees from all journals in the chain and merges them.
   * Since account UUIDs are different when journals are copied, we need all trees
   * to properly look up account types and build hierarchical paths.
   */
  private async loadAndMergeAccountsFromChain(chainIds: string[]): Promise<AccountTreeNode[]> {
    const allAccounts: AccountTreeNode[] = [];
    const seenIds = new Set<string>();
    
    for (const journalId of chainIds) {
      try {
        const accounts = await this.controller.getAccountTree(journalId);
        console.log(`Loaded ${accounts.length} accounts from journal ${journalId}`);
        for (const account of accounts) {
          if (!seenIds.has(account.id)) {
            seenIds.add(account.id);
            allAccounts.push(account);
          }
        }
      } catch (err) {
        console.error(`Failed to load accounts for journal ${journalId}:`, err);
      }
    }
    
    return allAccounts;
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
    let tagGroups: TagGroup[] | undefined = undefined;
    let subtotal = 0;
    let commodity = 'CHF'; // Default commodity

    // Extract commodity from entries if available
    if (this.entries.length > 0) {
      commodity = this.entries[0].commodity;
    }

    if (section.calculated === 'tagGrouped' && section.tagKey) {
      // Tag grouped report - group transactions by tag value
      console.log('Processing tagGrouped section:', {
        tagKey: section.tagKey,
        tagValuePrefix: section.tagValuePrefix,
        transactionCount: this.transactions.length
      });
      tagGroups = groupTransactionsByTag(
        this.transactions,
        section.tagKey,
        section.tagValuePrefix,
        section.defaultSortColumn || 'net',
        section.defaultSortDirection || 'desc',
        section.balanceAccountIds,
        section.balanceAccountRegex,
        section.balanceAccountNameRegex,
        accounts
      );
      
      // Filter out zero-balance groups if requested
      if (this.hideZeroBalances) {
        tagGroups = tagGroups.filter(g => g.netAmount !== 0);
      }
      
      console.log('Tag groups result:', tagGroups);
      subtotal = tagGroups.reduce((sum, g) => sum + g.netAmount, 0);
    } else if (section.groupByPartner) {
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
      tagGroups,
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
   * Returns the status text for a tag group based on net amount.
   */
  getTagGroupStatus(netAmount: number): { text: string; cssClass: string } {
    if (netAmount > 0) {
      return { text: 'underpaid', cssClass: 'status-underpaid' };
    } else if (netAmount < 0) {
      return { text: 'overpaid', cssClass: 'status-overpaid' };
    }
    return { text: '', cssClass: '' };
  }

  /**
   * Sort tag groups by the specified column
   */
  private sortTagGroups(groups: TagGroup[], column: string, direction: 'asc' | 'desc') {
    groups.sort((a, b) => {
      let comparison = 0;
      switch (column) {
        case 'net':
          comparison = a.netAmount - b.netAmount;
          break;
        case 'date':
          comparison = a.firstDate.localeCompare(b.firstDate);
          break;
        case 'tagValue':
          comparison = a.tagValue.localeCompare(b.tagValue);
          break;
        case 'partnerName':
          comparison = (a.partnerName || '').localeCompare(b.partnerName || '');
          break;
        default:
          comparison = a.netAmount - b.netAmount;
      }
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Handle column header click for sorting tag groups
   */
  onTagGroupSort(sectionIndex: number, column: string) {
    const section = this.reportSections[sectionIndex];
    if (!section.sortable || !section.tagGroups) {
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
    this.sortTagGroups(section.tagGroups, section.sortColumn, section.sortDirection);
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
