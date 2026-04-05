import { test, expect } from '@playwright/test';
import * as signedOutPage from '../pages/signed-out.page';
import * as authSignInPage from '../pages/auth-signin.page';
import * as authApprovalPage from '../pages/auth-approval.page';
import * as headerPage from '../pages/header.page';
import * as settingsPage from '../pages/settings.page';
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
    
    // Navigate to the application
    console.log('Navigating to application...');
    await page.goto('/');
    
    // Verify we're on the signed-out page
    await signedOutPage.waitForSignedOutPage(page);
    await signedOutPage.verifySignedOutPage(page);
    
    // Click the "Sign In" button
    await signedOutPage.clickSignIn(page);
    
    // Wait for redirect to auth provider and verify the sign-in page
    await authSignInPage.waitForAuthSignInPage(page);
    await authSignInPage.verifyAuthSignInPage(page);
    
    // Sign in with test credentials
    await authSignInPage.signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    
    // Wait for the approval page and approve the application
    await authApprovalPage.waitForAuthApprovalPage(page);
    await authApprovalPage.verifyAuthApprovalPage(page);
    await authApprovalPage.approveApplication(page, true);
    
    // Wait for redirect back to the application
    console.log('Waiting for redirect back to application...');
    await page.waitForURL(/http:\/\/localhost:8083/, { timeout: 10000 });
    
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
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      
      // Perform sign-in flow
      await signedOutPage.waitForSignedOutPage(page);
      await signedOutPage.clickSignIn(page);
      await authSignInPage.waitForAuthSignInPage(page);
      await authSignInPage.signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await authApprovalPage.waitForAuthApprovalPage(page);
      await authApprovalPage.approveApplication(page, true);
      await page.waitForURL(/http:\/\/localhost:8083/, { timeout: 10000 });
      
      console.log('Authentication complete');
    }
    
    await headerPage.waitForHeader(page);
    
    let deletedCount = 0;
    let hasMoreJournals = true;
    
    // Keep deleting until no more test journals are found
    while (hasMoreJournals) {
      // Get all journal options from the select
      const journalSelector = page.locator('#journal-select');
      const journalOptions = await journalSelector.locator('option').allTextContents();
      
      // Find a test journal (there might be multiple with the same name)
      const testJournalOption = journalOptions.find(option => option.includes(TEST_JOURNAL_NAME));
      
      if (testJournalOption) {
        console.log(`Found test journal: "${testJournalOption}", deleting it...`);
        
        // Select the test journal
        await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
        
        // Wait a moment for any navigation triggered by journal selection
        await page.waitForLoadState('networkidle');
        
        // Navigate to settings page using the header link
        await headerPage.clickSettingsLink(page);
        await settingsPage.waitForSettingsPage(page);
        
        // Delete the journal
        await settingsPage.deleteJournal(page, TEST_JOURNAL_NAME);
        
        deletedCount++;
        console.log(`Test journal deleted (${deletedCount} total deleted)`);
        
        // Navigate back to home to check for more journals
        await page.goto('/');
        await headerPage.waitForHeader(page);
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
