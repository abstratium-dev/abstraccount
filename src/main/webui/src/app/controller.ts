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
  children: AccountTreeNode[];
}

export interface AccountEntryDTO {
  entryId: string;
  transactionId: string;
  transactionDate: string;
  description: string;
  commodity: string;
  amount: number;
  runningBalance: number;
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
    status?: string
  ): Promise<TransactionDTO[]> {
    try {
      let params = new HttpParams();
      if (startDate) params = params.set('startDate', startDate);
      if (endDate) params = params.set('endDate', endDate);
      if (partnerId) params = params.set('partnerId', partnerId);
      if (status) params = params.set('status', status);
      
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

  async uploadJournal(content: string): Promise<any> {
    try {
      const result = await firstValueFrom(
        this.http.post('/api/journal/upload', content, {
          headers: { 'Content-Type': 'text/plain' }
        })
      );
      // Refresh journal list after upload
      await this.listJournals();
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

  setSelectedJournalId(journalId: string | null): void {
    this.modelService.setSelectedJournalId(journalId);
  }

  clearAccounts(): void {
    this.modelService.setAccounts([]);
  }

  async getAccountDetails(journalId: string, accountId: string): Promise<AccountTreeNode> {
    const response = await this.http.get<AccountTreeNode>(
      `/api/account/${journalId}/account/${accountId}`
    ).toPromise();
    return response!;
  }

  async getAccountEntries(journalId: string, accountId: string, includeChildren: boolean = false): Promise<AccountEntryDTO[]> {
    const url = `/api/account/${journalId}/account/${accountId}/entries`;
    const params: any = {};
    if (includeChildren) {
      params.includeChildren = 'true';
    }
    const response = await this.http.get<AccountEntryDTO[]>(url, { params }).toPromise();
    return response || [];
  }
}
