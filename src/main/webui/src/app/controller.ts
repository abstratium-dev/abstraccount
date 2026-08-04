import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Config, ModelService } from './model.service';

export interface TransactionDTO {
  id: string;
  date: string;
  status: string;
  description: string;
  partnerId: string | null;
  partnerName: string | null;
  tags: TagDTO[];
  entries: EntryDTO[];
  journalId?: string; // Set when loading from journal chain
  journalName?: string; // Set when loading from journal chain
}

export interface TagDTO {
  key: string;
  value: string;
}

export interface EntryDTO {
  id: string;
  entryOrder: number;
  accountId: string;
  accountName: string;
  accountType: string;
  commodity: string;
  amount: number;
  note: string | null;
}

export interface JournalMetadataDTO {
  id: string;
  logo: string | null;
  title: string;
  subtitle: string | null;
  currency: string;
  commodities: { [key: string]: string };
  previousJournalId: string | null;
  locked: boolean;
}

export interface JournalKpiDTO {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  currency: string;
}

export interface AccountTreeNode {
  id: string;
  name: string;
  type: string;
  note: string | null;
  parentId: string | null;
  accountCode: number;
  children: AccountTreeNode[];
}

export interface CreateAccountRequest {
  name: string;
  type: string;
  note: string | null;
  parentAccountId: string | null;
  journalId: string;
  accountOrder: number | null;
}

export interface UpdateAccountRequest {
  name: string;
  type: string;
  note: string | null;
  parentAccountId: string | null;
  accountOrder: number | null;
}

export interface PartnerDTO {
  partnerNumber: string;
  name: string;
}

export interface CreatePartnerResponseDTO {
  partnerNumber: string;
  name: string;
  warnings: string[];
}

export interface ImportPartnersResponseDTO {
  importedCount: number;
  errors: string[];
}

export interface AccountEntryDTO {
  entryId: string;
  transactionId: string;
  transactionDate: string;
  description: string;
  commodity: string;
  amount: number;
  runningBalance: number;
  note: string | null;
  accountId: string;
  partnerId: string | null;
  partnerName: string | null;
  status: string;
  tags: TagDTO[];
}

export interface JournalUploadSummary {
  title: string;
  accountCount: number;
  transactionCount: number;
  commodityCount: number;
  status: string;
  journalId: string;
  replacedCount?: number;
}

export interface JournalConflictInfo {
  status: string;
  message: string;
  conflictingJournals: { id: string; title: string }[];
}

export class JournalConflictError extends Error {
  conflictingJournals: { id: string; title: string }[];
  constructor(info: JournalConflictInfo) {
    super(info.message);
    this.name = 'JournalConflictError';
    this.conflictingJournals = info.conflictingJournals;
  }
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  templateContent: string;
}

export interface MacroParameterDTO {
  name: string;
  type: string;
  prompt: string | null;
  defaultValue: string | null;
  required: boolean;
  filter: string | null;
}

export interface MacroValidationDTO {
  balanceCheck: boolean;
  minPostings: number | null;
}

export interface MacroDTO {
  id: string;
  name: string;
  description: string | null;
  parameters: MacroParameterDTO[];
  template: string;
  validation: MacroValidationDTO | null;
  notes: string | null;
  createdDate: string;
  modifiedDate: string;
}

export interface ImportConflict {
  existingId: string;
  name: string;
  artefactType: string;
}

export interface ImportedItemSummary {
  originalName: string;
  finalName: string;
  id: string;
}

export interface ImportResult {
  status: 'success' | 'conflict' | 'error';
  message?: string;
  conflicts?: ImportConflict[];
  imported?: number;
  items?: ImportedItemSummary[];
}

export interface CloseAccountPreviewDTO {
  accountId: string;
  accountCodePath: string;
  accountFullName: string;
  balance: number;
  commodity: string;
}

export interface CloseBooksPreviewDTO {
  accounts: CloseAccountPreviewDTO[];
  equityAccountCodePath: string;
  equityAccountFullName: string;
  closingDate: string;
}

export interface CloseBooksResultDTO {
  transactionIds: string[];
  transactionCount: number;
}

export interface CloseBooksRequestDTO {
  journalId: string;
  closingDate: string;
  equityAccountCodePath: string;
}

