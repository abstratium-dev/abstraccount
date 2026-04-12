import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ModelService } from './model.service';

export interface TransactionDTO {
  id: string;
  date: string;
  status: string;
  description: string;
  partnerId: string | null;
  partnerName: string | null;
  tags: TagDTO[];
  entries: EntryDTO[];
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
}

export interface AccountTreeNode {
  id: string;
  name: string;
  type: string;
  note: string | null;
  parentId: string | null;
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
}

export interface JournalUploadSummary {
  title: string;
  accountCount: number;
  transactionCount: number;
  commodityCount: number;
  status: string;
  journalId: string;
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

@Injectable({
  providedIn: 'root',
})
export class Controller {

  private modelService = inject(ModelService);
  private http = inject(HttpClient);

  async loadConfig(): Promise<{logLevel: string}> {
    try {
      const config = await firstValueFrom(
        this.http.get<{logLevel: string}>('/public/config')
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

  async uploadJournal(content: string): Promise<JournalUploadSummary> {
    try {
      const result = await firstValueFrom(
        this.http.post<JournalUploadSummary>('/api/journal/upload', content, {
          headers: { 'Content-Type': 'text/plain' }
        })
      );
      this.modelService.setSelectedJournalId(result.journalId);

      // Refresh journal list after upload
      await this.listJournals();

      await this.getAccountTree(result.journalId);

      return result;
    } catch (error) {
      console.error('Error uploading journal:', error);
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
            status: tx.status
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
   * Get all entries with filtering for entry search.
   */
  async getEntrySearchResults(filters: {
    journalId?: string;
    accountId?: string;
    transactionId?: string;
    startDate?: string;
    endDate?: string;
    partnerId?: string;
    status?: string;
    commodity?: string;
    minAmount?: number;
    maxAmount?: number;
    accountType?: string;
    tagList?: string[];
  }): Promise<EntrySearchDTO[]> {
    try {
      let params = new HttpParams();
      if (filters.journalId) params = params.set('journalId', filters.journalId);
      if (filters.accountId) params = params.set('accountId', filters.accountId);
      if (filters.transactionId) params = params.set('transactionId', filters.transactionId);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.partnerId) params = params.set('partnerId', filters.partnerId);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.commodity) params = params.set('commodity', filters.commodity);
      if (filters.minAmount != null) params = params.set('minAmount', filters.minAmount.toString());
      if (filters.maxAmount != null) params = params.set('maxAmount', filters.maxAmount.toString());
      if (filters.accountType) params = params.set('accountType', filters.accountType);
      if (filters.tagList && filters.tagList.length > 0) {
        filters.tagList.forEach(tag => {
          params = params.append('tagList', tag);
        });
      }
      
      return await firstValueFrom(
        this.http.get<EntrySearchDTO[]>('/api/entry-search/entries', { params })
      );
    } catch (error) {
      console.error('Error getting entry search results:', error);
      throw error;
    }
  }

  /**
   * Get all unique tags for a journal for entry search.
   */
  async getEntrySearchTags(journalId: string): Promise<string[]> {
    try {
      const params = new HttpParams().set('journalId', journalId);
      return await firstValueFrom(
        this.http.get<string[]>('/api/entry-search/tags', { params })
      );
    } catch (error) {
      console.error('Error getting entry search tags:', error);
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
}
