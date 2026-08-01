import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SignedInComponent } from './signed-in.component';
import { RouteTrackingService } from '../route-tracking.service';

describe('SignedInComponent', () => {
  let component: SignedInComponent;
  let fixture: ComponentFixture<SignedInComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockRouteTracking: jasmine.SpyObj<RouteTrackingService>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigateByUrl']);
    mockRouteTracking = jasmine.createSpyObj('RouteTrackingService', ['getLastRoute']);

    await TestBed.configureTestingModule({
      imports: [SignedInComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: RouteTrackingService, useValue: mockRouteTracking }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignedInComponent);
    component = fixture.componentInstance;
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('redirects to last route when available', () => {
    mockRouteTracking.getLastRoute.and.returnValue('/journal');

    component.ngOnInit();

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/journal', { replaceUrl: true });
  });

  it('redirects to root when no last route is saved', () => {
    mockRouteTracking.getLastRoute.and.returnValue(null);

    component.ngOnInit();

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/', { replaceUrl: true });
  });
});
