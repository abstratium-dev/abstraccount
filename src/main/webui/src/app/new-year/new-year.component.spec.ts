import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { NewYearComponent } from './new-year.component';
import { Controller, NewYearPreviewDTO, NewYearResultDTO, AccountTreeNode, JournalMetadataDTO } from '../controller';
import { ModelService } from '../model.service';
import { AutocompleteComponent } from '../core/autocomplete/autocomplete.component';

describe('NewYearComponent', () => {
  let component: NewYearComponent;
  let fixture: ComponentFixture<NewYearComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let journalIdSignal: WritableSignal<string | null>;

  const mockAccounts: AccountTreeNode[] = [
    {
      id: 'acc-1', name: '1 Assets', type: 'ASSET', note: null,
      parentId: null, accountCode: 1, children: [
        {
          id: 'acc-2', name: '1020 Cash', type: 'ASSET', note: null,
          parentId: 'acc-1', accountCode: 1020, children: []
        }
      ]
    },
    {
      id: 'acc-3', name: '2 Passif', type: 'LIABILITY', note: null,
      parentId: null, accountCode: 2, children: [
        {
          id: 'acc-4', name: '2970 Retained Earnings', type: 'EQUITY', note: null,
          parentId: 'acc-3', accountCode: 2970, children: []
        },
        {
          id: 'acc-5', name: '2979 Annual profit/loss', type: 'EQUITY', note: null,
          parentId: 'acc-3', accountCode: 2979, children: []
        }
      ]
    }
  ];

  const mockPreview: NewYearPreviewDTO = {
    sourceJournalId: 'journal-1',
    sourceJournalTitle: 'Source Journal',
    newJournalTitle: 'New Year 2026',
    openingDate: '2026-01-01',
    retainedEarningsCodePath: '2:2970',
    retainedEarningsFullName: '2 Passif:2970 Retained Earnings',
    annualProfitLossCodePath: '2:2979',
    annualProfitLossFullName: '2 Passif:2979 Annual profit/loss',
    accounts: [
      { accountId: 'acc-2', accountCodePath: '1:1020', accountFullName: '1 Assets:1020 Cash', openingBalance: 1000, commodity: 'CHF' },
      { accountId: 'acc-4', accountCodePath: '2:2970', accountFullName: '2 Passif:2970 Retained Earnings', openingBalance: 0, commodity: 'CHF' }
    ],
    accountCount: 5,
    openingBalanceCount: 1
  };

  const mockResult: NewYearResultDTO = {
    newJournalId: 'new-journal-id',
    newJournalTitle: 'New Year 2026',
    accountCount: 5,
    openingBalanceCount: 1,
    retainedEarningsTransferId: 'transfer-tx-id'
  };

  const mockJournalMetadata: JournalMetadataDTO = {
    id: 'journal-1', logo: null, title: 'Source Journal', subtitle: null,
    currency: 'CHF', commodities: { CHF: '1000.00' }, previousJournalId: null
  };

  beforeEach(async () => {
    journalIdSignal = signal('journal-1');
    mockController = jasmine.createSpyObj('Controller', [
      'previewNewYear', 'executeNewYear', 'getJournalMetadata'
    ]);
    mockModelService = jasmine.createSpyObj('ModelService', ['getAccounts'], {
      selectedJournalId$: journalIdSignal,
      journals$: signal([
        { id: 'journal-1', title: 'Source Journal', logo: null, subtitle: null, currency: 'CHF', commodities: {}, previousJournalId: null }
      ])
    });
    mockModelService.getAccounts.and.returnValue(mockAccounts);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [NewYearComponent, CommonModule, FormsModule, AutocompleteComponent],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NewYearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('defaults openingDate to January 1st of next year', () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(component.openingDate).toBe(`${nextYear}-01-01`);
  });

  it('sets the default journal title from the selected journal', () => {
    expect(component.newJournalTitle).toBe('Source Journal');
  });

  it('returns the current journal title', () => {
    expect(component.currentJournalTitle).toBe('Source Journal');
  });

  it('returns empty title when no journal is selected', () => {
    journalIdSignal.set(null);
    fixture.detectChanges();
    expect(component.currentJournalTitle).toBe('');
  });

  it('fetches accounts for retained earnings autocomplete', async () => {
    const fetchFn = component.fetchAccountsForRetainedEarnings();
    const results = await fetchFn('');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.value === '1:1020')).toBeTrue();
    expect(results.some(r => r.value === '2:2970')).toBeTrue();
  });

  it('filters accounts by search term in autocomplete', async () => {
    const fetchFn = component.fetchAccountsForRetainedEarnings();
    const results = await fetchFn('cash');
    expect(results.length).toBe(1);
    expect(results[0].value).toBe('1:1020');
  });

  it('shows error when no journal is selected on preview', async () => {
    journalIdSignal.set(null);
    fixture.detectChanges();
    await component.previewNewYear();
    expect(component.errorMessage).toBe('No journal selected.');
    expect(mockController.previewNewYear).not.toHaveBeenCalled();
  });

  it('shows error when opening date is empty on preview', async () => {
    component.openingDate = '';
    await component.previewNewYear();
    expect(component.errorMessage).toBe('Opening date is required.');
    expect(mockController.previewNewYear).not.toHaveBeenCalled();
  });

  it('shows error when retained earnings code path is empty on preview', async () => {
    component.retainedEarningsCodePath = '';
    await component.previewNewYear();
    expect(component.errorMessage).toBe('Retained earnings account (2970) is required.');
  });

  it('shows error when annual profit/loss code path is empty on preview', async () => {
    component.retainedEarningsCodePath = '2:2970';
    component.annualProfitLossCodePath = '';
    await component.previewNewYear();
    expect(component.errorMessage).toBe('Annual profit/loss account (2979) is required.');
  });

  it('previews new year and shows confirm dialog when accounts exist', async () => {
    component.retainedEarningsCodePath = '2:2970';
    component.annualProfitLossCodePath = '2:2979';
    mockController.previewNewYear.and.resolveTo(mockPreview);

    await component.previewNewYear();

    expect(mockController.previewNewYear).toHaveBeenCalled();
    expect(component.preview).toEqual(mockPreview);
    expect(component.showConfirmDialog).toBeTrue();
    expect(component.errorMessage).toBe('');
  });

  it('shows error when preview returns no accounts', async () => {
    component.retainedEarningsCodePath = '2:2970';
    component.annualProfitLossCodePath = '2:2979';
    mockController.previewNewYear.and.resolveTo({ ...mockPreview, accounts: [] });

    await component.previewNewYear();

    expect(component.errorMessage).toBe('No accounts found to copy to the new journal.');
    expect(component.preview).toBeNull();
    expect(component.showConfirmDialog).toBeFalse();
  });

  it('shows error message when preview call fails', async () => {
    component.retainedEarningsCodePath = '2:2970';
    component.annualProfitLossCodePath = '2:2979';
    mockController.previewNewYear.and.rejectWith({ message: 'Network error' });

    await component.previewNewYear();

    expect(component.errorMessage).toBe('Network error');
    expect(component.isLoading).toBeFalse();
  });

  it('shows error message from server response when preview fails', async () => {
    component.retainedEarningsCodePath = '2:2970';
    component.annualProfitLossCodePath = '2:2979';
    mockController.previewNewYear.and.rejectWith({ error: { message: 'Server error' } });

    await component.previewNewYear();

    expect(component.errorMessage).toBe('Server error');
  });

  it('executes new year and navigates to journal page on success', async () => {
    component.preview = mockPreview;
    component.retainedEarningsCodePath = '2:2970';
    component.annualProfitLossCodePath = '2:2979';
    mockController.executeNewYear.and.resolveTo(mockResult);

    await component.executeNewYear();

    expect(mockController.executeNewYear).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/journal']);
    expect(component.successMessage).toContain('New Year 2026');
    expect(component.successMessage).toContain('5 accounts');
    expect(component.showConfirmDialog).toBeFalse();
    expect(component.preview).toBeNull();
  });

  it('does nothing when executing without a preview', async () => {
    component.preview = null;
    await component.executeNewYear();
    expect(mockController.executeNewYear).not.toHaveBeenCalled();
  });

  it('shows error and closes dialog when execute fails', async () => {
    component.preview = mockPreview;
    component.retainedEarningsCodePath = '2:2970';
    component.annualProfitLossCodePath = '2:2979';
    mockController.executeNewYear.and.rejectWith({ message: 'Execute failed' });

    await component.executeNewYear();

    expect(component.errorMessage).toBe('Execute failed');
    expect(component.showConfirmDialog).toBeFalse();
    expect(component.isLoading).toBeFalse();
  });

  it('cancels the confirm dialog and clears preview', () => {
    component.showConfirmDialog = true;
    component.preview = mockPreview;

    component.cancelConfirm();

    expect(component.showConfirmDialog).toBeFalse();
    expect(component.preview).toBeNull();
  });

  it('formats balance with commodity and two decimal places', () => {
    const formatted = component.formatBalance({
      accountId: 'acc-1', accountCodePath: '1:1020', accountFullName: 'Cash',
      openingBalance: 1234.5, commodity: 'CHF'
    });
    expect(formatted).toBe('CHF 1234.50');
  });

  it('returns only non-zero balance accounts', () => {
    component.preview = mockPreview;
    const nonZero = component.getNonZeroBalanceAccounts();
    expect(nonZero.length).toBe(1);
    expect(nonZero[0].accountId).toBe('acc-2');
  });

  it('returns empty list when no preview exists', () => {
    component.preview = null;
    expect(component.getNonZeroBalanceAccounts()).toEqual([]);
  });

  it('loads journal metadata on init', async () => {
    mockController.getJournalMetadata.and.resolveTo(mockJournalMetadata);
    component.newJournalTitle = '';
    await component.ngOnInit();
    expect(mockController.getJournalMetadata).toHaveBeenCalledWith('journal-1');
    expect(component.newJournalTitle).toBe('Source Journal');
  });

  it('does not overwrite title if already set during init', async () => {
    mockController.getJournalMetadata.and.resolveTo(mockJournalMetadata);
    component.newJournalTitle = 'Custom Title';
    await component.ngOnInit();
    expect(component.newJournalTitle).toBe('Custom Title');
  });

  it('handles error when loading journal metadata fails', async () => {
    mockController.getJournalMetadata.and.rejectWith({ message: 'Failed' });
    component.newJournalTitle = '';
    await component.ngOnInit();
    // Should not throw, just log the error. Title stays empty because metadata
    // load failed and we explicitly cleared it before ngOnInit.
    expect(component.newJournalTitle).toBe('');
  });
});
