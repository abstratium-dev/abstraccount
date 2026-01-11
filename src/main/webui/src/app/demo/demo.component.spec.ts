import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoComponent } from './demo.component';
import { Controller } from '../controller';
import { ModelService, Demo } from '../model.service';
import { ToastService } from '../core/toast/toast.service';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';
import { signal } from '@angular/core';

describe('DemoComponent', () => {
  let component: DemoComponent;
  let fixture: ComponentFixture<DemoComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let confirmService: jasmine.SpyObj<ConfirmDialogService>;
  
  // Store signal references for testing
  let demosSignal: ReturnType<typeof signal<Demo[]>>;
  let loadingSignal: ReturnType<typeof signal<boolean>>;
  let errorSignal: ReturnType<typeof signal<string | null>>;

  const mockDemos: Demo[] = [
    { id: '1' },
    { id: '2' },
    { id: '3' }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', ['loadDemos', 'createDemo', 'deleteDemo']);
    
    // Create writable signals for testing
    demosSignal = signal<Demo[]>([]);
    loadingSignal = signal<boolean>(false);
    errorSignal = signal<string | null>(null);
    
    const modelServiceSpy = jasmine.createSpyObj('ModelService', [], {
      demos$: demosSignal,
      demosLoading$: loadingSignal,
      demosError$: errorSignal
    });
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['success', 'error']);
    const confirmServiceSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [DemoComponent],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: ConfirmDialogService, useValue: confirmServiceSpy }
      ]
    }).compileComponents();

    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    confirmService = TestBed.inject(ConfirmDialogService) as jasmine.SpyObj<ConfirmDialogService>;

    fixture = TestBed.createComponent(DemoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('should load demos on init', () => {
      fixture.detectChanges();
      expect(controller.loadDemos).toHaveBeenCalled();
    });
  });

  describe('Form Management', () => {
    it('should toggle add form', () => {
      expect(component.showAddForm).toBe(false);
      
      component.toggleAddForm();
      expect(component.showAddForm).toBe(true);
      
      component.toggleAddForm();
      expect(component.showAddForm).toBe(false);
    });

    it('should clear form error when opening form', () => {
      component.formError = 'Some error';
      component.showAddForm = false;
      
      component.toggleAddForm();
      
      expect(component.formError).toBeNull();
    });
  });

  describe('Create Demo', () => {
    it('should create demo successfully', async () => {
      controller.createDemo.and.returnValue(Promise.resolve({ id: '123' }));
      component.showAddForm = true;

      await component.onSubmitAdd();

      expect(controller.createDemo).toHaveBeenCalled();
      expect(toastService.success).toHaveBeenCalledWith('Demo item created successfully');
      expect(component.showAddForm).toBe(false);
      expect(component.formSubmitting).toBe(false);
    });

    it('should handle create error', async () => {
      controller.createDemo.and.returnValue(Promise.reject(new Error('Failed')));

      await component.onSubmitAdd();

      expect(controller.createDemo).toHaveBeenCalled();
      expect(component.formError).toBe('Failed to create demo item. Please try again.');
      expect(component.formSubmitting).toBe(false);
    });

    it('should set submitting state during creation', async () => {
      let resolveCreate: (value: Demo) => void;
      const createPromise = new Promise<Demo>((resolve) => {
        resolveCreate = resolve;
      });
      controller.createDemo.and.returnValue(createPromise);

      const submitPromise = component.onSubmitAdd();
      expect(component.formSubmitting).toBe(true);

      resolveCreate!({ id: '123' });
      await submitPromise;
      expect(component.formSubmitting).toBe(false);
    });
  });

  describe('Delete Demo', () => {
    it('should delete demo after confirmation', async () => {
      const demoToDelete: Demo = { id: '123' };
      confirmService.confirm.and.returnValue(Promise.resolve(true));
      controller.deleteDemo.and.returnValue(Promise.resolve());

      await component.deleteDemo(demoToDelete);

      expect(confirmService.confirm).toHaveBeenCalledWith({
        title: 'Delete Demo Item',
        message: 'Are you sure you want to delete this demo item? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        confirmClass: 'btn-danger'
      });
      expect(controller.deleteDemo).toHaveBeenCalledWith('123');
      expect(toastService.success).toHaveBeenCalledWith('Demo item deleted successfully');
    });

    it('should not delete if user cancels', async () => {
      const demoToDelete: Demo = { id: '123' };
      confirmService.confirm.and.returnValue(Promise.resolve(false));

      await component.deleteDemo(demoToDelete);

      expect(confirmService.confirm).toHaveBeenCalled();
      expect(controller.deleteDemo).not.toHaveBeenCalled();
      expect(toastService.success).not.toHaveBeenCalled();
    });

    it('should show error toast on delete failure', async () => {
      const demoToDelete: Demo = { id: '123' };
      confirmService.confirm.and.returnValue(Promise.resolve(true));
      controller.deleteDemo.and.returnValue(Promise.reject(new Error('Failed')));

      await component.deleteDemo(demoToDelete);

      expect(controller.deleteDemo).toHaveBeenCalledWith('123');
      expect(toastService.error).toHaveBeenCalledWith('Failed to delete demo item. Please try again.');
    });
  });

  describe('Signal Integration', () => {
    it('should use demos signal from model service', () => {
      expect(component.demos).toBe(modelService.demos$);
    });

    it('should use loading signal from model service', () => {
      expect(component.loading).toBe(modelService.demosLoading$);
    });

    it('should use error signal from model service', () => {
      expect(component.error).toBe(modelService.demosError$);
    });
  });

  describe('Template Binding Validation', () => {
    it('should render loading state in template', () => {
      loadingSignal.set(true);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const loadingElement = compiled.querySelector('.loading');
      expect(loadingElement).toBeTruthy();
      expect(loadingElement?.textContent).toContain('Loading demo items');
    });

    it('should render error state in template', () => {
      errorSignal.set('Test error message');
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const errorElement = compiled.querySelector('.error-box');
      expect(errorElement).toBeTruthy();
      expect(errorElement?.textContent).toContain('Test error message');
    });

    it('should have retry button in error state that calls onRetry', () => {
      spyOn(component, 'onRetry');
      errorSignal.set('Test error');
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const retryButton = compiled.querySelector('.error-box button') as HTMLButtonElement;
      expect(retryButton).toBeTruthy();
      
      retryButton.click();
      expect(component.onRetry).toHaveBeenCalled();
    });

    it('should render demo list when demos are available', () => {
      demosSignal.set(mockDemos);
      loadingSignal.set(false);
      errorSignal.set(null);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const tiles = compiled.querySelectorAll('.tile');
      expect(tiles.length).toBe(3);
    });

    it('should render demo IDs in template', () => {
      demosSignal.set([{ id: 'test-id-123' }]);
      loadingSignal.set(false);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('test-id-123');
    });

    it('should show add form when showAddForm is true', () => {
      component.showAddForm = true;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const formContainer = compiled.querySelector('.form-container');
      expect(formContainer).toBeTruthy();
    });

    it('should hide add form when showAddForm is false', () => {
      component.showAddForm = false;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const formContainer = compiled.querySelector('.form-container');
      expect(formContainer).toBeFalsy();
    });

    it('should toggle button text based on showAddForm state', () => {
      component.showAddForm = false;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const addButton = compiled.querySelector('.btn-add') as HTMLButtonElement;
      expect(addButton.textContent).toContain('Add Demo Item');
      
      component.showAddForm = true;
      fixture.detectChanges();
      expect(addButton.textContent).toContain('Cancel');
    });

    it('should call toggleAddForm when add button is clicked', () => {
      spyOn(component, 'toggleAddForm');
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const addButton = compiled.querySelector('.btn-add') as HTMLButtonElement;
      addButton.click();
      
      expect(component.toggleAddForm).toHaveBeenCalled();
    });

    it('should call deleteDemo when delete button is clicked', () => {
      spyOn(component, 'deleteDemo');
      demosSignal.set([{ id: 'test-123' }]);
      loadingSignal.set(false);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const deleteButton = compiled.querySelector('.btn-icon-danger') as HTMLButtonElement;
      deleteButton.click();
      
      expect(component.deleteDemo).toHaveBeenCalledWith({ id: 'test-123' });
    });

    it('should show empty state when no demos and not loading', () => {
      demosSignal.set([]);
      loadingSignal.set(false);
      errorSignal.set(null);
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const infoMessage = compiled.querySelector('.info-message');
      expect(infoMessage).toBeTruthy();
      expect(infoMessage?.textContent).toContain('No demo items found');
    });

    it('should call onSubmitAdd when form is submitted', () => {
      spyOn(component, 'onSubmitAdd');
      component.showAddForm = true;
      fixture.detectChanges();
      
      const compiled = fixture.nativeElement as HTMLElement;
      const form = compiled.querySelector('form') as HTMLFormElement;
      form.dispatchEvent(new Event('submit'));
      
      expect(component.onSubmitAdd).toHaveBeenCalled();
    });
  });
});
