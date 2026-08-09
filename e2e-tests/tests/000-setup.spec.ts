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

    // List all journals via the API so we can unlock locked ones before deleting.
    // The backend refuses to delete a locked journal (returns 423), so we must
    // unlock first. We also clean up "Abstratium 2025" (created by test 009)
    // in addition to "Abstratium 2024".
    const JOURNAL_TITLES_TO_CLEAN = [TEST_JOURNAL_NAME, 'Abstratium 2025'];

    console.log('--- Fetching journal list via API ---');
    const journalsResponse = await page.request.get('/api/journal/list');
    if (!journalsResponse.ok()) {
      throw new Error(`Failed to list journals: ${journalsResponse.status()}`);
    }
    const allJournals: Array<{ id: string; title: string; locked: boolean; previousJournalId: string | null }> = await journalsResponse.json();
    const journalsToDelete = allJournals.filter(j => JOURNAL_TITLES_TO_CLEAN.includes(j.title));
    // Sort so that journals with a previousJournalId (follow-on years) are
    // deleted first. This avoids foreign-key constraint violations when the
    // referenced (parent) journal is deleted before the referencing child.
    journalsToDelete.sort((a, b) => {
      if (a.previousJournalId && !b.previousJournalId) return -1;
      if (!a.previousJournalId && b.previousJournalId) return 1;
      return 0;
    });
    console.log(`Found ${journalsToDelete.length} journal(s) to delete: ${journalsToDelete.map(j => `"${j.title}"`).join(', ')}`);

    // Unlock all locked journals first, then delete in order. If a deletion
    // fails (e.g. because of an unexpected dependency), retry it after the
    // others have been deleted — the dependency may have been removed.
    for (const journal of journalsToDelete) {
      if (journal.locked) {
        console.log(`  Unlocking journal: "${journal.title}" (id: ${journal.id})`);
        const unlockResponse = await page.request.post(`/api/journal/${journal.id}/unlock`);
        if (!unlockResponse.ok()) {
          throw new Error(`Failed to unlock journal "${journal.title}": ${unlockResponse.status()}`);
        }
        console.log('  Journal unlocked');
      }
    }

    let remaining = [...journalsToDelete];
    let deletedCount = 0;
    for (let attempt = 0; attempt < 3 && remaining.length > 0; attempt++) {
      const failed: typeof remaining = [];
      for (const journal of remaining) {
        console.log(`  Deleting journal: "${journal.title}" (id: ${journal.id}, previousJournalId: ${journal.previousJournalId ?? 'none'})`);
        const deleteResponse = await page.request.delete(`/api/journal/${journal.id}`);
        if (deleteResponse.ok()) {
          console.log('  Journal deleted');
          deletedCount++;
        } else {
          const body = await deleteResponse.text().catch(() => '<no body>');
          console.log(`  Delete failed: ${deleteResponse.status()} — ${body}`);
          failed.push(journal);
        }
      }
      remaining = failed;
    }
    if (remaining.length > 0) {
      throw new Error(`Failed to delete ${remaining.length} journal(s): ${remaining.map(j => `"${j.title}"`).join(', ')}`);
    }

    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} journal(s)`);
    } else {
      console.log('No existing test journals found, environment is clean');
    }

    // Clear the selected journal ID from localStorage so that subsequent tests
    // start fresh. If the old journal ID remains, the SPA tries to load a
    // deleted journal on the next page.goto('/') and gets stuck instead of
    // redirecting to /create-journal.
    await page.evaluate(() => localStorage.removeItem('journalId'));
    console.log('Cleared journalId from localStorage');

    console.log('=== Cleanup complete: Environment ready for testing ===');
  });
});