export interface NewYearAccountPreviewDTO {
  accountId: string;
  accountCodePath: string;
  accountFullName: string;
  openingBalance: number;
  commodity: string;
}

export interface NewYearPreviewDTO {
  sourceJournalId: string;
  sourceJournalTitle: string;
  newJournalTitle: string;
  openingDate: string;
  retainedEarningsCodePath: string;
  retainedEarningsFullName: string;
  annualProfitLossCodePath: string;
  annualProfitLossFullName: string;
  accounts: NewYearAccountPreviewDTO[];
  accountCount: number;
  openingBalanceCount: number;
}

export interface NewYearResultDTO {
  newJournalId: string;
  newJournalTitle: string;
  accountCount: number;
  openingBalanceCount: number;
  retainedEarningsTransferId: string | null;
}

export interface NewYearRequestDTO {
  sourceJournalId: string;
  newJournalTitle: string;
  openingDate: string;
  retainedEarningsCodePath: string;
  annualProfitLossCodePath: string;
}

export interface EntrySearchDTO {
  // Entry fields
  entryId: string;
  entryOrder: number;
  entryCommodity: string;
  entryAmount: number;
  entryNote: string | null;
  
  // Account fields
  accountId: string;
  accountName: string;
  accountType: string;
  accountNote: string | null;
  accountParentId: string | null;
  
  // Transaction fields
  transactionId: string;
  transactionDate: string;
  transactionStatus: string;
  transactionDescription: string;
  transactionPartnerId: string | null;
  transactionPartnerName: string | null;
  transactionTags: TagDTO[];
  
  // Journal fields
  journalId: string;
  journalTitle: string;
  journalCurrency: string;
}

export interface CreateEntryRequest {
  entryOrder: number;
  accountId: string;
  commodity: string;
  amount: number;
  note: string | null;
}

export interface CreateTransactionRequest {
  journalId: string;
  date: string;
  status: string;
  description: string;
  partnerId: string | null;
  tags: TagDTO[];
  entries: CreateEntryRequest[];
}

export interface UpdateEntryRequest {
  id: string | null;
  entryOrder: number;
  accountId: string;
  commodity: string;
  amount: number;
  note: string | null;
}

export interface UpdateTransactionRequest {
  date: string;
  status: string;
  description: string;
  partnerId: string | null;
  tags: TagDTO[];
  entries: UpdateEntryRequest[];
}

