import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { Controller } from '../controller';
import { ModelService } from '../model.service';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let controller: jasmine.SpyObj<Controller>;
  let modelService: {
    journals$: () => any[];
    getSelectedJournalId: jasmine.Spy;
    getAccounts: jasmine.Spy;
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const controllerSpy = jasmine.createSpyObj('Controller', ['listJournals', 'getAccountTree']);
    modelService = {
      journals$: () => [],
      getSelectedJournalId: jasmine.createSpy('getSelectedJournalId').and.returnValue(null),
      getAccounts: jasmine.createSpy('getAccounts').and.returnValue([])
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: Controller, useValue: controllerSpy },
        { provide: ModelService, useValue: modelService }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    controller = TestBed.inject(Controller) as jasmine.SpyObj<Controller>;
  });

  it('should allow access when user is authenticated and journals are already loaded', async () => {
    authService.isAuthenticated.and.returnValue(true);
    modelService.journals$ = () => [{ id: '1' }];

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/clients' } as any)
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(controller.listJournals).not.toHaveBeenCalled();
  });

  it('should load journals and allow access when authenticated but not yet loaded', async () => {
    authService.isAuthenticated.and.returnValue(true);
    controller.listJournals.and.returnValue(Promise.resolve([{ id: '1' } as any]));

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/clients' } as any)
    );

    expect(result).toBe(true);
    expect(controller.listJournals).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should deny access and redirect when user is not authenticated', async () => {
    authService.isAuthenticated.and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/clients' } as any)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/signed-out']);
    expect(controller.listJournals).not.toHaveBeenCalled();
  });

  it('should redirect to signed-out page when attempting to access protected route', async () => {
    authService.isAuthenticated.and.returnValue(false);

    await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/user/123' } as any)
    );

    expect(router.navigate).toHaveBeenCalledWith(['/signed-out']);
  });

  it('should handle complex URLs with query parameters', async () => {
    authService.isAuthenticated.and.returnValue(false);

    await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/clients?page=1&filter=active' } as any)
    );

    expect(router.navigate).toHaveBeenCalledWith(['/signed-out']);
  });

  it('should handle URLs with hash fragments', async () => {
    authService.isAuthenticated.and.returnValue(false);

    await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/user/123#section' } as any)
    );

    expect(router.navigate).toHaveBeenCalledWith(['/signed-out']);
  });

  it('should not store route when user is authenticated', async () => {
    authService.isAuthenticated.and.returnValue(true);
    modelService.journals$ = () => [{ id: '1' }];

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/clients' } as any)
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should handle root path when not authenticated', async () => {
    authService.isAuthenticated.and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/' } as any)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/signed-out']);
  });

  it('should redirect to create-journal when authenticated but no journals exist', async () => {
    authService.isAuthenticated.and.returnValue(true);
    controller.listJournals.and.returnValue(Promise.resolve([]));

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/clients' } as any)
    );

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/create-journal']);
  });

  it('should allow access to /create-journal even when no journals exist (no infinite loop)', async () => {
    authService.isAuthenticated.and.returnValue(true);
    controller.listJournals.and.returnValue(Promise.resolve([]));

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/create-journal' } as any)
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    // The journal-existence check should be skipped, so listJournals must not
    // even be called when navigating to /create-journal.
    expect(controller.listJournals).not.toHaveBeenCalled();
  });

  it('should allow access to /upload even when no journals exist (import is a valid first action)', async () => {
    authService.isAuthenticated.and.returnValue(true);
    controller.listJournals.and.returnValue(Promise.resolve([]));

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/upload' } as any)
    );

    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
    // The journal-existence check should be skipped, so listJournals must not
    // even be called when navigating to /upload.
    expect(controller.listJournals).not.toHaveBeenCalled();
  });

  it('should handle multiple calls with different authentication states', async () => {
    // First call - authenticated, journals not loaded
    authService.isAuthenticated.and.returnValue(true);
    controller.listJournals.and.returnValue(Promise.resolve([{ id: '1' } as any]));
    let result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/clients' } as any)
    );
    expect(result).toBe(true);

    // Second call - not authenticated
    authService.isAuthenticated.and.returnValue(false);
    result = await TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/user/456' } as any)
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/signed-out']);
  });
});
