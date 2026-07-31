import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MacrosComponent } from './macros.component';
import { Controller, ImportResult } from '../controller';
import { ModelService } from '../model.service';
import { signal } from '@angular/core';

describe('MacrosComponent', () => {
  let component: MacrosComponent;
  let fixture: ComponentFixture<MacrosComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', [
      'listMacros', 'executeMacro', 'exportMacros', 'importMacros'
    ]);
    mockModelService = jasmine.createSpyObj('ModelService', [], {
      macros$: signal([]),
      selectedJournalId$: signal('test-journal-id')
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [MacrosComponent],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService },
        { provide: Router, useValue: mockRouter }
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

  it('should perform import and show success message', async () => {
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

    await component.performImport();

    expect(mockController.importMacros).toHaveBeenCalledWith('yaml content');
    expect(component.importSuccessMessage).toContain('2');
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

  it('should resolve conflicts by replacing originals', async () => {
    component.importResult = {
      status: 'conflict',
      conflicts: [{ existingId: 'old-id', name: 'OldMacro', artefactType: 'macro' }]
    };
    component.importFileContent = 'yaml content';

    const successResult: ImportResult = {
      status: 'success',
      imported: 1,
      items: [{ originalName: 'OldMacro', finalName: 'OldMacro', id: 'new-id' }]
    };
    mockController.importMacros.and.returnValue(Promise.resolve(successResult));

    await component.resolveConflictsReplace();

    expect(mockController.importMacros).toHaveBeenCalledWith('yaml content', ['old-id']);
    expect(component.importSuccessMessage).toContain('1');
    expect(component.importResult).toBeNull();
  });

  it('should resolve conflicts by renaming duplicates', async () => {
    component.importResult = {
      status: 'conflict',
      conflicts: [{ existingId: 'old-id', name: 'DupMacro', artefactType: 'macro' }]
    };
    component.importFileContent = 'yaml content';

    const successResult: ImportResult = {
      status: 'success',
      imported: 1,
      items: [{ originalName: 'DupMacro', finalName: 'DupMacro (1)', id: 'new-id' }]
    };
    mockController.importMacros.and.returnValue(Promise.resolve(successResult));

    await component.resolveConflictsRename();

    expect(mockController.importMacros).toHaveBeenCalledWith('yaml content', [], true);
    expect(component.importSuccessMessage).toContain('DupMacro (1)');
    expect(component.importResult).toBeNull();
  });
});
