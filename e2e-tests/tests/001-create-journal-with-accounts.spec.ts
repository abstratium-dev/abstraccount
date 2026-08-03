import { test, expect } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as createJournalPage from '../pages/create-journal.page';
import * as accountsPage from '../pages/accounts.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_JOURNAL_CURRENCY, TEST_JOURNAL_SUBTITLE, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 1: Create Journal with Account Tree
 *
 * This test implements the test case from:
 * docs/test-cases/001-create-journal-with-accounts.md
 *
 * It creates a new journal (which automatically adds a starter chart of
 * accounts) and then adds the additional accounts that the starter chart
 * does not include but that later tests depend on.
 */

test.describe('Journal and Account Management', () => {
  test('should create a new journal with Swiss chart of accounts', async ({ page }) => {
    console.log('=== Starting Test 1: Create Journal with Accounts ===');

    // Navigate to the application
    await page.goto('/');

    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }

    // Ensure we're signed in
    await headerPage.waitForHeader(page);

    // ========================================================================
    // Step 1: Create the journal
    // ========================================================================
    console.log('--- Step 1: Creating Journal ---');

    // Select "Create New Journal" from the dropdown
    await headerPage.selectCreateNewJournal(page);

    // Wait for the create journal page
    await createJournalPage.waitForCreateJournalPage(page);

    // Create the journal
    await createJournalPage.createJournal(
      page,
      TEST_JOURNAL_NAME,
      TEST_JOURNAL_CURRENCY,
      TEST_JOURNAL_SUBTITLE
    );

    // Click "View Journal" to go to the journal
    await createJournalPage.clickViewJournal(page);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    console.log('Journal created successfully');

    // ========================================================================
    // Step 2: Navigate to Accounts page
    // ========================================================================
    console.log('--- Step 2: Navigating to Accounts ---');

    await headerPage.clickAccountsLink(page);
    await accountsPage.waitForAccountsPage(page);
    await accountsPage.verifyAccountsPage(page);

    // ========================================================================
    // Step 3: Create additional accounts not in the starter chart
    // ========================================================================
    // The journal creation automatically adds a starter chart of accounts
    // (1 Assets, 2 Equity, 2 Liabilities, 3 Revenue, 4/5/6/8 Expenses, etc.).
    // We only need to create the additional accounts that the starter chart
    // does not include and that later tests depend on.
    console.log('--- Step 3: Creating Additional Accounts ---');

    // 1230 Goods held for resale (child of 120 Inventories)
    await accountsPage.createChildAccount(
      page,
      '120 Inventories',
      '1230 Goods held for resale',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '1230');

    // 2200 VAT payable (child of 220 Other short-term liabilities)
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2200 VAT payable',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2200');

    // 2201 VAT settlement (child of 220 Other short-term liabilities)
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2201 VAT settlement',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2201');

    // 2206 Withholding tax payable (child of 220 Other short-term liabilities)
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2206 Withholding tax payable',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2206');

    // 6570.001 Microsoft (child of 6570 IT and computing expenses)
    await accountsPage.createChildAccount(
      page,
      '6570 IT and computing expenses',
      '6570.001 Microsoft',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6570.001');

    // 6570.002 Anthropic (child of 6570 IT and computing expenses)
    await accountsPage.createChildAccount(
      page,
      '6570 IT and computing expenses',
      '6570.002 Anthropic',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6570.002');

    // 8910 Taxes from prior periods (child of 8 Non-operating expenses)
    await accountsPage.createChildAccount(
      page,
      '8 Non-operating expenses',
      '8910 Taxes from prior periods',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '8910');

    console.log('Additional accounts created');

    // ========================================================================
    // Step 4: Verify the complete account tree
    // ========================================================================
    console.log('--- Step 4: Verifying Complete Account Tree ---');

    // Verify Assets (from starter chart)
    await accountsPage.verifyAccountExists(page, '1');
    await accountsPage.verifyAccountExists(page, '10');
    await accountsPage.verifyAccountExists(page, '100');
    await accountsPage.verifyAccountExists(page, '1000');
    await accountsPage.verifyAccountExists(page, '1020');
    await accountsPage.verifyAccountExists(page, '110');
    await accountsPage.verifyAccountExists(page, '1100');
    await accountsPage.verifyAccountExists(page, '120');
    await accountsPage.verifyAccountExists(page, '1230');

    // Verify Liabilities (from starter chart)
    await accountsPage.verifyAccountExists(page, '2', 'Liabilities');
    await accountsPage.verifyAccountExists(page, '20');
    await accountsPage.verifyAccountExists(page, '200');
    await accountsPage.verifyAccountExists(page, '2000');
    await accountsPage.verifyAccountExists(page, '220');
    await accountsPage.verifyAccountExists(page, '2200');
    await accountsPage.verifyAccountExists(page, '2201');
    await accountsPage.verifyAccountExists(page, '2206');
    await accountsPage.verifyAccountExists(page, '2208');
    await accountsPage.verifyAccountExists(page, '2210');
    await accountsPage.verifyAccountExists(page, '2210.001');

    // Verify Equity (from starter chart)
    await accountsPage.verifyAccountExists(page, '2', 'Equity');
    await accountsPage.verifyAccountExists(page, '28');
    await accountsPage.verifyAccountExists(page, '280');
    await accountsPage.verifyAccountExists(page, '2800');
    await accountsPage.verifyAccountExists(page, '290');
    await accountsPage.verifyAccountExists(page, '2950');
    await accountsPage.verifyAccountExists(page, '2970');
    await accountsPage.verifyAccountExists(page, '2979');

    // Verify Revenue (from starter chart)
    await accountsPage.verifyAccountExists(page, '3');
    await accountsPage.verifyAccountExists(page, '3400');

    // Verify Operating Expenses (from starter chart + additional)
    await accountsPage.verifyAccountExists(page, '6');
    await accountsPage.verifyAccountExists(page, '6500');
    await accountsPage.verifyAccountExists(page, '6570');
    await accountsPage.verifyAccountExists(page, '6570.001');
    await accountsPage.verifyAccountExists(page, '6570.002');
    await accountsPage.verifyAccountExists(page, '6700');
    await accountsPage.verifyAccountExists(page, '6900');

    // Verify Non-Operational Expenses (from starter chart + additional)
    await accountsPage.verifyAccountExists(page, '8');
    await accountsPage.verifyAccountExists(page, '8900');
    await accountsPage.verifyAccountExists(page, '8910');

    console.log('All accounts verified successfully');

    console.log('=== Test 1 Complete: Journal and Accounts Created Successfully ===');
  });
});
