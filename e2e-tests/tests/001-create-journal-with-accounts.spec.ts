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
 * It creates a new journal and establishes a complete account tree structure
 * following Swiss accounting standards (Swiss GAAP FER).
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
    // Step 3: Create Assets hierarchy
    // ========================================================================
    console.log('--- Step 3: Creating Assets Hierarchy ---');
    
    // Create root account: 1 Assets
    await accountsPage.createRootAccount(
      page,
      '1 Assets',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '1');
    
    // Create child: 10 Current Assets
    await accountsPage.createChildAccount(
      page,
      '1 Assets',
      '10 Current Assets',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '10');

    // Create child: 100 Cash and cash equivalents
    await accountsPage.createChildAccount(
      page,
      '10 Current Assets',
      '100 Cash and cash equivalents',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '100');

    // Create child: 1000 Cash
    await accountsPage.createChildAccount(
      page,
      '100 Cash and cash equivalents',
      '1000 Cash',
      'CASH'
    );
    await accountsPage.verifyAccountExists(page, '1000');

    // Create child: 1020 Bank Account
    await accountsPage.createChildAccount(
      page,
      '100 Cash and cash equivalents',
      '1020 Bank Account',
      'CASH'
    );
    await accountsPage.verifyAccountExists(page, '1020');

    // Create child: 110 Accounts Receivable
    await accountsPage.createChildAccount(
      page,
      '10 Current Assets',
      '110 Accounts Receivable',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '110');

    // Create child: 1100 Accounts receivable (Debtors)
    await accountsPage.createChildAccount(
      page,
      '110 Accounts Receivable',
      '1100 Accounts receivable (Debtors)',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '1100');

    // Create child: 120 Inventories and non-invoiced services
    await accountsPage.createChildAccount(
      page,
      '10 Current Assets',
      '120 Inventories and non-invoiced services',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '120');

    // Create child: 1230 Goods held for resale
    await accountsPage.createChildAccount(
      page,
      '120 Inventories and non-invoiced services',
      '1230 Goods held for resale',
      'ASSET'
    );
    await accountsPage.verifyAccountExists(page, '1230');
    
    console.log('Assets hierarchy created');
    
    // ========================================================================
    // Step 4: Create Liabilities hierarchy
    // ========================================================================
    console.log('--- Step 4: Creating Liabilities Hierarchy ---');
    
    // Create root account: 2 Liabilities
    await accountsPage.createRootAccount(
      page,
      '2 Liabilities',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2', 'Liabilities');
    
    // Create child: 20 Current liabilities
    await accountsPage.createChildAccount(
      page,
      '2 Liabilities',
      '20 Current liabilities',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '20');

    // Create child: 200 Accounts payable (A/P)
    await accountsPage.createChildAccount(
      page,
      '20 Current liabilities',
      '200 Accounts payable (A/P)',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '200');

    // Create child: 2000 Accounts payable (suppliers & creditors)
    await accountsPage.createChildAccount(
      page,
      '200 Accounts payable (A/P)',
      '2000 Accounts payable (suppliers & creditors)',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2000');

    // Create child: 220 Other short-term liabilities
    await accountsPage.createChildAccount(
      page,
      '20 Current liabilities',
      '220 Other short-term liabilities',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '220');

    // Create child: 2200 VAT payable
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2200 VAT payable',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2200');

    // Create child: 2201 VAT settlement
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2201 VAT settlement',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2201');

    // Create child: 2206 Withholding tax payable
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2206 Withholding tax payable',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2206');

    // Create child: 2208 Tax liabilities (provisions)
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2208 Tax liabilities (provisions)',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2208');

    // Create child: 2210 Other short-term liabilities
    await accountsPage.createChildAccount(
      page,
      '220 Other short-term liabilities',
      '2210 Other short-term liabilities',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2210');

    // Create child: 2210.001 John Smith
    await accountsPage.createChildAccount(
      page,
      '2210 Other short-term liabilities',
      '2210.001 John Smith',
      'LIABILITY'
    );
    await accountsPage.verifyAccountExists(page, '2210.001');
    
    console.log('Liabilities hierarchy created');
    
    // ========================================================================
    // Step 5: Create Equity hierarchy (separate root: 2 Equity)
    // ========================================================================
    console.log('--- Step 5: Creating Equity Hierarchy ---');
    
    // Create root account: 2 Equity (same code as 2 Liabilities per Swiss SME practice)
    await accountsPage.createRootAccount(
      page,
      '2 Equity',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '2', 'Equity');
    
    // Create child: 28 Shareholders Equity
    await accountsPage.createChildAccount(
      page,
      '2 Equity',
      '28 Shareholders Equity (legal entities)',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '28');

    // Create child: 280 Basic, shareholder or foundation capital
    await accountsPage.createChildAccount(
      page,
      '28 Shareholders Equity (legal entities)',
      '280 Basic, shareholder or foundation capital',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '280');

    // Create child: 2800 Basic, shareholder or foundation capital (detail)
    await accountsPage.createChildAccount(
      page,
      '280 Basic, shareholder or foundation capital',
      '2800 Basic, shareholder or foundation capital',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '2800');

    // Create child: 290 Reserves and retained earnings
    await accountsPage.createChildAccount(
      page,
      '2 Equity',
      '290 Reserves and retained earnings, own capital shares and disposable profit',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '290');

    // Create child: 2950 Legal reserves from profit
    await accountsPage.createChildAccount(
      page,
      '290 Reserves and retained earnings',
      '2950 Legal reserves from profit',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '2950');

    // Create child: 2970 Profit carried forward or loss carried forward
    await accountsPage.createChildAccount(
      page,
      '290 Reserves and retained earnings',
      '2970 Profit carried forward or loss carried forward',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '2970');

    // Create child: 2979 Annual profit or loss
    await accountsPage.createChildAccount(
      page,
      '290 Reserves and retained earnings',
      '2979 Annual profit or loss',
      'EQUITY'
    );
    await accountsPage.verifyAccountExists(page, '2979');
    
    console.log('Equity hierarchy created');
    
    // ========================================================================
    // Step 6: Create Operating Expenses hierarchy
    // ========================================================================
    console.log('--- Step 6: Creating Operating Expenses Hierarchy ---');
    
    // Create root account: 6 Operating Expenses
    await accountsPage.createRootAccount(
      page,
      '6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6');
    
    // Create child: 6500 Administrative expenses
    await accountsPage.createChildAccount(
      page,
      '6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result',
      '6500 Administrative expenses',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6500');

    // Create child: 6570 IT and computing expenses
    await accountsPage.createChildAccount(
      page,
      '6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result',
      '6570 IT and computing expenses, including leasing',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6570');

    // Create child: 6570.001 Microsoft
    await accountsPage.createChildAccount(
      page,
      '6570 IT and computing expenses, including leasing',
      '6570.001 Microsoft',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6570.001');

    // Create child: 6570.002 Anthropic
    await accountsPage.createChildAccount(
      page,
      '6570 IT and computing expenses, including leasing',
      '6570.002 Anthropic',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6570.002');

    // Create child: 6700 Other operating expenses
    await accountsPage.createChildAccount(
      page,
      '6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result',
      '6700 Other operating expenses',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6700');

    // Create child: 6900 Financial expense
    await accountsPage.createChildAccount(
      page,
      '6 Other Operating Expenses, Depreciations and Value Adjustments, Financial result',
      '6900 Financial expense',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '6900');
    
    console.log('Operating Expenses hierarchy created');
    
    // ========================================================================
    // Step 7: Create Non-Operational Expenses hierarchy
    // ========================================================================
    console.log('--- Step 7: Creating Non-Operational Expenses Hierarchy ---');
    
    // Create root account: 8 Non-Operational Expenses
    await accountsPage.createRootAccount(
      page,
      '8 Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '8');
    
    // Create child: 8900 Direct taxes
    await accountsPage.createChildAccount(
      page,
      '8 Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income',
      '8900 Direct taxes (legal entities)',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '8900');

    // Create child: 8910 Taxes from prior periods
    await accountsPage.createChildAccount(
      page,
      '8 Non-Operational, Extraordinary, Non-Recurring or Prior-Period Expenses and Income',
      '8910 Taxes from prior periods',
      'EXPENSE'
    );
    await accountsPage.verifyAccountExists(page, '8910');
    
    console.log('Non-Operational Expenses hierarchy created');

    // ========================================================================
    // Step 8: Create Revenue hierarchy
    // ========================================================================
    console.log('--- Step 8: Creating Revenue Hierarchy ---');
    
    // Create root account: 3 Revenue
    await accountsPage.createRootAccount(
      page,
      '3 Net proceeds from sales of goods and services',
      'REVENUE'
    );
    await accountsPage.verifyAccountExists(page, '3');
    
    // Create child: 3400 Revenue from services
    await accountsPage.createChildAccount(
      page,
      '3 Net proceeds from sales of goods and services',
      '3400 Revenue from services',
      'REVENUE'
    );
    await accountsPage.verifyAccountExists(page, '3400');
    
    console.log('Revenue hierarchy created');
    
    // ========================================================================
    // Step 9: Verify the complete account tree
    // ========================================================================
    console.log('--- Step 9: Verifying Complete Account Tree ---');
    
    // Verify Assets
    await accountsPage.verifyAccountExists(page, '1');
    await accountsPage.verifyAccountExists(page, '10');
    await accountsPage.verifyAccountExists(page, '100');
    await accountsPage.verifyAccountExists(page, '1000');
    await accountsPage.verifyAccountExists(page, '1020');
    await accountsPage.verifyAccountExists(page, '110');
    await accountsPage.verifyAccountExists(page, '1100');
    await accountsPage.verifyAccountExists(page, '120');
    await accountsPage.verifyAccountExists(page, '1230');
    
    // Verify Liabilities
    await accountsPage.verifyAccountExists(page, '2', 'Liabilities');
    await accountsPage.verifyAccountExists(page, '20');
    await accountsPage.verifyAccountExists(page, '200');
    await accountsPage.verifyAccountExists(page, '2000');
    await accountsPage.verifyAccountExists(page, '220');
    await accountsPage.verifyAccountExists(page, '2200');
    await accountsPage.verifyAccountExists(page, '2201');
    await accountsPage.verifyAccountExists(page, '2206');
    await accountsPage.verifyAccountExists(page, '2208');

    // Verify Equity
    await accountsPage.verifyAccountExists(page, '2', 'Equity');
    await accountsPage.verifyAccountExists(page, '28');
    await accountsPage.verifyAccountExists(page, '280');
    await accountsPage.verifyAccountExists(page, '2800');
    await accountsPage.verifyAccountExists(page, '290');
    await accountsPage.verifyAccountExists(page, '2950');
    await accountsPage.verifyAccountExists(page, '2970');
    await accountsPage.verifyAccountExists(page, '2979');

    // Verify Revenue
    await accountsPage.verifyAccountExists(page, '3');
    await accountsPage.verifyAccountExists(page, '3400');

    // Verify Operating Expenses
    await accountsPage.verifyAccountExists(page, '6');
    await accountsPage.verifyAccountExists(page, '6500');
    await accountsPage.verifyAccountExists(page, '6570');
    await accountsPage.verifyAccountExists(page, '6570.001');
    await accountsPage.verifyAccountExists(page, '6570.002');
    await accountsPage.verifyAccountExists(page, '6700');
    await accountsPage.verifyAccountExists(page, '6900');

    // Verify Non-Operational Expenses
    await accountsPage.verifyAccountExists(page, '8');
    await accountsPage.verifyAccountExists(page, '8900');
    await accountsPage.verifyAccountExists(page, '8910');

    console.log('All 37 accounts verified successfully');
    
    console.log('=== Test 1 Complete: Journal and Accounts Created Successfully ===');
  });
});
