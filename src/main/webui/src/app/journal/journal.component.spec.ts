import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
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
      'getAccountTree'
    ]);

    await TestBed.configureTestingModule({
      imports: [JournalComponent, FormsModule],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        provideHttpClient(),
        provideHttpClientTesting()
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
      { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} }
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

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
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

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, undefined);
    expect(component.transactions).toEqual(mockTransactions);
  });

  it('should apply filter string', async () => {
    const mockTransactions: any[] = [];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
    const filterString = 'begin:20240101 end:20241231 invoice';

    component.onFilterChange(filterString);
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, filterString);
    expect(component.filterString).toBe(filterString);
  });

  it('should handle empty filter string', async () => {
    const mockTransactions: any[] = [];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
    component.onFilterChange('');
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, undefined);
    expect(component.filterString).toBe('');
  });

  it('should handle errors when loading tags', async () => {
    controller.getTags.and.returnValue(Promise.reject(new Error('Network error')));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
    await component.loadTags();
    await fixture.whenStable();

    expect(component.tags).toEqual([]);
  });

  it('should handle errors when loading transactions', async () => {
    controller.getTransactions.and.returnValue(Promise.reject(new Error('Network error')));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toContain('Failed to load transactions');
    expect(component.loading).toBe(false);
  });
});
