import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MacrosComponent } from './macros.component';
import { Controller, ImportResult } from '../controller';
import { ModelService } from '../model.service';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { ToastService } from '../core/toast/toast.service';
import { signal } from '@angular/core';

describe('MacrosComponent', () => {
  let component: MacrosComponent;
  let fixture: ComponentFixture<MacrosComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockConfirmDialog: jasmine.SpyObj<ConfirmDialogService>;
  let mockToast: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', [
      'listMacros', 'executeMacro', 'exportMacros', 'importMacros', 'deleteMacro', 'getAccountTree'
    ]);
    mockModelService = jasmine.createSpyObj('ModelService', ['getAccounts', 'getSelectedJournalId'], {
      macros$: signal([]),
      selectedJournalId$: signal('test-journal-id')
    });
    mockModelService.getAccounts.and.returnValue([]);
    mockModelService.getSelectedJournalId.and.returnValue('test-journal-id');
    mockController.getAccountTree.and.returnValue(Promise.resolve([]));
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockConfirmDialog = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'show']);

    await TestBed.configureTestingModule({
      imports: [MacrosComponent],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService },
        { provide: Router, useValue: mockRouter },
        { provide: ConfirmDialogService, useValue: mockConfirmDialog },
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
});
