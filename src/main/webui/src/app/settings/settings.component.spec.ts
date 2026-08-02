import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { SettingsComponent } from './settings.component';
import { Controller, JournalMetadataDTO } from '../controller';
import { ModelService } from '../model.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockModelService: jasmine.SpyObj<ModelService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let journalIdSignal: WritableSignal<string | null>;

  const mockJournal: JournalMetadataDTO = {
    id: 'journal-1', logo: null, title: 'My Journal', subtitle: null,
    currency: 'CHF', commodities: { CHF: '1000.00' }, previousJournalId: null, locked: false
  };

  beforeEach(async () => {
    journalIdSignal = signal('journal-1');
    mockController = jasmine.createSpyObj('Controller', ['deleteJournal']);
    mockModelService = jasmine.createSpyObj('ModelService', [], {
      selectedJournalId$: journalIdSignal,
      journals$: signal([mockJournal])
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [SettingsComponent, CommonModule, FormsModule],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: ModelService, useValue: mockModelService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('loads the selected journal from the model service', () => {
    expect(component.selectedJournal).toEqual(mockJournal);
  });

  it('isConfirmationValid is true when confirmation name matches journal title', () => {
    component.confirmationName = 'My Journal';
    expect(component.isConfirmationValid).toBeTrue();
  });

  it('isConfirmationValid is false when confirmation name does not match', () => {
    component.confirmationName = 'Wrong Name';
    expect(component.isConfirmationValid).toBeFalse();
  });

  it('isConfirmationValid is false when no journal is selected', () => {
    component.selectedJournal = null;
    component.confirmationName = 'My Journal';
    expect(component.isConfirmationValid).toBeFalse();
  });

  it('deleteJournal does nothing when confirmation is invalid', async () => {
    component.confirmationName = 'Wrong';
    await component.deleteJournal();
    expect(mockController.deleteJournal).not.toHaveBeenCalled();
  });

  it('deleteJournal calls controller and navigates on success', async () => {
    component.confirmationName = 'My Journal';
    mockController.deleteJournal.and.resolveTo();

    await component.deleteJournal();

    expect(mockController.deleteJournal).toHaveBeenCalledWith('journal-1');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('deleteJournal shows error on failure', async () => {
    component.confirmationName = 'My Journal';
    mockController.deleteJournal.and.rejectWith(new Error('Network error'));

    await component.deleteJournal();

    expect(component.error).toContain('Failed to delete journal');
    expect(component.error).toContain('Network error');
    expect(component.deleting).toBeFalse();
  });

  it('cancel resets confirmation name and error', () => {
    component.confirmationName = 'My Journal';
    component.error = 'Some error';

    component.cancel();

    expect(component.confirmationName).toBe('');
    expect(component.error).toBeNull();
  });

  it('sets selectedJournal to null when no journal is selected', () => {
    journalIdSignal.set(null);
    fixture.detectChanges();
    expect(component.selectedJournal).toBeNull();
  });
});
