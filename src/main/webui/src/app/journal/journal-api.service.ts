import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PostingDTO {
  transactionDate: string;
  transactionStatus: string;
  transactionDescription: string;
  transactionId: string | null;
  accountNumber: string;
  accountName: string;
  accountType: string;
  commodity: string;
  amount: number;
  runningBalance: number | null;
}

export interface AccountSummaryDTO {
  accountNumber: string;
  accountName: string;
  accountType: string;
  note: string | null;
}

export interface AccountBalanceDTO {
  accountNumber: string;
  accountName: string;
  accountType: string;
  balances: { [key: string]: number };
}

export interface JournalMetadataDTO {
  id: string;
  title: string;
  subtitle: string | null;
  currency: string;
  commodities: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class JournalApiService {
  private readonly apiUrl = '/api/journal';

  constructor(private http: HttpClient) {}

  listJournals(): Observable<JournalMetadataDTO[]> {
    return this.http.get<JournalMetadataDTO[]>(`${this.apiUrl}/list`);
  }

  getJournalMetadata(journalId: string): Observable<JournalMetadataDTO> {
    return this.http.get<JournalMetadataDTO>(`${this.apiUrl}/${journalId}/metadata`);
  }

  getAccounts(): Observable<AccountSummaryDTO[]> {
    return this.http.get<AccountSummaryDTO[]>(`${this.apiUrl}/accounts`);
  }

  getAccountBalance(accountName: string, asOfDate?: string): Observable<AccountBalanceDTO> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    return this.http.get<AccountBalanceDTO>(`${this.apiUrl}/accounts/${encodeURIComponent(accountName)}/balance`, { params });
  }

  getAccountPostings(
    accountName: string,
    startDate?: string,
    endDate?: string,
    status?: string
  ): Observable<PostingDTO[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status) params = params.set('status', status);
    
    return this.http.get<PostingDTO[]>(
      `${this.apiUrl}/accounts/${encodeURIComponent(accountName)}/postings`,
      { params }
    );
  }

  getAllPostings(
    startDate?: string,
    endDate?: string,
    status?: string,
    accountName?: string
  ): Observable<PostingDTO[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status) params = params.set('status', status);
    if (accountName) params = params.set('accountName', accountName);
    
    return this.http.get<PostingDTO[]>(`${this.apiUrl}/postings`, { params });
  }

  getAllBalances(asOfDate?: string): Observable<AccountBalanceDTO[]> {
    let params = new HttpParams();
    if (asOfDate) {
      params = params.set('asOfDate', asOfDate);
    }
    return this.http.get<AccountBalanceDTO[]>(`${this.apiUrl}/balances`, { params });
  }
}
