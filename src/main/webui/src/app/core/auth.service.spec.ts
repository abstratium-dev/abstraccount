import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService, ANONYMOUS, Token } from './auth.service';
import { WINDOW } from './window.token';
import { Subject } from 'rxjs';

describe('AuthService (BFF Pattern)', () => {

  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let routerEventsSubject: Subject<any>;
  let mockWindow: { location: { pathname: string; search: string; href: string } };
  
  // Helper function to set router URL
  const setRouterUrl = (url: string) => {
    Object.defineProperty(routerSpy, 'url', {
      value: url,
      writable: true,
      configurable: true
    });
  };

  const mockUserInfo: Token = {
    iss: 'https://abstrauth.abstratium.dev',
    sub: 'user-123',
    groups: ['admin', 'users'],
    email: 'test@example.com',
    email_verified: true,
    name: 'Test User',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    isAuthenticated: true,
    client_id: 'abstratium-component',
    jti: 'jwt-id-123',
    upn: 'test@example.com',
    auth_method: 'password'
  };

  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear();
    
    // Create mock window
    mockWindow = {
      location: {
        pathname: '/accounts',
        search: '',
        href: ''
      }
    };
    
    // Create a Subject to simulate router events
    routerEventsSubject = new Subject();
    
    const spy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl'], { url: '/' });
    spy.events = routerEventsSubject.asObservable();
    spy.navigateByUrl.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: Router, useValue: spy },
        { provide: WINDOW, useValue: mockWindow }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should start with anonymous token', () => {
      const token = service.getAccessToken();
      expect(token.email).toBe(ANONYMOUS.email);
      expect(token.isAuthenticated).toBe(false);
    });

    it('should have token$ signal set to anonymous', () => {
      const token = service.token$();
      expect(token.email).toBe(ANONYMOUS.email);
      expect(token.isAuthenticated).toBe(false);
    });

    it('should not be authenticated initially', () => {
      expect(service.isAuthenticated()).toBe(false);
    });

  });

  describe('BFF Pattern - Initialize from Backend', () => {
    it('should load user info from /api/core/userinfo when authenticated', (done) => {
      setRouterUrl('/accounts');
      service.initialize().subscribe(() => {
        const token = service.getAccessToken();
        expect(token.sub).toBe('user-123');
        expect(token.email).toBe('test@example.com');
        expect(token.name).toBe('Test User');
        expect(token.isAuthenticated).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      expect(req.request.method).toBe('GET');
      req.flush(mockUserInfo);
    });

    it('should set anonymous token when /api/core/userinfo returns 401', (done) => {
      service.initialize().subscribe(() => {
        const token = service.getAccessToken();
        expect(token.email).toBe(ANONYMOUS.email);
        expect(token.isAuthenticated).toBe(false);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should update token$ signal when loading user info', (done) => {
      setRouterUrl('/accounts');
      service.initialize().subscribe(() => {
        const token = service.token$();
        expect(token.sub).toBe('user-123');
        expect(token.email).toBe('test@example.com');
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
    });

    it('should not make duplicate requests if already initialized', (done) => {
      setRouterUrl('/accounts');
      // First initialization
      service.initialize().subscribe(() => {
        // Second initialization should not make HTTP request
        service.initialize().subscribe(() => {
          done();
        });
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
      
      // Verify no additional requests
      httpMock.expectNone('/api/core/userinfo');
    });

    it('should initialize without errors', (done) => {
      setRouterUrl('/accounts');
      
      service.initialize().subscribe(() => {
        // Auth service no longer handles navigation
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
    });

    it('should initialize from root route', (done) => {
      setRouterUrl('/');
      
      service.initialize().subscribe(() => {
        // Auth service no longer handles navigation
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
    });

    it('should handle initialization on specific route', (done) => {
      setRouterUrl('/clients');
      
      service.initialize().subscribe(() => {
        // Auth service no longer handles navigation
        expect(service.isAuthenticated()).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
    });

  });

  describe('Token Properties', () => {
    beforeEach((done) => {
      setRouterUrl('/accounts');
      service.initialize().subscribe(() => done());
      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
    });

    it('should return email', () => {
      expect(service.getEmail()).toBe('test@example.com');
    });

    it('should return name', () => {
      expect(service.getName()).toBe('Test User');
    });

    it('should return groups', () => {
      const groups = service.getGroups();
      expect(groups).toEqual(['admin', 'users']);
    });

    it('should check if user is authenticated', () => {
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should check if user has role', () => {
      expect(service.hasRole('admin')).toBe(true);
      expect(service.hasRole('users')).toBe(true);
      expect(service.hasRole('superadmin')).toBe(false);
    });
  });

  describe('Token Expiry', () => {
    it('should detect expired token', (done) => {
      setRouterUrl('/accounts');
      const expiredToken = { ...mockUserInfo, exp: Math.floor(Date.now() / 1000) - 3600 };
      
      service.initialize().subscribe(() => {
        expect(service.isExpired()).toBe(true);
        
        // The expiry timer will trigger signout() immediately for expired tokens
        // We need to flush the logout request to avoid "Expected no open requests" error
        setTimeout(() => {
          const logoutReq = httpMock.match('/api/auth/logout');
          if (logoutReq.length > 0) {
            logoutReq[0].flush({});
          }
          done();
        }, 100);
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(expiredToken);
    });

    it('should detect token about to expire', (done) => {
      setRouterUrl('/accounts');
      const soonToExpireToken = { ...mockUserInfo, exp: Math.floor(Date.now() / 1000) + 1800 }; // 30 min
      
      service.initialize().subscribe(() => {
        expect(service.isAboutToExpire()).toBe(true);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(soonToExpireToken);
    });

    it('should not be expired for valid token', (done) => {
      setRouterUrl('/accounts');
      service.initialize().subscribe(() => {
        expect(service.isExpired()).toBe(false);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
    });
  });

  describe('Reset Token', () => {
    it('should reset to anonymous token', (done) => {
      setRouterUrl('/accounts');
      service.initialize().subscribe(() => {
        expect(service.isAuthenticated()).toBe(true);
        
        service.resetToken();
        
        expect(service.isAuthenticated()).toBe(false);
        expect(service.getEmail()).toBe(ANONYMOUS.email);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(mockUserInfo);
    });
  });

  describe('Session Fraction', () => {
    it('should start with sessionFraction$ = 1', () => {
      expect(service.sessionFraction$()).toBe(1);
    });

    it('should set sessionFraction$ close to 1 immediately after login with a fresh token', (done) => {
      setRouterUrl('/accounts');
      const freshToken = {
        ...mockUserInfo,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      service.initialize().subscribe(() => {
        const fraction = service.sessionFraction$();
        expect(fraction).toBeGreaterThan(0.99);
        expect(fraction).toBeLessThanOrEqual(1);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(freshToken);
    });

    it('should set sessionFraction$ to ~0.5 when halfway through session', (done) => {
      setRouterUrl('/accounts');
      const now = Math.floor(Date.now() / 1000);
      const halfwayToken = {
        ...mockUserInfo,
        iat: now - 1800,
        exp: now + 1800
      };

      service.initialize().subscribe(() => {
        const fraction = service.sessionFraction$();
        expect(fraction).toBeGreaterThan(0.49);
        expect(fraction).toBeLessThan(0.51);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(halfwayToken);
    });

    it('should set sessionFraction$ to 0 for an expired token', (done) => {
      setRouterUrl('/accounts');
      const expiredToken = {
        ...mockUserInfo,
        iat: Math.floor(Date.now() / 1000) - 7200,
        exp: Math.floor(Date.now() / 1000) - 3600
      };

      service.initialize().subscribe(() => {
        expect(service.sessionFraction$()).toBe(0);
        setTimeout(() => {
          const logoutReq = httpMock.match('/api/auth/logout');
          if (logoutReq.length > 0) {
            logoutReq[0].flush({});
          }
          done();
        }, 100);
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(expiredToken);
    });

    it('should set sessionMinutesRemaining$ to approximately correct value', (done) => {
      setRouterUrl('/accounts');
      const now = Math.floor(Date.now() / 1000);
      const token90min = {
        ...mockUserInfo,
        iat: now - 1800,
        exp: now + 5400
      };

      service.initialize().subscribe(() => {
        const minutes = service.sessionMinutesRemaining$();
        expect(minutes).toBeGreaterThanOrEqual(89);
        expect(minutes).toBeLessThanOrEqual(90);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(token90min);
    });

    it('should reset sessionMinutesRemaining$ to 0 on resetToken()', (done) => {
      setRouterUrl('/accounts');
      const freshToken = {
        ...mockUserInfo,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };

      service.initialize().subscribe(() => {
        expect(service.sessionMinutesRemaining$()).toBeGreaterThan(0);

        service.resetToken();

        expect(service.sessionMinutesRemaining$()).toBe(0);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(freshToken);
    });

    it('should reset sessionFraction$ to 1 on resetToken()', (done) => {
      setRouterUrl('/accounts');
      const halfwayToken = {
        ...mockUserInfo,
        iat: Math.floor(Date.now() / 1000) - 1800,
        exp: Math.floor(Date.now() / 1000) + 1800
      };

      service.initialize().subscribe(() => {
        expect(service.sessionFraction$()).toBeLessThan(0.51);

        service.resetToken();

        expect(service.sessionFraction$()).toBe(1);
        done();
      });

      const req = httpMock.expectOne('/api/core/userinfo');
      req.flush(halfwayToken);
    });
  });

  describe('Signout', () => {
    it('should reset token, call logout endpoint, and navigate to signed-out on success', () => {
      service.signout();
      
      // Verify token was reset
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getEmail()).toBe(ANONYMOUS.email);
      
      // Verify HTTP call to logout endpoint
      const req = httpMock.expectOne('/api/auth/logout');
      expect(req.request.method).toBe('GET');
      
      // Simulate successful response
      req.flush({});
      
      // Verify navigation to signed-out
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/signed-out']);
    });

    it('should navigate to signed-out even if logout endpoint fails', () => {
      service.signout();
      
      // Verify token was reset
      expect(service.isAuthenticated()).toBe(false);
      
      // Verify HTTP call to logout endpoint
      const req = httpMock.expectOne('/api/auth/logout');
      
      // Simulate error response
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
      
      // Verify navigation to signed-out still happens
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/signed-out']);
    });
  });

});
