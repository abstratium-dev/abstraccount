import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Controller } from '../controller';
import { ModelService } from '../model.service';
import { JournalManagementComponent } from './journal-management.component';
import { ConfirmDialogService } from '../core/confirm-dialog/confirm-dialog.service';

describe('JournalManagementComponent', () => {
  let component: JournalManagementComponent;
  let fixture: ComponentFixture<JournalManagementComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: ModelService;
  let router: Router;
  let confirmDialog: jasmine.SpyObj<ConfirmDialogService>;

  beforeEach(async () => {
    controller = jasmine.createSpyObj<Controller>('Controller', ['listJournals', 'selectJournal', 'exportJournal', 'deleteJournal', 'lockJournal', 'unlockJournal']);
    confirmDialog = jasmine.createSpyObj<ConfirmDialogService>('ConfirmDialogService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [JournalManagementComponent],
      providers: [
        { provide: Controller, useValue: controller },
        { provide: ConfirmDialogService, useValue: confirmDialog },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(JournalManagementComponent);
    component = fixture.componentInstance;
    modelService = TestBed.inject(ModelService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  it('renders export controls for the selected journal', () => {
    modelService.setJournals([{
      id: 'journal-id', title: 'Current Journal', subtitle: 'Current subtitle', currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    }]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Title:');
    expect(fixture.nativeElement.textContent).toContain('Subtitle:');
    expect(fixture.nativeElement.textContent).toContain('Currency:');
    expect(fixture.nativeElement.textContent).toContain('Include transactions');
    expect(fixture.nativeElement.textContent).toContain('Export');
    expect(fixture.nativeElement.querySelector('#import-journal').classList).toContain('btn-secondary');
    expect(fixture.nativeElement.querySelector('#create-journal').classList).toContain('btn-primary');
    expect(fixture.nativeElement.querySelectorAll('hr').length).toBe(6);
  });

  it('navigates to import and journal creation from the shared buttons', () => {
    fixture.detectChanges();

    fixture.nativeElement.querySelector('#import-journal').click();
    expect(router.navigate).toHaveBeenCalledWith(['/upload']);

    fixture.nativeElement.querySelector('#create-journal').click();
    expect(router.navigate).toHaveBeenCalledWith(['/create-journal']);
  });

  it('lists journals and selects the requested journal', async () => {
    modelService.setJournals([
      { id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF', commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false },
      { id: 'other-journal-id', title: 'Other Journal', subtitle: null, currency: 'EUR', commodities: { EUR: '1000.00' }, logo: null, previousJournalId: null, locked: false }
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('#journal-select option').length).toBe(2);

    component.selectedJournalId = 'other-journal-id';
    await component.onJournalSelected();

    expect(controller.selectJournal).toHaveBeenCalledWith('other-journal-id');
  });

  it('exports the selected journal with transactions by default', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    controller.exportJournal.and.resolveTo('; title: Current Journal');
    spyOn(HTMLAnchorElement.prototype, 'click');
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:journal');
    spyOn(window.URL, 'revokeObjectURL');

    await component.exportJournal();

    expect(controller.exportJournal).toHaveBeenCalledWith('journal-id', true);
    expect(component.exporting).toBeFalse();
    expect(component.exportError).toBeNull();
  });

  it('exports without transactions when requested', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    component.includeTransactions = false;
    controller.exportJournal.and.resolveTo('; title: Current Journal');
    spyOn(HTMLAnchorElement.prototype, 'click');
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:journal');
    spyOn(window.URL, 'revokeObjectURL');

    await component.exportJournal();

    expect(controller.exportJournal).toHaveBeenCalledWith('journal-id', false);
  });

  it('shows an export failure', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    controller.exportJournal.and.rejectWith(new Error('Export failed'));

    await component.exportJournal();

    expect(component.exportError).toContain('Failed to export journal');
  });

  it('renders the danger zone with delete journal controls for the selected journal', () => {
    modelService.setJournals([{
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Danger Zone');
    expect(fixture.nativeElement.textContent).toContain('Delete Journal');
    expect(fixture.nativeElement.querySelector('#confirmation-input')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#delete-journal')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#cancel-delete')).toBeTruthy();
  });

  it('disables the delete button until the confirmation name matches', () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    expect(component.isConfirmationValid).toBeFalse();

    component.confirmationName = 'Current Journal';
    expect(component.isConfirmationValid).toBeTrue();
  });

  it('deletes the journal and navigates home on success', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    component.confirmationName = 'Current Journal';
    controller.deleteJournal.and.resolveTo();

    await component.deleteJournal();

    expect(controller.deleteJournal).toHaveBeenCalledWith('journal-id');
    expect(router.navigate).toHaveBeenCalledWith(['/']);
    expect(component.deleting).toBeFalse();
  });

  it('shows an error when deletion fails', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    component.confirmationName = 'Current Journal';
    controller.deleteJournal.and.rejectWith(new Error('Delete failed'));

    await component.deleteJournal();

    expect(component.deleteError).toContain('Failed to delete journal');
    expect(component.deleting).toBeFalse();
  });

  it('does not call deleteJournal when confirmation is invalid', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    component.confirmationName = 'wrong name';

    await component.deleteJournal();

    expect(controller.deleteJournal).not.toHaveBeenCalled();
  });

  it('clears confirmation and error on cancel', () => {
    component.confirmationName = 'something';
    component.deleteError = 'some error';

    component.cancelDelete();

    expect(component.confirmationName).toBe('');
    expect(component.deleteError).toBeNull();
  });

  it('renders lock controls for an unlocked journal', () => {
    modelService.setJournals([{
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#lock-journal')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#unlock-journal')).toBeFalsy();
  });

  it('renders unlock controls for a locked journal', () => {
    modelService.setJournals([{
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: true
    }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#lock-journal')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('#unlock-journal')).toBeTruthy();
  });

  it('locks the journal via the controller', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    controller.lockJournal.and.resolveTo({
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: true
    });

    await component.lockJournal();

    expect(controller.lockJournal).toHaveBeenCalledWith('journal-id');
    expect(component.locking).toBeFalse();
    expect(component.lockError).toBeNull();
  });

  it('asks for confirmation via the confirm dialog before unlocking the journal', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: true
    };
    controller.unlockJournal.and.resolveTo({
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    });
    confirmDialog.confirm.and.resolveTo(true);

    await component.unlockJournal();

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(confirmDialog.confirm.calls.mostRecent().args[0].title).toBe('Unlock Journal');
    expect(confirmDialog.confirm.calls.mostRecent().args[0].confirmText).toBe('Yes, unlock anyway');
    expect(controller.unlockJournal).toHaveBeenCalledWith('journal-id');
    expect(component.locking).toBeFalse();
    expect(component.lockError).toBeNull();
  });

  it('does not call unlockJournal on the controller when the user cancels the confirmation', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: true
    };
    confirmDialog.confirm.and.resolveTo(false);

    await component.unlockJournal();

    expect(confirmDialog.confirm).toHaveBeenCalled();
    expect(controller.unlockJournal).not.toHaveBeenCalled();
    expect(component.locking).toBeFalse();
  });

  it('does nothing when no journal is selected', async () => {
    component.selectedJournal = null;

    await component.unlockJournal();

    expect(confirmDialog.confirm).not.toHaveBeenCalled();
    expect(controller.unlockJournal).not.toHaveBeenCalled();
  });

  it('shows an error when unlocking fails', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: true
    };
    confirmDialog.confirm.and.resolveTo(true);
    controller.unlockJournal.and.rejectWith(new Error('Unlock failed'));

    await component.unlockJournal();

    expect(component.lockError).toContain('Failed to unlock journal');
    expect(component.locking).toBeFalse();
  });

  it('shows an error when locking fails', async () => {
    component.selectedJournal = {
      id: 'journal-id', title: 'Current Journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, logo: null, previousJournalId: null, locked: false
    };
    controller.lockJournal.and.rejectWith(new Error('Lock failed'));

    await component.lockJournal();

    expect(component.lockError).toContain('Failed to lock journal');
    expect(component.locking).toBeFalse();
  });
});
