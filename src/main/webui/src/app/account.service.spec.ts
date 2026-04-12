import { TestBed } from '@angular/core/testing';
import { AccountService } from './account.service';
import { AccountTreeNode } from './controller';

describe('AccountService', () => {
  let service: AccountService;

  // Hierarchical account structure for testing
  // 1 Assets
  //   10 Current Assets
  //     110 Accounts Receivable
  //       1100 Debtors
  const hierarchicalAccounts: AccountTreeNode[] = [
    {
      id: 'assets',
      name: '1 Assets',
      type: 'ASSET',
      note: null,
      parentId: null,
      children: [
        {
          id: 'current-assets',
          name: '10 Current Assets',
          type: 'ASSET',
          note: null,
          parentId: 'assets',
          children: [
            {
              id: 'receivables',
              name: '110 Accounts Receivable',
              type: 'ASSET',
              note: null,
              parentId: 'current-assets',
              children: [
                {
                  id: 'debtors',
                  name: '1100 Debtors',
                  type: 'ASSET',
                  note: null,
                  parentId: 'receivables',
                  children: []
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AccountService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('extractAccountNumber', () => {
    it('should extract number from "1 Assets"', () => {
      expect(service.extractAccountNumber('1 Assets')).toBe('1');
    });

    it('should extract number from "100 Bank"', () => {
      expect(service.extractAccountNumber('100 Bank')).toBe('100');
    });

    it('should extract number with decimal from "2210.001 Person"', () => {
      expect(service.extractAccountNumber('2210.001 Person')).toBe('2210.001');
    });

    it('should return empty string for name without number', () => {
      expect(service.extractAccountNumber('Some Account')).toBe('');
    });
  });

  describe('buildHierarchicalPath', () => {
    it('should build path for root account', () => {
      const path = service.buildHierarchicalPath('assets', hierarchicalAccounts);
      expect(path).toEqual([
        { number: '1', id: 'assets', name: '1 Assets' }
      ]);
    });

    it('should build full path for nested account', () => {
      const path = service.buildHierarchicalPath('debtors', hierarchicalAccounts);
      expect(path).toEqual([
        { number: '1', id: 'assets', name: '1 Assets' },
        { number: '10', id: 'current-assets', name: '10 Current Assets' },
        { number: '110', id: 'receivables', name: '110 Accounts Receivable' },
        { number: '1100', id: 'debtors', name: '1100 Debtors' }
      ]);
    });

    it('should return empty array for unknown account', () => {
      const path = service.buildHierarchicalPath('unknown', hierarchicalAccounts);
      expect(path).toEqual([]);
    });
  });

  describe('buildHierarchicalAccountName', () => {
    it('should build hierarchical name for root account', () => {
      const name = service.buildHierarchicalAccountName('assets', hierarchicalAccounts);
      expect(name).toBe('1 Assets');
    });

    it('should build hierarchical name with number prefixes for nested account', () => {
      const name = service.buildHierarchicalAccountName('debtors', hierarchicalAccounts);
      // Should be "1:10:110:1100 Debtors" - the hierarchical number prefix followed by the leaf name
      expect(name).toBe('1:10:110:1100 Debtors');
    });

    it('should return empty string for unknown account', () => {
      const name = service.buildHierarchicalAccountName('unknown', hierarchicalAccounts);
      expect(name).toBe('');
    });

    it('should handle intermediate account', () => {
      const name = service.buildHierarchicalAccountName('receivables', hierarchicalAccounts);
      // Should be "1:10:110 Accounts Receivable"
      expect(name).toBe('1:10:110 Accounts Receivable');
    });
  });

  describe('findAccountById', () => {
    it('should find root account', () => {
      const account = service.findAccountById('assets', hierarchicalAccounts);
      expect(account).toBeTruthy();
      expect(account?.name).toBe('1 Assets');
    });

    it('should find nested account', () => {
      const account = service.findAccountById('debtors', hierarchicalAccounts);
      expect(account).toBeTruthy();
      expect(account?.name).toBe('1100 Debtors');
    });

    it('should return null for unknown account', () => {
      const account = service.findAccountById('unknown', hierarchicalAccounts);
      expect(account).toBeNull();
    });
  });
});
