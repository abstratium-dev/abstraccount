import { Page } from '@playwright/test';
import * as landingPage from '../pages/landing.page';

/**
 * Shared authentication helper for e2e tests.
 *
 * The auth flow is:
 *  1. Navigate to "/" (landing page, public).
 *  2. Click "Sign In" → browser navigates to /api/auth/login.
 *  3. Quarkus OIDC redirects to the external auth server.
 *  4. The auth server may show:
 *     a. A login form (if no existing session) → fill credentials, submit.
 *     b. An approval/consent page (if session exists but app not approved).
 *     c. Redirect straight back to the app (if session + approval exist).
 *  5. After authentication, Quarkus redirects to /signed-in which restores
 *     the last visited route.
 *
 * This helper handles all three auth-server outcomes robustly using
 * Promise.race, avoiding timeouts when a step is skipped.
 */

/**
 * The cookie notice overlay intercepts pointer events until dismissed, which
 * blocks any click on the landing page (including "Sign In"). The notice is
 * shown when localStorage key "cookieNoticeAccepted" is not "true".
 *
 * This dismisses the cookie notice if present by clicking "Got it!". It is
 * safe to call even when the notice is not visible.
 */
export async function dismissCookieNotice(page: Page): Promise<void> {
  const gotItButton = page.getByRole('button', { name: /^Got it!$/i });
  const visible = await gotItButton.isVisible({ timeout: 2000 }).catch(() => false);
  if (visible) {
    console.log('[AuthHelper] Cookie notice detected, dismissing');
    await gotItButton.click();
    await page.waitForTimeout(300);
    console.log('[AuthHelper] Cookie notice dismissed');
  }
}

/**
 * Handle the auth server states after triggering the OIDC flow.
 * Handles three possible states:
 *  1. Auth server shows a login form  → fill credentials, then maybe consent
 *  2. Auth server shows consent only  → click Approve
 *  3. App redirected straight back    → nothing extra needed
 */
export async function handleAuthServer(page: Page, email: string, password: string): Promise<void> {
  const emailField = page.getByRole('textbox', { name: /email/i });
  const approveBtn = page.getByRole('button', { name: 'Approve' });

  // Match http://localhost (the app's URL) but NOT the auth server's
  // authorize URL, which contains "localhost" inside the redirect_uri
  // query parameter (e.g. redirect_uri=http%3A%2F%2Flocalhost%3A8083).
  const appUrl = /^http:\/\/localhost/;

  console.log('[AuthHelper] Waiting for auth server response (login form, approval, or redirect)...');

  // Wait for any of the three outcomes
  await Promise.race([
    emailField.waitFor({ state: 'visible', timeout: 15000 }),
    approveBtn.waitFor({ state: 'visible', timeout: 15000 }),
    page.waitForURL(appUrl, { timeout: 15000 }),
  ]);

  console.log(`[AuthHelper] URL after trigger: ${page.url()}`);

  // Outcome 1: login form detected
  if (await emailField.isVisible().catch(() => false)) {
    console.log('[AuthHelper] Login form detected, filling credentials');
    await emailField.fill(email);
    await page.getByRole('textbox', { name: /password/i }).fill(password);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    // After login, approval page may appear
    await approveBtn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null);
  }

  // Outcome 2: approval/consent page detected (either initially or after login)
  if (await approveBtn.isVisible().catch(() => false)) {
    console.log('[AuthHelper] Consent screen detected, approving');
    await approveBtn.click();
    await page.waitForURL(appUrl, { timeout: 15000 });
  } else {
    console.log('[AuthHelper] No consent screen, already back on app');
  }

  console.log(`[AuthHelper] Complete, URL: ${page.url()}`);
}

/**
 * Full sign-in flow: navigate to landing page, click Sign In, handle auth
 * server, and wait for redirect back to the app.
 *
 * @param page - Playwright page
 * @param email - test user email
 * @param password - test user password
 */
export async function authenticate(page: Page, email: string, password: string): Promise<void> {
  console.log(`[AuthHelper] Starting authentication for ${email}`);

  // We should already be on the landing page (caller did page.goto('/'))
  await landingPage.waitForLandingPage(page);

  // The cookie notice overlay intercepts pointer events and blocks clicks.
  // Dismiss it before attempting to click "Sign In".
  await dismissCookieNotice(page);

  await landingPage.clickSignIn(page);

  // Handle the auth server (login form / approval / direct redirect)
  await handleAuthServer(page, email, password);

  // Wait for the app to load after redirect
  await page.waitForURL(/^http:\/\/localhost/, { timeout: 15000 });

  // After OIDC redirect, the SPA lands on /signed-in which has an empty
  // template. SignedInComponent.ngOnInit then redirects to the last route
  // (or '/'). Wait for that redirect and any subsequent API calls to settle
  // so callers don't interact with a blank or partially-rendered page.
  await page.waitForLoadState('networkidle').catch(() => undefined);

  console.log('[AuthHelper] Authentication complete');
}
