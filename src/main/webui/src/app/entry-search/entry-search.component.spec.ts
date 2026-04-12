import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { EntrySearchComponent } from './entry-search.component';
import { Controller, EntrySearchDTO, AccountTreeNode, PartnerDTO } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('EntrySearchComponent', () => {
  let component: EntrySearchComponent;
  let fixture: ComponentFixture<EntrySearchComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;
  let accountService: jasmine.SpyObj<AccountService>;

  const mockAccounts: AccountTreeNode[] = [
    {
      id: '1000',
      name: 'Cash',
      type: 'ASSET',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: '2000',
      name: 'Revenue',
      type: 'REVENUE',
      note: null,
      parentId: null,
      children: []
    }
  ];

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

  const mockPartners: PartnerDTO[] = [
    { partnerNumber: 'P001', name: 'Partner One' },
    { partnerNumber: 'P002', name: 'Partner Two' }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', [
      'getEntrySearchResults',
      'searchPartners',
      'getEntrySearchTags'
    ]);

    const accountsSignal = signal<AccountTreeNode[]>(mockAccounts);
    const journalsSignal = signal([
      { id: 'journal1', title: 'Test Journal', subtitle: null, currency: 'CHF', commodities: { CHF: '1000.00' } }
    ]);
    const selectedJournalIdSignal = signal<string | null>('journal1');

    const modelServiceSpy = jasmine.createSpyObj('ModelService', ['getSelectedJournalId', 'getAccounts'], {
      accounts$: accountsSignal.asReadonly(),
      journals$: journalsSignal.asReadonly(),
      selectedJournalId$: selectedJournalIdSignal.asReadonly()
    });
    modelServiceSpy.getAccounts.and.returnValue(mockAccounts);
    modelServiceSpy.getSelectedJournalId.and.returnValue('journal1');

    const accountServiceSpy = jasmine.createSpyObj('AccountService', [
      'buildHierarchicalPath',
      'findAccountById'
    ]);

    await TestBed.configureTestingModule({
      imports: [EntrySearchComponent, FormsModule],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelServiceSpy },
        { provide: AccountService, useValue: accountServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EntrySearchComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
    accountService = TestBed.inject(AccountService) as jasmine.SpyObj<AccountService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load entries on init', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    await component.ngOnInit();
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalled();
  });

  it('should load entries when journal is selected', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalled();
    expect(component.entries).toEqual(mockEntries);
    expect(component.loading).toBe(false);
  });

  it('should show error when loadEntries is called without journal', async () => {
    // Directly test the loadEntries method's error handling
    // by temporarily overriding the getSelectedJournalId return value
    const originalReturn = modelService.getSelectedJournalId.and.returnValue(null);

    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toBe('No journal selected. Please select a journal from the header.');
    expect(component.loading).toBe(false);
    
    // Restore original behavior
    modelService.getSelectedJournalId.and.returnValue('journal1');
  });

  it('should handle errors when loading entries', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.reject(new Error('Network error')));

    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toContain('Failed to load entries');
    expect(component.loading).toBe(false);
  });

  it('should clear filters', async () => {
    component.filters.accountIdOrPattern = '1000';
    component.filters.partnerId = 'P001';
    component.selectedAccountId = '1000';
    component.selectedPartnerId = 'P001';
    component.selectedTags = [{ spec: 'category:shopping', isNegation: false }];
    component.tagNegationMode = true;
    controller.getEntrySearchResults.and.returnValue(Promise.resolve([]));

    component.clearFilters();
    await fixture.whenStable();

    expect(component.filters.accountIdOrPattern).toBe('');
    expect(component.filters.partnerId).toBe('');
    expect(component.selectedAccountId).toBeNull();
    expect(component.selectedPartnerId).toBeNull();
    expect(component.selectedTags.length).toBe(0);
    expect(component.tagNegationMode).toBe(false);
  });

  it('should fetch partner options', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));

    const options = await component.fetchPartnerOptions('Partner');

    expect(controller.searchPartners).toHaveBeenCalledWith('Partner');
    expect(options.length).toBe(2);
    expect(options[0].value).toBe('P001');
    expect(options[0].label).toBe('P001 - Partner One');
  });

  it('should handle partner selection', () => {
    component.onPartnerSelected({ value: 'P001', label: 'P001 - Partner One' });

    expect(component.selectedPartnerId).toBe('P001');
    expect(component.filters.partnerId).toBe('P001');
  });

  it('should handle partner deselection', () => {
    component.selectedPartnerId = 'P001';
    component.filters.partnerId = 'P001';

    component.onPartnerSelected(null);

    expect(component.selectedPartnerId).toBeNull();
    expect(component.filters.partnerId).toBe('');
  });

  it('should fetch tag options', async () => {
    const mockTags = ['invoice:123', 'project:ABC'];
    controller.getEntrySearchTags.and.returnValue(Promise.resolve(mockTags));

    const options = await component.fetchTagOptions('invoice');

    expect(controller.getEntrySearchTags).toHaveBeenCalledWith('journal1');
    expect(options.length).toBeGreaterThan(0);
  });

  it('should handle tag selection', () => {
    spyOn(component, 'loadEntries');
    component.onTagSelected({ value: 'invoice:123', label: 'invoice:123' });

    expect(component.selectedTags.length).toBe(1);
    expect(component.selectedTags[0].spec).toBe('invoice:123');
    expect(component.selectedTags[0].isNegation).toBe(false);
    expect(component.loadEntries).toHaveBeenCalled();
  });

  it('should handle free text tag entry', () => {
    spyOn(component, 'loadEntries');
    component.onTagFreeTextEntered('custom:pattern');

    expect(component.selectedTags.length).toBe(1);
    expect(component.selectedTags[0].spec).toBe('custom:pattern');
    expect(component.selectedTags[0].isNegation).toBe(false);
    expect(component.loadEntries).toHaveBeenCalled();
  });

  it('should handle regex pattern tag entry', () => {
    spyOn(component, 'loadEntries');
    component.onTagFreeTextEntered('YearEnd:.*');

    expect(component.selectedTags.length).toBe(1);
    expect(component.selectedTags[0].spec).toBe('YearEnd:.*');
    expect(component.loadEntries).toHaveBeenCalled();
  });

  it('should handle negated tag selection', () => {
    spyOn(component, 'loadEntries');
    component.tagNegationMode = true;
    component.onTagSelected({ value: 'invoice:123', label: 'invoice:123' });

    expect(component.selectedTags.length).toBe(1);
    expect(component.selectedTags[0].spec).toBe('not:invoice:123');
    expect(component.selectedTags[0].isNegation).toBe(true);
    expect(component.loadEntries).toHaveBeenCalled();
  });

  it('should handle negated free text entry', () => {
    spyOn(component, 'loadEntries');
    component.tagNegationMode = true;
    component.onTagFreeTextEntered('exclude:.*');

    expect(component.selectedTags.length).toBe(1);
    expect(component.selectedTags[0].spec).toBe('not:exclude:.*');
    expect(component.selectedTags[0].isNegation).toBe(true);
    expect(component.loadEntries).toHaveBeenCalled();
  });

  it('should remove tag', () => {
    spyOn(component, 'loadEntries');
    component.selectedTags = [
      { spec: 'tag1:value', isNegation: false },
      { spec: 'tag2:value', isNegation: false }
    ];

    component.removeTag(0);

    expect(component.selectedTags.length).toBe(1);
    expect(component.selectedTags[0].spec).toBe('tag2:value');
    expect(component.loadEntries).toHaveBeenCalled();
  });

  it('should clear all tags', () => {
    spyOn(component, 'loadEntries');
    component.selectedTags = [
      { spec: 'tag1:value', isNegation: false },
      { spec: 'not:tag2:value', isNegation: true }
    ];

    component.clearAllTags();

    expect(component.selectedTags.length).toBe(0);
    expect(component.loadEntries).toHaveBeenCalled();
  });

  it('should toggle tag negation mode', () => {
    expect(component.tagNegationMode).toBe(false);

    component.toggleTagNegationMode();

    expect(component.tagNegationMode).toBe(true);

    component.toggleTagNegationMode();

    expect(component.tagNegationMode).toBe(false);
  });

  it('should avoid duplicate tags', () => {
    spyOn(component, 'loadEntries');
    component.onTagSelected({ value: 'unique:tag', label: 'unique:tag' });
    component.onTagSelected({ value: 'unique:tag', label: 'unique:tag' });

    expect(component.selectedTags.length).toBe(1);
    expect(component.loadEntries).toHaveBeenCalledTimes(1); // Only called once for first addition
  });

  it('should get correct tag display', () => {
    const normalTag = { spec: 'category:shopping', isNegation: false };
    const negatedTag = { spec: 'not:category:food', isNegation: true };

    expect(component.getTagDisplay(normalTag)).toBe('category:shopping');
    expect(component.getTagDisplay(negatedTag)).toBe('NOT category:food');
  });

  it('should include tagList in filters when loading entries', async () => {
    component.selectedTags = [
      { spec: 'category:shopping', isNegation: false },
      { spec: 'not:invoice:draft', isNegation: true }
    ];
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    await component.loadEntries();
    await fixture.whenStable();

    const expectedTagList = ['category:shopping', 'not:invoice:draft'];
    expect(controller.getEntrySearchResults).toHaveBeenCalledWith(
      jasmine.objectContaining({ tagList: expectedTagList })
    );
  });

  it('should handle account selection', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    component.onAccountSelected({ value: '1000', label: '1000 - Cash' });
    await fixture.whenStable();

    expect(component.selectedAccountId).toBe('1000');
    expect(component.filters.accountIdOrPattern).toBe('1000');
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
    const assetEntry: any = {
      entryAmount: 100,
      accountType: 'ASSET',
      entryCommodity: 'CHF'
    };
    
    // Debit-normal: positive = debit, negative = credit
    expect(component.getDebitAmount(assetEntry)).toBe(100);
    expect(component.getCreditAmount(assetEntry)).toBe(0);
    
    assetEntry.entryAmount = -50;
    expect(component.getDebitAmount(assetEntry)).toBe(0);
    expect(component.getCreditAmount(assetEntry)).toBe(50);
  });

  it('should calculate credit amounts correctly for credit-normal accounts', () => {
    const revenueEntry: any = {
      entryAmount: 200,
      accountType: 'REVENUE',
      entryCommodity: 'CHF'
    };
    
    // Credit-normal: positive = credit, negative = debit
    expect(component.getDebitAmount(revenueEntry)).toBe(0);
    expect(component.getCreditAmount(revenueEntry)).toBe(200);
    
    revenueEntry.entryAmount = -75;
    expect(component.getDebitAmount(revenueEntry)).toBe(75);
    expect(component.getCreditAmount(revenueEntry)).toBe(0);
  });

  it('should calculate debit/credit totals across all entries', () => {
    component.entries = [
      { entryAmount: 100, accountType: 'ASSET', entryCommodity: 'CHF' } as any,      // Dr: 100, Cr: 0
      { entryAmount: -50, accountType: 'ASSET', entryCommodity: 'CHF' } as any,     // Dr: 0, Cr: 50
      { entryAmount: 200, accountType: 'REVENUE', entryCommodity: 'CHF' } as any,    // Dr: 0, Cr: 200
      { entryAmount: -75, accountType: 'EXPENSE', entryCommodity: 'CHF' } as any,   // Dr: 0, Cr: 75
      { entryAmount: 300, accountType: 'LIABILITY', entryCommodity: 'USD' } as any  // Dr: 0, Cr: 300 (different commodity)
    ];
    
    const totals = component.getDebitCreditTotals();
    
    // CHF totals: Dr: 100, Cr: 50+200+75 = 325, Net: 100-50+200-75 = 175
    const chfTotals = totals.get('CHF');
    expect(chfTotals?.debits).toBe(100);
    expect(chfTotals?.credits).toBe(325);
    expect(chfTotals?.net).toBe(175);
    
    // USD totals: Dr: 0, Cr: 300, Net: 300
    const usdTotals = totals.get('USD');
    expect(usdTotals?.debits).toBe(0);
    expect(usdTotals?.credits).toBe(300);
    expect(usdTotals?.net).toBe(300);
  });

  it('should reload entries when journal changes', async () => {
    controller.getEntrySearchResults.and.returnValue(Promise.resolve(mockEntries));

    // Initial load
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalledTimes(1);

    // Simulate journal change by manually triggering the effect logic
    // In the actual component, the effect watches selectedJournalId$()
    (component as any).lastJournalId = 'journal1';
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getEntrySearchResults).toHaveBeenCalledTimes(2);
  });
});
