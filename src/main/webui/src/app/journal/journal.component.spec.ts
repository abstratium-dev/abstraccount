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
      'getTransactions'
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
    expect(component.journals).toEqual(mockJournals);
  });

  it('should auto-select journal if only one exists', async () => {
    const mockJournals = [
      { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} }
    ];
    const mockTransactions: any[] = [];
    controller.listJournals.and.returnValue(Promise.resolve(mockJournals));
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    await component.ngOnInit();
    await fixture.whenStable();

    expect(component.selectedJournal).toEqual(mockJournals[0]);
    expect(controller.getTransactions).toHaveBeenCalled();
  });

  it('should load transactions when journal is selected', async () => {
    const mockTransactions = [
      {
        id: 'tx1',
        transactionDate: '2024-01-01',
        status: 'CLEARED',
        description: 'Test transaction',
        partnerId: null,
        tags: [],
        entries: []
      }
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined);
    expect(component.transactions).toEqual(mockTransactions);
  });

  it('should apply filters', async () => {
    const mockTransactions: any[] = [];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {} };
    component.startDate = '2024-01-01';
    component.endDate = '2024-12-31';
    component.status = 'CLEARED';

    component.applyFilters();
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', '2024-01-01', '2024-12-31', undefined, 'CLEARED');
  });

  it('should clear filters', () => {
    component.startDate = '2024-01-01';
    component.endDate = '2024-12-31';
    component.status = 'CLEARED';

    component.clearFilters();

    expect(component.startDate).toBe('');
    expect(component.endDate).toBe('');
    expect(component.status).toBe('');
  });

  it('should handle errors when loading journals', async () => {
    controller.listJournals.and.returnValue(Promise.reject(new Error('Network error')));

    await component.loadJournals();
    await fixture.whenStable();

    expect(component.error).toContain('Failed to load journals');
    expect(component.loading).toBe(false);
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
