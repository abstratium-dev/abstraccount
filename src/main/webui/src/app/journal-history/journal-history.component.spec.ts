import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { JournalHistoryComponent } from './journal-history.component';
import { Controller, JournalMetadataDTO, JournalKpiDTO } from '../controller';
import { ModelService } from '../model.service';

describe('JournalHistoryComponent', () => {
  let component: JournalHistoryComponent;
  let fixture: ComponentFixture<JournalHistoryComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockJournal1: JournalMetadataDTO = {
    id: 'j1', logo: null, title: 'Journal 2024', subtitle: null,
    currency: 'CHF', commodities: {}, previousJournalId: null, locked: false
  };
  const mockJournal2: JournalMetadataDTO = {
    id: 'j2', logo: null, title: 'Journal 2025', subtitle: null,
    currency: 'CHF', commodities: {}, previousJournalId: 'j1', locked: false
  };
  const mockJournal3: JournalMetadataDTO = {
    id: 'j3', logo: null, title: 'Journal 2026', subtitle: null,
    currency: 'CHF', commodities: {}, previousJournalId: 'j2', locked: false
  };

  const mockKpi: JournalKpiDTO = {
    totalAssets: 10000,
    totalLiabilities: -5000,
    totalEquity: 5000,
    totalRevenue: -3000,
    totalExpenses: 1000,
    currency: 'CHF'
  };

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', ['getJournalKpi', 'selectJournal']);
    mockModelService = jasmine.createSpyObj('ModelService', ['getSelectedJournalId'], {
      journals$: signal([mockJournal1, mockJournal2, mockJournal3])
    });
    mockModelService.getSelectedJournalId.and.returnValue('j2');
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [JournalHistoryComponent],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JournalHistoryComponent);
    component = fixture.componentInstance;
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('shows error when no journal is selected', async () => {
    mockModelService.getSelectedJournalId.and.returnValue(null);
    await component.ngOnInit();
    expect(component.error).toBe('No journal selected.');
  });

  it('builds chain of journals from ancestors and successors', async () => {
    mockController.getJournalKpi.and.resolveTo(mockKpi);
    await component.ngOnInit();

    expect(component.entries.length).toBe(3);
    expect(component.entries[0].journal.id).toBe('j1');
    expect(component.entries[1].journal.id).toBe('j2');
    expect(component.entries[2].journal.id).toBe('j3');
  });

  it('loads KPIs for each journal in the chain', async () => {
    mockController.getJournalKpi.and.resolveTo(mockKpi);
    await component.ngOnInit();

    expect(mockController.getJournalKpi).toHaveBeenCalledTimes(3);
    expect(component.entries.every(e => e.kpi !== null)).toBeTrue();
    expect(component.entries.every(e => !e.kpiLoading)).toBeTrue();
  });

  it('sets kpiError when KPI loading fails', async () => {
    mockController.getJournalKpi.and.rejectWith(new Error('Network error'));
    await component.ngOnInit();

    expect(component.entries.every(e => e.kpiError)).toBeTrue();
    expect(component.entries.every(e => !e.kpiLoading)).toBeTrue();
  });

  it('formatAmount returns dash for null value', () => {
    expect(component.formatAmount(null, 'CHF')).toBe('—');
  });

  it('formatAmount returns dash for undefined value', () => {
    expect(component.formatAmount(undefined, 'CHF')).toBe('—');
  });

  it('formatAmount formats number with currency', () => {
    const formatted = component.formatAmount(1234.5, 'CHF');
    expect(formatted).toContain('1,234.50');
    expect(formatted).toContain('CHF');
  });

  it('netAssets returns sum of totalAssets and totalLiabilities', () => {
    expect(component.netAssets(mockKpi)).toBe(5000);
  });

  it('profitLoss returns negated sum of revenue and expenses', () => {
    // totalRevenue = -3000, totalExpenses = 1000, sum = -2000, negated = 2000
    expect(component.profitLoss(mockKpi)).toBe(2000);
  });

  it('selectJournal calls controller and navigates', () => {
    component.selectJournal('j1');
    expect(mockController.selectJournal).toHaveBeenCalledWith('j1');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/journal']);
  });

  it('disconnects resize observer on destroy', () => {
    component.ngAfterViewInit();
    spyOn(component['resizeObserver']!, 'disconnect');
    component.ngOnDestroy();
    expect(component['resizeObserver']!.disconnect).toHaveBeenCalled();
  });
});
