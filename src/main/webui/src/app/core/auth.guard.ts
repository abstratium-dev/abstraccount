import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Authentication guard that protects routes requiring user authentication.
 * 
 * If the user is not authenticated, they are redirected to the signed-out page.
 * 
 * Apply this guard to routes that should only be accessible to authenticated users.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.debug('[AUTH GUARD] Checking authentication for route:', state.url);
  
  if (authService.isAuthenticated()) {
    console.debug('[AUTH GUARD] User is authenticated, allowing access');
    return true;
  }

  console.debug('[AUTH GUARD] User is NOT authenticated, redirecting to signed-out page');
  router.navigate(['/signed-out']);
  return false;
};
