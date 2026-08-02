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

    // The journal selector dropdown now lives on the Journal Management page,
    // so navigate there once before the cleanup loop.
    await headerPage.goToJournalManagementPage(page);
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

        // After deletion the app navigates to '/'; go back to the Journal
        // Management page to check for more test journals.
        await headerPage.goToJournalManagementPage(page);
        await journalManagementPage.waitForJournalManagementPage(page);
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
