import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignedOutComponent } from './signed-out.component';

describe('SignedOutComponent', () => {
  let component: SignedOutComponent;
  let fixture: ComponentFixture<SignedOutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignedOutComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SignedOutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Template Rendering', () => {
    it('should display sign in required heading', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const heading = compiled.querySelector('h1');
      expect(heading).toBeTruthy();
      expect(heading?.textContent).toContain('Sign In Required');
    });

    it('should display message about needing to sign in', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const message = compiled.querySelector('.description');
      expect(message).toBeTruthy();
      expect(message?.textContent).toContain('You need to sign in');
    });

    it('should display sign in button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.btn-primary');
      expect(button).toBeTruthy();
      expect(button?.textContent?.trim()).toBe('Sign In');
    });

    it('should display help text about contacting administrator', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const descriptions = compiled.querySelectorAll('.description');
      const helpText = Array.from(descriptions).find(el => el.textContent?.includes('contact your administrator'));
      expect(helpText).toBeTruthy();
      expect(helpText?.textContent).toContain('contact your administrator');
    });

    it('should display icon', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const icon = compiled.querySelector('svg');
      expect(icon).toBeTruthy();
    });
  });

  describe('Sign In Functionality', () => {
    it('should have signIn method defined', () => {
      // Verify the method exists - actual redirect behavior tested in E2E
      expect(component.signIn).toBeDefined();
      expect(typeof component.signIn).toBe('function');
    });

    it('should call signIn method when button is clicked', () => {
      spyOn(component, 'signIn');
      
      const compiled = fixture.nativeElement as HTMLElement;
      const button = compiled.querySelector('.btn-primary') as HTMLButtonElement;
      button.click();

      expect(component.signIn).toHaveBeenCalled();
    });
  });

  describe('Styling and Layout', () => {
    it('should use global container class', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const container = compiled.querySelector('.container');
      expect(container).toBeTruthy();
    });

    it('should use global card class for content', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const card = compiled.querySelector('.card');
      expect(card).toBeTruthy();
    });

    it('should have SVG icon', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const svg = compiled.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });
});