export interface AttachmentDTO {
  id: string;
  transactionId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class Controller {

  private modelService = inject(ModelService);
  private http = inject(HttpClient);

  async loadConfig(): Promise<Config> {
    try {
      const config = await firstValueFrom(
        this.http.get<Config>('/public/config')
      );
      this.modelService.setConfig(config);
      return config;
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  // Journal methods
  async listJournals(): Promise<JournalMetadataDTO[]> {
    try {
      const journals = await firstValueFrom(
        this.http.get<JournalMetadataDTO[]>('/api/journal/list')
      );
      this.modelService.setJournals(journals);
      return journals;
    } catch (error) {
      console.error('Error listing journals:', error);
      throw error;
    }
  }

  async getJournalMetadata(journalId: string): Promise<JournalMetadataDTO> {
    try {
      return await firstValueFrom(
        this.http.get<JournalMetadataDTO>(`/api/journal/${journalId}/metadata`)
      );
    } catch (error) {
      console.error('Error getting journal metadata:', error);
      throw error;
    }
  }

  async getJournalKpi(journalId: string): Promise<JournalKpiDTO> {
    try {
      return await firstValueFrom(
        this.http.get<JournalKpiDTO>(`/api/journal/${journalId}/kpi`)
      );
    } catch (error) {
      console.error('Error getting journal KPI:', error);
      throw error;
    }
  }

  async getTransactions(
    journalId: string,
    startDate?: string,
    endDate?: string,
    partnerId?: string,
    status?: string,
    filter?: string
  ): Promise<TransactionDTO[]> {
    try {
      let params = new HttpParams();
      if (startDate) params = params.set('startDate', startDate);
      if (endDate) params = params.set('endDate', endDate);
      if (partnerId) params = params.set('partnerId', partnerId);
      if (status) params = params.set('status', status);
      if (filter) params = params.set('filter', filter);
      
      const transactions = await firstValueFrom(
        this.http.get<TransactionDTO[]>('/api/journal/' + journalId + '/transactions', { params })
      );
      this.modelService.setTransactions(transactions);
      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  async getTags(journalId: string): Promise<TagDTO[]> {
    try {
      return await firstValueFrom(
        this.http.get<TagDTO[]>(`/api/journal/${journalId}/tags`)
      );
    } catch (error) {
      console.error('Error getting tags:', error);
      throw error;
    }
  }

  async createJournal(request: {
    logo: string | null;
    title: string;
    subtitle: string | null;
    currency: string;
    commodities: { [key: string]: string };
  }): Promise<JournalMetadataDTO> {
    try {
      const result = await firstValueFrom(
        this.http.post<JournalMetadataDTO>('/api/journal/create', request)
      );
      
      // Refresh journal list after creation
      await this.listJournals();
      
      // Set as selected journal
      this.modelService.setSelectedJournalId(result.id);
      
      return result;
    } catch (error) {
      console.error('Error creating journal:', error);
      throw error;
    }
  }

  async uploadJournal(content: string, replaceExisting: boolean = false): Promise<JournalUploadSummary> {
    try {
      const params = replaceExisting ? { params: { replaceExisting: 'true' } } : {};
      const result = await firstValueFrom(
        this.http.post<JournalUploadSummary>('/api/journal/upload', content, {
          headers: { 'Content-Type': 'text/plain' },
          ...params
        })
      );
      this.modelService.setSelectedJournalId(result.journalId);

      // Refresh journal list after upload
      await this.listJournals();

      await this.getAccountTree(result.journalId);

      return result;
    } catch (error: any) {
      if (error.status === 409 && error.error?.conflictingJournals) {
        throw new JournalConflictError(error.error as JournalConflictInfo);
      }
      console.error('Error uploading journal:', error);
      throw error;
    }
  }

  async lockJournal(journalId: string): Promise<JournalMetadataDTO> {
    try {
      const result = await firstValueFrom(
        this.http.post<JournalMetadataDTO>(`/api/journal/${journalId}/lock`, {})
      );
      await this.listJournals();
      return result;
    } catch (error) {
      console.error('Error locking journal:', error);
      throw error;
    }
  }

  async unlockJournal(journalId: string): Promise<JournalMetadataDTO> {
    try {
      const result = await firstValueFrom(
        this.http.post<JournalMetadataDTO>(`/api/journal/${journalId}/unlock`, {})
      );
      await this.listJournals();
      return result;
    } catch (error) {
      console.error('Error unlocking journal:', error);
      throw error;
    }
  }

  async exportJournal(journalId: string, includeTransactions: boolean = true): Promise<string> {
    try {
      const params = includeTransactions ? {} : { params: { includeTransactions: 'false' } };
      const content = await firstValueFrom(
        this.http.get(`/api/journal/${journalId}/export`, {
          responseType: 'text',
          ...params
        })
      );
      return content;
    } catch (error) {
      console.error('Error exporting journal:', error);
      throw error;
    }
  }

  async deleteJournal(journalId: string): Promise<any> {
    try {
      const result = await firstValueFrom(
        this.http.delete(`/api/journal/${journalId}`)
      );
      // Refresh journal list after deletion
      await this.listJournals();

      // Clear selection and navigate to home
      this.clearAccounts();
      this.clearTransactions();

      return result;
    } catch (error) {
      console.error('Error deleting journal:', error);
      throw error;
    }
  }

  async getAccountTree(journalId: string): Promise<AccountTreeNode[]> {
    try {
      const accounts = await firstValueFrom(
        this.http.get<AccountTreeNode[]>(`/api/account/${journalId}/tree`)
      );
      this.modelService.setAccounts(accounts);
      return accounts;
    } catch (error) {
      console.error('Error getting account tree:', error);
      this.modelService.setAccounts([]);
      throw error;
    }
  }

  async selectJournal(journalId: string | null): Promise<void> {
    this.clearAccounts();
    this.clearTransactions();
    if(journalId === null) {
      this.modelService.setSelectedJournalId(null);
    } else {
      this.modelService.setSelectedJournalId(journalId);

      // Load accounts for this journal - Controller updates the model
      try {
          await this.getAccountTree(journalId);
      } catch (error) {
          console.error('Failed to load accounts:', error);
      }

      // Load transactions for this journal - Controller updates the model
      try {
          await this.getTransactions(journalId);
      } catch (error) {
          console.error('Failed to load transactions:', error);
      }
    }
  }

  private clearAccounts(): void {
    this.modelService.setAccounts([]);
  }

  private clearTransactions(): void {
    this.modelService.setTransactions([]);
  }

  async getAccountDetails(journalId: string, accountId: string): Promise<AccountTreeNode> {
    const response = await firstValueFrom(
      this.http.get<AccountTreeNode>(`/api/account/${journalId}/account/${accountId}`)
    );
    return response;
  }

  async getAccountEntries(journalId: string, accountId: string, includeChildren: boolean = false): Promise<AccountEntryDTO[]> {
    const url = `/api/account/${journalId}/account/${accountId}/entries`;
    const params: any = {};
    if (includeChildren) {
      params.includeChildren = 'true';
    }
    const response = await this.http.get<AccountEntryDTO[]>(url, { params }).toPromise() || [];
    let total = 0;
    return response.reverse().map(e => ({ ...e, runningBalance: total += e.amount })).reverse();
  }

  async listReportTemplates(): Promise<ReportTemplate[]> {
    try {
      const templates = await firstValueFrom(
        this.http.get<ReportTemplate[]>('/api/report/templates')
      );
      this.modelService.setReportTemplates(templates);
      return templates;
    } catch (error) {
      console.error('Error listing report templates:', error);
      throw error;
    }
  }

  async getReportTemplate(templateId: string): Promise<ReportTemplate> {
    try {
      return await firstValueFrom(
        this.http.get<ReportTemplate>(`/api/report/templates/${templateId}`)
      );
    } catch (error) {
      console.error('Error getting report template:', error);
      throw error;
    }
  }

  async exportReportTemplates(): Promise<string> {
    try {
      return await firstValueFrom(
        this.http.get('/api/report/templates/export', { responseType: 'text' })
      );
    } catch (error) {
      console.error('Error exporting report templates:', error);
      throw error;
    }
  }

  async importReportTemplates(yamlContent: string, replaceIds?: string[], autoRename?: boolean): Promise<ImportResult> {
    try {
      let params = new HttpParams();
      if (replaceIds && replaceIds.length > 0) {
        params = params.set('replaceIds', replaceIds.join(','));
      }
      if (autoRename) {
        params = params.set('autoRename', 'true');
      }
      const response = await firstValueFrom(
        this.http.post<ImportResult>('/api/report/templates/import', yamlContent, {
          params,
          headers: { 'Content-Type': 'text/yaml' }
        })
      );
      await this.listReportTemplates();
      return response;
    } catch (error: any) {
      if (error.status === 409) {
        return error.error as ImportResult;
      }
      if (error.status === 400) {
        return error.error as ImportResult;
      }
      console.error('Error importing report templates:', error);
      throw error;
    }
  }

  async deleteReportTemplate(templateId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`/api/report/templates/${templateId}`)
      );
      // Refresh report template list
      await this.listReportTemplates();
    } catch (error) {
      console.error('Error deleting report template:', error);
      throw error;
    }
  }

  async getEntriesForReport(
    journalId: string,
    startDate?: string,
    endDate?: string,
    accountTypes?: string[],
    filter?: string
  ): Promise<AccountEntryDTO[]> {
    try {
      // Use the existing transaction endpoint to get entries
      // We'll need to extract entries from transactions
      const transactions = await this.getTransactions(journalId, startDate, endDate, undefined, undefined, filter);
      
      // Flatten entries from all transactions
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
            runningBalance: 0, // Will be calculated later if needed
            note: entry.note,
            accountId: entry.accountId,
            partnerId: tx.partnerId,
            partnerName: tx.partnerName,
            status: tx.status,
            tags: tx.tags ?? []
          });
        }
      }
      
