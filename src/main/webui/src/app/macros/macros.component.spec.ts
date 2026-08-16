import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MacrosComponent } from './macros.component';
import { Controller, ImportResult, JournalMetadataDTO } from '../controller';
import { ModelService } from '../model.service';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { InfoDialogService } from '../core/info-dialog/info-dialog.service';
import { ToastService } from '../core/toast/toast.service';
import { signal } from '@angular/core';

describe('MacrosComponent', () => {
  let component: MacrosComponent;
  let fixture: ComponentFixture<MacrosComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockConfirmDialog: jasmine.SpyObj<ConfirmDialogService>;
  let mockInfoDialog: jasmine.SpyObj<InfoDialogService>;
  let mockToast: jasmine.SpyObj<ToastService>;

  const unlockedJournal: JournalMetadataDTO = {
    id: 'test-journal-id', title: 'Open Journal', subtitle: null, currency: 'CHF',
    commodities: {}, logo: null, previousJournalId: null, locked: false
  };
  const lockedJournal: JournalMetadataDTO = {
    id: 'test-journal-id', title: 'Locked Journal', subtitle: null, currency: 'CHF',
    commodities: {}, logo: null, previousJournalId: null, locked: true
  };

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', [
      'listMacros', 'executeMacro', 'executeMacroBatch', 'exportMacros', 'importMacros', 'deleteMacro'
    ]);
    mockModelService = jasmine.createSpyObj('ModelService', ['getAccounts', 'getSelectedJournalId'], {
      macros$: signal([]),
      selectedJournalId$: signal('test-journal-id'),
      journals$: signal([unlockedJournal])
    });
    mockModelService.getAccounts.and.returnValue([]);
    mockModelService.getSelectedJournalId.and.returnValue('test-journal-id');
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockConfirmDialog = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);
    mockInfoDialog = jasmine.createSpyObj('InfoDialogService', ['show']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'show']);

    await TestBed.configureTestingModule({
      imports: [MacrosComponent],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService },
        { provide: Router, useValue: mockRouter },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
        { provide: InfoDialogService, useValue: mockInfoDialog },
        { provide: ToastService, useValue: mockToast }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MacrosComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load macros on init', async () => {
    mockController.listMacros.and.returnValue(Promise.resolve([]));
    
    component.ngOnInit();
    await fixture.whenStable();
    
    expect(mockController.listMacros).toHaveBeenCalled();
  });

  it('should execute macro and navigate to journal', async () => {
    const testMacro = {
      id: 'test-macro',
      name: 'Test Macro',
      description: 'Test',
      parameters: [
        { name: 'amount', type: 'amount', prompt: 'Amount', required: true, defaultValue: null, filter: null }
      ],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };

    component.selectMacro(testMacro);
    component.setParameterValue('amount', '100.00');

    mockController.executeMacro.and.returnValue(Promise.resolve('transaction-id'));
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    await component.generateTransaction();

    expect(mockController.executeMacro).toHaveBeenCalledWith(
      'test-macro',
      'test-journal-id',
      { amount: '100.00' }
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/journal']);
  });

  it('should show error if required parameter is missing', async () => {
    const testMacro = {
      id: 'test-macro',
      name: 'Test Macro',
      description: 'Test',
      parameters: [
        { name: 'amount', type: 'amount', prompt: 'Amount', required: true, defaultValue: null, filter: null }
      ],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };

    component.selectMacro(testMacro);
    // Don't set the required parameter

    await component.generateTransaction();

    expect(component.errorMessage).toContain('required');
    expect(mockController.executeMacro).not.toHaveBeenCalled();
  });

  it('should initialize default values for autocomplete parameters (invoice type)', () => {
    const testMacro = {
      id: 'test-macro',
      name: 'InvoiceForServicesOrSaas',
      description: 'Test invoice macro',
      parameters: [
        { name: 'invoice_number', type: 'invoice', prompt: 'Invoice number', required: true, defaultValue: '{next_invoice_SI}', filter: null },
        { name: 'partner', type: 'partner', prompt: 'Partner', required: true, defaultValue: null, filter: null }
      ],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };

    component.selectMacro(testMacro);

    // Verify that default value is set even for autocomplete fields
    expect(component.getParameterValue('invoice_number')).toBe('{next_invoice_SI}');
    expect(component.getParameterValue('partner')).toBe('');
  });

  it('should call exportMacros on controller when exporting', async () => {
    mockController.exportMacros.and.returnValue(Promise.resolve('yaml content'));

    // Stub the DOM download
    spyOn(document, 'createElement').and.callThrough();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:url');
    spyOn(URL, 'revokeObjectURL');

    await component.exportMacros();

    expect(mockController.exportMacros).toHaveBeenCalled();
  });

  it('should open import dialog', () => {
    component.openImportDialog();
    expect(component.showImportDialog).toBeTrue();
  });

  it('should close import dialog and reset state', () => {
    component.openImportDialog();
    component.importFileName = 'test.yaml';
    component.importFileContent = 'content';
    component.closeImportDialog();
    expect(component.showImportDialog).toBeFalse();
    expect(component.importFileName).toBe('');
    expect(component.importFileContent).toBe('');
  });

  it('should close import dialog and show success toast on import', async () => {
    const result: ImportResult = {
      status: 'success',
      imported: 2,
      items: [
        { originalName: 'Macro1', finalName: 'Macro1', id: 'id1' },
        { originalName: 'Macro2', finalName: 'Macro2', id: 'id2' }
      ]
    };
    mockController.importMacros.and.returnValue(Promise.resolve(result));
    component.importFileContent = 'yaml content';
    component.showImportDialog = true;

    await component.performImport();

    expect(mockController.importMacros).toHaveBeenCalledWith('yaml content');
    expect(mockToast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 2 macro\(s\)/));
    expect(component.showImportDialog).toBeFalse();
    expect(component.importResult).toBeNull();
  });

  it('should show conflict dialog when import detects conflicts', async () => {
    const result: ImportResult = {
      status: 'conflict',
      conflicts: [
        { existingId: 'existing-id', name: 'DuplicateMacro', artefactType: 'macro' }
      ]
    };
    mockController.importMacros.and.returnValue(Promise.resolve(result));
    component.importFileContent = 'yaml content';

    await component.performImport();

    expect(component.importResult).not.toBeNull();
    expect(component.importResult?.conflicts?.length).toBe(1);
  });

  it('should show error message on import error status', async () => {
    const result: ImportResult = {
      status: 'error',
      message: 'Invalid JSON in template'
    };
    mockController.importMacros.and.returnValue(Promise.resolve(result));
    component.importFileContent = 'yaml content';

    await component.performImport();

    expect(component.errorMessage).toContain('Invalid JSON');
  });

  it('should resolve conflicts by replacing originals and close dialog with toast', async () => {
    component.importResult = {
      status: 'conflict',
      conflicts: [{ existingId: 'old-id', name: 'OldMacro', artefactType: 'macro' }]
    };
    component.importFileContent = 'yaml content';
    component.showImportDialog = true;

    const successResult: ImportResult = {
      status: 'success',
      imported: 1,
      items: [{ originalName: 'OldMacro', finalName: 'OldMacro', id: 'new-id' }]
    };
    mockController.importMacros.and.returnValue(Promise.resolve(successResult));

    await component.resolveConflictsReplace();

    expect(mockController.importMacros).toHaveBeenCalledWith('yaml content', ['old-id']);
    expect(mockToast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 1 macro\(s\)/));
    expect(component.showImportDialog).toBeFalse();
    expect(component.importResult).toBeNull();
  });

  it('should resolve conflicts by renaming duplicates and close dialog with toast', async () => {
    component.importResult = {
      status: 'conflict',
      conflicts: [{ existingId: 'old-id', name: 'DupMacro', artefactType: 'macro' }]
    };
    component.importFileContent = 'yaml content';
    component.showImportDialog = true;

    const successResult: ImportResult = {
      status: 'success',
      imported: 1,
      items: [{ originalName: 'DupMacro', finalName: 'DupMacro (1)', id: 'new-id' }]
    };
    mockController.importMacros.and.returnValue(Promise.resolve(successResult));

    await component.resolveConflictsRename();

    expect(mockController.importMacros).toHaveBeenCalledWith('yaml content', [], true);
    expect(mockToast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 1 macro\(s\).*DupMacro \(1\)/));
    expect(component.showImportDialog).toBeFalse();
    expect(component.importResult).toBeNull();
  });

  it('should fetch built-in macros and import them', async () => {
    const result: ImportResult = {
      status: 'success',
      imported: 3,
      items: []
    };
    mockController.importMacros.and.returnValue(Promise.resolve(result));
    spyOn(window, 'fetch').and.returnValue(Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('builtin yaml content')
    } as Response));

    await component.importBuiltinMacros();

    expect(window.fetch).toHaveBeenCalledWith('/builtin/macros-export.yaml');
    expect(mockController.importMacros).toHaveBeenCalledWith('builtin yaml content');
    expect(mockToast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully imported 3 macro\(s\)/));
    expect(component.showImportDialog).toBeFalse();
  });

  it('should show error and not import when built-in fetch fails', async () => {
    spyOn(window, 'fetch').and.returnValue(Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('')
    } as Response));

    await component.importBuiltinMacros();

    expect(window.fetch).toHaveBeenCalledWith('/builtin/macros-export.yaml');
    expect(mockController.importMacros).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('built-in');
    expect(component.importInProgress).toBeFalse();
  });

  it('should delete macro when confirmed', async () => {
    const testMacro = {
      id: 'macro-to-delete',
      name: 'Deletable Macro',
      description: 'Test',
      parameters: [],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };
    mockController.deleteMacro.and.returnValue(Promise.resolve());
    mockConfirmDialog.confirm.and.returnValue(Promise.resolve(true));

    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    await component.deleteMacro(testMacro, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mockConfirmDialog.confirm).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Delete Macro',
      message: jasmine.stringMatching(/Deletable Macro/),
      confirmText: 'Delete',
      confirmClass: 'btn-danger',
    }));
    expect(mockController.deleteMacro).toHaveBeenCalledWith('macro-to-delete');
    expect(component.errorMessage).toBe('');
    expect(mockToast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Deletable Macro.*deleted/));
  });

  it('should not delete macro when confirmation is cancelled', async () => {
    const testMacro = {
      id: 'macro-to-delete',
      name: 'Deletable Macro',
      description: 'Test',
      parameters: [],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };
    mockConfirmDialog.confirm.and.returnValue(Promise.resolve(false));

    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    await component.deleteMacro(testMacro, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(mockController.deleteMacro).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
  });

  it('should stop propagation so the tile click does not open the execute dialog', async () => {
    const testMacro = {
      id: 'macro-to-delete',
      name: 'Deletable Macro',
      description: 'Test',
      parameters: [],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };
    mockConfirmDialog.confirm.and.returnValue(Promise.resolve(false));

    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    await component.deleteMacro(testMacro, event);

    expect(component.showExecuteDialog).toBeFalse();
    expect(component.selectedMacro).toBeNull();
  });

  it('should open the single execute dialog and stop propagation when the single button is clicked', () => {
    const testMacro = {
      id: 'single-macro',
      name: 'Single Macro',
      description: 'Test',
      parameters: [],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };

    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.selectSingleMacro(testMacro, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.showExecuteDialog).toBeTrue();
    expect(component.selectedMacro).toEqual(testMacro);
  });

  it('should show error message and toast when delete fails', async () => {
    const testMacro = {
      id: 'macro-to-delete',
      name: 'Deletable Macro',
      description: 'Test',
      parameters: [],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };
    mockController.deleteMacro.and.returnValue(Promise.reject(new Error('Network error')));
    mockConfirmDialog.confirm.and.returnValue(Promise.resolve(true));

    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    await component.deleteMacro(testMacro, event);

    expect(mockController.deleteMacro).toHaveBeenCalledWith('macro-to-delete');
    expect(component.errorMessage).toContain('Failed to delete macro');
    expect(mockToast.error).toHaveBeenCalledWith(jasmine.stringMatching(/Failed to delete macro.*Deletable Macro/));
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

  describe('locked journal guard', () => {
    const testMacro = {
      id: 'test-macro',
      name: 'Test Macro',
      description: 'Test',
      parameters: [
        { name: 'amount', type: 'amount', prompt: 'Amount', required: true, defaultValue: null, filter: null }
      ],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };

    it('blocks opening the execute dialog when the journal is locked', () => {
      (mockModelService.journals$ as any).set([lockedJournal]);

      component.selectMacro(testMacro);

      expect(component.showExecuteDialog).toBe(false);
      expect(component.selectedMacro).toBeNull();
      expect(mockInfoDialog.show).toHaveBeenCalled();
      expect(mockInfoDialog.show.calls.mostRecent().args[0].title).toBe('Journal Locked');
    });

    it('allows opening the execute dialog when the journal is unlocked', () => {
      (mockModelService.journals$ as any).set([unlockedJournal]);

      component.selectMacro(testMacro);

      expect(component.showExecuteDialog).toBe(true);
      expect(component.selectedMacro).toEqual(testMacro);
      expect(mockInfoDialog.show).not.toHaveBeenCalled();
    });

    it('blocks generating a transaction when the journal is locked', async () => {
      (mockModelService.journals$ as any).set([lockedJournal]);
      component.selectedMacro = testMacro;
      component.setParameterValue('amount', '100.00');

      await component.generateTransaction();

      expect(mockController.executeMacro).not.toHaveBeenCalled();
      expect(mockInfoDialog.show).toHaveBeenCalled();
    });

    it('allows generating a transaction when the journal is unlocked', async () => {
      (mockModelService.journals$ as any).set([unlockedJournal]);
      component.selectedMacro = testMacro;
      component.setParameterValue('amount', '100.00');
      mockController.executeMacro.and.returnValue(Promise.resolve('transaction-id'));
      mockRouter.navigate.and.returnValue(Promise.resolve(true));

      await component.generateTransaction();

      expect(mockController.executeMacro).toHaveBeenCalledWith(
        'test-macro',
        'test-journal-id',
        { amount: '100.00' }
      );
      expect(mockInfoDialog.show).not.toHaveBeenCalled();
    });

    it('does not show the lock dialog when no journal is selected', () => {
      (mockModelService.journals$ as any).set([]);

      component.selectMacro(testMacro);

      // No journal -> no lock dialog, the modal opens (the backend will reject if no journal)
      expect(mockInfoDialog.show).not.toHaveBeenCalled();
    });
  });

  describe('batch execution', () => {
    const batchMacro = {
      id: 'batch-macro',
      name: 'PaymentProcessorSale',
      description: 'Record a PSP sale',
      parameters: [
        { name: 'date', type: 'date', prompt: 'Date', required: true, defaultValue: null, filter: null },
        { name: 'description', type: 'text', prompt: 'Description', required: true, defaultValue: null, filter: null },
        { name: 'gross_amount', type: 'amount', prompt: 'Gross amount', required: true, defaultValue: null, filter: null },
        { name: 'revenue_account', type: 'account', prompt: 'Revenue account', required: true, defaultValue: null, filter: '^3:.*$' },
        { name: 'processor_account', type: 'account', prompt: 'Processor account', required: true, defaultValue: null, filter: '^1021.*$' }
      ],
      template: 'test template',
      validation: null,
      notes: null,
      createdDate: '2024-01-01',
      modifiedDate: '2024-01-01'
    };

    beforeEach(() => {
      (mockModelService.journals$ as any).set([unlockedJournal]);
    });

    it('splits parameters into shared (account) and row (non-account) groups', () => {
      expect(component.getBatchSharedParameters(batchMacro).map(p => p.name)).toEqual([
        'revenue_account', 'processor_account'
      ]);
      expect(component.getBatchRowParameterNames(batchMacro)).toEqual([
        'date', 'description', 'gross_amount'
      ]);
    });

    it('opens the batch dialog for the selected macro and resets state', () => {
      const event = new Event('click');
      spyOn(event, 'stopPropagation');

      component.batchResult = {
        totalRows: 1, successCount: 1, failureCount: 0,
        results: [{ row: 1, success: true, transactionId: 'tx', error: null }]
      };

      component.selectMacroForBatch(batchMacro, event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showBatchDialog).toBeTrue();
      expect(component.selectedBatchMacro).toEqual(batchMacro);
      expect(component.batchResult).toBeNull();
      expect(component.getBatchSharedValue('revenue_account')).toBe('');
      expect(component.getBatchSharedValue('processor_account')).toBe('');
    });

    it('blocks opening the batch dialog when the journal is locked', () => {
      (mockModelService.journals$ as any).set([lockedJournal]);
      const event = new Event('click');

      component.selectMacroForBatch(batchMacro, event);

      expect(component.showBatchDialog).toBeFalse();
      expect(mockInfoDialog.show).toHaveBeenCalled();
    });

    it('closes the batch dialog and resets state', () => {
      component.selectMacroForBatch(batchMacro, new Event('click'));
      component.batchCsv = '2026-01-01,desc,10.00';

      component.closeBatchDialog();

      expect(component.showBatchDialog).toBeFalse();
      expect(component.selectedBatchMacro).toBeNull();
      expect(component.batchCsv).toBe('');
      expect(component.batchResult).toBeNull();
    });

    it('requires shared account parameters before executing a batch', async () => {
      component.selectMacroForBatch(batchMacro, new Event('click'));
      component.batchCsv = '2026-01-01,desc,10.00';
      // Leave shared account parameters empty

      await component.executeBatch();

      expect(component.batchErrorMessage).toContain('required');
      expect(mockController.executeMacroBatch).not.toHaveBeenCalled();
    });

    it('requires CSV data before executing a batch', async () => {
      component.selectMacroForBatch(batchMacro, new Event('click'));
      component.setBatchSharedValue('revenue_account', '3400');
      component.setBatchSharedValue('processor_account', '1021');

      await component.executeBatch();

      expect(component.batchErrorMessage).toContain('CSV');
      expect(mockController.executeMacroBatch).not.toHaveBeenCalled();
    });

    it('executes a batch and stores the per-row result summary', async () => {
      component.selectMacroForBatch(batchMacro, new Event('click'));
      component.setBatchSharedValue('revenue_account', '3400');
      component.setBatchSharedValue('processor_account', '1021');
      component.batchCsv = '2026-01-01,Sale 1,10.00\n2026-01-02,Sale 2,20.00';

      const result = {
        totalRows: 2, successCount: 2, failureCount: 0,
        results: [
          { row: 1, success: true, transactionId: 'tx-1', error: null },
          { row: 2, success: true, transactionId: 'tx-2', error: null }
        ]
      };
      mockController.executeMacroBatch.and.returnValue(Promise.resolve(result));

      await component.executeBatch();

      expect(mockController.executeMacroBatch).toHaveBeenCalledWith(
        'batch-macro',
        'test-journal-id',
        { revenue_account: '3400', processor_account: '1021' },
        '2026-01-01,Sale 1,10.00\n2026-01-02,Sale 2,20.00'
      );
      expect(component.batchResult).toEqual(result);
      expect(mockToast.success).toHaveBeenCalledWith(jasmine.stringMatching(/Successfully created 2 transaction\(s\)/));
    });

    it('shows an error toast summarising partial failures', async () => {
      component.selectMacroForBatch(batchMacro, new Event('click'));
      component.setBatchSharedValue('revenue_account', '3400');
      component.setBatchSharedValue('processor_account', '1021');
      component.batchCsv = '2026-01-01,Sale 1,10.00\nbad-row';

      const result = {
        totalRows: 2, successCount: 1, failureCount: 1,
        results: [
          { row: 1, success: true, transactionId: 'tx-1', error: null },
          { row: 2, success: false, transactionId: null, error: 'Expected 3 column(s), got 1' }
        ]
      };
      mockController.executeMacroBatch.and.returnValue(Promise.resolve(result));

      await component.executeBatch();

      expect(component.batchResult).toEqual(result);
      expect(mockToast.error).toHaveBeenCalledWith(jasmine.stringMatching(/1 row\(s\) failed/));
    });

    it('blocks executing a batch when the journal is locked', async () => {
      component.selectMacroForBatch(batchMacro, new Event('click'));
      component.setBatchSharedValue('revenue_account', '3400');
      component.setBatchSharedValue('processor_account', '1021');
      component.batchCsv = '2026-01-01,Sale 1,10.00';

      (mockModelService.journals$ as any).set([lockedJournal]);

      await component.executeBatch();

      expect(mockController.executeMacroBatch).not.toHaveBeenCalled();
      expect(mockInfoDialog.show).toHaveBeenCalled();
    });

    it('shows an error message when the batch request fails', async () => {
      component.selectMacroForBatch(batchMacro, new Event('click'));
      component.setBatchSharedValue('revenue_account', '3400');
      component.setBatchSharedValue('processor_account', '1021');
      component.batchCsv = '2026-01-01,Sale 1,10.00';
      mockController.executeMacroBatch.and.returnValue(Promise.reject(new Error('Network error')));

      await component.executeBatch();

      expect(component.batchErrorMessage).toContain('Failed to execute macro batch');
      expect(component.batchInProgress).toBeFalse();
    });
  });
});
