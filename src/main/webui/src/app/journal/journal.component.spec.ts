import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { JournalComponent } from './journal.component';
import { Controller } from '../controller';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { InfoDialogService } from '../core/info-dialog/info-dialog.service';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';

describe('JournalComponent', () => {
  let component: JournalComponent;
  let fixture: ComponentFixture<JournalComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let router: Router;
  let infoDialog: jasmine.SpyObj<InfoDialogService>;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    const controllerSpy = jasmine.createSpyObj('Controller', [
      'listJournals',
      'getJournalMetadata',
      'getTransactions',
      'getTags',
      'setSelectedJournalId',
      'deleteTransaction',
      'listAttachments',
      'uploadAttachment',
      'deleteAttachment',
      'getAttachmentDownloadUrl'
    ]);
    const infoDialogSpy = jasmine.createSpyObj('InfoDialogService', ['show']);
    const confirmDialogSpy = jasmine.createSpyObj('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [JournalComponent],
      providers: [
        { provide: Controller, useValue: controllerSpy },
        { provide: InfoDialogService, useValue: infoDialogSpy },
        { provide: ConfirmDialogService, useValue: confirmDialogSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JournalComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
    router = TestBed.inject(Router);
    infoDialog = TestBed.inject(InfoDialogService) as jasmine.SpyObj<InfoDialogService>;
    confirmDialog = TestBed.inject(ConfirmDialogService) as jasmine.SpyObj<ConfirmDialogService>;
    spyOn(router, 'navigate');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not load journals or redirect on init when no journal is selected', async () => {
    await component.ngOnInit();
    await fixture.whenStable();

    expect(controller.listJournals).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should not trigger a journal list load on init (loaded by auth guard)', async () => {
    await component.ngOnInit();
    await fixture.whenStable();

    expect(controller.listJournals).not.toHaveBeenCalled();
  });

  it('should load tags and transactions when journal is selected', async () => {
    const mockTags = [{ key: 'invoice', value: '1234' }];
    const mockTransactions: any[] = [];
    controller.getTags.and.returnValue(Promise.resolve(mockTags));
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    await component.loadTags();
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('1');
    expect(controller.getTransactions).toHaveBeenCalled();
    expect(component.tags).toEqual(mockTags);
  });

  it('should load transactions when journal is selected', async () => {
    const mockTransactions = [
      {
        id: '1',
        date: '2024-01-01',
        status: 'CLEARED',
        description: 'Test transaction',
        partnerId: null,
      partnerName: null,
        tags: [],
        entries: []
      }
    ];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, undefined);
    expect(component.transactions).toEqual(mockTransactions);
  });

  it('should apply filter string', async () => {
    const mockTransactions: any[] = [];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    const filterString = 'begin:20240101 end:20241231 invoice';

    component.onFilterChange(filterString);
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for setTimeout in onFilterChange
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, filterString);
    expect(component.filterString).toBe(filterString);
  });

  it('should handle empty filter string', async () => {
    const mockTransactions: any[] = [];
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    component.onFilterChange('');
    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for setTimeout in onFilterChange
    await fixture.whenStable();

    expect(controller.getTransactions).toHaveBeenCalledWith('1', undefined, undefined, undefined, undefined, undefined);
    expect(component.filterString).toBe('');
  });

  it('should handle errors when loading tags', async () => {
    controller.getTags.and.returnValue(Promise.reject(new Error('Network error')));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    await component.loadTags();
    await fixture.whenStable();

    expect(component.tags).toEqual([]);
  });

  it('should handle errors when loading transactions', async () => {
    controller.getTransactions.and.returnValue(Promise.reject(new Error('Network error')));

    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    await component.loadEntries();
    await fixture.whenStable();

    expect(component.error).toContain('Failed to load transactions');
    expect(component.loading).toBe(false);
  });

  it('should react to journal changes via effect', async () => {
    const mockTags = [{ key: 'invoice', value: '1234' }];
    const mockTransactions: any[] = [];
    controller.getTags.and.returnValue(Promise.resolve(mockTags));
    controller.getTransactions.and.returnValue(Promise.resolve(mockTransactions));

    // Simulate journal change by setting selectedJournal
    component.selectedJournal = { id: '1', title: 'Journal 1', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    
    await component.loadTags();
    await component.loadEntries();
    await fixture.whenStable();

    expect(controller.getTags).toHaveBeenCalledWith('1');
    expect(controller.getTransactions).toHaveBeenCalled();
    expect(component.tags).toEqual(mockTags);
    expect(component.transactions).toEqual(mockTransactions);
  });

  it('does not render export controls', () => {
    component.selectedJournal = { id: '1', title: 'Test Journal', subtitle: null, currency: 'EUR', commodities: {}, logo: null, previousJournalId: null, locked: false };

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Include transactions');
    expect(fixture.nativeElement.textContent).not.toContain('Export');
  });

  describe('locked journal guard', () => {
    const lockedJournal = { id: '1', title: 'Locked Journal', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: true };
    const unlockedJournal = { id: '1', title: 'Open Journal', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };

    it('blocks opening the add transaction modal when the journal is locked', () => {
      component.selectedJournal = lockedJournal;

      component.openAddTransactionModal();

      expect(component.showTransactionModal).toBe(false);
      expect(infoDialog.show).toHaveBeenCalled();
      expect(infoDialog.show.calls.mostRecent().args[0].title).toBe('Journal Locked');
    });

    it('allows opening the add transaction modal when the journal is unlocked', () => {
      component.selectedJournal = unlockedJournal;

      component.openAddTransactionModal();

      expect(component.showTransactionModal).toBe(true);
      expect(infoDialog.show).not.toHaveBeenCalled();
    });

    it('blocks opening the edit transaction modal when the journal is locked', () => {
      component.selectedJournal = lockedJournal;
      component.contextMenuTransactionId = 'tx-1';

      component.openEditTransactionModal('tx-1');

      expect(component.showTransactionModal).toBe(false);
      expect(component.editingTransactionId).toBeNull();
      expect(infoDialog.show).toHaveBeenCalled();
    });

    it('allows opening the edit transaction modal when the journal is unlocked', () => {
      component.selectedJournal = unlockedJournal;
      component.contextMenuTransactionId = 'tx-1';

      component.openEditTransactionModal('tx-1');

      expect(component.showTransactionModal).toBe(true);
      expect(component.editingTransactionId).toBe('tx-1');
      expect(infoDialog.show).not.toHaveBeenCalled();
    });

    it('blocks deleting a transaction when the journal is locked', async () => {
      component.selectedJournal = lockedJournal;
      confirmDialog.confirm.and.resolveTo(true);

      await component.deleteTransaction('tx-1');

      expect(confirmDialog.confirm).not.toHaveBeenCalled();
      expect(controller.deleteTransaction).not.toHaveBeenCalled();
      expect(infoDialog.show).toHaveBeenCalled();
    });

    it('allows deleting a transaction when the journal is unlocked (after confirm)', async () => {
      component.selectedJournal = unlockedJournal;
      confirmDialog.confirm.and.resolveTo(true);
      controller.deleteTransaction.and.returnValue(Promise.resolve());
      controller.getTransactions.and.returnValue(Promise.resolve([]));

      await component.deleteTransaction('tx-1');
      await fixture.whenStable();

      expect(confirmDialog.confirm).toHaveBeenCalled();
      expect(confirmDialog.confirm.calls.mostRecent().args[0].title).toBe('Delete Transaction');
      expect(confirmDialog.confirm.calls.mostRecent().args[0].confirmText).toBe('Delete');
      expect(controller.deleteTransaction).toHaveBeenCalledWith('tx-1', '1');
    });

    it('does not delete the transaction when the user cancels the confirmation', async () => {
      component.selectedJournal = unlockedJournal;
      confirmDialog.confirm.and.resolveTo(false);

      await component.deleteTransaction('tx-1');

      expect(confirmDialog.confirm).toHaveBeenCalled();
      expect(controller.deleteTransaction).not.toHaveBeenCalled();
    });
  });

  describe('context menu attachments', () => {
    const lockedJournal = { id: '1', title: 'Locked Journal', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: true };
    const unlockedJournal = { id: '1', title: 'Open Journal', subtitle: null, currency: 'CHF', commodities: {}, logo: null, previousJournalId: null, locked: false };
    const mockAttachment = {
      id: 'att-1',
      transactionId: 'tx-1',
      fileName: 'receipt.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      uploadedAt: '2024-01-15T10:00:00Z',
      uploadedBy: 'testuser'
    };

    const mockContextMenuEvent = (): MouseEvent => ({
      preventDefault: () => {},
      stopPropagation: () => {},
      currentTarget: {
        getBoundingClientRect: () => ({ right: 100, bottom: 50, left: 80, top: 30, width: 20, height: 20 })
      }
    } as unknown as MouseEvent);

    it('loads attachments when the context menu is opened', async () => {
      controller.listAttachments.and.returnValue(Promise.resolve([mockAttachment]));
      const event = mockContextMenuEvent();

      component.openContextMenu(event, 'tx-1');
      await fixture.whenStable();

      expect(component.contextMenuTransactionId).toBe('tx-1');
      expect(controller.listAttachments).toHaveBeenCalledWith('tx-1');
      expect(component.contextMenuAttachments).toEqual([mockAttachment]);
    });

    it('surfaces an error if loading attachments fails', async () => {
      controller.listAttachments.and.returnValue(Promise.reject(new Error('boom')));

      await component.loadContextMenuAttachments('tx-1');

      expect(component.contextMenuAttachmentError).toContain('Failed to load attachments');
    });

    it('clears attachment state when the context menu is closed', () => {
      component.contextMenuTransactionId = 'tx-1';
      component.contextMenuAttachments = [mockAttachment];
      component.contextMenuAttachmentError = 'oops';

      component.closeContextMenu();

      expect(component.contextMenuTransactionId).toBeNull();
      expect(component.contextMenuAttachments).toEqual([]);
      expect(component.contextMenuAttachmentError).toBeNull();
    });

    it('uploads a selected file and refreshes the attachment list', async () => {
      component.selectedJournal = unlockedJournal;
      component.contextMenuTransactionId = 'tx-1';
      const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
      controller.uploadAttachment.and.returnValue(Promise.resolve(mockAttachment));
      controller.listAttachments.and.returnValue(Promise.resolve([mockAttachment]));

      const event = { target: { files: [file], value: '' } } as unknown as Event;
      await component.onContextMenuAttachmentFileSelected(event);

      expect(controller.uploadAttachment).toHaveBeenCalledWith('tx-1', file);
      expect(component.contextMenuAttachments).toEqual([mockAttachment]);
      expect(component.contextMenuAttachmentUploading).toBe(false);
    });

    it('does not upload when the journal is locked', async () => {
      component.selectedJournal = lockedJournal;
      component.contextMenuTransactionId = 'tx-1';
      const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });

      const event = { target: { files: [file], value: '' } } as unknown as Event;
      await component.onContextMenuAttachmentFileSelected(event);

      expect(controller.uploadAttachment).not.toHaveBeenCalled();
    });

    it('surfaces an error if upload fails', async () => {
      component.selectedJournal = unlockedJournal;
      component.contextMenuTransactionId = 'tx-1';
      const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
      controller.uploadAttachment.and.returnValue(Promise.reject(new Error('too big')));

      const event = { target: { files: [file], value: '' } } as unknown as Event;
      await component.onContextMenuAttachmentFileSelected(event);

      expect(component.contextMenuAttachmentError).toContain('Failed to upload attachment');
    });

    it('builds the download URL via the controller', () => {
      controller.getAttachmentDownloadUrl.and.returnValue('/api/attachment/att-1');

      expect(component.getAttachmentDownloadUrl(mockAttachment)).toBe('/api/attachment/att-1');
    });

    it('deletes an attachment after confirmation and refreshes the list', async () => {
      component.selectedJournal = unlockedJournal;
      component.contextMenuTransactionId = 'tx-1';
      confirmDialog.confirm.and.resolveTo(true);
      controller.deleteAttachment.and.returnValue(Promise.resolve());
      controller.listAttachments.and.returnValue(Promise.resolve([]));

      await component.deleteContextMenuAttachment(mockAttachment);

      expect(confirmDialog.confirm).toHaveBeenCalled();
      expect(controller.deleteAttachment).toHaveBeenCalledWith('att-1');
      expect(component.contextMenuAttachments).toEqual([]);
    });

    it('does not delete the attachment when the user cancels the confirmation', async () => {
      component.selectedJournal = unlockedJournal;
      component.contextMenuTransactionId = 'tx-1';
      confirmDialog.confirm.and.resolveTo(false);

      await component.deleteContextMenuAttachment(mockAttachment);

      expect(controller.deleteAttachment).not.toHaveBeenCalled();
    });

    it('does not delete the attachment when the journal is locked', async () => {
      component.selectedJournal = lockedJournal;
      component.contextMenuTransactionId = 'tx-1';

      await component.deleteContextMenuAttachment(mockAttachment);

      expect(confirmDialog.confirm).not.toHaveBeenCalled();
      expect(controller.deleteAttachment).not.toHaveBeenCalled();
    });

    it('surfaces an error if delete fails', async () => {
      component.selectedJournal = unlockedJournal;
      component.contextMenuTransactionId = 'tx-1';
      confirmDialog.confirm.and.resolveTo(true);
      controller.deleteAttachment.and.returnValue(Promise.reject(new Error('locked')));

      await component.deleteContextMenuAttachment(mockAttachment);

      expect(component.contextMenuAttachmentError).toContain('Failed to delete attachment');
    });
  });
});
