import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { Controller } from '../controller';
import { ModelService } from '../model.service';

/**
 * Authentication guard that protects routes requiring user authentication.
 * 
 * If the user is not authenticated, they are redirected to the signed-out page.
 * If the user is authenticated and the journal list is not yet loaded, it is
 * loaded now; if no journals exist, the user is redirected to the create-journal
 * page.
 * 
 * Apply this guard to routes that should only be accessible to authenticated users.
 */
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const controller = inject(Controller);
  const modelService = inject(ModelService);

  console.debug('[AUTH GUARD] Checking authentication for route:', state.url);

  if (!authService.isAuthenticated()) {
    console.debug('[AUTH GUARD] User is NOT authenticated, redirecting to signed-out page');
    router.navigate(['/signed-out']);
    return false;
  }

  if (modelService.journals$().length === 0) {
    try {
      const journals = await controller.listJournals();
      if (journals.length === 0) {
        console.debug('[AUTH GUARD] No journals found, redirecting to create-journal page');
        router.navigate(['/create-journal']);
        return false;
      }
    } catch (err) {
      console.error('[AUTH GUARD] Failed to load journals:', err);
      return false;
    }
  }

  console.debug('[AUTH GUARD] User is authenticated and journals are ready, allowing access');
  return true;
};
