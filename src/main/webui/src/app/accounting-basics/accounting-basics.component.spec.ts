import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountingBasicsComponent } from './accounting-basics.component';

describe('AccountingBasicsComponent', () => {
  let component: AccountingBasicsComponent;
  let fixture: ComponentFixture<AccountingBasicsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountingBasicsComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountingBasicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the page heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('.guide-title');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toContain('Accounting Basics');
  });

  it('should render the basic principles section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#principles')).toBeTruthy();
  });

  it('should render the accounts section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#accounts')).toBeTruthy();
  });

  it('should render the journal entries section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#journal-entries')).toBeTruthy();
  });

  it('should render the reports section', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#reports')).toBeTruthy();
  });
});
