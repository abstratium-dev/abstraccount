import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { CloseBooksComponent } from './close-books.component';
import { Controller, CloseBooksPreviewDTO } from '../controller';
import { ModelService } from '../model.service';
import { AutocompleteComponent } from '../core/autocomplete/autocomplete.component';

describe('CloseBooksComponent', () => {
  let component: CloseBooksComponent;
  let fixture: ComponentFixture<CloseBooksComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockPreview: CloseBooksPreviewDTO = {
    accounts: [
      {
        accountId: 'acc-1',
        accountCodePath: '3:3400',
        accountFullName: '3 Revenue:3400 Services',
        balance: -2000,
        commodity: 'CHF'
      },
      {
        accountId: 'acc-2',
        accountCodePath: '6:6570',
        accountFullName: '6 Expenses:6570 IT',
        balance: 500,
        commodity: 'CHF'
      }
    ],
    equityAccountCodePath: '2:2979',
    equityAccountFullName: '2 Passif:2979 Annual profit',
    closingDate: '2025-12-31'
  };

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', ['previewCloseBooks', 'executeCloseBooks']);
    mockModelService = jasmine.createSpyObj('ModelService', ['getAccounts'], {
      selectedJournalId$: signal('test-journal-id')
    });
    mockModelService.getAccounts.and.returnValue([]);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CloseBooksComponent, CommonModule, FormsModule, AutocompleteComponent],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CloseBooksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default closing date to December 31 of current year', () => {
    const currentYear = new Date().getFullYear();
    expect(component.closingDate).toBe(`${currentYear}-12-31`);
  });

  it('should show error when no equity account is selected on preview', async () => {
    component.closingDate = '2025-12-31';
    component.equityAccountCodePath = '';

    await component.previewClose();

    expect(component.errorMessage).toContain('required');
    expect(mockController.previewCloseBooks).not.toHaveBeenCalled();
  });

  it('should show error when no journal is selected', async () => {
    // Temporarily make journalId return null by overwriting the getter behaviour
    // via the existing mockModelService signal (already set to 'test-journal-id').
    // We simulate the null case by spying on the component's journalId getter.
    spyOnProperty(component, 'journalId', 'get').and.returnValue(null);

    await component.previewClose();

    expect(component.errorMessage).toContain('journal');
  });

  it('should call previewCloseBooks and show confirm dialog on success', async () => {
    component.closingDate = '2025-12-31';
    component.equityAccountCodePath = '2:2979';
    mockController.previewCloseBooks.and.returnValue(Promise.resolve(mockPreview));

    await component.previewClose();

    expect(mockController.previewCloseBooks).toHaveBeenCalledWith({
      journalId: 'test-journal-id',
      closingDate: '2025-12-31',
      equityAccountCodePath: '2:2979'
    });
    expect(component.showConfirmDialog).toBeTrue();
    expect(component.preview).toEqual(mockPreview);
    expect(component.errorMessage).toBe('');
  });

  it('should show info when no accounts have non-zero balance', async () => {
    component.closingDate = '2025-12-31';
    component.equityAccountCodePath = '2:2979';
    const emptyPreview = { ...mockPreview, accounts: [] };
    mockController.previewCloseBooks.and.returnValue(Promise.resolve(emptyPreview));

    await component.previewClose();

    expect(component.showConfirmDialog).toBeFalse();
    expect(component.preview).toBeNull();
    expect(component.errorMessage).toContain('Nothing to close');
  });

  it('should call executeCloseBooks and navigate on confirm', async () => {
    component.closingDate = '2025-12-31';
    component.equityAccountCodePath = '2:2979';
    component.preview = mockPreview;
    component.showConfirmDialog = true;
    mockController.executeCloseBooks.and.returnValue(Promise.resolve({ transactionIds: ['t1', 't2'], transactionCount: 2 }));
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    await component.executeClose();

    expect(mockController.executeCloseBooks).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/journal']);
  });

  it('should close the confirm dialog on cancel', () => {
    component.showConfirmDialog = true;
    component.preview = mockPreview;

    component.cancelConfirm();

    expect(component.showConfirmDialog).toBeFalse();
    expect(component.preview).toBeNull();
  });

  it('should format balance correctly', () => {
    const account = mockPreview.accounts[0];
    expect(component.formatBalance(account)).toBe('CHF -2000.00');
  });
});