      // Filter by account types if specified
      if (accountTypes && accountTypes.length > 0) {
        return entries.filter(e => accountTypes.includes(e.accountId));
      }
      
      return entries;
    } catch (error) {
      console.error('Error getting entries for report:', error);
      throw error;
    }
  }

  // Macro methods
  async listMacros(): Promise<MacroDTO[]> {
    try {
      const macros = await firstValueFrom(
        this.http.get<MacroDTO[]>('/api/macro')
      );
      this.modelService.setMacros(macros);
      return macros;
    } catch (error) {
      console.error('Error listing macros:', error);
      throw error;
    }
  }

  async getMacro(macroId: string): Promise<MacroDTO> {
    try {
      return await firstValueFrom(
        this.http.get<MacroDTO>(`/api/macro/${macroId}`)
      );
    } catch (error) {
      console.error('Error getting macro:', error);
      throw error;
    }
  }

  async createMacro(macro: Partial<MacroDTO>): Promise<MacroDTO> {
    try {
      const created = await firstValueFrom(
        this.http.post<MacroDTO>('/api/macro', macro)
      );
      // Refresh macro list
      await this.listMacros();
      return created;
    } catch (error) {
      console.error('Error creating macro:', error);
      throw error;
    }
  }

  async updateMacro(macroId: string, macro: Partial<MacroDTO>): Promise<MacroDTO> {
    try {
      const updated = await firstValueFrom(
        this.http.put<MacroDTO>(`/api/macro/${macroId}`, macro)
      );
      // Refresh macro list
      await this.listMacros();
      return updated;
    } catch (error) {
      console.error('Error updating macro:', error);
      throw error;
    }
  }

  async deleteMacro(macroId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete<void>(`/api/macro/${macroId}`)
      );
      // Refresh macro list
      await this.listMacros();
    } catch (error) {
      console.error('Error deleting macro:', error);
      throw error;
    }
  }

  async executeMacro(macroId: string, journalId: string, parameters: Record<string, string>): Promise<string> {
    try {
      const transactionId = await firstValueFrom(
        this.http.post<string>('/api/macro/execute', {
          macroId,
          journalId,
          parameters
        }, { responseType: 'text' as 'json' })
      );
      // Refresh transactions
      await this.getTransactions(journalId);
      return transactionId;
    } catch (error) {
      console.error('Error executing macro:', error);
      throw error;
    }
  }

  async exportMacros(): Promise<string> {
    try {
      return await firstValueFrom(
        this.http.get('/api/macro/export', { responseType: 'text' })
      );
    } catch (error) {
      console.error('Error exporting macros:', error);
      throw error;
    }
  }

  async importMacros(yamlContent: string, replaceIds?: string[], autoRename?: boolean): Promise<ImportResult> {
    try {
      let params = new HttpParams();
      if (replaceIds && replaceIds.length > 0) {
        params = params.set('replaceIds', replaceIds.join(','));
      }
      if (autoRename) {
        params = params.set('autoRename', 'true');
      }
      const response = await firstValueFrom(
        this.http.post<ImportResult>('/api/macro/import', yamlContent, {
          params,
          headers: { 'Content-Type': 'text/yaml' }
        })
      );
      await this.listMacros();
      return response;
    } catch (error: any) {
      if (error.status === 409) {
        return error.error as ImportResult;
      }
      if (error.status === 400) {
        return error.error as ImportResult;
      }
      console.error('Error importing macros:', error);
      throw error;
    }
  }

  /**
   * Search for partners.
   */
  async searchPartners(searchTerm: string): Promise<PartnerDTO[]> {
    try {
      let params = new HttpParams();
      if (searchTerm) {
        params = params.set('q', searchTerm);
      }

      return await firstValueFrom(
        this.http.get<PartnerDTO[]>('/api/partners/search', { params })
      );
    } catch (error) {
      console.error('Error searching partners:', error);
      throw error;
    }
  }

  /**
   * Create a new partner.
   * The backend assigns the partner number (next available, gap-filling).
   * Returns the created partner and any warnings (e.g. duplicate name).
   */
  async createPartner(name: string): Promise<CreatePartnerResponseDTO> {
    try {
      return await firstValueFrom(
        this.http.post<CreatePartnerResponseDTO>('/api/partners', { name })
      );
    } catch (error) {
      console.error('Error creating partner:', error);
      throw error;
    }
  }

  /**
   * Replace all partners from an imported CSV file.
   * The backend validates the CSV before overwriting the partner file.
   * On validation failure (HTTP 400) the error body is returned as a
   * resolved promise with the list of errors, so the UI can display them.
   */
  async importPartners(csvContent: string): Promise<ImportPartnersResponseDTO> {
    try {
      return await firstValueFrom(
        this.http.post<ImportPartnersResponseDTO>('/api/partners/import', csvContent, {
          headers: { 'Content-Type': 'text/csv' },
          responseType: 'json'
        })
      );
    } catch (error: any) {
      if (error.status === 400) {
        return error.error as ImportPartnersResponseDTO;
      }
      console.error('Error importing partners:', error);
      throw error;
    }
  }

  /**
   * Export all partners for the current organisation as CSV.
   * Returns the raw CSV content (including header line) which can be
   * downloaded as a .csv file or re-imported via importPartners().
   */
  async exportPartners(): Promise<string> {
    try {
      return await firstValueFrom(
        this.http.get('/api/partners/export', { responseType: 'text' })
      );
    } catch (error) {
      console.error('Error exporting partners:', error);
      throw error;
    }
  }

  /**
   * Get all entries with EQL filtering for entry search.
   */
  async getEntrySearchResults(journalId: string, accountId?: string, filter?: string): Promise<EntrySearchDTO[]> {
    try {
      let params = new HttpParams();
      params = params.set('journalId', journalId);
      if (accountId) params = params.set('accountId', accountId);
      if (filter) params = params.set('filter', filter);

      return await firstValueFrom(
        this.http.get<EntrySearchDTO[]>('/api/entry-search/entries', { params })
      );
    } catch (error) {
      console.error('Error getting entry search results:', error);
      throw error;
    }
  }

  /**
   * Search for invoice numbers.
   */
  async searchInvoices(journalId: string, prefix?: string): Promise<string[]> {
    try {
      let params = new HttpParams().set('journalId', journalId);
      if (prefix) {
        params = params.set('prefix', prefix);
      }
      
      return await firstValueFrom(
        this.http.get<string[]>('/api/invoices/search', { params })
      );
    } catch (error) {
      console.error('Error searching invoices:', error);
      throw error;
    }
  }

  /**
   * Create a new transaction.
   */
  async createTransaction(request: CreateTransactionRequest): Promise<TransactionDTO> {
    try {
      const transaction = await firstValueFrom(
        this.http.post<TransactionDTO>('/api/transaction', request)
      );
      // Refresh transactions for the journal
      await this.getTransactions(request.journalId);
      return transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get a single transaction by ID.
   */
  async getTransaction(transactionId: string): Promise<TransactionDTO> {
    try {
      return await firstValueFrom(
        this.http.get<TransactionDTO>(`/api/transaction/${transactionId}`)
      );
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  /**
   * Update an existing transaction.
   */
  async updateTransaction(transactionId: string, journalId: string, request: UpdateTransactionRequest): Promise<TransactionDTO> {
    try {
      const transaction = await firstValueFrom(
        this.http.put<TransactionDTO>(`/api/transaction/${transactionId}`, request)
      );
      // Refresh transactions for the journal
      await this.getTransactions(journalId);
      return transaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Delete a transaction.
   */
  async deleteTransaction(transactionId: string, journalId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`/api/transaction/${transactionId}`)
      );
      // Refresh transactions for the journal
      await this.getTransactions(journalId);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  // Attachment methods

  /**
   * List the attachments (metadata only) for a transaction.
   */
  async listAttachments(transactionId: string): Promise<AttachmentDTO[]> {
    try {
      return await firstValueFrom(
        this.http.get<AttachmentDTO[]>(`/api/attachment/transaction/${transactionId}`)
      );
    } catch (error) {
      console.error('Error listing attachments:', error);
      throw error;
    }
  }

  /**
   * Upload a new attachment (e.g. a receipt PDF) for a transaction.
   */
  async uploadAttachment(transactionId: string, file: File): Promise<AttachmentDTO> {
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      return await firstValueFrom(
        this.http.post<AttachmentDTO>(`/api/attachment/transaction/${transactionId}`, formData)
      );
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  /**
   * Replace the content of an existing attachment.
   */
  async replaceAttachment(attachmentId: string, file: File): Promise<AttachmentDTO> {
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      return await firstValueFrom(
        this.http.put<AttachmentDTO>(`/api/attachment/${attachmentId}`, formData)
      );
    } catch (error) {
      console.error('Error replacing attachment:', error);
      throw error;
    }
  }

  /**
   * Delete an attachment.
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`/api/attachment/${attachmentId}`)
      );
    } catch (error) {
      console.error('Error deleting attachment:', error);
      throw error;
    }
  }

  /**
   * URL to view/download an attachment's raw bytes (e.g. for an <iframe> preview
   * or an <a> download link). No separate HTTP call needed to build this.
   */
  getAttachmentDownloadUrl(attachmentId: string): string {
    return `/api/attachment/${attachmentId}`;
  }

  /**
   * Get all distinct tag keys across all journals.
   * Useful for autocomplete suggestions.
   */
  async getAllTagKeys(): Promise<string[]> {
    try {
      return await firstValueFrom(
        this.http.get<string[]>('/api/core/tags/keys')
      );
    } catch (error) {
      console.error('Error getting all tag keys:', error);
      throw error;
    }
  }

  /**
   * Create a new account.
   */
  async createAccount(request: CreateAccountRequest): Promise<AccountTreeNode> {
    try {
      const account = await firstValueFrom(
        this.http.post<AccountTreeNode>('/api/account', request)
      );
      // Refresh account tree for the journal
      await this.getAccountTree(request.journalId);
      return account;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  /**
   * Update an existing account.
   */
  async updateAccount(accountId: string, journalId: string, request: UpdateAccountRequest): Promise<AccountTreeNode> {
    try {
      const account = await firstValueFrom(
        this.http.put<AccountTreeNode>(`/api/account/${accountId}`, request)
      );
      // Refresh account tree for the journal
      await this.getAccountTree(journalId);
      return account;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  /**
   * Delete an account. Only leaf accounts can be deleted.
   */
  async deleteAccount(journalId: string, accountId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`/api/account/${journalId}/account/${accountId}`)
      );
      // Refresh account tree for the journal
      await this.getAccountTree(journalId);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  /**
   * Check if an account is a leaf account (has no children).
   */
  async isLeafAccount(accountId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.get<{isLeaf: boolean}>(`/api/account/${accountId}/is-leaf`)
      );
      return response.isLeaf;
    } catch (error) {
      console.error('Error checking if account is leaf:', error);
      throw error;
    }
  }

  /**
   * Preview the year-end close-books operation.
   * Returns accounts that will be closed and their balances without making any changes.
   */
  async previewCloseBooks(request: CloseBooksRequestDTO): Promise<CloseBooksPreviewDTO> {
    try {
      return await firstValueFrom(
        this.http.post<CloseBooksPreviewDTO>('/api/close-books/preview', request)
      );
    } catch (error) {
      console.error('Error previewing close-books:', error);
      throw error;
    }
  }

  /**
   * Execute the year-end close-books operation.
   * Creates one closing transaction per affected income/expense account.
   */
  async executeCloseBooks(request: CloseBooksRequestDTO): Promise<CloseBooksResultDTO> {
    try {
      const result = await firstValueFrom(
        this.http.post<CloseBooksResultDTO>('/api/close-books/execute', request)
      );
      // Refresh transactions for the journal
      await this.getTransactions(request.journalId);
      return result;
    } catch (error) {
      console.error('Error executing close-books:', error);
      throw error;
    }
  }

  /**
   * Preview the new year journal creation.
   * Returns accounts that will be copied and their opening balances without making any changes.
   */
  async previewNewYear(request: NewYearRequestDTO): Promise<NewYearPreviewDTO> {
    try {
      return await firstValueFrom(
        this.http.post<NewYearPreviewDTO>('/api/new-year/preview', request)
      );
    } catch (error) {
      console.error('Error previewing new year:', error);
      throw error;
    }
  }

  /**
   * Execute the new year journal creation.
   * Creates a new journal, copies all accounts, and creates opening balance transactions.
   */
  async executeNewYear(request: NewYearRequestDTO): Promise<NewYearResultDTO> {
    try {
      const result = await firstValueFrom(
        this.http.post<NewYearResultDTO>('/api/new-year/execute', request)
      );
      // Refresh journal list after creation
      await this.listJournals();
      // Select the new journal
      this.modelService.setSelectedJournalId(result.newJournalId);
      // Load accounts for the new journal
      await this.getAccountTree(result.newJournalId);
      return result;
    } catch (error) {
      console.error('Error executing new year:', error);
      throw error;
    }
  }
}
