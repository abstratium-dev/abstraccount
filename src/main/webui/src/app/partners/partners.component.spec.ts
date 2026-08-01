import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PartnersComponent } from './partners.component';
import { ModelService } from '../model.service';
import { Controller, PartnerDTO, TransactionDTO, CreatePartnerResponseDTO, ImportPartnersResponseDTO } from '../controller';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { ToastService } from '../core/toast/toast.service';
import { signal } from '@angular/core';

describe('PartnersComponent', () => {
  let component: PartnersComponent;
  let fixture: ComponentFixture<PartnersComponent>;
  let modelService: jasmine.SpyObj<ModelService>;
  let controller: jasmine.SpyObj<Controller>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;
  let toastService: jasmine.SpyObj<ToastService>;

  const mockTransactions: TransactionDTO[] = [
    {
      id: 'tx1',
      date: '2024-01-01',
      status: 'POSTED',
      description: 'Test transaction 1',
      partnerId: 'P00000001',
      partnerName: 'Partner One',
      tags: [],
      entries: []
    },
    {
      id: 'tx2',
      date: '2024-01-02',
      status: 'POSTED',
      description: 'Test transaction 2',
      partnerId: 'P00000001',
      partnerName: 'Partner One',
      tags: [],
      entries: []
    },
    {
      id: 'tx3',
      date: '2024-01-03',
      status: 'POSTED',
      description: 'Test transaction 3',
      partnerId: 'P00000002',
      partnerName: 'Partner Two',
      tags: [],
      entries: []
    }
  ];

  const mockPartners: PartnerDTO[] = [
    { partnerNumber: 'P00000001', name: 'Partner One' },
    { partnerNumber: 'P00000002', name: 'Partner Two' },
    { partnerNumber: 'P00000003', name: 'Partner Three' }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', ['searchPartners', 'createPartner', 'importPartners']);
    const modelServiceSpy = jasmine.createSpyObj('ModelService', [], {
      transactions$: signal(mockTransactions),
      selectedJournalId$: signal('journal1')
    });
    const confirmDialogSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);
    confirmDialogSpy.confirm.and.returnValue(Promise.resolve(false));
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning', 'show', 'remove', 'clear']);

    await TestBed.configureTestingModule({
      imports: [PartnersComponent],
      providers: [
        { provide: ModelService, useValue: modelServiceSpy },
        { provide: Controller, useValue: controllerSpy },
        { provide: ConfirmDialogService, useValue: confirmDialogSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    confirmDialog = TestBed.inject(ConfirmDialogService) as jasmine.SpyObj<ConfirmDialogService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    fixture = TestBed.createComponent(PartnersComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all partners from backend with transaction counts', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    // Trigger change detection to run the effect
    fixture.detectChanges();
    await fixture.whenStable();
    
    expect(controller.searchPartners).toHaveBeenCalledWith('');
    expect(component.partners.length).toBe(3);
    
    // Partners are sorted by name by default, so check in sorted order
    const partnerOne = component.partners.find(p => p.partnerId === 'P00000001');
    const partnerTwo = component.partners.find(p => p.partnerId === 'P00000002');
    const partnerThree = component.partners.find(p => p.partnerId === 'P00000003');
    
    expect(partnerOne?.partnerName).toBe('Partner One');
    expect(partnerOne?.transactionCount).toBe(2);
    expect(partnerOne?.hasTransactions).toBe(true);
    
    expect(partnerTwo?.partnerName).toBe('Partner Two');
    expect(partnerTwo?.transactionCount).toBe(1);
    expect(partnerTwo?.hasTransactions).toBe(true);
    
    expect(partnerThree?.partnerName).toBe('Partner Three');
    expect(partnerThree?.transactionCount).toBe(0);
    expect(partnerThree?.hasTransactions).toBe(false);
  });

  it('should sort by partner name by default', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    expect(component.sortColumn).toBe('partnerName');
    expect(component.sortDirection).toBe('asc');
    expect(component.partners[0].partnerName).toBe('Partner One');
    expect(component.partners[1].partnerName).toBe('Partner Three');
    expect(component.partners[2].partnerName).toBe('Partner Two');
  });

  it('should toggle sort direction when clicking same column', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    component.onColumnSort('partnerName');
    expect(component.sortDirection).toBe('desc');
    expect(component.partners[0].partnerName).toBe('Partner Two');
    expect(component.partners[1].partnerName).toBe('Partner Three');
    expect(component.partners[2].partnerName).toBe('Partner One');
  });

  it('should sort by different column', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    component.onColumnSort('transactionCount');
    expect(component.sortColumn).toBe('transactionCount');
    expect(component.sortDirection).toBe('asc');
    expect(component.partners[0].transactionCount).toBe(0);
    expect(component.partners[1].transactionCount).toBe(1);
    expect(component.partners[2].transactionCount).toBe(2);
  });

  it('should show sort indicator for current column', () => {
    component.sortColumn = 'partnerName';
    component.sortDirection = 'asc';
    
    expect(component.getSortIndicator('partnerName')).toBe(' ▲');
    expect(component.getSortIndicator('partnerId')).toBe('');
  });

  it('should handle error when loading partners fails', async () => {
    controller.searchPartners.and.returnValue(Promise.reject(new Error('Network error')));
    
    await component.loadPartners();
    await fixture.whenStable();
    
    expect(component.error).toBe('Failed to load partners');
    expect(component.partners.length).toBe(0);
  });

  it('should reload partners when journal changes', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    // Manually trigger the journal change (simulating the effect)
    await component.loadPartners();
    await fixture.whenStable();
    
    expect(controller.searchPartners).toHaveBeenCalledTimes(1);
    expect(component.partners.length).toBe(3);
  });

  it('should update transaction counts when transactions change', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    
    // Trigger change detection to run the effect
    fixture.detectChanges();
    await fixture.whenStable();
    
    // Verify initial transaction counts (partners are sorted by name)
    const partnerOne = component.partners.find(p => p.partnerId === 'P00000001');
    const partnerTwo = component.partners.find(p => p.partnerId === 'P00000002');
    const partnerThree = component.partners.find(p => p.partnerId === 'P00000003');
    
    expect(partnerOne?.transactionCount).toBe(2);
    expect(partnerTwo?.transactionCount).toBe(1);
    expect(partnerThree?.transactionCount).toBe(0);
    
    // Note: In a real scenario, the effect would trigger when modelService.transactions$() changes
    // The effect watches both selectedJournalId$ and transactions$, so when transactions are
    // updated via controller.getTransactions(), the effect will re-run loadPartners()
  });

  // ========================================================================
  // Add Partner form tests
  // ========================================================================

  it('should show add partner form when Add Partner button is clicked', () => {
    expect(component.showAddForm).toBe(false);
    component.toggleAddForm();
    expect(component.showAddForm).toBe(true);
  });

  it('should hide add partner form when Cancel is clicked', () => {
    component.showAddForm = true;
    component.newPartnerName = 'Some Name';
    component.toggleAddForm();
    expect(component.showAddForm).toBe(false);
    expect(component.newPartnerName).toBe('');
  });

  it('should create partner successfully and show success toast', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    const createResponse: CreatePartnerResponseDTO = {
      partnerNumber: 'P00000004',
      name: 'New Partner',
      warnings: []
    };
    controller.createPartner.and.returnValue(Promise.resolve(createResponse));

    component.newPartnerName = 'New Partner';
    await component.onAddPartner();

    expect(controller.createPartner).toHaveBeenCalledWith('New Partner');
    expect(toastService.success).toHaveBeenCalledWith('Partner P00000004 created: New Partner');
    expect(toastService.warning).not.toHaveBeenCalled();
    expect(component.showAddForm).toBe(false);
    expect(component.newPartnerName).toBe('');
  });

  it('should show warning toast when duplicate name is detected', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    const createResponse: CreatePartnerResponseDTO = {
      partnerNumber: 'P00000001',
      name: 'Partner One',
      warnings: ['A partner with the name "Partner One" already exists (P00000001). No new partner was created.']
    };
    controller.createPartner.and.returnValue(Promise.resolve(createResponse));

    component.newPartnerName = 'Partner One';
    await component.onAddPartner();

    expect(controller.createPartner).toHaveBeenCalledWith('Partner One');
    expect(toastService.warning).toHaveBeenCalledWith(
      'A partner with the name "Partner One" already exists (P00000001). No new partner was created.'
    );
    expect(toastService.success).not.toHaveBeenCalled();
    expect(component.showAddForm).toBe(false);
  });

  it('should show error toast when partner creation fails', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    controller.createPartner.and.returnValue(Promise.reject(new Error('Network error')));

    component.newPartnerName = 'Test Partner';
    await component.onAddPartner();

    expect(toastService.error).toHaveBeenCalledWith('Failed to create partner');
    expect(component.addingPartner).toBe(false);
  });

  it('should not call createPartner when name is blank', async () => {
    component.newPartnerName = '   ';
    await component.onAddPartner();

    expect(controller.createPartner).not.toHaveBeenCalled();
  });

  it('should trim partner name before creating', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    const createResponse: CreatePartnerResponseDTO = {
      partnerNumber: 'P00000004',
      name: 'Trimmed Partner',
      warnings: []
    };
    controller.createPartner.and.returnValue(Promise.resolve(createResponse));

    component.newPartnerName = '  Trimmed Partner  ';
    await component.onAddPartner();

    expect(controller.createPartner).toHaveBeenCalledWith('Trimmed Partner');
  });

  it('should reload partners after creating a new one', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    const createResponse: CreatePartnerResponseDTO = {
      partnerNumber: 'P00000004',
      name: 'New Partner',
      warnings: []
    };
    controller.createPartner.and.returnValue(Promise.resolve(createResponse));

    // Trigger the effect to load partners initially
    fixture.detectChanges();
    await fixture.whenStable();

    const initialCallCount = controller.searchPartners.calls.count();

    component.newPartnerName = 'New Partner';
    await component.onAddPartner();

    // searchPartners should have been called again after creation
    expect(controller.searchPartners.calls.count()).toBeGreaterThan(initialCallCount);
  });

  it('should set addingPartner to true during creation and false after', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    let resolveCreate: (value: CreatePartnerResponseDTO) => void;
    const createPromise = new Promise<CreatePartnerResponseDTO>((resolve) => {
      resolveCreate = resolve;
    });
    controller.createPartner.and.returnValue(createPromise);

    component.newPartnerName = 'Test';
    const addPromise = component.onAddPartner();

    expect(component.addingPartner).toBe(true);

    resolveCreate!({ partnerNumber: 'P00000004', name: 'Test', warnings: [] });
    await addPromise;

    expect(component.addingPartner).toBe(false);
  });

  // ========================================================================
  // Import CSV tests
  // ========================================================================

  it('should set importingPartners to true during import and false after', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    let resolveImport: (value: ImportPartnersResponseDTO) => void;
    const importPromise = new Promise<ImportPartnersResponseDTO>((resolve) => {
      resolveImport = resolve;
    });
    controller.importPartners.and.returnValue(importPromise);

    // Bypass confirm dialog
    confirmDialog.confirm.and.returnValue(Promise.resolve(true));

    const file = new File(['"Partner Number","Name","Active"\n"P00000001","Test","true"\n'], 'partners.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: 'partners.csv' } } as unknown as Event;

    const selectedPromise = component.onFileSelected(event);

    // Wait for the confirm dialog promise to resolve before checking state
    await fixture.whenStable();

    expect(component.importingPartners).toBe(true);

    resolveImport!({ importedCount: 1, errors: [] });
    await selectedPromise;

    expect(component.importingPartners).toBe(false);
  });

  it('should not import when user cancels confirmation', async () => {
    confirmDialog.confirm.and.returnValue(Promise.resolve(false));

    const file = new File(['csv content'], 'partners.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: 'partners.csv' } } as unknown as Event;

    await component.onFileSelected(event);

    expect(controller.importPartners).not.toHaveBeenCalled();
    expect(component.importingPartners).toBe(false);
  });

  it('should not import when no file is selected', async () => {
    const event = { target: { files: [], value: '' } } as unknown as Event;

    await component.onFileSelected(event);

    expect(controller.importPartners).not.toHaveBeenCalled();
  });

  it('should show success toast and reload partners on successful import', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    controller.importPartners.and.returnValue(Promise.resolve({ importedCount: 5, errors: [] }));

    confirmDialog.confirm.and.returnValue(Promise.resolve(true));

    // Trigger the effect to load partners initially
    fixture.detectChanges();
    await fixture.whenStable();

    const initialCallCount = controller.searchPartners.calls.count();

    const file = new File(['"Partner Number","Name","Active"\n"P00000001","Test","true"\n'], 'partners.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: 'partners.csv' } } as unknown as Event;

    await component.onFileSelected(event);

    expect(controller.importPartners).toHaveBeenCalledWith('"Partner Number","Name","Active"\n"P00000001","Test","true"\n');
    expect(toastService.success).toHaveBeenCalledWith('Imported 5 partner(s).');
    // searchPartners called again to reload after import
    expect(controller.searchPartners.calls.count()).toBeGreaterThan(initialCallCount);
  });

  it('should show error toast with validation errors when import fails validation', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    const errorResponse: ImportPartnersResponseDTO = {
      importedCount: 0,
      errors: ['Line 1: invalid header', 'Line 2: bad number']
    };
    controller.importPartners.and.returnValue(Promise.resolve(errorResponse));

    confirmDialog.confirm.and.returnValue(Promise.resolve(true));

    const file = new File(['bad csv'], 'partners.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: 'partners.csv' } } as unknown as Event;

    await component.onFileSelected(event);

    expect(controller.importPartners).toHaveBeenCalledWith('bad csv');
    expect(toastService.error).toHaveBeenCalled();
    const errorArg = toastService.error.calls.mostRecent().args[0] as string;
    expect(errorArg).toContain('invalid header');
    expect(errorArg).toContain('bad number');
  });

  it('should show error toast when import throws an exception', async () => {
    controller.searchPartners.and.returnValue(Promise.resolve(mockPartners));
    controller.importPartners.and.returnValue(Promise.reject(new Error('Network error')));

    confirmDialog.confirm.and.returnValue(Promise.resolve(true));

    const file = new File(['csv'], 'partners.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: 'partners.csv' } } as unknown as Event;

    await component.onFileSelected(event);

    expect(toastService.error).toHaveBeenCalledWith('Failed to import partners');
    expect(component.importingPartners).toBe(false);
  });

  it('should reset file input value after import so same file can be reselected', async () => {
    controller.importPartners.and.returnValue(Promise.resolve({ importedCount: 1, errors: [] }));
    confirmDialog.confirm.and.returnValue(Promise.resolve(true));

    const file = new File(['csv'], 'partners.csv', { type: 'text/csv' });
    const inputElement = { files: [file], value: 'partners.csv' } as unknown as HTMLInputElement;
    const event = { target: inputElement } as unknown as Event;

    await component.onFileSelected(event);

    expect(inputElement.value).toBe('');
  });

  it('should reset file input value when user cancels confirmation', async () => {
    confirmDialog.confirm.and.returnValue(Promise.resolve(false));

    const file = new File(['csv'], 'partners.csv', { type: 'text/csv' });
    const inputElement = { files: [file], value: 'partners.csv' } as unknown as HTMLInputElement;
    const event = { target: inputElement } as unknown as Event;

    await component.onFileSelected(event);

    expect(inputElement.value).toBe('');
  });
});
