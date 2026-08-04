import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TransactionEditModalComponent } from './transaction-edit-modal.component';
import { Controller } from '../controller';
import { ModelService } from '../model.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('TransactionEditModalComponent', () => {
  let component: TransactionEditModalComponent;
  let fixture: ComponentFixture<TransactionEditModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionEditModalComponent, FormsModule],
      providers: [
        Controller,
        ModelService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionEditModalComponent);
    component = fixture.componentInstance;
    component.journalId = 'test-journal-id';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default values for new transaction', () => {
    component.transactionId = null;
    component.entries = []; // Reset entries before re-initializing
    component.ngOnInit();
    
    expect(component.isNew).toBe(true);
    expect(component.status).toBe('CLEARED');
    expect(component.entries.length).toBe(2);
  });

  it('should add an entry', () => {
    const initialLength = component.entries.length;
    component.addEntry();
    
    expect(component.entries.length).toBe(initialLength + 1);
  });

  it('should remove an entry', () => {
    component.addEntry();
    component.addEntry();
    const initialLength = component.entries.length;
    
    component.removeEntry(0);
    
    expect(component.entries.length).toBe(initialLength - 1);
  });

  it('should add a tag', () => {
    component.tagInput = 'invoice:INV-123';
    component.addTag();
    
    expect(component.tags.length).toBe(1);
    expect(component.tags[0].key).toBe('invoice');
    expect(component.tags[0].value).toBe('INV-123');
    expect(component.tagInput).toBe('');
  });

  it('should remove a tag', () => {
    component.tags = [{ key: 'test', value: 'value' }];
    component.removeTag(0);
    
    expect(component.tags.length).toBe(0);
  });

  it('should calculate balance correctly', () => {
    component.entries = [
      { id: null, entryOrder: 0, accountId: 'acc1', accountName: '', commodity: 'CHF', amount: 100, note: '' },
      { id: null, entryOrder: 1, accountId: 'acc2', accountName: '', commodity: 'CHF', amount: -100, note: '' }
    ];
    
    expect(component.getBalance()).toBe(0);
    expect(component.isBalanced()).toBe(true);
  });

  it('should detect unbalanced transaction', () => {
    component.entries = [
      { id: null, entryOrder: 0, accountId: 'acc1', accountName: '', commodity: 'CHF', amount: 100, note: '' },
      { id: null, entryOrder: 1, accountId: 'acc2', accountName: '', commodity: 'CHF', amount: -50, note: '' }
    ];
    
    expect(component.getBalance()).toBe(50);
    expect(component.isBalanced()).toBe(false);
  });

  it('should validate required fields', async () => {
    component.date = '';
    component.description = '';
    
    await component.save();
    
    expect(component.error).toBeTruthy();
  });

  it('should prevent saving unbalanced transaction', async () => {
    component.date = '2024-01-15';
    component.description = 'Test transaction';
    component.entries = [
      { id: null, entryOrder: 0, accountId: 'acc1', accountName: '', commodity: 'CHF', amount: 100, note: '' },
      { id: null, entryOrder: 1, accountId: 'acc2', accountName: '', commodity: 'CHF', amount: -50, note: '' }
    ];
    
    await component.save();
    
    expect(component.error).toContain('must sum to zero');
    expect(component.error).toContain('50.00');
  });

  it('should allow saving balanced transaction', async () => {
    component.date = '2024-01-15';
    component.description = 'Test transaction';
    component.entries = [
      { id: null, entryOrder: 0, accountId: 'acc1', accountName: '', commodity: 'CHF', amount: 100, note: '' },
      { id: null, entryOrder: 1, accountId: 'acc2', accountName: '', commodity: 'CHF', amount: -100, note: '' }
    ];
    
    // Mock the controller method to avoid actual HTTP call
    spyOn(component.controller, 'createTransaction').and.returnValue(Promise.resolve({
      id: 'test-id',
      date: '2024-01-15',
      status: 'CLEARED',
      description: 'Test transaction',
      partnerId: null,
      partnerName: null,
      tags: [],
      entries: []
    }));
    
    await component.save();
    
    expect(component.error).toBeNull();
  });

  it('should fetch and filter tag options from journal and global tags', async () => {
    // Mock getTags to return journal-specific tags
    spyOn(component.controller, 'getTags').and.returnValue(Promise.resolve([
      { key: 'invoice', value: 'INV-001' },
      { key: 'invoice', value: 'INV-002' },
      { key: 'project', value: 'PROJ-A' }
    ]));
    
    // Mock getAllTagKeys to return global tag keys
    spyOn(component.controller, 'getAllTagKeys').and.returnValue(Promise.resolve([
      'invoice',
      'category',
      'department',
      'priority'
    ]));

    const options = await component.fetchTagOptions('inv');
    
    // Should include 2 journal tags (invoice:INV-001, invoice:INV-002)
    // 'invoice' key is already in journal tags, so not duplicated from global
    expect(options.length).toBe(2);
    expect(options[0].value).toBe('invoice:INV-001');
    expect(options[1].value).toBe('invoice:INV-002');
  });

  it('should include global tag keys not in journal', async () => {
    // Mock getTags to return journal-specific tags
    spyOn(component.controller, 'getTags').and.returnValue(Promise.resolve([
      { key: 'invoice', value: 'INV-001' }
    ]));
    
    // Mock getAllTagKeys to return global tag keys
    spyOn(component.controller, 'getAllTagKeys').and.returnValue(Promise.resolve([
      'invoice',
      'category',
      'department'
    ]));

    const options = await component.fetchTagOptions('cat');
    
    // Should include 'category' from global tags (not in journal)
    expect(options.length).toBe(1);
    expect(options[0].value).toBe('category');
  });

  it('should automatically add tag when selected from autocomplete', () => {
    component.onTagSelected({ value: 'invoice:INV-123', label: 'invoice:INV-123' });
    
    expect(component.tags.length).toBe(1);
    expect(component.tags[0].key).toBe('invoice');
    expect(component.tags[0].value).toBe('INV-123');
    expect(component.tagInput).toBe('');
  });

  it('should fetch and filter account options using regex', async () => {
    // Mock account tree structure
    const mockAccounts = [
      {
        id: 'acc1',
        name: 'Assets',
        type: 'ASSET',
        note: null,
        parentId: null,
        accountCode: 1000,
        children: [
          {
            id: 'acc2',
            name: 'Cash',
            type: 'ASSET',
            note: null,
            parentId: 'acc1',
            accountCode: 1100,
            children: []
          }
        ]
      },
      {
        id: 'acc3',
        name: 'Expenses',
        type: 'EXPENSE',
        note: null,
        parentId: null,
        accountCode: 6000,
        children: []
      }
    ];

    spyOn(component.modelService, 'getAccounts').and.returnValue(mockAccounts);

    const options = await component.fetchAccountOptions('cash');
    
    expect(options.length).toBe(1);
    expect(options[0].value).toBe('acc2');
    expect(options[0].label).toBe('Assets > Cash');
    expect(options[0].label).not.toContain('acc2'); // ID should not be in label
  });

  it('should support regex patterns in account search', async () => {
    const mockAccounts = [
      {
        id: 'acc1',
        name: 'Assets',
        type: 'ASSET',
        note: null,
        parentId: null,
        accountCode: 1000,
        children: [
          {
            id: 'acc2',
            name: 'Cash',
            type: 'ASSET',
            note: null,
            parentId: 'acc1',
            accountCode: 1100,
            children: []
          },
          {
            id: 'acc3',
            name: 'Bank',
            type: 'ASSET',
            note: null,
            parentId: 'acc1',
            accountCode: 1200,
            children: []
          }
        ]
      }
    ];

    spyOn(component.modelService, 'getAccounts').and.returnValue(mockAccounts);

    // Test regex pattern: match accounts starting with 'C'
    const options = await component.fetchAccountOptions('^Assets > C');
    
    expect(options.length).toBe(1);
    expect(options[0].label).toBe('Assets > Cash');
  });

  it('should match accounts with pattern A.*et', async () => {
    const mockAccounts = [
      {
        id: 'acc1',
        name: 'Assets',
        type: 'ASSET',
        note: null,
        parentId: null,
        accountCode: 1000,
        children: [
          {
            id: 'acc2',
            name: 'Cash',
            type: 'ASSET',
            note: null,
            parentId: 'acc1',
            accountCode: 1100,
            children: []
          }
        ]
      },
      {
        id: 'acc3',
        name: 'Liabilities',
        type: 'LIABILITY',
        note: null,
        parentId: null,
        accountCode: 2000,
        children: []
      },
      {
        id: 'acc4',
        name: 'Expenses',
        type: 'EXPENSE',
        note: null,
        parentId: null,
        accountCode: 6000,
        children: []
      }
    ];

    spyOn(component.modelService, 'getAccounts').and.returnValue(mockAccounts);

    // Test regex pattern: A.*et should match "Assets" and any child
    const options = await component.fetchAccountOptions('A.*et');
    
    // Should match "Assets" and "Assets > Cash"
    expect(options.length).toBe(2);
    expect(options.some(opt => opt.label === 'Assets')).toBe(true);
    expect(options.some(opt => opt.label === 'Assets > Cash')).toBe(true);
  });

  it('should update entry account when selected from autocomplete', () => {
    const mockAccount = {
      id: 'acc1',
      name: 'Cash',
      type: 'ASSET',
      note: null,
      parentId: null,
      accountCode: 1100,
      children: []
    };

    spyOn(component.modelService, 'findAccount').and.returnValue(mockAccount);

    component.entries = [
      { id: null, entryOrder: 0, accountId: '', accountName: '', commodity: 'CHF', amount: 0, note: '' }
    ];

    component.onAccountSelected(0, { value: 'acc1', label: 'Cash' });

    expect(component.entries[0].accountId).toBe('acc1');
    expect(component.entries[0].accountName).toBe('Cash');
  });

  describe('Attachments', () => {
    const mockAttachment = {
      id: 'att-1',
      transactionId: 'test-tx-id',
      fileName: 'receipt.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      uploadedAt: '2024-01-15T10:00:00Z',
      uploadedBy: 'testuser'
    };

    it('should not load attachments for a new (unsaved) transaction', () => {
      component.transactionId = null;
      component.ngOnInit();

      expect(component.attachments.length).toBe(0);
    });

    it('should load attachments on init when editing an existing transaction', async () => {
      component.transactionId = 'test-tx-id';
      spyOn(component.controller, 'getTransaction').and.returnValue(Promise.resolve({
        id: 'test-tx-id', date: '2024-01-15', status: 'CLEARED', description: 'Test',
        partnerId: null, partnerName: null, tags: [], entries: []
      }));
      spyOn(component.controller, 'listAttachments').and.returnValue(Promise.resolve([mockAttachment]));

      component.ngOnInit();
      await component.loadAttachments();

      expect(component.controller.listAttachments).toHaveBeenCalledWith('test-tx-id');
      expect(component.attachments.length).toBe(1);
      expect(component.attachments[0].fileName).toBe('receipt.pdf');
    });

    it('should surface an error if loading attachments fails', async () => {
      component.transactionId = 'test-tx-id';
      spyOn(component.controller, 'listAttachments').and.returnValue(Promise.reject(new Error('boom')));

      await component.loadAttachments();

      expect(component.attachmentError).toContain('Failed to load attachments');
    });

    it('should upload a selected file and refresh the attachment list', async () => {
      component.transactionId = 'test-tx-id';
      const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
      spyOn(component.controller, 'uploadAttachment').and.returnValue(Promise.resolve(mockAttachment));
      spyOn(component.controller, 'listAttachments').and.returnValue(Promise.resolve([mockAttachment]));

      const event = { target: { files: [file], value: '' } } as unknown as Event;
      await component.onAttachmentFileSelected(event);

      expect(component.controller.uploadAttachment).toHaveBeenCalledWith('test-tx-id', file);
      expect(component.attachments.length).toBe(1);
      expect(component.attachmentUploading).toBe(false);
    });

    it('should surface an error if upload fails', async () => {
      component.transactionId = 'test-tx-id';
      const file = new File(['%PDF-1.4'], 'receipt.pdf', { type: 'application/pdf' });
      spyOn(component.controller, 'uploadAttachment').and.returnValue(Promise.reject(new Error('too big')));

      const event = { target: { files: [file], value: '' } } as unknown as Event;
      await component.onAttachmentFileSelected(event);

      expect(component.attachmentError).toContain('Failed to upload attachment');
      expect(component.attachmentUploading).toBe(false);
    });

    it('should do nothing when no file was selected', async () => {
      component.transactionId = 'test-tx-id';
      spyOn(component.controller, 'uploadAttachment');

      const event = { target: { files: [], value: '' } } as unknown as Event;
      await component.onAttachmentFileSelected(event);

      expect(component.controller.uploadAttachment).not.toHaveBeenCalled();
    });

    it('should replace an attachment and refresh the list', async () => {
      component.transactionId = 'test-tx-id';
      const file = new File(['%PDF-1.4'], 'new-receipt.pdf', { type: 'application/pdf' });
      spyOn(component.controller, 'replaceAttachment').and.returnValue(Promise.resolve({ ...mockAttachment, fileName: 'new-receipt.pdf' }));
      spyOn(component.controller, 'listAttachments').and.returnValue(Promise.resolve([{ ...mockAttachment, fileName: 'new-receipt.pdf' }]));

      const event = { target: { files: [file], value: '' } } as unknown as Event;
      await component.onAttachmentReplaceSelected(event, mockAttachment);

      expect(component.controller.replaceAttachment).toHaveBeenCalledWith('att-1', file);
      expect(component.attachments[0].fileName).toBe('new-receipt.pdf');
    });

    it('should delete an attachment and refresh the list', async () => {
      component.transactionId = 'test-tx-id';
      spyOn(component.controller, 'deleteAttachment').and.returnValue(Promise.resolve());
      spyOn(component.controller, 'listAttachments').and.returnValue(Promise.resolve([]));

      await component.deleteAttachment(mockAttachment);

      expect(component.controller.deleteAttachment).toHaveBeenCalledWith('att-1');
      expect(component.attachments.length).toBe(0);
    });

    it('should surface an error if delete fails', async () => {
      component.transactionId = 'test-tx-id';
      spyOn(component.controller, 'deleteAttachment').and.returnValue(Promise.reject(new Error('locked')));

      await component.deleteAttachment(mockAttachment);

      expect(component.attachmentError).toContain('Failed to delete attachment');
    });

    it('should report the journal as locked when the selected journal is locked', () => {
      spyOn(component.modelService, 'journals$').and.returnValue([
        { id: 'test-journal-id', logo: null, title: 'J', subtitle: null, currency: 'CHF', commodities: {}, previousJournalId: null, locked: true }
      ] as any);

      expect(component.isJournalLocked()).toBe(true);
    });

    it('should report the journal as not locked when there is no matching journal', () => {
      spyOn(component.modelService, 'journals$').and.returnValue([] as any);

      expect(component.isJournalLocked()).toBe(false);
    });

    it('should build the download URL via the controller', () => {
      spyOn(component.controller, 'getAttachmentDownloadUrl').and.returnValue('/api/attachment/att-1');

      expect(component.getAttachmentDownloadUrl(mockAttachment)).toBe('/api/attachment/att-1');
    });

    it('should format attachment sizes in bytes, KB and MB', () => {
      expect(component.formatAttachmentSize(500)).toBe('500 B');
      expect(component.formatAttachmentSize(2048)).toBe('2.0 KB');
      expect(component.formatAttachmentSize(5 * 1024 * 1024)).toBe('5.0 MB');
    });
  });
});
