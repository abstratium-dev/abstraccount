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
});
