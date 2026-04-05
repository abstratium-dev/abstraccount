import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Auth Provider Sign-In page
 * This is the external authentication provider page (auth-t.abstratium.dev)
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the email textbox
 */
function getEmailTextbox(page: Page) {
  return page.getByRole('textbox', { name: /Email/i });
}

/**
 * Gets the password textbox
 */
function getPasswordTextbox(page: Page) {
  return page.getByRole('textbox', { name: /Password/i });
}

/**
 * Gets the "Sign in" button
 */
function getSignInButton(page: Page) {
  return page.getByRole('button', { name: /^Sign in$/i });
}

/**
 * Gets the heading "Sign in"
 */
function getHeading(page: Page) {
  return page.getByRole('heading', { name: /^Sign in$/i });
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the auth provider sign-in page to be visible
 */
export async function waitForAuthSignInPage(page: Page) {
  console.log('Waiting for auth provider sign-in page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Auth provider sign-in page is visible');
}

/**
 * Fills in the email field
 */
export async function fillEmail(page: Page, email: string) {
  console.log(`Filling email: ${email}`);
  const emailField = getEmailTextbox(page);
  await expect(emailField).toBeVisible({ timeout: 10000 });
  await emailField.fill(email);
  console.log('Email filled');
}

/**
 * Fills in the password field
 */
export async function fillPassword(page: Page, password: string) {
  console.log('Filling password...');
  const passwordField = getPasswordTextbox(page);
  await expect(passwordField).toBeVisible({ timeout: 10000 });
  await passwordField.fill(password);
  console.log('Password filled');
}

/**
 * Clicks the sign-in button
 */
export async function clickSignInButton(page: Page) {
  console.log('Clicking sign-in button...');
  const signInButton = getSignInButton(page);
  await expect(signInButton).toBeVisible({ timeout: 10000 });
  await signInButton.click();
  console.log('Sign-in button clicked');
}

/**
 * Complete sign-in flow on the auth provider page
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 */
export async function signIn(page: Page, email: string, password: string) {
  console.log(`Signing in as ${email}...`);
  await waitForAuthSignInPage(page);
  await fillEmail(page, email);
  await fillPassword(page, password);
  await clickSignInButton(page);
  console.log('Sign-in form submitted');
}

/**
 * Verifies that the auth sign-in page is displayed correctly
 */
export async function verifyAuthSignInPage(page: Page) {
  console.log('Verifying auth sign-in page...');
  await expect(getHeading(page)).toBeVisible();
  await expect(getEmailTextbox(page)).toBeVisible();
  await expect(getPasswordTextbox(page)).toBeVisible();
  await expect(getSignInButton(page)).toBeVisible();
  console.log('Auth sign-in page verified');
}
