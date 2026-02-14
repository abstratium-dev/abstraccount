import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { JournalComponent } from './journal.component';
import { JournalApiService, JournalMetadataDTO, AccountSummaryDTO, AccountBalanceDTO, PostingDTO } from './journal-api.service';

describe('JournalComponent', () => {
  let component: JournalComponent;
  let fixture: ComponentFixture<JournalComponent>;
  let mockJournalApi: jasmine.SpyObj<JournalApiService>;

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

  const mockBalance: AccountBalanceDTO = {
    accountNumber: '1',
    accountName: '1 Assets',
    accountType: 'ASSET',
    balances: { 'CHF': 1000.50 }
  };

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
    },
    {
      transactionDate: '2024-01-02',
      transactionStatus: 'PENDING',
      transactionDescription: 'Purchase',
      transactionId: 'tx-2',
      accountNumber: '1',
      accountName: '1 Assets',
      accountType: 'ASSET',
      commodity: 'CHF',
      amount: -50.25,
      runningBalance: 949.75
    }
  ];

  beforeEach(async () => {
    mockJournalApi = jasmine.createSpyObj('JournalApiService', [
      'listJournals',
      'getJournalMetadata',
      'getAccounts',
      'getAccountBalance',
      'getAccountPostings',
      'getAllPostings',
      'getAllBalances'
    ]);

    await TestBed.configureTestingModule({
      imports: [JournalComponent, FormsModule],
      providers: [
        { provide: JournalApiService, useValue: mockJournalApi }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JournalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load journals on init', () => {
      mockJournalApi.listJournals.and.returnValue(of(mockJournals));

      fixture.detectChanges(); // triggers ngOnInit

      expect(mockJournalApi.listJournals).toHaveBeenCalled();
      expect(component.journals).toEqual(mockJournals);
      expect(component.loading).toBe(false);
    });

    it('should auto-select journal if only one exists', () => {
      const singleJournal = [mockJournals[0]];
      mockJournalApi.listJournals.and.returnValue(of(singleJournal));
      mockJournalApi.getAccounts.and.returnValue(of(mockAccounts));

      fixture.detectChanges();

      expect(component.selectedJournal).toEqual(singleJournal[0]);
      expect(mockJournalApi.getAccounts).toHaveBeenCalled();
    });

    it('should not auto-select if multiple journals exist', () => {
      mockJournalApi.listJournals.and.returnValue(of(mockJournals));

      fixture.detectChanges();

      expect(component.selectedJournal).toBeNull();
      expect(mockJournalApi.getAccounts).not.toHaveBeenCalled();
    });

    it('should handle error loading journals', () => {
      const error = new Error('Failed to load');
      mockJournalApi.listJournals.and.returnValue(throwError(() => error));

      fixture.detectChanges();

      expect(component.error).toContain('Failed to load journals');
      expect(component.loading).toBe(false);
    });
  });

  describe('onJournalSelected', () => {
    beforeEach(() => {
      mockJournalApi.listJournals.and.returnValue(of(mockJournals));
      fixture.detectChanges();
    });

    it('should load accounts when journal is selected', () => {
      mockJournalApi.getAccounts.and.returnValue(of(mockAccounts));
      
      component.selectedJournal = mockJournals[0];
      component.onJournalSelected();

      expect(mockJournalApi.getAccounts).toHaveBeenCalled();
      expect(component.accounts).toEqual(mockAccounts);
    });

    it('should clear accounts when journal is deselected', () => {
      component.accounts = mockAccounts;
      component.selectedAccount = '1 Assets';
      component.postings = mockPostings;
      component.balance = mockBalance;

      component.selectedJournal = null;
      component.onJournalSelected();

      expect(component.accounts).toEqual([]);
      expect(component.selectedAccount).toBeNull();
      expect(component.postings).toEqual([]);
      expect(component.balance).toBeNull();
    });

    it('should handle error loading accounts', () => {
      const error = new Error('Failed to load');
      mockJournalApi.getAccounts.and.returnValue(throwError(() => error));

      component.selectedJournal = mockJournals[0];
      component.onJournalSelected();

      expect(component.error).toContain('Failed to load accounts');
      expect(component.loading).toBe(false);
    });
  });

  describe('onAccountSelected', () => {
    beforeEach(() => {
      mockJournalApi.listJournals.and.returnValue(of(mockJournals));
      mockJournalApi.getAccounts.and.returnValue(of(mockAccounts));
      fixture.detectChanges();
      component.selectedJournal = mockJournals[0];
      component.onJournalSelected();
    });

    it('should load postings and balance when account is selected', () => {
      mockJournalApi.getAccountPostings.and.returnValue(of(mockPostings));
      mockJournalApi.getAccountBalance.and.returnValue(of(mockBalance));

      component.selectedAccount = '1 Assets';
      component.onAccountSelected();

      expect(mockJournalApi.getAccountPostings).toHaveBeenCalledWith('1 Assets', undefined, undefined, undefined);
      expect(mockJournalApi.getAccountBalance).toHaveBeenCalledWith('1 Assets');
      expect(component.postings).toEqual(mockPostings);
      expect(component.balance).toEqual(mockBalance);
    });

    it('should clear postings and balance when account is deselected', () => {
      component.postings = mockPostings;
      component.balance = mockBalance;

      component.selectedAccount = null;
      component.onAccountSelected();

      expect(component.postings).toEqual([]);
      expect(component.balance).toBeNull();
    });

    it('should handle error loading postings', () => {
      const error = new Error('Failed to load');
      mockJournalApi.getAccountPostings.and.returnValue(throwError(() => error));
      mockJournalApi.getAccountBalance.and.returnValue(of(mockBalance));

      component.selectedAccount = '1 Assets';
      component.onAccountSelected();

      expect(component.error).toContain('Failed to load postings');
      expect(component.loading).toBe(false);
    });
  });

  describe('applyFilters', () => {
    beforeEach(() => {
      mockJournalApi.listJournals.and.returnValue(of(mockJournals));
      mockJournalApi.getAccounts.and.returnValue(of(mockAccounts));
      mockJournalApi.getAccountPostings.and.returnValue(of(mockPostings));
      mockJournalApi.getAccountBalance.and.returnValue(of(mockBalance));
      fixture.detectChanges();
      component.selectedJournal = mockJournals[0];
      component.selectedAccount = '1 Assets';
    });

    it('should reload postings with filters', () => {
      component.startDate = '2024-01-01';
      component.endDate = '2024-12-31';
      component.status = 'CLEARED';

      component.applyFilters();

      expect(mockJournalApi.getAccountPostings).toHaveBeenCalledWith(
        '1 Assets',
        '2024-01-01',
        '2024-12-31',
        'CLEARED'
      );
    });
  });

  describe('clearFilters', () => {
    beforeEach(() => {
      mockJournalApi.listJournals.and.returnValue(of(mockJournals));
      mockJournalApi.getAccounts.and.returnValue(of(mockAccounts));
      mockJournalApi.getAccountPostings.and.returnValue(of(mockPostings));
      mockJournalApi.getAccountBalance.and.returnValue(of(mockBalance));
      fixture.detectChanges();
      component.selectedJournal = mockJournals[0];
      component.selectedAccount = '1 Assets';
    });

    it('should clear filter values and reload postings', () => {
      component.startDate = '2024-01-01';
      component.endDate = '2024-12-31';
      component.status = 'CLEARED';

      component.clearFilters();

      expect(component.startDate).toBe('');
      expect(component.endDate).toBe('');
      expect(component.status).toBe('');
      expect(mockJournalApi.getAccountPostings).toHaveBeenCalledWith('1 Assets', undefined, undefined, undefined);
    });
  });

  describe('formatAmount', () => {
    it('should format amount to 2 decimal places', () => {
      expect(component.formatAmount(1000)).toBe('1000.00');
      expect(component.formatAmount(50.5)).toBe('50.50');
      expect(component.formatAmount(-123.456)).toBe('-123.46');
    });
  });

  describe('formatDate', () => {
    it('should format date string to locale date', () => {
      const formatted = component.formatDate('2024-01-15');
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
    });
  });

  describe('getBalanceString', () => {
    it('should return empty string when no balance', () => {
      component.balance = null;
      expect(component.getBalanceString()).toBe('');
    });

    it('should format single commodity balance', () => {
      component.balance = {
        accountNumber: '1',
        accountName: '1 Assets',
        accountType: 'ASSET',
        balances: { 'CHF': 1000.50 }
      };
      expect(component.getBalanceString()).toBe('CHF 1000.50');
    });

    it('should format multiple commodity balances', () => {
      component.balance = {
        accountNumber: '1',
        accountName: '1 Assets',
        accountType: 'ASSET',
        balances: { 'CHF': 1000.50, 'USD': 500.25 }
      };
      const result = component.getBalanceString();
      expect(result).toContain('CHF 1000.50');
      expect(result).toContain('USD 500.25');
    });
  });
});
