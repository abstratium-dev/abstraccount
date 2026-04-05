import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Signed Out page
 * This page is shown when the user needs to sign in to access the application
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the "Sign In" button
 */
function getSignInButton(page: Page) {
  return page.getByRole('button', { name: /Sign In/i });
}

/**
 * Gets the heading "Sign In Required"
 */
function getHeading(page: Page) {
  return page.getByRole('heading', { name: /Sign In Required/i });
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the signed-out page to be visible
 */
export async function waitForSignedOutPage(page: Page) {
  console.log('Waiting for signed-out page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Signed-out page is visible');
}

/**
 * Clicks the "Sign In" button to initiate the authentication flow
 * This will redirect to the external auth provider
 */
export async function clickSignIn(page: Page) {
  console.log('Clicking Sign In button...');
  const signInButton = getSignInButton(page);
  await expect(signInButton).toBeVisible({ timeout: 10000 });
  await signInButton.click();
  console.log('Sign In button clicked');
}

/**
 * Verifies that the signed-out page is displayed correctly
 */
export async function verifySignedOutPage(page: Page) {
  console.log('Verifying signed-out page...');
  await expect(getHeading(page)).toBeVisible();
  await expect(getSignInButton(page)).toBeVisible();
  await expect(page.getByText(/You need to sign in to access this application/i)).toBeVisible();
  console.log('Signed-out page verified');
}
