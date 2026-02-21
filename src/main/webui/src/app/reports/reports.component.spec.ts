import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ReportsComponent } from './reports.component';
import { Controller, ReportTemplate, AccountEntryDTO, AccountTreeNode, TagDTO } from '../controller';
import { ModelService } from '../model.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;

  const mockTemplates: ReportTemplate[] = [
    {
      id: 'balance-sheet-001',
      name: 'Balance Sheet',
      description: 'Standard balance sheet',
      templateType: 'BALANCE_SHEET',
      templateContent: '{"sections":[{"title":"Assets","accountTypes":["ASSET"],"showSubtotals":true}]}'
    },
    {
      id: 'income-statement-001',
      name: 'Income Statement',
      description: 'Profit and loss statement',
      templateType: 'INCOME_STATEMENT',
      templateContent: '{"sections":[{"title":"Revenue","accountTypes":["REVENUE"],"invertSign":true}]}'
    }
  ];

  const mockAccounts: AccountTreeNode[] = [
    {
      id: 'acc1',
      name: 'Cash',
      type: 'ASSET',
      note: null,
      parentId: null,
      children: []
    },
    {
      id: 'acc2',
      name: 'Revenue',
      type: 'REVENUE',
      note: null,
      parentId: null,
      children: []
    }
  ];

  const mockEntries: AccountEntryDTO[] = [
    {
      entryId: 'e1',
      transactionId: 't1',
      transactionDate: '2024-01-01',
      description: 'Test entry',
      commodity: 'CHF',
      amount: 100,
      runningBalance: 100,
      note: null,
      accountId: 'acc1',
      partnerId: null,
      status: 'CLEARED'
    }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', [
      'listReportTemplates',
      'getReportTemplate',
      'getEntriesForReport',
      'getAccountTree',
      'getTags'
    ]);

    const modelServiceSpy = jasmine.createSpyObj('ModelService', [
      'getSelectedJournalId',
      'getAccounts',
      'setReportTemplates'
    ], {
      reportTemplates$: signal(mockTemplates)
    });

    await TestBed.configureTestingModule({
      imports: [ReportsComponent, FormsModule],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load templates on init', async () => {
    controller.listReportTemplates.and.returnValue(Promise.resolve(mockTemplates));

    await component.ngOnInit();
    await fixture.whenStable();

    expect(controller.listReportTemplates).toHaveBeenCalled();
  });

  it('should handle template selection', async () => {
    const selectedTemplate = mockTemplates[0];
    controller.getReportTemplate.and.returnValue(Promise.resolve(selectedTemplate));
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    component.selectedTemplateId = selectedTemplate.id;
    await component.onTemplateSelect();
    await fixture.whenStable();

    expect(controller.getReportTemplate).toHaveBeenCalledWith(selectedTemplate.id);
    expect(component.selectedTemplate).toEqual(selectedTemplate);
  });

  it('should generate report with entries', async () => {
    const selectedTemplate = mockTemplates[0];
    component.selectedTemplate = selectedTemplate;
    
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(controller.getEntriesForReport).toHaveBeenCalledWith('journal1');
    expect(component.entries).toEqual(mockEntries);
    expect(component.reportSections.length).toBeGreaterThan(0);
  });

  it('should handle error when no journal is selected', async () => {
    component.selectedTemplate = mockTemplates[0];
    modelService.getSelectedJournalId.and.returnValue(null);

    await component.generateReport();
    await fixture.whenStable();

    expect(component.error).toBe('No journal selected');
  });

  it('should format currency correctly', () => {
    expect(component.formatCurrency(1234.56)).toBe('1,234.56');
    expect(component.formatCurrency(-1234.56)).toBe('-1,234.56');
    expect(component.formatCurrency(0)).toBe('0.00');
  });

  it('should clear report when template is deselected', async () => {
    component.selectedTemplateId = null;
    component.reportSections = [{ title: 'Test', level: 3, accounts: [], subtotal: 0, commodity: 'CHF', showDebitsCredits: false, showAccounts: true, groupByPartner: false }];

    await component.onTemplateSelect();
    await fixture.whenStable();

    expect(component.selectedTemplate).toBeNull();
    expect(component.reportSections).toEqual([]);
  });

  it('should parse filter text and extract dates', () => {
    component.onFilterChange('begin:20240101 end:20241231');
    
    expect(component.startDate).toBe('2024-01-01');
    expect(component.endDate).toBe('2024-12-31');
  });

  it('should handle filter without dates', () => {
    component.onFilterChange('partner:ABC');
    
    expect(component.startDate).toBeNull();
    expect(component.endDate).toBeNull();
  });

  it('should filter zero-balance accounts when hideZeroBalances is true', async () => {
    const entriesWithZero: AccountEntryDTO[] = [
      {
        entryId: 'e1',
        transactionId: 't1',
        transactionDate: '2024-01-01',
        description: 'Test entry',
        commodity: 'CHF',
        amount: 100,
        runningBalance: 100,
        note: null,
        accountId: 'acc1',
        partnerId: null,
        status: 'CLEARED'
      },
      {
        entryId: 'e2',
        transactionId: 't2',
        transactionDate: '2024-01-02',
        description: 'Zero balance',
        commodity: 'CHF',
        amount: -100,
        runningBalance: 0,
        note: null,
        accountId: 'acc1',
        partnerId: null,
        status: 'CLEARED'
      }
    ];

    const selectedTemplate = mockTemplates[0];
    component.selectedTemplate = selectedTemplate;
    component.hideZeroBalances = true;
    
    controller.getEntriesForReport.and.returnValue(Promise.resolve(entriesWithZero));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    // Should filter out accounts with zero balance
    const section = component.reportSections[0];
    const zeroBalanceAccounts = section.accounts.filter(acc => acc.balance === 0);
    expect(zeroBalanceAccounts.length).toBe(0);
  });

  it('should handle template with calculated net income section', async () => {
    const templateWithNetIncome: ReportTemplate = {
      id: 'test-001',
      name: 'Test Report',
      description: 'Test',
      templateType: 'TEST',
      templateContent: '{"sections":[{"title":"Net Income","calculated":"netIncome"}]}'
    };
    
    component.selectedTemplate = templateWithNetIncome;
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(component.reportSections.length).toBe(1);
    expect(component.reportSections[0].title).toBe('Net Income');
  });

  it('should handle template with invertSign option', async () => {
    const revenueEntries: AccountEntryDTO[] = [
      {
        entryId: 'e1',
        transactionId: 't1',
        transactionDate: '2024-01-01',
        description: 'Revenue',
        commodity: 'CHF',
        amount: -500,
        runningBalance: -500,
        note: null,
        accountId: 'acc2',
        partnerId: null,
        status: 'CLEARED'
      }
    ];

    component.selectedTemplate = mockTemplates[1]; // Income statement with invertSign
    controller.getEntriesForReport.and.returnValue(Promise.resolve(revenueEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    const section = component.reportSections[0];
    expect(section.accounts.length).toBeGreaterThan(0);
    // Revenue should be inverted to positive
    expect(section.accounts[0].balance).toBeGreaterThan(0);
  });

  it('should handle error during report generation', async () => {
    component.selectedTemplate = mockTemplates[0];
    controller.getEntriesForReport.and.returnValue(Promise.reject(new Error('Network error')));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(component.error).toBe('Failed to generate report');
  });

  it('should handle error during template loading', async () => {
    controller.listReportTemplates.and.returnValue(Promise.reject(new Error('Network error')));

    await component.loadTemplates();
    await fixture.whenStable();

    expect(component.error).toBe('Failed to load report templates');
  });

  it('should handle error during template selection', async () => {
    component.selectedTemplateId = 'test-001';
    controller.getReportTemplate.and.returnValue(Promise.reject(new Error('Not found')));

    await component.onTemplateSelect();
    await fixture.whenStable();

    expect(component.error).toBe('Failed to load template');
  });

  it('should handle empty entries array', async () => {
    component.selectedTemplate = mockTemplates[0];
    controller.getEntriesForReport.and.returnValue(Promise.resolve([]));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(component.entries).toEqual([]);
    expect(component.reportSections.length).toBeGreaterThan(0);
  });

  it('should not generate report if no template is selected', async () => {
    component.selectedTemplate = null;
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));

    await component.generateReport();
    await fixture.whenStable();

    expect(controller.getEntriesForReport).not.toHaveBeenCalled();
  });

  it('should load tags when generating report', async () => {
    const mockTags: TagDTO[] = [
      { key: 'invoice', value: '123' },
      { key: 'project', value: 'ABC' }
    ];

    component.selectedTemplate = mockTemplates[0];
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve(mockTags));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('journal1');
    expect(component.tags).toEqual(mockTags);
  });
});
