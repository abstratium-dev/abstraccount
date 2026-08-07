import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PricingComponent } from './pricing.component';

describe('PricingComponent', () => {
  let component: PricingComponent;
  let fixture: ComponentFixture<PricingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PricingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the pricing page heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const heading = compiled.querySelector('.pricing-title');
    expect(heading).toBeTruthy();
    expect(heading?.textContent).toContain('Pricing');
  });

  it('should render a card for each tier', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('.pricing-card');
    expect(cards.length).toBe(component.tiers.length);
  });

  it('should render the Free tier with online and community help only', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const names = Array.from(compiled.querySelectorAll('.pricing-card-name')).map(el => el.textContent);
    expect(names).toContain('Free');

    const freeTier = component.tiers.find(t => t.name === 'Free');
    expect(freeTier).toBeTruthy();
    expect(freeTier?.features.some(f => f.toLowerCase().includes('online help'))).toBeTrue();
    expect(freeTier?.features.some(f => f.toLowerCase().includes('community'))).toBeTrue();
  });

  it('should render the Pro tier at 5 € per month with AI-assisted email support', () => {
    const proTier = component.tiers.find(t => t.name === 'Pro');
    expect(proTier).toBeTruthy();
    expect(proTier?.price).toBe('5 €');
    expect(proTier?.features.some(f => f.toLowerCase().includes('24-hour email support'))).toBeTrue();
    expect(proTier?.features.some(f => f.toLowerCase().includes('ai assistance'))).toBeTrue();
  });

  it('should mark exactly one tier as featured', () => {
    const featured = component.tiers.filter(t => t.featured);
    expect(featured.length).toBe(1);
    expect(featured[0].name).toBe('Pro');
  });

  it('should show a "Most Popular" badge on the featured tier only', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badges = compiled.querySelectorAll('.pricing-card-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toContain('Most Popular');
  });

  it('should have an enabled "Get Started" call to action for the Free tier that triggers sign-in', () => {
    const freeTier = component.tiers.find(t => t.name === 'Free');
    expect(freeTier?.ctaLabel).toBe('Get Started');
    expect(freeTier?.ctaEnabled).toBeTrue();

    const signInSpy = spyOn(component, 'signIn');
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.pricing-card-cta')) as HTMLButtonElement[];
    const freeButton = buttons.find(b => b.textContent?.trim() === 'Get Started');
    expect(freeButton).toBeTruthy();
    expect(freeButton?.disabled).toBeFalse();
    freeButton?.click();
    expect(signInSpy).toHaveBeenCalled();
  });

  it('should show a disabled "Coming soon" call to action for the Pro tier', () => {
    const proTier = component.tiers.find(t => t.name === 'Pro');
    expect(proTier?.ctaLabel).toBe('Coming soon');
    expect(proTier?.ctaEnabled).toBeFalse();

    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll('.pricing-card-cta')) as HTMLButtonElement[];
    const proButton = buttons.find(b => b.textContent?.trim() === 'Coming soon');
    expect(proButton).toBeTruthy();
    expect(proButton?.disabled).toBeTrue();
  });
});
