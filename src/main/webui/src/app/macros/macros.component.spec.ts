import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MacrosComponent } from './macros.component';
import { Controller } from '../controller';
import { ModelService } from '../model.service';
import { signal } from '@angular/core';

describe('MacrosComponent', () => {
  let component: MacrosComponent;
  let fixture: ComponentFixture<MacrosComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', ['listMacros', 'executeMacro']);
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
});
