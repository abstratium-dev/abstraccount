import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { EntrySearchComponent } from './entry-search.component';
import { Controller, EntrySearchDTO, TagDTO } from '../controller';
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
      { id: 'journal1', title: 'Test Journal', subtitle: null, currency: 'CHF', commodities: { CHF: '1000.00' } }
    ]);
    const selectedJournalIdSignal = signal<string | null>('journal1');

    const modelServiceSpy = jasmine.createSpyObj('ModelService', ['getSelectedJournalId'], {
      journals$: journalsSignal.asReadonly(),
      selectedJournalId$: selectedJournalIdSignal.asReadonly()
    });
    modelServiceSpy.getSelectedJournalId.and.returnValue('journal1');

    await TestBed.configureTestingModule({
      imports: [EntrySearchComponent, FormsModule],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting()
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
});
