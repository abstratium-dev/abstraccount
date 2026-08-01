import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { RouteTrackingService, LAST_ROUTE_KEY, EXCLUDED_ROUTES } from './route-tracking.service';

describe('RouteTrackingService', () => {
  let service: RouteTrackingService;
  let mockRouter: jasmine.SpyObj<Router>;
  let routerEvents: Subject<any>;

  beforeEach(() => {
    routerEvents = new Subject<any>();
    mockRouter = jasmine.createSpyObj('Router', [], { events: routerEvents.asObservable() });
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        RouteTrackingService,
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(RouteTrackingService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates the service', () => {
    expect(service).toBeTruthy();
  });

  it('saves route to localStorage on NavigationEnd', () => {
    service.start();
    routerEvents.next(new NavigationEnd(1, '/journal', '/journal'));

    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBe('/journal');
  });

  it('does not save excluded routes', () => {
    service.start();
    routerEvents.next(new NavigationEnd(1, '/signed-out', '/signed-out'));

    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBeNull();
  });

  it('does not save signed-in route', () => {
    service.start();
    routerEvents.next(new NavigationEnd(1, '/signed-in', '/signed-in'));

    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBeNull();
  });

  it('ignores non-NavigationEnd events', () => {
    service.start();
    routerEvents.next({ id: 1, url: '/some-route' } as any);

    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBeNull();
  });

  it('getLastRoute returns saved route', () => {
    localStorage.setItem(LAST_ROUTE_KEY, '/reports');
    expect(service.getLastRoute()).toBe('/reports');
  });

  it('getLastRoute returns null when nothing saved', () => {
    expect(service.getLastRoute()).toBeNull();
  });

  it('getLastRoute returns null for excluded routes', () => {
    localStorage.setItem(LAST_ROUTE_KEY, '/signed-out');
    expect(service.getLastRoute()).toBeNull();
  });

  it('saveRoute saves non-excluded routes', () => {
    service.saveRoute('/accounts-table');
    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBe('/accounts-table');
  });

  it('saveRoute does not save excluded routes', () => {
    service.saveRoute('/signed-out');
    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBeNull();
  });

  it('saveRoute does not save empty urls', () => {
    service.saveRoute('');
    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBeNull();
  });

  it('saveRoute does not save null urls', () => {
    service.saveRoute(null as any);
    expect(localStorage.getItem(LAST_ROUTE_KEY)).toBeNull();
  });
});
