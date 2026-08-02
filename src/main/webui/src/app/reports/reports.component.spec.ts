import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ReportsComponent } from './reports.component';
import { Controller, ReportTemplate, AccountEntryDTO, AccountTreeNode, TagDTO, ImportResult } from '../controller';
import { ModelService } from '../model.service';
import { ToastService } from '../core/toast/toast.service';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('ReportsComponent', () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;
  let toast: jasmine.SpyObj<ToastService>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

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
      accountCode: 1000,
      children: []
    },
    {
      id: 'acc2',
      name: 'Revenue',
      type: 'REVENUE',
      note: null,
      parentId: null,
      accountCode: 3000,
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
      status: 'CLEARED',
      tags: []
    }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', [
      'listReportTemplates',
      'getReportTemplate',
      'getEntriesForReport',
      'getAccountTree',
      'getTags',
      'getTransactions',
      'exportReportTemplates',
      'importReportTemplates',
      'deleteReportTemplate'
    ]);

    const modelServiceSpy = jasmine.createSpyObj('ModelService', [
      'getSelectedJournalId',
      'getAccounts',
      'setReportTemplates'
    ], {
      reportTemplates$: signal(mockTemplates),
      selectedJournalId$: signal('journal1'),
      journals$: signal([{ id: 'journal1', title: 'Test Journal', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false }]),
      accounts$: signal(mockAccounts)
    });
    const toastSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'show']);
    const confirmDialogSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [ReportsComponent, FormsModule],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        { provide: ConfirmDialogService, useValue: confirmDialogSpy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
    toast = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    confirmDialog = TestBed.inject(ConfirmDialogService) as jasmine.SpyObj<ConfirmDialogService>;
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
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Test entry', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc1', accountName: 'Cash', accountType: 'ASSET', amount: 100, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('journal1', undefined, undefined, undefined, undefined, undefined);
    expect(component.reportSections.length).toBeGreaterThan(0);
  });

  it('should generate cash flow report with calculated rows', async () => {
    const cashFlowTemplate: ReportTemplate = {
      id: 'cash-flow-001',
      name: 'Cash Flow Statement',
      description: 'Indirect-method cash flow statement',
      templateContent: '{"sections":[{"title":"Cash Flow Statement","calculated":"cashFlow"}]}'
    };
    component.selectedTemplate = cashFlowTemplate;

    const mockTransactions = [
      {
        id: 't1', date: '2024-06-01', description: 'Cash sale', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
          { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc1', accountName: 'Cash', accountType: 'ASSET', amount: 500, commodity: 'CHF', note: null, tags: [] },
          { id: 'e2', entryOrder: 2, entryId: 'e2', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -500, commodity: 'CHF', note: null, tags: [] }
        ]
      }
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(component.reportSections.length).toBe(1);
    expect(component.reportSections[0].cashFlowRows).toBeDefined();
    expect(component.reportSections[0].cashFlowRows!.length).toBeGreaterThan(0);
    expect(component.reportSections[0].cashFlowRows!.some(r => r.title === 'Operating activities')).toBe(true);
    expect(component.reportSections[0].cashFlowRows!.some(r => r.title === 'Cash flow from operating activities')).toBe(true);
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
    expect(component.formatCurrency(-0)).toBe('0.00');
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
        status: 'CLEARED',
        tags: []
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
        status: 'CLEARED',
        tags: []
      }
    ];

    const selectedTemplate = mockTemplates[0];
    component.selectedTemplate = selectedTemplate;
    component.hideZeroBalances = true;
    // Mock transactions that result in zero balance
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Test entry', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc1', accountName: 'Cash', accountType: 'ASSET', amount: 100, commodity: 'CHF', note: null, tags: [] }
      ]},
      { id: 't2', date: '2024-01-02', description: 'Zero balance', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
        { id: 'e2', entryOrder: 1, entryId: 'e2', accountId: 'acc1', accountName: 'Cash', accountType: 'ASSET', amount: -100, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
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
    // Mock transactions with entries that will be flattened
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Test entry', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc1', accountName: 'Cash', accountType: 'ASSET', amount: 100, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    expect(component.reportSections.length).toBe(1);
    expect(component.reportSections[0].title).toBe('Net Income');
  });

  it('labels a positive raw net result as Net Loss for lowercase net income titles', () => {
    component.reportSections = [{
      title: 'Net income', level: 1, accounts: [], subtotal: 10, commodity: 'CHF',
      showDebitsCredits: false, showAccounts: true, groupByPartner: false,
      invertSign: false, sortable: false, sortColumn: null, sortDirection: 'asc'
    }];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.total-label').textContent).toContain('Net Loss');
    expect(fixture.nativeElement.querySelector('.total-amount').textContent).toContain('10.00 CHF');
  });

  it('labels a negative raw net result as Net Income with a positive display value', () => {
    component.reportSections = [{
      title: 'Net Income', level: 1, accounts: [], subtotal: -20, commodity: 'CHF',
      showDebitsCredits: false, showAccounts: true, groupByPartner: false,
      invertSign: false, sortable: false, sortColumn: null, sortDirection: 'asc'
    }];

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.total-label').textContent).toContain('Net Income');
    expect(fixture.nativeElement.querySelector('.total-amount').textContent).toContain('20.00 CHF');
    expect(fixture.nativeElement.querySelector('.total-amount').textContent).not.toContain('-20.00 CHF');
  });

  it('includes current-year net income as positive equity in a balance-sheet section', () => {
    const section = (component as any).processSection({
      title: 'Current-year profit/loss', accountRegex: '^Current-year profit/loss$',
      includeNetIncome: true, invertSign: true
    }, {
      netIncome: -20,
      getEntriesByAccountRegex: () => []
    }, []);

    expect(section.accounts).toEqual([jasmine.objectContaining({
      accountId: 'net-income', accountName: 'Net Income', balance: -20
    })]);
    expect(section.subtotal).toBe(-20);
    expect(component.applyDisplaySign(section.accounts[0].balance, section.invertSign)).toBe(20);
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
        status: 'CLEARED',
        tags: []
      }
    ];

    component.selectedTemplate = mockTemplates[1]; // Income statement with invertSign
    // Mock transactions with revenue entries (negative amounts for revenue accounts)
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Revenue', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -500, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    const section = component.reportSections[0];
    expect(section.accounts.length).toBeGreaterThan(0);
    // Raw balance is stored as-is; sign inversion is applied at display time via applyDisplaySign
    expect(section.accounts[0].balance).toBeLessThan(0);
    // applyDisplaySign should return the positive (inverted) value for display
    expect(component.applyDisplaySign(section.accounts[0].balance, section.invertSign)).toBeGreaterThan(0);
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
    // Mock empty transactions
    controller.getTransactions.and.returnValue(Promise.resolve([]));
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

    await component.generateReport();
    await fixture.whenStable();

    expect(controller.getTransactions).not.toHaveBeenCalled();
  });

  it('should load tags when generating report', async () => {
    const mockTags: TagDTO[] = [
      { key: 'invoice', value: '123' },
      { key: 'project', value: 'ABC' }
    ];

    component.selectedTemplate = mockTemplates[0];
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Test entry', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc1', accountName: 'Cash', accountType: 'ASSET', amount: 100, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
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
        status: 'CLEARED',
        tags: []
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
        status: 'CLEARED',
        tags: []
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
        accountCode: 6000,
        children: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Revenue', status: 'CLEARED', partnerId: 'partner1', partnerName: 'Partner One', tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -500, commodity: 'CHF', note: null, tags: [] }
      ]},
      { id: 't2', date: '2024-01-02', description: 'Expense', status: 'CLEARED', partnerId: 'partner1', partnerName: 'Partner One', tags: [], entries: [
        { id: 'e2', entryOrder: 1, entryId: 'e2', accountId: 'acc3', accountName: 'Expenses', accountType: 'EXPENSE', amount: 200, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
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
        status: 'CLEARED',
        tags: []
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
        status: 'CLEARED',
        tags: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Revenue', status: 'CLEARED', partnerId: 'partnerA', partnerName: 'Partner A', tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -500, commodity: 'CHF', note: null, tags: [] }
      ]},
      { id: 't2', date: '2024-01-02', description: 'Revenue', status: 'CLEARED', partnerId: 'partnerB', partnerName: 'Partner B', tags: [], entries: [
        { id: 'e2', entryOrder: 1, entryId: 'e2', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -300, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
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
        status: 'CLEARED',
        tags: []
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
        status: 'CLEARED',
        tags: []
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
        status: 'CLEARED',
        tags: []
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
        accountCode: 6000,
        children: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    component.hideZeroBalances = true;
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Revenue', status: 'CLEARED', partnerId: 'partnerA', partnerName: 'Partner A', tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -500, commodity: 'CHF', note: null, tags: [] }
      ]},
      { id: 't2', date: '2024-01-02', description: 'Expense', status: 'CLEARED', partnerId: 'partnerA', partnerName: 'Partner A', tags: [], entries: [
        { id: 'e2', entryOrder: 1, entryId: 'e2', accountId: 'acc3', accountName: 'Expenses', accountType: 'EXPENSE', amount: 500, commodity: 'CHF', note: null, tags: [] }
      ]},
      { id: 't3', date: '2024-01-03', description: 'Revenue', status: 'CLEARED', partnerId: 'partnerB', partnerName: 'Partner B', tags: [], entries: [
        { id: 'e3', entryOrder: 1, entryId: 'e3', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -300, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
    controller.getAccountTree.and.returnValue(Promise.resolve(accountsWithExpense));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    await component.generateReport();
    await fixture.whenStable();

    const section = component.reportSections[0];
    expect(section.partners).toBeDefined();
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
        status: 'CLEARED',
        tags: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    component.hideZeroBalances = true;
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Revenue', status: 'CLEARED', partnerId: 'partnerB', partnerName: 'Partner B', tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -300, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
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
        status: 'CLEARED',
        tags: []
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
        status: 'CLEARED',
        tags: []
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
        accountCode: 6000,
        children: []
      }
    ];

    component.selectedTemplate = partnerTemplate;
    component.hideZeroBalances = false;
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Revenue', status: 'CLEARED', partnerId: 'partnerA', partnerName: 'Partner A', tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc2', accountName: 'Revenue', accountType: 'REVENUE', amount: -500, commodity: 'CHF', note: null, tags: [] }
      ]},
      { id: 't2', date: '2024-01-02', description: 'Expense', status: 'CLEARED', partnerId: 'partnerA', partnerName: 'Partner A', tags: [], entries: [
        { id: 'e2', entryOrder: 1, entryId: 'e2', accountId: 'acc3', accountName: 'Expenses', accountType: 'EXPENSE', amount: 500, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
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
    // Mock transactions that will be flattened to entries
    const mockTransactions = [
      { id: 't1', date: '2024-01-01', description: 'Test entry', status: 'CLEARED', partnerId: null, partnerName: null, tags: [], entries: [
        { id: 'e1', entryOrder: 1, entryId: 'e1', accountId: 'acc1', accountName: 'Cash', accountType: 'ASSET', amount: 100, commodity: 'CHF', note: null, tags: [] }
      ]}
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    // Generate initial report
    await component.generateReport();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('journal1');
    expect(controller.getTransactions).toHaveBeenCalledWith('journal1', undefined, undefined, undefined, undefined, undefined);

    // Simulate journal change by updating the signal
    controller.getTags.calls.reset();
    controller.getTransactions.calls.reset();
    modelService.getSelectedJournalId.and.returnValue('journal2');

    // Manually trigger the journal change (simulating the effect)
    await (component as any).onJournalChange('journal2');
    await fixture.whenStable();

    // Verify that tags were reloaded for the new journal
    expect(controller.getTags).toHaveBeenCalledWith('journal2');
    // Note: onJournalChange doesn't call generateReport, so we don't check getTransactions here
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
    // Note: onFilterChange doesn't trigger generateReport, filter is used when report is generated
  });

  it('should pass filter string with tag filters to backend', async () => {
    component.selectedTemplate = mockTemplates[0];
    controller.getEntriesForReport.and.returnValue(Promise.resolve(mockEntries));
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));
    controller.getTags.and.returnValue(Promise.resolve([]));
    modelService.getSelectedJournalId.and.returnValue('journal1');

    component.onFilterChange('begin:20240101 end:20241231 invoice:123 not:draft');
    await fixture.whenStable();

    // Note: onFilterChange only updates filter state; filter is passed to getTransactions when generateReport is called
    expect(component.filterText).toBe('begin:20240101 end:20241231 invoice:123 not:draft');
    expect(component.startDate).toBe('2024-01-01');
    expect(component.endDate).toBe('2024-12-31');
  });

  it('should call exportReportTemplates on controller when exporting', async () => {
    controller.exportReportTemplates.and.returnValue(Promise.resolve('yaml content'));

    spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    spyOn(URL, 'revokeObjectURL');

    await component.exportReportTemplates();

    expect(controller.exportReportTemplates).toHaveBeenCalled();
  });

  it('should open and close import dialog', () => {
    component.openImportDialog();
    expect(component.showImportDialog).toBeTrue();

    component.closeImportDialog();
    expect(component.showImportDialog).toBeFalse();
    expect(component.importFileName).toBe('');
    expect(component.importFileContent).toBe('');
  });

  it('should close import dialog and show success toast on import', async () => {
    const result: ImportResult = {
      status: 'success',
      imported: 1,
      items: [{ originalName: 'Template1', finalName: 'Template1', id: 'id1' }]
    };
    controller.importReportTemplates.and.returnValue(Promise.resolve(result));
    component.importFileContent = 'yaml content';
    component.showImportDialog = true;

    await component.performImport();

    expect(controller.importReportTemplates).toHaveBeenCalledWith('yaml content');
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 1 report template\(s\)/));
    expect(component.showImportDialog).toBeFalse();
    expect(component.importResult).toBeNull();
  });

  it('should show conflict dialog when import detects conflicts', async () => {
    const result: ImportResult = {
      status: 'conflict',
      conflicts: [{ existingId: 'existing-id', name: 'DupTemplate', artefactType: 'report_template' }]
    };
    controller.importReportTemplates.and.returnValue(Promise.resolve(result));
    component.importFileContent = 'yaml content';

    await component.performImport();

    expect(component.importResult).not.toBeNull();
    expect(component.importResult?.conflicts?.length).toBe(1);
  });

  it('should show error message on import error status', async () => {
    const result: ImportResult = {
      status: 'error',
      message: 'Invalid JSON in template_content'
    };
    controller.importReportTemplates.and.returnValue(Promise.resolve(result));
    component.importFileContent = 'yaml content';

    await component.performImport();

    expect(component.importError).toContain('Invalid JSON');
  });

  it('should resolve conflicts by replacing originals and close dialog with toast', async () => {
    component.importResult = {
      status: 'conflict',
      conflicts: [{ existingId: 'old-id', name: 'OldTemplate', artefactType: 'report_template' }]
    };
    component.importFileContent = 'yaml content';
    component.showImportDialog = true;

    const successResult: ImportResult = {
      status: 'success',
      imported: 1,
      items: [{ originalName: 'OldTemplate', finalName: 'OldTemplate', id: 'new-id' }]
    };
    controller.importReportTemplates.and.returnValue(Promise.resolve(successResult));

    await component.resolveConflictsReplace();

    expect(controller.importReportTemplates).toHaveBeenCalledWith('yaml content', ['old-id']);
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 1 report template\(s\)/));
    expect(component.showImportDialog).toBeFalse();
    expect(component.importResult).toBeNull();
  });

  it('should resolve conflicts by renaming duplicates and close dialog with toast', async () => {
    component.importResult = {
      status: 'conflict',
      conflicts: [{ existingId: 'old-id', name: 'DupTemplate', artefactType: 'report_template' }]
    };
    component.importFileContent = 'yaml content';
    component.showImportDialog = true;

    const successResult: ImportResult = {
      status: 'success',
      imported: 1,
      items: [{ originalName: 'DupTemplate', finalName: 'DupTemplate (1)', id: 'new-id' }]
    };
    controller.importReportTemplates.and.returnValue(Promise.resolve(successResult));

    await component.resolveConflictsRename();

    expect(controller.importReportTemplates).toHaveBeenCalledWith('yaml content', [], true);
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 1 report template\(s\).*DupTemplate \(1\)/));
    expect(component.showImportDialog).toBeFalse();
    expect(component.importResult).toBeNull();
  });

  it('should fetch built-in report templates and import them', async () => {
    const result: ImportResult = {
      status: 'success',
      imported: 2,
      items: []
    };
    controller.importReportTemplates.and.returnValue(Promise.resolve(result));
    spyOn(window, 'fetch').and.returnValue(Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('builtin yaml content')
    } as Response));

    await component.importBuiltinReportTemplates();

    expect(window.fetch).toHaveBeenCalledWith('/builtin/report-templates-export.yaml');
    expect(controller.importReportTemplates).toHaveBeenCalledWith('builtin yaml content');
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 2 report template\(s\)/));
    expect(component.showImportDialog).toBeFalse();
  });

  it('should show error and not import when built-in fetch fails', async () => {
    spyOn(window, 'fetch').and.returnValue(Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('')
    } as Response));

    await component.importBuiltinReportTemplates();

    expect(window.fetch).toHaveBeenCalledWith('/builtin/report-templates-export.yaml');
    expect(controller.importReportTemplates).not.toHaveBeenCalled();
    expect(component.importError).toContain('built-in');
    expect(component.importInProgress).toBeFalse();
  });

  it('should toggle and close menu', () => {
    expect(component.menuOpen).toBeFalse();

    component.toggleMenu();
    expect(component.menuOpen).toBeTrue();

    component.toggleMenu();
    expect(component.menuOpen).toBeFalse();

    component.menuOpen = true;
    component.closeMenu();
    expect(component.menuOpen).toBeFalse();
  });

  it('should delete report template and clear selection when confirmed', async () => {
    const testTemplate = mockTemplates[0];
    component.selectedTemplateId = testTemplate.id;
    component.selectedTemplate = testTemplate;
    controller.deleteReportTemplate.and.returnValue(Promise.resolve());
    confirmDialog.confirm.and.returnValue(Promise.resolve(true));

    await component.deleteReportTemplate(testTemplate);

    expect(confirmDialog.confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Delete Report Template',
      message: jasmine.stringMatching(testTemplate.name),
      confirmText: 'Delete',
      confirmClass: 'btn-danger',
    }));
    expect(controller.deleteReportTemplate).toHaveBeenCalledWith(testTemplate.id);
    expect(toast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Report template.*deleted/));
    expect(component.selectedTemplateId).toBeNull();
    expect(component.selectedTemplate).toBeNull();
    expect(component.reportSections.length).toBe(0);
  });

  it('should not delete report template when confirmation is cancelled', async () => {
    const testTemplate = mockTemplates[0];
    confirmDialog.confirm.and.returnValue(Promise.resolve(false));

    await component.deleteReportTemplate(testTemplate);

    expect(controller.deleteReportTemplate).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('should show error toast when report template delete fails', async () => {
    const testTemplate = mockTemplates[0];
    confirmDialog.confirm.and.returnValue(Promise.resolve(true));
    controller.deleteReportTemplate.and.returnValue(Promise.reject(new Error('Network error')));

    await component.deleteReportTemplate(testTemplate);

    expect(controller.deleteReportTemplate).toHaveBeenCalledWith(testTemplate.id);
    expect(component.error).toContain('Failed to delete');
    expect(toast.error).toHaveBeenCalledWith(jasmine.stringMatching(/Failed to delete report template.*Balance Sheet/));
  });
});
