import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountsComponent } from './accounts.component';
import { Controller, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', ['getAccountTree']);
    const accountsSignal = signal<AccountTreeNode[]>([]);
    const modelServiceSpy = jasmine.createSpyObj('ModelService', ['getSelectedJournalId', 'setAccounts']);
    // Add accounts$ signal to the mock
    (modelServiceSpy as any).accounts$ = accountsSignal.asReadonly();
    // Make setAccounts update the signal
    modelServiceSpy.setAccounts.and.callFake((accounts: AccountTreeNode[]) => {
      accountsSignal.set(accounts);
    });

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
    controller.getAccountTree.and.callFake(async (journalId: string) => {
      modelService.setAccounts(mockAccounts);
      return mockAccounts;
    });

    await component.ngOnInit();

    expect(modelService.getSelectedJournalId).toHaveBeenCalled();
    expect(controller.getAccountTree).toHaveBeenCalledWith('test-journal-id');
    expect(component.accounts()).toEqual(mockAccounts);
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

  describe('Context Menu', () => {
    it('should toggle context menu when menu button is clicked', () => {
      const accountId = 'test-account-1';
      const event = new MouseEvent('click');
      spyOn(event, 'preventDefault');
      spyOn(event, 'stopPropagation');

      expect(component.openMenuId).toBeNull();

      component.toggleMenu(accountId, event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.openMenuId).toBe(accountId);

      // Toggle again to close
      component.toggleMenu(accountId, event);
      expect(component.openMenuId).toBeNull();
    });

    it('should close menu when closeMenu is called', () => {
      component.openMenuId = 'test-account-1';

      component.closeMenu();

      expect(component.openMenuId).toBeNull();
    });

    it('should open edit modal and close menu', () => {
      const accountId = 'test-account-1';
      component.openMenuId = accountId;

      component.openEditModal(accountId);

      expect(component.showModal).toBeTrue();
      expect(component.modalAccountId).toBe(accountId);
      expect(component.modalParentAccountId).toBeNull();
      expect(component.openMenuId).toBeNull();
    });

    it('should open add child modal and close menu', () => {
      const parentAccountId = 'test-account-1';
      component.openMenuId = parentAccountId;

      component.openAddChildModal(parentAccountId);

      expect(component.showModal).toBeTrue();
      expect(component.modalAccountId).toBeNull();
      expect(component.modalParentAccountId).toBe(parentAccountId);
      expect(component.openMenuId).toBeNull();
    });

    it('should delete leaf account after confirmation', async () => {
      const accountId = 'test-account-1';
      const journalId = 'test-journal-id';
      
      modelService.getSelectedJournalId.and.returnValue(journalId);
      controller.isLeafAccount = jasmine.createSpy('isLeafAccount').and.returnValue(Promise.resolve(true));
      controller.deleteAccount = jasmine.createSpy('deleteAccount').and.returnValue(Promise.resolve());
      controller.getAccountTree.and.returnValue(Promise.resolve([]));
      
      spyOn(window, 'confirm').and.returnValue(true);
      component.openMenuId = accountId;

      await component.deleteAccount(accountId);

      expect(controller.isLeafAccount).toHaveBeenCalledWith(accountId);
      expect(window.confirm).toHaveBeenCalled();
      expect(controller.deleteAccount).toHaveBeenCalledWith(journalId, accountId);
      expect(component.openMenuId).toBeNull();
    });

    it('should not delete non-leaf account', async () => {
      const accountId = 'test-account-1';
      
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.isLeafAccount = jasmine.createSpy('isLeafAccount').and.returnValue(Promise.resolve(false));
      controller.deleteAccount = jasmine.createSpy('deleteAccount');
      
      spyOn(window, 'alert');
      component.openMenuId = accountId;

      await component.deleteAccount(accountId);

      expect(controller.isLeafAccount).toHaveBeenCalledWith(accountId);
      expect(window.alert).toHaveBeenCalledWith('Cannot delete an account with children. Please delete child accounts first.');
      expect(controller.deleteAccount).not.toHaveBeenCalled();
      expect(component.openMenuId).toBeNull();
    });

    it('should not delete account if user cancels confirmation', async () => {
      const accountId = 'test-account-1';
      
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.isLeafAccount = jasmine.createSpy('isLeafAccount').and.returnValue(Promise.resolve(true));
      controller.deleteAccount = jasmine.createSpy('deleteAccount');
      
      spyOn(window, 'confirm').and.returnValue(false);
      component.openMenuId = accountId;

      await component.deleteAccount(accountId);

      expect(controller.isLeafAccount).toHaveBeenCalledWith(accountId);
      expect(window.confirm).toHaveBeenCalled();
      expect(controller.deleteAccount).not.toHaveBeenCalled();
      expect(component.openMenuId).toBeNull();
    });

    it('should handle error when checking if account is leaf', async () => {
      const accountId = 'test-account-1';
      
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.isLeafAccount = jasmine.createSpy('isLeafAccount').and.returnValue(Promise.reject(new Error('Network error')));
      controller.deleteAccount = jasmine.createSpy('deleteAccount');
      
      spyOn(window, 'alert');
      spyOn(console, 'error');
      component.openMenuId = accountId;

      await component.deleteAccount(accountId);

      expect(controller.isLeafAccount).toHaveBeenCalledWith(accountId);
      expect(window.alert).toHaveBeenCalledWith('Failed to check account status');
      expect(controller.deleteAccount).not.toHaveBeenCalled();
      expect(component.openMenuId).toBeNull();
    });

    it('should handle error when deleting account', async () => {
      const accountId = 'test-account-1';
      const journalId = 'test-journal-id';
      
      modelService.getSelectedJournalId.and.returnValue(journalId);
      controller.isLeafAccount = jasmine.createSpy('isLeafAccount').and.returnValue(Promise.resolve(true));
      controller.deleteAccount = jasmine.createSpy('deleteAccount').and.returnValue(Promise.reject({ error: 'Delete failed' }));
      
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      spyOn(console, 'error');
      component.openMenuId = accountId;

      await component.deleteAccount(accountId);

      expect(controller.deleteAccount).toHaveBeenCalledWith(journalId, accountId);
      expect(window.alert).toHaveBeenCalledWith('Failed to delete account: Delete failed');
      expect(component.openMenuId).toBeNull();
    });
  });

  describe('hasChildren', () => {
    it('should return true when account has children', () => {
      const account: AccountTreeNode = {
        id: '1',
        name: 'Parent',
        type: 'ASSET',
        note: null,
        parentId: null,
        children: [
          {
            id: '2',
            name: 'Child',
            type: 'ASSET',
            note: null,
            parentId: '1',
            children: []
          }
        ]
      };

      expect(component.hasChildren(account)).toBeTrue();
    });

    it('should return false when account has no children', () => {
      const account: AccountTreeNode = {
        id: '1',
        name: 'Leaf',
        type: 'ASSET',
        note: null,
        parentId: null,
        children: []
      };

      expect(component.hasChildren(account)).toBeFalse();
    });

    it('should return false when children is undefined', () => {
      const account: AccountTreeNode = {
        id: '1',
        name: 'Leaf',
        type: 'ASSET',
        note: null,
        parentId: null,
        children: undefined as any
      };

      expect(component.hasChildren(account)).toBeFalsy();
    });
  });
});
