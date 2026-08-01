import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Landing page (public, no auth required).
 *
 * The root path "/" renders the LandingComponent. When the user is not signed
 * in, it shows a "Sign In" button that triggers the OIDC flow by navigating
 * the browser to /api/auth/login.
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the main heading "Abstraccount™"
 */
function getHeading(page: Page) {
  return page.getByRole('heading', { name: /^Abstraccount™$/i });
}

/**
 * Gets the "Sign In" button shown when the user is not authenticated.
 * The landing page renders <button (click)="signIn()">Sign In</button>.
 */
function getSignInButton(page: Page) {
  return page.getByRole('button', { name: /^Sign In$/i });
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the landing page to be visible.
 */
export async function waitForLandingPage(page: Page) {
  console.log('Waiting for landing page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Landing page is visible');
}

/**
 * Clicks the "Sign In" button on the landing page to initiate the OIDC flow.
 * This causes a full browser navigation to /api/auth/login.
 */
export async function clickSignIn(page: Page) {
  console.log('Clicking Sign In button on landing page...');
  const signInButton = getSignInButton(page);
  await expect(signInButton).toBeVisible({ timeout: 10000 });
  await signInButton.click();
  console.log('Sign In button clicked');
}

/**
 * Verifies that the landing page is displayed correctly and the user is not
 * signed in (the Sign In button is visible).
 */
export async function verifyLandingPageSignedOut(page: Page) {
  console.log('Verifying landing page (signed out)...');
  await expect(getHeading(page)).toBeVisible();
  await expect(getSignInButton(page)).toBeVisible();
  console.log('Landing page verified (signed out)');
}
