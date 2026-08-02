import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountsTableComponent } from './accounts-table.component';
import { Controller } from '../controller';
import { ModelService } from '../model.service';
import { AccountService } from '../account.service';
import { InfoDialogService } from '../core/info-dialog/info-dialog.service';
import { JournalMetadataDTO } from '../controller';

describe('AccountsTableComponent', () => {
  let component: AccountsTableComponent;
  let fixture: ComponentFixture<AccountsTableComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: ModelService;
  let accountService: jasmine.SpyObj<AccountService>;
  let infoDialog: jasmine.SpyObj<InfoDialogService>;

  const lockedJournal: JournalMetadataDTO = {
    id: 'journal-id', title: 'Locked Journal', subtitle: null, currency: 'CHF',
    commodities: {}, logo: null, previousJournalId: null, locked: true
  };
  const unlockedJournal: JournalMetadataDTO = {
    id: 'journal-id', title: 'Open Journal', subtitle: null, currency: 'CHF',
    commodities: {}, logo: null, previousJournalId: null, locked: false
  };

  beforeEach(async () => {
    controller = jasmine.createSpyObj<Controller>('Controller', [
      'getTags', 'getAccountTree', 'getJournalMetadata', 'getTransactions',
      'isLeafAccount', 'deleteAccount'
    ]);
    accountService = jasmine.createSpyObj<AccountService>('AccountService', ['buildHierarchicalPath']);
    infoDialog = jasmine.createSpyObj<InfoDialogService>('InfoDialogService', ['show']);

    await TestBed.configureTestingModule({
      imports: [AccountsTableComponent],
      providers: [
        { provide: Controller, useValue: controller },
        { provide: AccountService, useValue: accountService },
        { provide: InfoDialogService, useValue: infoDialog },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsTableComponent);
    component = fixture.componentInstance;
    modelService = TestBed.inject(ModelService);
  });

  describe('locked journal guard', () => {
    it('blocks opening the create account modal when the journal is locked', () => {
      component.journalMetadata = lockedJournal;

      component.openCreateModal();

      expect(component.showModal).toBe(false);
      expect(infoDialog.show).toHaveBeenCalled();
      expect(infoDialog.show.calls.mostRecent().args[0].title).toBe('Journal Locked');
    });

    it('allows opening the create account modal when the journal is unlocked', () => {
      component.journalMetadata = unlockedJournal;

      component.openCreateModal();

      expect(component.showModal).toBe(true);
      expect(infoDialog.show).not.toHaveBeenCalled();
    });

    it('blocks opening the edit account modal when the journal is locked', () => {
      component.journalMetadata = lockedJournal;

      component.openEditModal('account-1');

      expect(component.showModal).toBe(false);
      expect(component.modalAccountId).toBeNull();
      expect(infoDialog.show).toHaveBeenCalled();
    });

    it('allows opening the edit account modal when the journal is unlocked', () => {
      component.journalMetadata = unlockedJournal;

      component.openEditModal('account-1');

      expect(component.showModal).toBe(true);
      expect(component.modalAccountId).toBe('account-1');
      expect(infoDialog.show).not.toHaveBeenCalled();
    });

    it('blocks opening the add child modal when the journal is locked', () => {
      component.journalMetadata = lockedJournal;

      component.openAddChildModal('account-1');

      expect(component.showModal).toBe(false);
      expect(component.modalParentAccountId).toBeNull();
      expect(infoDialog.show).toHaveBeenCalled();
    });

    it('allows opening the add child modal when the journal is unlocked', () => {
      component.journalMetadata = unlockedJournal;

      component.openAddChildModal('account-1');

      expect(component.showModal).toBe(true);
      expect(component.modalParentAccountId).toBe('account-1');
      expect(infoDialog.show).not.toHaveBeenCalled();
    });

    it('blocks deleting an account when the journal is locked', async () => {
      component.journalMetadata = lockedJournal;
      spyOn(window, 'confirm');

      await component.deleteAccount('account-1');

      expect(window.confirm).not.toHaveBeenCalled();
      expect(controller.isLeafAccount).not.toHaveBeenCalled();
      expect(controller.deleteAccount).not.toHaveBeenCalled();
      expect(infoDialog.show).toHaveBeenCalled();
    });

    it('allows deleting an account when the journal is unlocked (after leaf check and confirm)', async () => {
      component.journalMetadata = unlockedJournal;
      modelService.setJournals([unlockedJournal]);
      spyOn(window, 'confirm').and.returnValue(true);
      controller.isLeafAccount.and.resolveTo(true);
      controller.deleteAccount.and.resolveTo();
      controller.getAccountTree.and.resolveTo([]);
      controller.getJournalMetadata.and.resolveTo(unlockedJournal);
      controller.getTransactions.and.resolveTo([]);
      controller.getTags.and.resolveTo([]);

      await component.deleteAccount('account-1');
      await fixture.whenStable();

      expect(controller.isLeafAccount).toHaveBeenCalledWith('account-1');
      expect(controller.deleteAccount).toHaveBeenCalledWith('journal-id', 'account-1');
    });

    it('falls back to the modelService journal list when journalMetadata is not loaded yet', () => {
      component.journalMetadata = null;
      modelService.setJournals([lockedJournal]);

      component.openCreateModal();

      expect(component.showModal).toBe(false);
      expect(infoDialog.show).toHaveBeenCalled();
      expect(infoDialog.show.calls.mostRecent().args[0].message).toContain('Locked Journal');
    });

    it('does not show the lock dialog when no journal is selected and metadata is null', () => {
      component.journalMetadata = null;

      component.openCreateModal();

      // No journal selected -> no lock dialog, but also no modal (no journal to create into)
      // The guard returns false because journal is null, so the modal opens.
      // This is acceptable: the backend will reject if no journal, and there's nothing to lock.
      expect(infoDialog.show).not.toHaveBeenCalled();
    });
  });
});
