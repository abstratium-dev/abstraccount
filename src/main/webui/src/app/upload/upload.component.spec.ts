import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UploadComponent } from './upload.component';
import { Controller, JournalConflictError, JournalUploadSummary } from '../controller';

describe('UploadComponent', () => {
  let component: UploadComponent;
  let fixture: ComponentFixture<UploadComponent>;
  let mockController: jasmine.SpyObj<Controller>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockUploadResult: JournalUploadSummary = {
    title: 'Test Journal',
    accountCount: 10,
    transactionCount: 50,
    commodityCount: 2,
    status: 'created',
    journalId: 'journal-id-1'
  };

  beforeEach(async () => {
    mockController = jasmine.createSpyObj('Controller', ['uploadJournal']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [UploadComponent],
      providers: [
        { provide: Controller, useValue: mockController },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('starts with no upload in progress', () => {
    expect(component.uploading).toBeFalse();
    expect(component.uploadResult).toBeNull();
    expect(component.uploadError).toBeNull();
    expect(component.pendingConflict).toBeNull();
  });

  it('viewJournal navigates to journal page', () => {
    component.viewJournal();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/journal']);
  });

  it('cancelReplace clears conflict and error state', () => {
    component.pendingConflict = {
      journals: [{ id: 'j1', title: 'Journal 1' }],
      file: new File([''], 'test.txt')
    };
    component.uploadError = 'Some error';

    component.cancelReplace();

    expect(component.pendingConflict).toBeNull();
    expect(component.uploadError).toBeNull();
  });

  it('confirmReplace does nothing when no pending conflict', () => {
    component.pendingConflict = null;
    component.confirmReplace();
    expect(mockController.uploadJournal).not.toHaveBeenCalled();
  });

  it('uploads file successfully', async () => {
    const file = new File(['journal content'], 'test.journal', { type: 'text/plain' });
    mockController.uploadJournal.and.resolveTo(mockUploadResult);

    await component.uploadFile(file);

    // Wait for FileReader to complete
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockController.uploadJournal).toHaveBeenCalledWith('journal content', false);
    expect(component.uploadResult).toEqual(mockUploadResult);
    expect(component.uploading).toBeFalse();
  });

  it('handles upload error', async () => {
    const file = new File(['content'], 'test.journal');
    mockController.uploadJournal.and.rejectWith({ error: { message: 'Invalid format' } });

    await component.uploadFile(file);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(component.uploadError).toBe('Invalid format');
    expect(component.uploading).toBeFalse();
  });

  it('handles JournalConflictError by setting pendingConflict', async () => {
    const file = new File(['content'], 'test.journal');
    const conflictError = new JournalConflictError({
      status: 'conflict',
      message: 'Journal already exists',
      conflictingJournals: [{ id: 'j1', title: 'Existing Journal' }]
    });
    mockController.uploadJournal.and.rejectWith(conflictError);

    await component.uploadFile(file);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(component.pendingConflict).not.toBeNull();
    expect(component.pendingConflict!.journals).toEqual([{ id: 'j1', title: 'Existing Journal' }]);
    expect(component.uploading).toBeFalse();
  });

  it('confirmReplace re-uploads with replaceExisting=true', async () => {
    const file = new File(['content'], 'test.journal');
    component.pendingConflict = {
      journals: [{ id: 'j1', title: 'Existing Journal' }],
      file
    };
    // Set lastFile by having uploaded previously
    await component.uploadFile(file);
    await new Promise(resolve => setTimeout(resolve, 50));

    // Now trigger conflict and confirm replace
    component.pendingConflict = {
      journals: [{ id: 'j1', title: 'Existing Journal' }],
      file
    };
    mockController.uploadJournal.and.resolveTo({ ...mockUploadResult, status: 'replaced' });

    component.confirmReplace();
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockController.uploadJournal).toHaveBeenCalledWith('content', true);
  });

  it('onFileSelected does nothing when no file is selected', () => {
    const event = {
      target: { files: [] }
    } as unknown as Event;

    component.onFileSelected(event);

    expect(component.uploading).toBeFalse();
  });

  it('onFileSelected triggers upload when a file is selected', () => {
    const file = new File(['content'], 'test.journal');
    const event = {
      target: { files: [file] }
    } as unknown as Event;

    spyOn(component, 'uploadFile');

    component.onFileSelected(event);

    expect(component.uploadFile).toHaveBeenCalledWith(file);
  });
});
