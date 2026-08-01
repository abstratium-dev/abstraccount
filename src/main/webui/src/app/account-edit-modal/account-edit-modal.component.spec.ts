import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountEditModalComponent } from './account-edit-modal.component';
import { Controller, AccountTreeNode } from '../controller';
import { ModelService } from '../model.service';

describe('AccountEditModalComponent', () => {
  let component: AccountEditModalComponent;
  let fixture: ComponentFixture<AccountEditModalComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;

  const mockAccounts: AccountTreeNode[] = [
    {
      id: 'acc-1', name: '1 Assets', type: 'ASSET', note: null,
      parentId: null, accountCode: 1, children: [
        {
          id: 'acc-2', name: '1020 Cash', type: 'ASSET', note: 'Cash account',
          parentId: 'acc-1', accountCode: 1020, children: []
        }
      ]
    },
    {
      id: 'acc-3', name: '2 Passif', type: 'LIABILITY', note: null,
      parentId: null, accountCode: 2, children: []
    }
  ];

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', ['createAccount', 'updateAccount', 'getAccountDetails']);
    mockModelService = jasmine.createSpyObj('ModelService', ['getAccounts', 'findAccount']);
    mockModelService.getAccounts.and.returnValue(mockAccounts);
    mockModelService.findAccount.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AccountEditModalComponent, CommonModule, FormsModule],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountEditModalComponent);
    component = fixture.componentInstance;
    component.journalId = 'journal-1';
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('initializes as new account when no accountId is provided', () => {
    component.accountId = null;
    component.ngOnInit();
    expect(component.isNew).toBeTrue();
    expect(component.isAddingChild).toBeFalse();
    expect(component.getModalTitle()).toBe('Create New Account');
  });

  it('initializes as edit account when accountId is provided', () => {
    component.accountId = 'acc-2';
    mockController.getAccountDetails.and.resolveTo(mockAccounts[0].children![0]);
    component.ngOnInit();
    expect(component.isNew).toBeFalse();
    expect(component.getModalTitle()).toBe('Edit Account');
  });

  it('initializes as adding child when parentAccountId is provided', () => {
    component.accountId = null;
    component.parentAccountId = 'acc-1';
    mockModelService.findAccount.and.returnValue(mockAccounts[0]);
    component.ngOnInit();
    expect(component.isNew).toBeTrue();
    expect(component.isAddingChild).toBeTrue();
    expect(component.selectedParentId).toBe('acc-1');
    expect(component.type).toBe('ASSET');
    expect(component.getModalTitle()).toBe('Add Child Account');
  });

  it('loads account details when editing', async () => {
    component.accountId = 'acc-2';
    mockController.getAccountDetails.and.resolveTo({
      id: 'acc-2', name: '1020 Cash', type: 'ASSET', note: 'Cash note',
      parentId: 'acc-1', accountCode: 1020, children: []
    });
    component.ngOnInit();
    await fixture.whenStable();

    expect(component.name).toBe('1020 Cash');
    expect(component.type).toBe('ASSET');
    expect(component.note).toBe('Cash note');
    expect(component.selectedParentId).toBe('acc-1');
  });

  it('shows error when loading account fails', async () => {
    component.accountId = 'acc-2';
    mockController.getAccountDetails.and.rejectWith(new Error('Network error'));
    component.ngOnInit();
    await fixture.whenStable();

    expect(component.error).toContain('Failed to load account');
    expect(component.loading).toBeFalse();
  });

  it('loads available parents excluding current account and descendants', () => {
    component.accountId = 'acc-1';
    component.loadAvailableParents();

    // acc-1 and its descendant acc-2 should be excluded
    expect(component.availableParents.some(a => a.id === 'acc-1')).toBeFalse();
    expect(component.availableParents.some(a => a.id === 'acc-2')).toBeFalse();
    expect(component.availableParents.some(a => a.id === 'acc-3')).toBeTrue();
  });

  it('validates name is required on save', async () => {
    component.name = '   ';
    await component.onSave();
    expect(component.error).toBe('Account name is required');
    expect(mockController.createAccount).not.toHaveBeenCalled();
  });

  it('creates new account on save', async () => {
    component.accountId = null;
    component.ngOnInit();
    component.name = 'New Account';
    component.type = 'ASSET';
    component.note = 'Some note';
    component.accountOrder = 5;
    mockController.createAccount.and.resolveTo({} as AccountTreeNode);

    await component.onSave();

    expect(mockController.createAccount).toHaveBeenCalled();
    const args = mockController.createAccount.calls.mostRecent().args[0];
    expect(args.name).toBe('New Account');
    expect(args.type).toBe('ASSET');
    expect(args.journalId).toBe('journal-1');
    expect(args.accountOrder).toBe(5);
  });

  it('updates existing account on save', async () => {
    component.accountId = 'acc-2';
    mockController.getAccountDetails.and.resolveTo({
      id: 'acc-2', name: 'Old Name', type: 'ASSET', note: null,
      parentId: 'acc-1', accountCode: 1020, children: []
    });
    component.ngOnInit();
    await fixture.whenStable();

    component.name = 'Updated Name';
    mockController.updateAccount.and.resolveTo({} as AccountTreeNode);

    await component.onSave();

    expect(mockController.updateAccount).toHaveBeenCalledWith('acc-2', 'journal-1', jasmine.any(Object));
    const args = mockController.updateAccount.calls.mostRecent().args[2];
    expect(args.name).toBe('Updated Name');
  });

  it('emits saved and close events on successful save', async () => {
    component.name = 'New Account';
    mockController.createAccount.and.resolveTo({} as AccountTreeNode);

    let savedEmitted = false;
    let closeEmitted = false;
    component.saved.subscribe(() => savedEmitted = true);
    component.close.subscribe(() => closeEmitted = true);

    await component.onSave();

    expect(savedEmitted).toBeTrue();
    expect(closeEmitted).toBeTrue();
  });

  it('shows error when save fails', async () => {
    component.name = 'New Account';
    mockController.createAccount.and.rejectWith({ message: 'Server error' });

    await component.onSave();

    expect(component.error).toBe('Server error');
    expect(component.loading).toBeFalse();
  });

  it('emits close event on cancel', () => {
    let closeEmitted = false;
    component.close.subscribe(() => closeEmitted = true);

    component.onCancel();

    expect(closeEmitted).toBeTrue();
  });

  it('builds account path from hierarchy', () => {
    component.accountId = null;
    component.ngOnInit();
    const path = component.getAccountPath(mockAccounts[0].children![0]);
    expect(path).toBe('1 Assets > 1020 Cash');
  });

  it('getModalTitle returns Create New Account for new account', () => {
    component.accountId = null;
    component.parentAccountId = null;
    component.ngOnInit();
    expect(component.getModalTitle()).toBe('Create New Account');
  });

  it('getModalTitle returns Edit Account for existing account', () => {
    component.accountId = 'acc-2';
    mockController.getAccountDetails.and.resolveTo({
      id: 'acc-2', name: 'Cash', type: 'ASSET', note: null,
      parentId: 'acc-1', accountCode: 1020, children: []
    });
    component.ngOnInit();
    expect(component.getModalTitle()).toBe('Edit Account');
  });
});
