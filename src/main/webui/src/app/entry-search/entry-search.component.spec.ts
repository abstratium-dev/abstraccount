import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { EntrySearchComponent } from './entry-search.component';
import { Controller, EntrySearchDTO, TagDTO, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('EntrySearchComponent', () => {
  let component: EntrySearchComponent;
  let fixture: ComponentFixture<EntrySearchComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;

  const mockEntries: EntrySearchDTO[] = [
    {
      entryId: 'e1',
      entryOrder: 1,
      entryCommodity: 'CHF',
      entryAmount: 100,
      entryNote: null,
      accountId: '1000',
      accountName: 'Cash',
      accountType: 'ASSET',
      accountNote: null,
      accountParentId: null,
      transactionId: 't1',
      transactionDate: '2024-01-01',
      transactionStatus: 'CLEARED',
      transactionDescription: 'Test entry',
      transactionPartnerId: 'P001',
      transactionPartnerName: 'Partner One',
      transactionTags: [],
      journalId: 'journal1',
      journalTitle: 'Test Journal',
      journalCurrency: 'CHF'
    }
  ];

  const mockTags: TagDTO[] = [
    { key: 'category', value: 'shopping' },
    { key: 'invoice', value: '123' }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', [
      'getEntrySearchResults',
      'getTags'
    ]);

    const journalsSignal = signal([
      { id: 'journal1', title: 'Test Journal', subtitle: null, currency: 'CHF', commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null }
    ]);
    const selectedJournalIdSignal = signal<string | null>('journal1');
    const accountsSignal = signal<AccountTreeNode[]>([
      { id: '1000', name: '1 Assets', type: 'ASSET', note: null, parentId: null, accountCode: 1, children: [
        { id: '1100', name: '1100 Cash', type: 'CASH', note: null, parentId: '1000', accountCode: 1100, children: [] }
      ]}
    ]);

    const modelServiceSpy = jasmine.createSpyObj('ModelService', ['getSelectedJournalId'], {
      journals$: journalsSignal.asReadonly(),
      selectedJournalId$: selectedJournalIdSignal.asReadonly(),
      accounts$: accountsSignal.asReadonly()
    });
    modelServiceSpy.getSelectedJournalId.and.returnValue('journal1');

    await TestBed.configureTestingModule({
      imports: [EntrySearchComponent, FormsModule],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EntrySearchComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load entries on init', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    await component.ngOnInit();
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for setTimeout in ngOnInit
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalledWith('journal1', undefined, undefined);
  });

  it('should load entries and populate the list', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    await component.loadEntries();
    await fixture.whenStable();

    expect(component.entries).toEqual(mockEntries);
    expect(component.loading).toBe(false);
    expect(component.error).toBeNull();
  });

  it('should pass EQL filter string when loading entries', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));
    component.filterString = 'description:*Test*';

    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalledWith('journal1', undefined, 'description:*Test*');
  });

  it('should pass undefined filter when filterString is empty', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));
    component.filterString = '';

    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalledWith('journal1', undefined, undefined);
  });

  it('should update filterString and reload entries on filter change', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    component.onFilterChange('tag:invoice');
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for setTimeout in onFilterChange
    await fixture.whenStable();

    expect(component.filterString).toBe('tag:invoice');
    expect(controller.getEntrySearchResults).toHaveBeenCalledWith('journal1', undefined, 'tag:invoice');
  });

  it('should show error when no journal is selected', async () => {
    modelService.getSelectedJournalId.and.returnValue(null);

    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toBe('No journal selected. Please select a journal from the header.');
    expect(component.loading).toBe(false);
  });

  it('should display backend parse error detail on 400 response', async () => {
    const backendError = { error: { message: 'Invalid token at position 5' }, message: 'Http failure response' };
    controller.getEntrySearchResults.and.returnValue(Promise.reject(backendError));

    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toContain('Invalid token at position 5');
    expect(component.loading).toBe(false);
  });

  it('should fall back to err.message when no error body', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.reject(new Error('Network error')));

    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toContain('Network error');
    expect(component.loading).toBe(false);
  });

  it('should load tags from controller when journal changes', async () => {
    controller.getTags.and.returnValue(Promise.resolve(mockTags));

    await component.loadTags();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('journal1');
    expect(component.tags).toEqual(mockTags);
  });

  it('should calculate commodity totals correctly', () => {
    component.entries = mockEntries;

    const totals = component.getCommodityTotals();

    expect(totals.has('CHF')).toBe(true);
    expect(totals.get('CHF')?.total).toBe(100);
  });

  it('should format amounts correctly', () => {
    expect(component.formatAmount(123.456)).toBe('123.46');
    expect(component.formatAmount(0)).toBe('0.00');
  });

  it('should format dates correctly', () => {
    const formatted = component.formatDate('2024-01-01');
    expect(formatted).toContain('1');
    expect(formatted).toContain('2024');
  });

  it('should display tags correctly', () => {
    const tags = [
      { key: 'invoice', value: '123' },
      { key: 'project', value: null }
    ];

    const display = component.getTagsDisplay(tags);

    expect(display).toContain('invoice:123');
    expect(display).toContain('project');
  });

  it('should display simple tags without null or empty values', () => {
    const tags = [
      { key: 'invoice', value: '123' },
      { key: 'Payment', value: null },
      { key: 'Closing', value: 'null' },
      { key: 'YearEnd', value: '' },
      { key: 'OpeningBalances', value: undefined }
    ];

    const display = component.getTagsDisplay(tags);

    expect(display).toContain('invoice:123');
    expect(display).toContain('Payment');
    expect(display).not.toContain('Payment:null');
    expect(display).toContain('Closing');
    expect(display).not.toContain('Closing:null');
    expect(display).toContain('YearEnd');
    expect(display).not.toContain('YearEnd:');
    expect(display).toContain('OpeningBalances');
    expect(display).not.toContain('OpeningBalances:undefined');
  });

  it('should get selected journal name', () => {
    const name = component.getSelectedJournalName();

    expect(name).toBe('Test Journal');
  });

  it('should identify debit-normal account types', () => {
    expect(component.isDebitNormal('ASSET')).toBe(true);
    expect(component.isDebitNormal('EXPENSE')).toBe(true);
    expect(component.isDebitNormal('CASH')).toBe(true);
    expect(component.isDebitNormal('LIABILITY')).toBe(false);
    expect(component.isDebitNormal('EQUITY')).toBe(false);
    expect(component.isDebitNormal('REVENUE')).toBe(false);
  });

  it('should calculate debit amounts correctly for debit-normal accounts', () => {
    const assetEntry: any = { entryAmount: 100, accountType: 'ASSET', entryCommodity: 'CHF' };

    expect(component.getDebitAmount(assetEntry)).toBe(100);
    expect(component.getCreditAmount(assetEntry)).toBe(0);

    assetEntry.entryAmount = -50;
    expect(component.getDebitAmount(assetEntry)).toBe(0);
    expect(component.getCreditAmount(assetEntry)).toBe(50);
  });

  it('should calculate credit amounts correctly for credit-normal accounts', () => {
    const revenueEntry: any = { entryAmount: 200, accountType: 'REVENUE', entryCommodity: 'CHF' };

    expect(component.getDebitAmount(revenueEntry)).toBe(0);
    expect(component.getCreditAmount(revenueEntry)).toBe(200);

    revenueEntry.entryAmount = -75;
    expect(component.getDebitAmount(revenueEntry)).toBe(75);
    expect(component.getCreditAmount(revenueEntry)).toBe(0);
  });

  it('should calculate debit/credit totals across all entries', () => {
    component.entries = [
      { entryAmount: 100, accountType: 'ASSET', entryCommodity: 'CHF' } as any,
      { entryAmount: -50, accountType: 'ASSET', entryCommodity: 'CHF' } as any,
      { entryAmount: 200, accountType: 'REVENUE', entryCommodity: 'CHF' } as any,
      { entryAmount: -75, accountType: 'EXPENSE', entryCommodity: 'CHF' } as any,
      { entryAmount: 300, accountType: 'LIABILITY', entryCommodity: 'USD' } as any
    ];

    const totals = component.getDebitCreditTotals();

    const chfTotals = totals.get('CHF');
    expect(chfTotals?.debits).toBe(100);
    expect(chfTotals?.credits).toBe(325);
    expect(chfTotals?.net).toBe(175);

    const usdTotals = totals.get('USD');
    expect(usdTotals?.debits).toBe(0);
    expect(usdTotals?.credits).toBe(300);
    expect(usdTotals?.net).toBe(300);
  });

  it('should reload entries when called multiple times', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    await component.loadEntries();
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalledTimes(2);
  });

  // ===== PIVOT TABLE TESTS =====

  const makeEntry = (overrides: Partial<EntrySearchDTO>): EntrySearchDTO => ({
    ...mockEntries[0],
    ...overrides
  });

  describe('extractDimensionValue', () => {
    it('should extract accountType', () => {
      const e = makeEntry({ accountType: 'REVENUE' });
      expect(component.extractDimensionValue(e, 'accountType', '')).toBe('REVENUE');
    });

    it('should extract account name', () => {
      const e = makeEntry({ accountName: 'Savings', accountId: 'acc1' });
      expect(component.extractDimensionValue(e, 'account', '')).toBe('Savings');
    });

    it('should extract transaction id', () => {
      const e = makeEntry({ transactionDescription: 'Grocery shopping', transactionId: 't123' });
      expect(component.extractDimensionValue(e, 'transaction', '')).toBe('t123');
    });

    it('should extract month', () => {
      const e = makeEntry({ transactionDate: '2024-03-15' });
      expect(component.extractDimensionValue(e, 'month', '')).toBe('2024-03');
    });

    it('should extract quarter', () => {
      const e1 = makeEntry({ transactionDate: '2024-01-10' });
      const e2 = makeEntry({ transactionDate: '2024-04-10' });
      const e3 = makeEntry({ transactionDate: '2024-07-10' });
      const e4 = makeEntry({ transactionDate: '2024-10-10' });
      expect(component.extractDimensionValue(e1, 'quarter', '')).toBe('2024-Q1');
      expect(component.extractDimensionValue(e2, 'quarter', '')).toBe('2024-Q2');
      expect(component.extractDimensionValue(e3, 'quarter', '')).toBe('2024-Q3');
      expect(component.extractDimensionValue(e4, 'quarter', '')).toBe('2024-Q4');
    });

    it('should extract year', () => {
      const e = makeEntry({ transactionDate: '2023-06-01' });
      expect(component.extractDimensionValue(e, 'year', '')).toBe('2023');
    });

    it('should extract calendar week in ISO format', () => {
      const e = makeEntry({ transactionDate: '2024-01-08' });
      const result = component.extractDimensionValue(e, 'calendarWeek', '');
      expect(result).toMatch(/^\d{4}-W\d{2}$/);
    });

    it('should extract tag key value when tag key matches', () => {
      const e = makeEntry({ transactionTags: [{ key: 'project', value: 'alpha' }] });
      expect(component.extractDimensionValue(e, 'tagKey', 'project')).toBe('alpha');
    });

    it('should return (none) when tag key is absent', () => {
      const e = makeEntry({ transactionTags: [] });
      expect(component.extractDimensionValue(e, 'tagKey', 'project')).toBe('(none)');
    });

    it('should extract commodity', () => {
      const e = makeEntry({ entryCommodity: 'USD' });
      expect(component.extractDimensionValue(e, 'commodity', '')).toBe('USD');
    });

    it('should extract transactionStatus', () => {
      const e = makeEntry({ transactionStatus: 'PENDING' });
      expect(component.extractDimensionValue(e, 'transactionStatus', '')).toBe('PENDING');
    });

    it('should extract partner name preferring name over id', () => {
      const e = makeEntry({ transactionPartnerName: 'ACME', transactionPartnerId: 'P001' });
      expect(component.extractDimensionValue(e, 'partner', '')).toBe('ACME');
    });

    it('should fall back to partner id when name is absent', () => {
      const e = makeEntry({ transactionPartnerName: null, transactionPartnerId: 'P999' });
      expect(component.extractDimensionValue(e, 'partner', '')).toBe('P999');
    });
  });

  describe('buildPivot', () => {
    beforeEach(() => {
      component.entries = [
        makeEntry({ accountType: 'ASSET',   entryAmount:  100, transactionDate: '2024-01-15', entryCommodity: 'CHF' }),
        makeEntry({ accountType: 'ASSET',   entryAmount:   50, transactionDate: '2024-02-10', entryCommodity: 'CHF' }),
        makeEntry({ accountType: 'EXPENSE', entryAmount:  -30, transactionDate: '2024-01-20', entryCommodity: 'CHF' }),
      ];
      component.pivotConfig = {
        rowDimension: 'accountType',
        colDimension: 'month',
        groupByDimension: 'none',
        tagKeyForRows: '',
        tagKeyForCols: '',
        tagKeyForGroup: '',
        yAxisMin: null,
        yAxisMax: null,
      };
    });

    it('should produce correct rowKeys and colKeys', () => {
      const pt = component.buildPivot();
      expect(pt.rowKeys).toEqual(['ASSET', 'EXPENSE']);
      expect(pt.colKeys).toEqual(['2024-01', '2024-02']);
    });

    it('should produce correct cell totals for ASSET/2024-01', () => {
      const pt = component.buildPivot();
      const cell = pt.cells.get('ASSET||2024-01')!;
      expect(cell).toBeTruthy();
      expect(cell.totals.debits).toBe(100);
      expect(cell.totals.credits).toBe(0);
      expect(cell.totals.net).toBe(100);
    });

    it('should produce correct cell totals for EXPENSE/2024-01', () => {
      const pt = component.buildPivot();
      const cell = pt.cells.get('EXPENSE||2024-01')!;
      expect(cell).toBeTruthy();
      expect(cell.totals.debits).toBe(0);
      expect(cell.totals.credits).toBe(30);
      expect(cell.totals.net).toBe(-30);
    });

    it('should produce correct row totals', () => {
      const pt = component.buildPivot();
      const assetTotal = pt.rowTotals.get('ASSET')!;
      expect(assetTotal.debits).toBe(150);
      expect(assetTotal.net).toBe(150);
      const expenseTotal = pt.rowTotals.get('EXPENSE')!;
      expect(expenseTotal.credits).toBe(30);
    });

    it('should produce correct col totals', () => {
      const pt = component.buildPivot();
      const jan = pt.colTotals.get('2024-01')!;
      expect(jan.debits).toBe(100);
      expect(jan.credits).toBe(30);
    });

    it('should produce correct grand total', () => {
      const pt = component.buildPivot();
      expect(pt.grandTotal.debits).toBe(150);
      expect(pt.grandTotal.credits).toBe(30);
      expect(pt.grandTotal.net).toBe(120);
    });

    it('should produce no sub-groups when groupByDimension is none', () => {
      const pt = component.buildPivot();
      for (const cell of pt.cells.values()) {
        expect(cell.subGroups.length).toBe(0);
      }
    });

    it('should produce sub-groups when groupByDimension is set', () => {
      component.entries = [
        makeEntry({ accountType: 'ASSET', accountName: 'Cash',    entryAmount: 100, transactionDate: '2024-01-15' }),
        makeEntry({ accountType: 'ASSET', accountName: 'Savings', entryAmount:  50, transactionDate: '2024-01-20' }),
      ];
      component.pivotConfig.groupByDimension = 'account';
      const pt = component.buildPivot();
      const cell = pt.cells.get('ASSET||2024-01')!;
      expect(cell.subGroups.length).toBe(2);
      const cashGroup = cell.subGroups.find(g => g.label === 'Cash')!;
      expect(cashGroup.amounts.debits).toBe(100);
      const savingsGroup = cell.subGroups.find(g => g.label === 'Savings')!;
      expect(savingsGroup.amounts.debits).toBe(50);
    });

    it('should sort sub-group labels alphabetically', () => {
      component.entries = [
        makeEntry({ accountType: 'ASSET', accountName: 'Zeta',  entryAmount: 10, transactionDate: '2024-01-01' }),
        makeEntry({ accountType: 'ASSET', accountName: 'Alpha', entryAmount: 20, transactionDate: '2024-01-02' }),
      ];
      component.pivotConfig.groupByDimension = 'account';
      const pt = component.buildPivot();
      const cell = pt.cells.get('ASSET||2024-01')!;
      expect(cell.subGroups[0].label).toBe('Alpha');
      expect(cell.subGroups[1].label).toBe('Zeta');
    });
  });

  describe('getPivotCell', () => {
    it('should return the cell for a given row/col pair', () => {
      component.entries = [makeEntry({ accountType: 'ASSET', entryAmount: 100, transactionDate: '2024-01-01' })];
      component.pivotConfig = { rowDimension: 'accountType', colDimension: 'month', groupByDimension: 'none', tagKeyForRows: '', tagKeyForCols: '', tagKeyForGroup: '', yAxisMin: null, yAxisMax: null };
      component.pivotTable = component.buildPivot();

      const cell = component.getPivotCell('ASSET', '2024-01');
      expect(cell).toBeTruthy();
      expect(cell!.totals.debits).toBe(100);
    });

    it('should return null for a missing cell', () => {
      component.entries = [makeEntry({ accountType: 'ASSET', entryAmount: 100, transactionDate: '2024-01-01' })];
      component.pivotConfig = { rowDimension: 'accountType', colDimension: 'month', groupByDimension: 'none', tagKeyForRows: '', tagKeyForCols: '', tagKeyForGroup: '', yAxisMin: null, yAxisMax: null };
      component.pivotTable = component.buildPivot();

      expect(component.getPivotCell('EXPENSE', '2024-01')).toBeNull();
    });

    it('should return null when pivotTable is null', () => {
      component.pivotTable = null;
      expect(component.getPivotCell('ASSET', '2024-01')).toBeNull();
    });
  });

  describe('toggleEntries', () => {
    it('should hide entries when toggleEntries is called and entries are visible', () => {
      component.showEntries = true;
      component.toggleEntries();
      expect(component.showEntries).toBe(false);
    });

    it('should show entries when toggleEntries is called and entries are hidden', () => {
      component.showEntries = false;
      component.toggleEntries();
      expect(component.showEntries).toBe(true);
    });
  });

  describe('toggleFilters', () => {
    it('should hide filters when toggleFilters is called and filters are visible', () => {
      component.showFilters = true;
      component.toggleFilters();
      expect(component.showFilters).toBe(false);
    });

    it('should show filters when toggleFilters is called and filters are hidden', () => {
      component.showFilters = false;
      component.toggleFilters();
      expect(component.showFilters).toBe(true);
    });
  });

  describe('togglePivot', () => {
    it('should show pivot and build table on first toggle', () => {
      controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));
      component.entries = mockEntries;
      expect(component.showPivot).toBe(false);

      component.togglePivot();

      expect(component.showPivot).toBe(true);
      expect(component.pivotTable).toBeTruthy();
    });

    it('should hide pivot on second toggle without clearing the table', () => {
      component.entries = mockEntries;
      component.togglePivot();
      component.togglePivot();
      expect(component.showPivot).toBe(false);
    });
  });

  describe('getTagKeysForDimension', () => {
    it('should return sorted unique tag keys from current entries', () => {
      component.entries = [
        makeEntry({ transactionTags: [{ key: 'project', value: 'alpha' }, { key: 'invoice', value: '1' }] }),
        makeEntry({ transactionTags: [{ key: 'project', value: 'beta' }] }),
      ];
      const keys = component.getTagKeysForDimension();
      expect(keys).toEqual(['invoice', 'project']);
    });

    it('should return empty array when entries have no tags', () => {
      component.entries = [makeEntry({ transactionTags: [] })];
      expect(component.getTagKeysForDimension()).toEqual([]);
    });
  });

  describe('getDimensionLabel', () => {
    it('should return "None (simple sum)" for none', () => {
      expect(component.getDimensionLabel('none')).toBe('None (simple sum)');
    });

    it('should return the label for a known dimension', () => {
      expect(component.getDimensionLabel('accountType')).toBe('Account Type');
      expect(component.getDimensionLabel('calendarWeek')).toBe('Calendar Week');
    });
  });

  describe('localStorage persistence', () => {
    const STORAGE_KEY = 'abstraccount:entrySearch';

    beforeEach(() => {
      localStorage.clear();
    });

    it('should not load filterString from entrySearch storage (uses globalEql key instead)', () => {
      // filterString is loaded from 'abstraccount:globalEql' key, not STORAGE_KEY
      // This test verifies that loadFromStorage does NOT change filterString
      const initialFilter = component.filterString;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ filterString: 'tag:invoice' }));
      component.loadFromStorage();
      // filterString should remain unchanged (loaded from different key in constructor)
      expect(component.filterString).toBe(initialFilter);
    });

    it('should load visibility flags from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        showEntries: false,
        showFilters: false,
        showPivot: true
      }));
      component.loadFromStorage();
      expect(component.showEntries).toBe(false);
      expect(component.showFilters).toBe(false);
      expect(component.showPivot).toBe(true);
    });

    it('should load pivotConfig from localStorage', () => {
      const storedConfig = {
        rowDimension: 'account',
        colDimension: 'quarter',
        groupByDimension: 'transaction',
        tagKeyForRows: 'project',
        tagKeyForCols: 'invoice',
        tagKeyForGroup: 'category'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ pivotConfig: storedConfig }));
      component.loadFromStorage();
      expect(component.pivotConfig.rowDimension).toBe('account');
      expect(component.pivotConfig.colDimension).toBe('quarter');
      expect(component.pivotConfig.groupByDimension).toBe('transaction');
      expect(component.pivotConfig.tagKeyForRows).toBe('project');
    });

    it('should merge partial pivotConfig from localStorage with defaults', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        pivotConfig: { rowDimension: 'partner' }
      }));
      component.loadFromStorage();
      expect(component.pivotConfig.rowDimension).toBe('partner');
      expect(component.pivotConfig.colDimension).toBe('month'); // default
    });

    it('should not save filterString to entrySearch storage when filter changes', () => {
      // filterString is NOT saved to STORAGE_KEY by onFilterChange
      // It may be saved to 'abstraccount:globalEql' instead
      component.filterString = 'tag:test';
      component.onFilterChange('tag:invoice');
      const storedRaw = localStorage.getItem(STORAGE_KEY);
      // onFilterChange doesn't call saveToStorage, so either nothing is saved
      // or if something was saved before, it shouldn't contain filterString
      if (storedRaw) {
        const stored = JSON.parse(storedRaw);
        expect(stored.filterString).toBeUndefined();
      }
      // If nothing saved, that's also valid behavior
      expect(component.filterString).toBe('tag:invoice');
    });

    it('should save to localStorage when toggling entries', () => {
      component.showEntries = true;
      component.toggleEntries();
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.showEntries).toBe(false);
    });

    it('should save to localStorage when toggling filters', () => {
      component.showFilters = true;
      component.toggleFilters();
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.showFilters).toBe(false);
    });

    it('should save to localStorage when toggling pivot', () => {
      component.showPivot = false;
      component.entries = mockEntries;
      component.togglePivot();
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.showPivot).toBe(true);
    });

    it('should save to localStorage when pivot config changes', () => {
      component.pivotConfig.rowDimension = 'accountType';
      component.onPivotConfigChange();
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.pivotConfig.rowDimension).toBe('accountType');
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json{{{');
      expect(() => component.loadFromStorage()).not.toThrow();
    });

    it('should handle missing localStorage gracefully', () => {
      localStorage.removeItem(STORAGE_KEY);
      expect(() => component.loadFromStorage()).not.toThrow();
    });
  });

  describe('getAccountNumber', () => {
    it('should extract account number from name with space', () => {
      expect(component.getAccountNumber('1100 Cash')).toBe('1100');
    });

    it('should return full name when no space', () => {
      expect(component.getAccountNumber('Cash')).toBe('Cash');
    });

    it('should handle empty string', () => {
      expect(component.getAccountNumber('')).toBe('');
    });
  });

  describe('getAccountDisplayName', () => {
    it('should extract display name from account name', () => {
      expect(component.getAccountDisplayName('1100 Cash')).toBe(' Cash');
    });

    it('should return full name when no space', () => {
      expect(component.getAccountDisplayName('Cash')).toBe('Cash');
    });
  });

  describe('buildPivot representative tracking', () => {
    it('should track row representatives', () => {
      component.entries = [
        makeEntry({ accountType: 'ASSET', entryAmount: 100, transactionId: 't1' }),
        makeEntry({ accountType: 'LIABILITY', entryAmount: 50, transactionId: 't2' })
      ];
      component.pivotConfig = {
        rowDimension: 'accountType',
        colDimension: 'month',
        groupByDimension: 'none',
        tagKeyForRows: '',
        tagKeyForCols: '',
        tagKeyForGroup: '',
        yAxisMin: null,
        yAxisMax: null,
      };
      const pt = component.buildPivot();

      expect(pt.rowRepresentatives.get('ASSET')?.transactionId).toBe('t1');
      expect(pt.rowRepresentatives.get('LIABILITY')?.transactionId).toBe('t2');
    });

    it('should track col representatives', () => {
      component.entries = [
        makeEntry({ transactionDate: '2024-01-01', entryAmount: 100, transactionId: 't1' }),
        makeEntry({ transactionDate: '2024-02-01', entryAmount: 50, transactionId: 't2' })
      ];
      component.pivotConfig = {
        rowDimension: 'accountType',
        colDimension: 'month',
        groupByDimension: 'none',
        tagKeyForRows: '',
        tagKeyForCols: '',
        tagKeyForGroup: '',
        yAxisMin: null,
        yAxisMax: null,
      };
      const pt = component.buildPivot();

      expect(pt.colRepresentatives.get('2024-01')?.transactionId).toBe('t1');
      expect(pt.colRepresentatives.get('2024-02')?.transactionId).toBe('t2');
    });

    it('should track group representatives when groupByDimension is set', () => {
      component.entries = [
        makeEntry({ accountType: 'ASSET', accountName: 'Cash', transactionDate: '2024-01-01', entryAmount: 100, transactionId: 't1' }),
        makeEntry({ accountType: 'ASSET', accountName: 'Bank', transactionDate: '2024-01-01', entryAmount: 50, transactionId: 't2' })
      ];
      component.pivotConfig = {
        rowDimension: 'accountType',
        colDimension: 'month',
        groupByDimension: 'account',
        tagKeyForRows: '',
        tagKeyForCols: '',
        tagKeyForGroup: '',
        yAxisMin: null,
        yAxisMax: null,
      };
      const pt = component.buildPivot();

      const cellKey = 'ASSET||2024-01';
      expect(pt.cellGroupRepresentatives.get(cellKey)?.get('Cash')?.transactionId).toBe('t1');
      expect(pt.cellGroupRepresentatives.get(cellKey)?.get('Bank')?.transactionId).toBe('t2');
    });
  });

  it('should render account as a link to the ledger using hierarchical name', async () => {
    const entriesWithKnownAccount: EntrySearchDTO[] = [{
      ...mockEntries[0],
      accountId: '1100',
      accountName: '1100 Cash'
    }];
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(entriesWithKnownAccount));
    controller.getTags.and.returnValue(Promise.resolve([]));

    fixture.detectChanges();
    await component.loadEntries();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Ancestor number link (parent "1 Assets" → segment number "1")
    const parentLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a.path-segment[href*="/account/1000/ledger"]');
    expect(parentLink).toBeTruthy('Expected a path-segment link for ancestor account 1000');
    expect(parentLink!.textContent?.trim()).toBe('1');

    // Leaf number link (account "1100 Cash" → number "1100")
    const leafLink: HTMLAnchorElement = fixture.nativeElement.querySelector('a.path-segment[href*="/account/1100/ledger"]');
    expect(leafLink).toBeTruthy('Expected a path-segment link for leaf account 1100');
    expect(leafLink!.textContent?.trim()).toBe('1100');

    // Leaf name as plain text
    const nameSpan: HTMLElement = fixture.nativeElement.querySelector('.entry-account-name');
    expect(nameSpan).toBeTruthy();
    expect(nameSpan!.textContent?.trim()).toBe('Cash');
  });
});
