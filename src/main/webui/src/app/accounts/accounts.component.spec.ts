import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountsComponent } from './accounts.component';
import { Controller, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', ['getAccountTree']);
    const modelServiceSpy = jasmine.createSpyObj('ModelService', ['getSelectedJournalId']);

    await TestBed.configureTestingModule({
      imports: [AccountsComponent],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    modelService = TestBed.inject(ModelService) as jasmine.SpyObj<ModelService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load accounts on init when journal is selected', async () => {
    const mockAccounts: AccountTreeNode[] = [
      {
        id: '1',
        name: 'Assets',
        type: 'ASSET',
        note: null,
        parentId: null,
        children: [
          {
            id: '10',
            name: 'Current Assets',
            type: 'ASSET',
            note: null,
            parentId: '1',
            children: []
          }
        ]
      }
    ];

    modelService.getSelectedJournalId.and.returnValue('test-journal-id');
    controller.getAccountTree.and.returnValue(Promise.resolve(mockAccounts));

    await component.ngOnInit();

    expect(modelService.getSelectedJournalId).toHaveBeenCalled();
    expect(controller.getAccountTree).toHaveBeenCalledWith('test-journal-id');
    expect(component.accounts).toEqual(mockAccounts);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
  });

  it('should show error when no journal is selected', async () => {
    modelService.getSelectedJournalId.and.returnValue(null);

    await component.ngOnInit();

    expect(component.error).toBe('No journal selected');
    expect(component.loading).toBeFalse();
  });

  it('should handle errors when loading accounts', async () => {
    modelService.getSelectedJournalId.and.returnValue('test-journal-id');
    controller.getAccountTree.and.returnValue(Promise.reject(new Error('Network error')));

    await component.ngOnInit();

    expect(component.error).toBe('Failed to load accounts');
    expect(component.loading).toBeFalse();
  });
});
