import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Controller } from '../controller';
import { CreateJournalComponent } from './create-journal.component';

describe('CreateJournalComponent', () => {
  let component: CreateJournalComponent;
  let fixture: ComponentFixture<CreateJournalComponent>;
  let controller: jasmine.SpyObj<Controller>;

  beforeEach(async () => {
    controller = jasmine.createSpyObj<Controller>('Controller', ['createJournal', 'selectJournal']);

    await TestBed.configureTestingModule({
      imports: [CreateJournalComponent],
      providers: [
        { provide: Controller, useValue: controller },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateJournalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a missing USER role message when journal creation is forbidden', async () => {
    controller.createJournal.and.rejectWith({ status: 403 });

    await component.onSubmit();

    expect(component.createError).toBe('You do not have the required USER role to create a journal.');
  });
});
