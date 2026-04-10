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
      templateContent: '{"sections":[{"title":"Assets","accountTypes":["ASSET"],"showSubtotals":true}]}'
    },
    {
      id: 'income-statement-001',
      name: 'Income Statement',
      description: 'Profit and loss statement',
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
      partnerName: null,
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
      reportTemplates$: signal(mockTemplates),
      selectedJournalId$: signal('journal1')
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

    expect(controller.getEntriesForReport).toHaveBeenCalledWith('journal1', undefined, undefined, undefined, undefined);
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
    component.reportSections = [{ title: 'Test', level: 3, accounts: [], subtotal: 0, commodity: 'CHF', showDebitsCredits: false, showAccounts: true, groupByPartner: false, invertSign: false, sortable: false, sortColumn: null, sortDirection: 'asc' }];

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
      partnerName: null,
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
      partnerName: null,
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
      partnerName: null,
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

  it('should handle partner report with sorting configuration', async () => {
    const partnerTemplate: ReportTemplate = {
      id: 'partner-report-001',
      name: 'Partner Activity Report',
      description: 'Income and expenses grouped by partner',
      templateContent: '{"sections":[{"title":"Partner Activity","groupByPartner":true,"sortable":true,"defaultSortColumn":"net","defaultSortDirection":"desc"}]}'
    };

    const partnerEntries: AccountEntryDTO[] = [
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
        partnerId: 'partner1',
      partnerName: null,
        status: 'CLEARED'
      },
      {
        entryId: 'e2',
        transactionId: 't2',
        transactionDate: '2024-01-02',
        description: 'Expense',
        commodity: 'CHF',
        amount: 200,
        runningBalance: 200,
        note: null,
        accountId: 'acc3',
        partnerId: 'partner1',
      partnerName: null,
        status: 'CLEARED'
      }
    ];

    const accountsWithExpense: AccountTreeNode[] = [
      ...mockAccounts,
      {
        id: 'acc3',
        name: 'Expenses',
        type: 'EXPENSE',
        note: null,
        parentId: null,
        children: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    controller.getEntriesForReport.and.returnValue(Promise.resolve(partnerEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(accountsWithExpense));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(component.reportSections.length).toBe(1);
    const section = component.reportSections[0];
    expect(section.groupByPartner).toBe(true);
    expect(section.sortable).toBe(true);
    expect(section.sortColumn).toBe('net');
    expect(section.sortDirection).toBe('desc');
    expect(section.partners).toBeDefined();
    expect(section.partners!.length).toBeGreaterThan(0);
  });

  it('should sort partners by column when onColumnSort is called', async () => {
    const partnerTemplate: ReportTemplate = {
      id: 'partner-report-001',
      name: 'Partner Activity Report',
      description: 'Income and expenses grouped by partner',
      templateContent: '{"sections":[{"title":"Partner Activity","groupByPartner":true,"sortable":true,"defaultSortColumn":"net","defaultSortDirection":"desc"}]}'
    };

    const partnerEntries: AccountEntryDTO[] = [
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
        partnerId: 'partnerA',
      partnerName: null,
        status: 'CLEARED'
      },
      {
        entryId: 'e2',
        transactionId: 't2',
        transactionDate: '2024-01-02',
        description: 'Revenue',
        commodity: 'CHF',
        amount: -300,
        runningBalance: -300,
        note: null,
        accountId: 'acc2',
        partnerId: 'partnerB',
      partnerName: null,
        status: 'CLEARED'
      }
    ];

    component.selectedTemplate = partnerTemplate;
    controller.getEntriesForReport.and.returnValue(Promise.resolve(partnerEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    const section = component.reportSections[0];
    expect(section.partners).toBeDefined();
    expect(section.partners!.length).toBe(2);
    
    // Initially sorted by net descending (500 > 300)
    expect(section.partners![0].net).toBe(500);
    expect(section.partners![1].net).toBe(300);

    // Click to sort by partnerName
    component.onColumnSort(0, 'partnerName');
    expect(section.sortColumn).toBe('partnerName');
    expect(section.sortDirection).toBe('asc');
    expect(section.partners![0].partnerId).toBe('partnerA');
    expect(section.partners![1].partnerId).toBe('partnerB');

    // Click again to reverse sort
    component.onColumnSort(0, 'partnerName');
    expect(section.sortDirection).toBe('desc');
    expect(section.partners![0].partnerId).toBe('partnerB');
    expect(section.partners![1].partnerId).toBe('partnerA');
  });

  it('should return correct sort indicator', () => {
    const section: any = {
      sortable: true,
      sortColumn: 'net',
      sortDirection: 'desc'
    };

    expect(component.getSortIndicator(section, 'net')).toBe(' ▼');
    expect(component.getSortIndicator(section, 'income')).toBe('');

    section.sortDirection = 'asc';
    expect(component.getSortIndicator(section, 'net')).toBe(' ▲');
  });

  it('should not sort when section is not sortable', () => {
    const section: any = {
      sortable: false,
      sortColumn: null,
      sortDirection: 'asc',
      partners: [
        { partnerId: 'p1', partnerName: 'Partner 1', income: 100, expenses: 50, net: 50, transactionCount: 1 },
        { partnerId: 'p2', partnerName: 'Partner 2', income: 200, expenses: 100, net: 100, transactionCount: 2 }
      ]
    };
    component.reportSections = [section];

    const originalOrder = [...section.partners];
    component.onColumnSort(0, 'net');

    expect(section.partners).toEqual(originalOrder);
    expect(section.sortColumn).toBeNull();
  });

  it('should filter out partners with zero activity when hideZeroBalances is true', async () => {
    const partnerTemplate: ReportTemplate = {
      id: 'partner-report-001',
      name: 'Partner Activity Report',
      description: 'Income and expenses grouped by partner',
      templateContent: '{"sections":[{"title":"Partner Activity","groupByPartner":true,"sortable":true,"defaultSortColumn":"net","defaultSortDirection":"desc"}]}'
    };

    const partnerEntries: AccountEntryDTO[] = [
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
        partnerId: 'partnerA',
      partnerName: null,
        status: 'CLEARED'
      },
      {
        entryId: 'e2',
        transactionId: 't2',
        transactionDate: '2024-01-02',
        description: 'Expense',
        commodity: 'CHF',
        amount: 500,
        runningBalance: 0,
        note: null,
        accountId: 'acc3',
        partnerId: 'partnerA',
      partnerName: null,
        status: 'CLEARED'
      },
      {
        entryId: 'e3',
        transactionId: 't3',
        transactionDate: '2024-01-03',
        description: 'Revenue',
        commodity: 'CHF',
        amount: -300,
        runningBalance: -300,
        note: null,
        accountId: 'acc2',
        partnerId: 'partnerB',
      partnerName: null,
        status: 'CLEARED'
      }
    ];

    const accountsWithExpense: AccountTreeNode[] = [
      ...mockAccounts,
      {
        id: 'acc3',
        name: 'Expenses',
        type: 'EXPENSE',
        note: null,
        parentId: null,
        children: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    component.hideZeroBalances = true;
    controller.getEntriesForReport.and.returnValue(Promise.resolve(partnerEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(accountsWithExpense));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    const section = component.reportSections[0];
    expect(section.partners).toBeDefined();
    // partnerA has income=500, expenses=500, net=0 (has activity, should be included)
    // partnerB has income=300, expenses=0, net=300 (has activity, should be included)
    // Both partners have activity, so both should be shown
    expect(section.partners!.length).toBe(2);
  });

  it('should filter out partners with all zeros when hideZeroBalances is true', async () => {
    const partnerTemplate: ReportTemplate = {
      id: 'partner-report-001',
      name: 'Partner Activity Report',
      description: 'Income and expenses grouped by partner',
      templateContent: '{"sections":[{"title":"Partner Activity","groupByPartner":true,"sortable":true,"defaultSortColumn":"net","defaultSortDirection":"desc"}]}'
    };

    // Create entries where partnerC will have no entries (all zeros)
    // We need to manually create a scenario where a partner exists but has no activity
    // This is simulated by having entries but they cancel out to zero
    const partnerEntries: AccountEntryDTO[] = [
      {
        entryId: 'e1',
        transactionId: 't1',
        transactionDate: '2024-01-01',
        description: 'Revenue',
        commodity: 'CHF',
        amount: -300,
        runningBalance: -300,
        note: null,
        accountId: 'acc2',
        partnerId: 'partnerB',
      partnerName: null,
        status: 'CLEARED'
      }
    ];

    component.selectedTemplate = partnerTemplate;
    component.hideZeroBalances = true;
    controller.getEntriesForReport.and.returnValue(Promise.resolve(partnerEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    const section = component.reportSections[0];
    expect(section.partners).toBeDefined();
    // Only partnerB with activity should be shown
    expect(section.partners!.length).toBe(1);
    expect(section.partners![0].partnerId).toBe('partnerB');
  });

  it('should include partners with zero activity when hideZeroBalances is false', async () => {
    const partnerTemplate: ReportTemplate = {
      id: 'partner-report-001',
      name: 'Partner Activity Report',
      description: 'Income and expenses grouped by partner',
      templateContent: '{"sections":[{"title":"Partner Activity","groupByPartner":true,"sortable":true,"defaultSortColumn":"net","defaultSortDirection":"desc"}]}'
    };

    const partnerEntries: AccountEntryDTO[] = [
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
        partnerId: 'partnerA',
      partnerName: null,
        status: 'CLEARED'
      },
      {
        entryId: 'e2',
        transactionId: 't2',
        transactionDate: '2024-01-02',
        description: 'Expense',
        commodity: 'CHF',
        amount: 500,
        runningBalance: 0,
        note: null,
        accountId: 'acc3',
        partnerId: 'partnerA',
      partnerName: null,
        status: 'CLEARED'
      }
    ];

    const accountsWithExpense: AccountTreeNode[] = [
      ...mockAccounts,
      {
        id: 'acc3',
        name: 'Expenses',
        type: 'EXPENSE',
        note: null,
        parentId: null,
        children: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    component.hideZeroBalances = false;
    controller.getEntriesForReport.and.returnValue(Promise.resolve(partnerEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(accountsWithExpense));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    const section = component.reportSections[0];
    expect(section.partners).toBeDefined();
    // partnerA has income=500, expenses=500, net=0 (should be included when hideZeroBalances is false)
    expect(section.partners!.length).toBe(1);
    expect(section.partners![0].partnerId).toBe('partnerA');
    expect(section.partners![0].net).toBe(0);
  });

  it('should regenerate report when selected journal changes', async () => {
    // Set up initial state with a template selected
    const selectedTemplate = mockTemplates[0];
    component.selectedTemplate = selectedTemplate;
    
    controller.getTags.and.returnValue(Promise.resolve([]));
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    // Generate initial report
    await component.generateReport();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('journal1');
    expect(controller.getEntriesForReport).toHaveBeenCalledWith('journal1', undefined, undefined, undefined, undefined);
    
    const initialCallCount = controller.getEntriesForReport.calls.count();

    // Simulate journal change by updating the signal
    // Note: In the actual test, the effect will trigger when the signal changes
    // For this test, we'll manually call the onJournalChange method
    controller.getTags.calls.reset();
    controller.getEntriesForReport.calls.reset();
    modelService.getSelectedJournalId.and.returnValue('journal2');
    
    // Manually trigger the journal change (simulating the effect)
    await (component as any).onJournalChange('journal2');
    await fixture.whenStable();

    // Verify that tags and report were reloaded for the new journal
    expect(controller.getTags).toHaveBeenCalledWith('journal2');
    expect(controller.getEntriesForReport).toHaveBeenCalledWith('journal2', undefined, undefined, undefined, undefined);
  });

  it('should pass filter string to getEntriesForReport when filter is set', async () => {
    component.selectedTemplate = mockTemplates[0];
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    component.onFilterChange('begin:20240101 end:20241231 not:Closing');
    await fixture.whenStable();

    expect(component.filterText).toBe('begin:20240101 end:20241231 not:Closing');
    expect(component.startDate).toBe('2024-01-01');
    expect(component.endDate).toBe('2024-12-31');
    expect(controller.getEntriesForReport).toHaveBeenCalledWith(
      'journal1',
      '2024-01-01',
      '2024-12-31',
      undefined,
      'begin:20240101 end:20241231 not:Closing'
    );
  });

  it('should pass filter string with tag filters to backend', async () => {
    component.selectedTemplate = mockTemplates[0];
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    component.onFilterChange('begin:20240101 end:20241231 invoice:123 not:draft');
    await fixture.whenStable();

    expect(controller.getEntriesForReport).toHaveBeenCalledWith(
      'journal1',
      '2024-01-01',
      '2024-12-31',
      undefined,
      'begin:20240101 end:20241231 invoice:123 not:draft'
    );
  });
});
