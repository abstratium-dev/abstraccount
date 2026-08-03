import { test, expect } from '@playwright/test';
import * as landingPage from '../pages/landing.page';
import * as headerPage from '../pages/header.page';
import * as journalManagementPage from '../pages/journal-management.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 0: Setup - Sign In and Clean Environment
 *
 * This test sets up the environment by:
 * 1. Signing in to the application
 * 2. Deleting any existing test journals to ensure a clean state
 *
 * It should be run first before all other tests.
 */

test.describe('Setup: Authentication and Environment', () => {
  test('should sign in', async ({ page }) => {
    console.log('=== Starting Test 0: Setup ===');

    // ========================================================================
    // Part 1: Authentication
    // ========================================================================
    console.log('--- Part 1: Authentication ---');

    // Navigate to the application (landing page, public)
    console.log('Navigating to application...');
    await page.goto('/');

    // Verify we're on the landing page and not yet signed in
    await landingPage.waitForLandingPage(page);
    await landingPage.verifyLandingPageSignedOut(page);

    // Perform the full OIDC sign-in flow (handles login form + approval)
    await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);

    // Verify we're signed in by checking the header
    await headerPage.waitForHeader(page);
    await headerPage.verifySignedIn(page);

    console.log('Authentication complete');
  });

  test('clean up existing test journals', async ({ page }) => {
    console.log('=== Starting cleanup of existing test journals ===');

    // Navigate to the home page
    await page.goto('/');

    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);

    // After sign-in the SPA redirects client-side: to /create-journal when the
    // database is empty, or to a journal-related page when journals exist.
    // Wait for one of the two destination indicators to appear rather than
    // checking the URL (which may still be the transient /signed-in route).
    const createJournalHeading = page.getByRole('heading', { name: /^Start Your Books$/i });
    const journalManagementHeading = page.getByRole('heading', { name: /^Journal Management$/i });
    const journalLink = page.locator('#journal');

    // The auth guard will redirect to /create-journal when there are no
    // journals. In that case there is nothing to clean up.
    const landedOnCreateJournal = await createJournalHeading.isVisible({ timeout: 10000 }).catch(() => false);
    if (landedOnCreateJournal) {
      console.log('Landed on /create-journal — no journals exist, nothing to clean up');
      console.log('=== Cleanup complete: Environment ready for testing ===');
      return;
    }

    // Otherwise we should be on a page with the header navigation links. Wait
    // for the journal link to be visible, then navigate to journal management
    // directly via URL (more reliable than clicking through the menu).
    await expect(journalLink).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    // The journal selector dropdown now lives on the Journal Management page,
    // so navigate there once before the cleanup loop.
    await page.goto('/journal-management');
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await journalManagementPage.waitForJournalManagementPage(page);

    let deletedCount = 0;
    let hasMoreJournals = true;

    // Keep deleting until no more test journals are found
    while (hasMoreJournals) {
      // Get all journal options from the select on the Journal Management page
      const journalSelector = page.locator('#journal-select');
      const journalOptions = await journalSelector.locator('option').allTextContents();

      // Find a test journal (there might be multiple with the same name)
      const testJournalOption = journalOptions.find(option => option.includes(TEST_JOURNAL_NAME));

      if (testJournalOption) {
        console.log(`Found test journal: "${testJournalOption}", deleting it...`);

        // Select the test journal (we are already on the Journal Management page)
        await headerPage.selectJournalOnManagementPage(page, TEST_JOURNAL_NAME);

        // Delete the journal (the danger zone is on this same page)
        await journalManagementPage.deleteJournal(page, TEST_JOURNAL_NAME);

        deletedCount++;
        console.log(`Test journal deleted (${deletedCount} total deleted)`);

        // After deletion the app navigates to '/'. The auth guard will then
        // redirect to /create-journal if no journals remain, or back to a
        // journal-related page if journals still exist. Wait for the page to
        // stabilise before checking which destination we landed on.
        await page.waitForLoadState('networkidle').catch(() => undefined);
        const createJournalHeading = page.getByRole('heading', { name: /^Start Your Books$/i });
        const journalLink = page.locator('#journal');
        const landedOnCreateJournal = await createJournalHeading.isVisible({ timeout: 5000 }).catch(() => false);
        if (landedOnCreateJournal) {
          console.log('No journals remaining after deletion, exiting cleanup loop');
          hasMoreJournals = false;
        } else {
          // Wait for the journal link to be visible before navigating
          await expect(journalLink).toBeVisible({ timeout: 10000 });
          await page.waitForLoadState('networkidle').catch(() => undefined);
          // Navigate to journal-management. The auth guard may redirect to
          // /create-journal if no journals remain (e.g. if the deletion just
          // removed the last one). In that case, exit the loop.
          await page.goto('/journal-management');
          await page.waitForLoadState('networkidle').catch(() => undefined);
          const redirectedToCreateJournal = await createJournalHeading.isVisible({ timeout: 5000 }).catch(() => false);
          if (redirectedToCreateJournal) {
            console.log('Redirected to /create-journal after navigation — no journals remain');
            hasMoreJournals = false;
          } else {
            await journalManagementPage.waitForJournalManagementPage(page);
          }
        }
      } else {
        // No more test journals found
        hasMoreJournals = false;
        console.log(`No more test journals found. Total deleted: ${deletedCount}`);
      }
    }

    if (deletedCount === 0) {
      console.log('No existing test journals found, environment is clean');
    }

    console.log('=== Cleanup complete: Environment ready for testing ===');
  });
});
