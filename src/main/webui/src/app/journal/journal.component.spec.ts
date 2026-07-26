import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { JournalComponent } from './journal.component';
import { Controller } from '../controller';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('JournalComponent', () => {
  let component: JournalComponent;
  let fixture: ComponentFixture<JournalComponent>;
  let controller: jasmine.SpyObj<Controller>;

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', [
      'listJournals',
      'getJournalMetadata',
      'getTransactions',
      'getTags',
      'setSelectedJournalId',
      'getAccountTree',
      'exportJournal'
    ]);

    await TestBed.configureTestingModule({
      imports: [JournalComponent, FormsModule],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JournalComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load journals on init', async () => {
    const mockJournals = [
      { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null }
    ];
    controller.listJournals.and.returnValue(Promise.resolve(mockJournals));

    await component.ngOnInit();
    await fixture.whenStable();

    expect(controller.listJournals).toHaveBeenCalled();
  });

  it('should load tags and transactions when journal is selected', async () => {
    const mockTags = [{ key: 'invoice', value: '1234' }];
    const mockTransactions: any[] = [];
    controller.getTags.and.returnValue(Promise.resolve(mockTags));
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null };
    await component.loadTags();
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('1');
    expect(controller.getTransactions).toHaveBeenCalled();
    expect(component.tags).toEqual(mockTags);
  });

  it('should load transactions when journal is selected', async () => {
    const mockTransactions = [
      {
        id: '1',
        date: '2024-01-01',
        status: 'CLEARED',
        description: 'Test transaction',
        partnerId: null,
      partnerName: null,
        tags: [],
        entries: []
      }
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null };
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, undefined);
    expect(component.transactions).toEqual(mockTransactions);
  });

  it('should apply filter string', async () => {
    const mockTransactions: any[] = [];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null };
    const filterString = 'begin:20240101 end:20241231 invoice';

    component.onFilterChange(filterString);
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for setTimeout in onFilterChange
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, filterString);
    expect(component.filterString).toBe(filterString);
  });

  it('should handle empty filter string', async () => {
    const mockTransactions: any[] = [];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null };
    component.onFilterChange('');
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for setTimeout in onFilterChange
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, undefined);
    expect(component.filterString).toBe('');
  });

  it('should handle errors when loading tags', async () => {
    controller.getTags.and.returnValue(Promise.reject(new Error('Network error')));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null };
    await component.loadTags();
    await fixture.whenStable();

    expect(component.tags).toEqual([]);
  });

  it('should handle errors when loading transactions', async () => {
    controller.getTransactions.and.returnValue(Promise.reject(new Error('Network error')));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null };
    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toContain('Failed to load transactions');
    expect(component.loading).toBe(false);
  });

  it('should react to journal changes via effect', async () => {
    const mockTags = [{ key: 'invoice', value: '1234' }];
    const mockTransactions: any[] = [];
    controller.getTags.and.returnValue(Promise.resolve(mockTags));
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    // Simulate journal change by setting selectedJournal
    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null };
    
    await component.loadTags();
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('1');
    expect(controller.getTransactions).toHaveBeenCalled();
    expect(component.tags).toEqual(mockTags);
    expect(component.transactions).toEqual(mockTransactions);
  });

  it('should export journal and trigger download', async () => {
    const mockContent = '; title: Test\n; Currency: EUR\n';
    controller.exportJournal.and.returnValue(Promise.resolve(mockContent));

    component.selectedJournal = { id: '1', title: 'Test Journal', subtitle: null, currency: 'EUR', commodities: {}, logo: null, previousJournalId: null };

    // Mock DOM APIs
    const createElementSpy = spyOn(document, 'createElement').and.callThrough();
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock');
    spyOn(window.URL, 'revokeObjectURL');

    await component.exportJournal();
    await fixture.whenStable();

    expect(controller.exportJournal).toHaveBeenCalledWith('1', true);
    expect(component.exporting).toBe(false);
    expect(component.exportError).toBeNull();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should export journal without transactions when checkbox unchecked', async () => {
    const mockContent = '; title: Test\n; Currency: EUR\n';
    controller.exportJournal.and.returnValue(Promise.resolve(mockContent));

    component.selectedJournal = { id: '1', title: 'Test Journal', subtitle: null, currency: 'EUR', commodities: {}, logo: null, previousJournalId: null };
    component.includeTransactions = false;

    await component.exportJournal();
    await fixture.whenStable();

    expect(controller.exportJournal).toHaveBeenCalledWith('1', false);
  });

  it('should handle export errors', async () => {
    controller.exportJournal.and.returnValue(Promise.reject(new Error('Export failed')));

    component.selectedJournal = { id: '1', title: 'Test Journal', subtitle: null, currency: 'EUR', commodities: {}, logo: null, previousJournalId: null };

    await component.exportJournal();
    await fixture.whenStable();

    expect(component.exporting).toBe(false);
    expect(component.exportError).toContain('Failed to export journal');
  });

  it('should not export when no journal is selected', async () => {
    component.selectedJournal = null;

    await component.exportJournal();

    expect(controller.exportJournal).not.toHaveBeenCalled();
  });
});
