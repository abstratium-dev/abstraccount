import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { JournalApiService, JournalMetadataDTO, AccountSummaryDTO, AccountBalanceDTO, PostingDTO } from './journal-api.service';

describe('JournalApiService', () => {
  let service: JournalApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [JournalApiService]
    });
    service = TestBed.inject(JournalApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('listJournals', () => {
    it('should return list of journals', () => {
      const mockJournals: JournalMetadataDTO[] = [
        {
          id: 'journal-1',
          title: 'Test Journal 2024',
          subtitle: 'Test Subtitle',
          currency: 'CHF',
          commodities: { 'CHF': '1000.00' }
        },
        {
          id: 'journal-2',
          title: 'Test Journal 2025',
          subtitle: null,
          currency: 'USD',
          commodities: { 'USD': '100.00' }
        }
      ];

      service.listJournals().subscribe(journals => {
        expect(journals).toEqual(mockJournals);
        expect(journals.length).toBe(2);
        expect(journals[0].title).toBe('Test Journal 2024');
        expect(journals[1].currency).toBe('USD');
      });

      const req = httpMock.expectOne('/api/journal/list');
      expect(req.request.method).toBe('GET');
      req.flush(mockJournals);
    });

    it('should handle empty journal list', () => {
      service.listJournals().subscribe(journals => {
        expect(journals).toEqual([]);
        expect(journals.length).toBe(0);
      });

      const req = httpMock.expectOne('/api/journal/list');
      req.flush([]);
    });
  });

  describe('getJournalMetadata', () => {
    it('should return journal metadata by ID', () => {
      const mockJournal: JournalMetadataDTO = {
        id: 'journal-1',
        title: 'Test Journal',
        subtitle: 'Subtitle',
        currency: 'CHF',
        commodities: { 'CHF': '1000.00' }
      };

      service.getJournalMetadata('journal-1').subscribe(journal => {
        expect(journal).toEqual(mockJournal);
        expect(journal.id).toBe('journal-1');
        expect(journal.title).toBe('Test Journal');
      });

      const req = httpMock.expectOne('/api/journal/journal-1/metadata');
      expect(req.request.method).toBe('GET');
      req.flush(mockJournal);
    });
  });

  describe('getAccounts', () => {
    it('should return list of accounts', () => {
      const mockAccounts: AccountSummaryDTO[] = [
        {
          accountNumber: '1',
          accountName: '1 Assets',
          accountType: 'ASSET',
          note: 'Asset account'
        },
        {
          accountNumber: '2',
          accountName: '2 Liabilities',
          accountType: 'LIABILITY',
          note: null
        }
      ];

      service.getAccounts().subscribe(accounts => {
        expect(accounts).toEqual(mockAccounts);
        expect(accounts.length).toBe(2);
      });

      const req = httpMock.expectOne('/api/journal/accounts');
      expect(req.request.method).toBe('GET');
      req.flush(mockAccounts);
    });
  });

  describe('getAccountBalance', () => {
    it('should return account balance without date', () => {
      const mockBalance: AccountBalanceDTO = {
        accountNumber: '1',
        accountName: '1 Assets',
        accountType: 'ASSET',
        balances: { 'CHF': 1000.50 }
      };

      service.getAccountBalance('1 Assets').subscribe(balance => {
        expect(balance).toEqual(mockBalance);
        expect(balance.balances['CHF']).toBe(1000.50);
      });

      const req = httpMock.expectOne('/api/journal/accounts/1%20Assets/balance');
      expect(req.request.method).toBe('GET');
      req.flush(mockBalance);
    });

    it('should return account balance with asOfDate parameter', () => {
      const mockBalance: AccountBalanceDTO = {
        accountNumber: '1',
        accountName: '1 Assets',
        accountType: 'ASSET',
        balances: { 'CHF': 500.25 }
      };

      service.getAccountBalance('1 Assets', '2024-12-31').subscribe(balance => {
        expect(balance).toEqual(mockBalance);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/journal/accounts/1%20Assets/balance' && 
        req.params.get('asOfDate') === '2024-12-31'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockBalance);
    });
  });

  describe('getAccountPostings', () => {
    it('should return postings without filters', () => {
      const mockPostings: PostingDTO[] = [
        {
          transactionDate: '2024-01-01',
          transactionStatus: 'CLEARED',
          transactionDescription: 'Opening balance',
          transactionId: 'tx-1',
          accountNumber: '1',
          accountName: '1 Assets',
          accountType: 'ASSET',
          commodity: 'CHF',
          amount: 1000,
          runningBalance: 1000
        }
      ];

      service.getAccountPostings('1 Assets').subscribe(postings => {
        expect(postings).toEqual(mockPostings);
        expect(postings.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/journal/accounts/1%20Assets/postings');
      expect(req.request.method).toBe('GET');
      req.flush(mockPostings);
    });

    it('should return postings with all filters', () => {
      const mockPostings: PostingDTO[] = [];

      service.getAccountPostings('1 Assets', '2024-01-01', '2024-12-31', 'CLEARED').subscribe(postings => {
        expect(postings).toEqual(mockPostings);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/journal/accounts/1%20Assets/postings' &&
        req.params.get('startDate') === '2024-01-01' &&
        req.params.get('endDate') === '2024-12-31' &&
        req.params.get('status') === 'CLEARED'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPostings);
    });
  });

  describe('getAllPostings', () => {
    it('should return all postings without filters', () => {
      const mockPostings: PostingDTO[] = [];

      service.getAllPostings().subscribe(postings => {
        expect(postings).toEqual(mockPostings);
      });

      const req = httpMock.expectOne('/api/journal/postings');
      expect(req.request.method).toBe('GET');
      req.flush(mockPostings);
    });

    it('should return all postings with filters', () => {
      const mockPostings: PostingDTO[] = [];

      service.getAllPostings('2024-01-01', '2024-12-31', 'CLEARED', '1 Assets').subscribe(postings => {
        expect(postings).toEqual(mockPostings);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/journal/postings' &&
        req.params.get('startDate') === '2024-01-01' &&
        req.params.get('endDate') === '2024-12-31' &&
        req.params.get('status') === 'CLEARED' &&
        req.params.get('accountName') === '1 Assets'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockPostings);
    });
  });

  describe('getAllBalances', () => {
    it('should return all balances without date', () => {
      const mockBalances: AccountBalanceDTO[] = [
        {
          accountNumber: '1',
          accountName: '1 Assets',
          accountType: 'ASSET',
          balances: { 'CHF': 1000 }
        }
      ];

      service.getAllBalances().subscribe(balances => {
        expect(balances).toEqual(mockBalances);
        expect(balances.length).toBe(1);
      });

      const req = httpMock.expectOne('/api/journal/balances');
      expect(req.request.method).toBe('GET');
      req.flush(mockBalances);
    });

    it('should return all balances with asOfDate parameter', () => {
      const mockBalances: AccountBalanceDTO[] = [];

      service.getAllBalances('2024-12-31').subscribe(balances => {
        expect(balances).toEqual(mockBalances);
      });

      const req = httpMock.expectOne(req => 
        req.url === '/api/journal/balances' &&
        req.params.get('asOfDate') === '2024-12-31'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockBalances);
    });
  });
});
