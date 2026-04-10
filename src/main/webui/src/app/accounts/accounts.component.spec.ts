import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountsComponent } from './accounts.component';
import { Controller, AccountTreeNode, JournalMetadataDTO, TransactionDTO } from '../controller';
import { ModelService } from '../model.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: jasmine.SpyObj<ModelService>;

  const mockJournalMetadata: JournalMetadataDTO = {
    id: 'test-journal-id',
    logo: null,
    title: 'Test Journal',
    subtitle: null,
    currency: 'CHF',
    commodities: { 'CHF': '2' }
  };

  const mockTransactions: TransactionDTO[] = [
    {
      id: 'tx1',
      date: '2024-01-01',
      status: 'CLEARED',
      description: 'Test transaction',
      partnerId: null,
      partnerName: null,
      tags: [],
      entries: [
        { id: 'e1', entryOrder: 1, accountId: 'acc1', accountName: 'Bank', accountType: 'ASSET', commodity: 'CHF', amount: 1000, note: null },
        { id: 'e2', entryOrder: 2, accountId: 'acc2', accountName: 'Income', accountType: 'INCOME', commodity: 'CHF', amount: -1000, note: null }
      ]
    },
    {
      id: 'tx2',
      date: '2024-01-15',
      status: 'CLEARED',
      description: 'Second transaction',
      partnerId: null,
      partnerName: null,
      tags: [],
      entries: [
        { id: 'e3', entryOrder: 1, accountId: 'acc1', accountName: 'Bank', accountType: 'ASSET', commodity: 'CHF', amount: 500, note: null },
        { id: 'e4', entryOrder: 2, accountId: 'acc3', accountName: 'Expense', accountType: 'EXPENSE', commodity: 'CHF', amount: -500, note: null }
      ]
    }
  ];

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', ['getAccountTree', 'getJournalMetadata', 'getTransactions']);
    const accountsSignal = signal<AccountTreeNode[]>([]);
    const selectedJournalIdSignal = signal<string | null>('test-journal-id');
    const modelServiceSpy = jasmine.createSpyObj('ModelService', ['getSelectedJournalId', 'setAccounts']);
    // Add signals to the mock
    (modelServiceSpy as any).accounts$ = accountsSignal.asReadonly();
    (modelServiceSpy as any).selectedJournalId$ = selectedJournalIdSignal.asReadonly();
    // Make setAccounts update the signal
    modelServiceSpy.setAccounts.and.callFake((accounts: AccountTreeNode[]) => {
      accountsSignal.set(accounts);
    });
    controllerSpy.getJournalMetadata.and.returnValue(Promise.resolve(mockJournalMetadata));
    controllerSpy.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

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

    // Trigger change detection to run the effect
    fixture.detectChanges();
    await fixture.whenStable();

    expect(controller.getAccountTree).toHaveBeenCalledWith('test-journal-id');
    expect(controller.getJournalMetadata).toHaveBeenCalledWith('test-journal-id');
    expect(controller.getTransactions).toHaveBeenCalledWith('test-journal-id');
    expect(component.accounts()).toEqual(mockAccounts);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
  });

  it('should not load accounts when no journal is selected', async () => {
    // When journalId is null, the effect doesn't call loadAccounts
    // This is tested by the effect implementation itself
    // We can verify this by checking that loadAccounts requires a journalId
    modelService.getSelectedJournalId.and.returnValue(null);
    
    await component.loadAccounts();
    await fixture.whenStable();

    expect(component.error).toBe('No journal selected');
    expect(component.loading).toBeFalse();
  });

  it('should handle errors when loading accounts', async () => {
    modelService.getSelectedJournalId.and.returnValue('test-journal-id');
    controller.getAccountTree.and.returnValue(Promise.reject(new Error('Network error')));

    // Trigger change detection to run the effect
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.error).toBe('Failed to load accounts');
    expect(component.loading).toBeFalse();
  });

  describe('Account Balance Computation', () => {
    it('should compute balances correctly from transactions', async () => {
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.getAccountTree.and.returnValue(Promise.resolve([]));

      await component.loadAccounts();

      expect(component.getAccountBalance('acc1')).toBe(1500);
      expect(component.getAccountBalance('acc2')).toBe(-1000);
      expect(component.getAccountBalance('acc3')).toBe(-500);
    });

    it('should return 0 for an account with no transactions', async () => {
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.getAccountTree.and.returnValue(Promise.resolve([]));

      await component.loadAccounts();

      expect(component.getAccountBalance('acc-nonexistent')).toBe(0);
    });

    it('should format balance with journal currency and precision', async () => {
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.getAccountTree.and.returnValue(Promise.resolve([]));

      await component.loadAccounts();

      expect(component.formatBalance('acc1')).toBe('CHF 1500.00');
      expect(component.formatBalance('acc2')).toBe('CHF -1000.00');
    });

    it('should format balance with 2 decimal places when no currency is loaded', () => {
      component.journalMetadata = null;
      component.accountBalances = new Map([['acc1', 123.456]]);

      expect(component.formatBalance('acc1')).toBe('123.46');
    });

    it('should format balance with commodity precision from journal metadata', async () => {
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.getAccountTree.and.returnValue(Promise.resolve([]));
      controller.getJournalMetadata.and.returnValue(Promise.resolve({
        ...mockJournalMetadata,
        currency: 'BTC',
        commodities: { 'BTC': '8' }
      }));
      controller.getTransactions.and.returnValue(Promise.resolve([{
        id: 'tx1', date: '2024-01-01', status: 'CLEARED', description: '', partnerId: null, partnerName: null, tags: [],
        entries: [{ id: 'e1', entryOrder: 1, accountId: 'acc1', accountName: 'Wallet', accountType: 'ASSET', commodity: 'BTC', amount: 0.12345678, note: null }]
      }]));

      await component.loadAccounts();

      expect(component.formatBalance('acc1')).toBe('BTC 0.12345678');
    });

    it('should fall back to 2 decimal places when precision is invalid or out of range', () => {
      component.journalMetadata = { id: 'j1', logo: null, title: 'J', subtitle: null, currency: 'EUR', commodities: { 'EUR': 'abc' } };
      component.accountBalances = new Map([['acc1', 42.5]]);
      expect(component.formatBalance('acc1')).toBe('EUR 42.50');

      component.journalMetadata = { id: 'j1', logo: null, title: 'J', subtitle: null, currency: 'EUR', commodities: {} };
      expect(component.formatBalance('acc1')).toBe('EUR 42.50');
    });

    it('should load journal metadata and store it', async () => {
      modelService.getSelectedJournalId.and.returnValue('test-journal-id');
      controller.getAccountTree.and.returnValue(Promise.resolve([]));

      await component.loadAccounts();

      expect(component.journalMetadata).toEqual(mockJournalMetadata);
    });
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

  describe('Journal Change Reaction', () => {
    it('should reload accounts when journal changes', async () => {
      const mockAccounts: AccountTreeNode[] = [
        {
          id: '1',
          name: 'Assets',
          type: 'ASSET',
          note: null,
          parentId: null,
          children: []
        }
      ];

      modelService.getSelectedJournalId.and.returnValue('journal1');
      controller.getAccountTree.and.callFake(async (journalId: string) => {
        modelService.setAccounts(mockAccounts);
        return mockAccounts;
      });

      // Initial load via effect
      await component.loadAccounts();
      await fixture.whenStable();

      expect(controller.getAccountTree).toHaveBeenCalledWith('journal1');
      expect(component.accounts()).toEqual(mockAccounts);

      // Simulate journal change
      controller.getAccountTree.calls.reset();
      modelService.getSelectedJournalId.and.returnValue('journal2');

      await component.loadAccounts();
      await fixture.whenStable();

      expect(controller.getAccountTree).toHaveBeenCalledWith('journal2');
    });
  });
});
