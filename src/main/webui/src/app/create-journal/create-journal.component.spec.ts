import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Controller } from '../controller';
import { CreateJournalComponent } from './create-journal.component';

describe('CreateJournalComponent', () => {
  let component: CreateJournalComponent;
  let fixture: ComponentFixture<CreateJournalComponent>;
  let controller: jasmine.SpyObj<Controller>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    controller = jasmine.createSpyObj<Controller>('Controller', ['createJournal', 'selectJournal']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CreateJournalComponent],
      providers: [
        { provide: Controller, useValue: controller },
        { provide: Router, useValue: router }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateJournalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the starter chart onboarding message', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Start Your Books');
    expect(fixture.nativeElement.textContent).toContain('starter chart of accounts');
    expect(fixture.nativeElement.textContent).not.toContain('Add Commodity');
  });

  it('submits an empty commodity map because the currency commodity is created by the backend', async () => {
    component.title = 'My journal';
    component.currency = 'CHF';
    controller.createJournal.and.resolveTo({
      id: 'journal-id', logo: null, title: 'My journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, previousJournalId: null
    });

    await component.onSubmit();

    expect(controller.createJournal).toHaveBeenCalledWith({
      logo: null,
      title: 'My journal',
      subtitle: null,
      currency: 'CHF',
      commodities: {}
    });
  });

  it('selects the created journal and opens the accounts screen', () => {
    component.createResult = {
      id: 'journal-id', logo: null, title: 'My journal', subtitle: null, currency: 'CHF',
      commodities: { CHF: '1000.00' }, previousJournalId: null
    };

    component.viewAccounts();

    expect(controller.selectJournal).toHaveBeenCalledWith('journal-id');
    expect(router.navigate).toHaveBeenCalledWith(['/accounts-table']);
  });

  it('shows a missing USER role message when journal creation is forbidden', async () => {
    controller.createJournal.and.rejectWith({ status: 403 });

    await component.onSubmit();

    expect(component.createError).toBe('You do not have the required USER role to create a journal.');
  });
});
