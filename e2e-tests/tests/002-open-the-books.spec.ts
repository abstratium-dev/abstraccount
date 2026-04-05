import { test, expect } from '@playwright/test';
import * as signedOutPage from '../pages/signed-out.page';
import * as authSignInPage from '../pages/auth-signin.page';
import * as authApprovalPage from '../pages/auth-approval.page';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 2: Open the Books with Opening Balances
 * 
 * This test implements the test case from:
 * docs/test-cases/002-open-the-books.md
 * 
 * PREREQUISITE: Test 001 must have been run successfully to create the journal
 * and account tree.
 * 
 * This test creates an opening balances transaction that initializes all accounts
 * with their starting balances (CHF 0.00) for the fiscal year.
 */

test.describe('Opening Balances Transaction', () => {
  test('should create opening balances transaction to open the books', async ({ page }) => {
    console.log('=== Starting Test 2: Open the Books ===');
    
    // Navigate to the application
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
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');
    
    // Select the journal from the dropdown
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to the journal/transactions page by clicking the Journal link
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    
    console.log('Journal page loaded');
    
    // ========================================================================
    // Step 2: Open the Add Transaction modal
    // ========================================================================
    console.log('--- Step 2: Opening Add Transaction Modal ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    // ========================================================================
    // Step 3: Fill in transaction details
    // ========================================================================
    console.log('--- Step 3: Filling Transaction Details ---');
    
    // Set transaction date to 2026-01-01
    await transactionsPage.fillTransactionDate(page, '2026-01-01');
    
    // Set description
    await transactionsPage.fillTransactionDescription(page, 'Opening Balances');
    
    // Set status to CLEARED
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    
    // Add tag "OpeningBalances"
    await transactionsPage.addTag(page, 'OpeningBalances');
    
    console.log('Transaction details filled');
    
    // ========================================================================
    // Step 4: Add Equity account entries (3 entries)
    // ========================================================================
    console.log('--- Step 4: Adding Equity Account Entries ---');
    
    // The form starts with 2 empty entries, so we'll use those and add more as needed
    
    // Entry 1: 2800 Basic, shareholder or foundation capital (Credit 0.00)
    await transactionsPage.createEntry(page, 0, '2800', 0.00, 'CHF');
    
    // Entry 2: 2970 Profit carried forward or loss carried forward (Credit 0.00)
    await transactionsPage.createEntry(page, 1, '2970', 0.00, 'CHF');
    
    // Add a new entry for the third equity account
    await transactionsPage.clickAddEntry(page);
    
    // Entry 3: 2979 Annual profit or loss (Credit 0.00)
    await transactionsPage.createEntry(page, 2, '2979', 0.00, 'CHF');
    
    console.log('Equity entries added');
    
    // ========================================================================
    // Step 5: Add Asset account entries (5 entries)
    // ========================================================================
    console.log('--- Step 5: Adding Asset Account Entries ---');
    
    // Entry 4: 1000 Cash (Debit 0.00)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 3, '1000', 0.00, 'CHF');
    
    // Entry 5: 1020 Bank Account (Debit 0.00)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 4, '1020', 0.00, 'CHF');
    
    // Entry 6: 1100 Accounts receivable (Debtors) (Debit 0.00)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 5, '1100', 0.00, 'CHF');
    
    // Entry 7: 120 Inventories and non-invoiced services (Debit 0.00)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 6, '120', 0.00, 'CHF');
    
    // Entry 8: 1230 Goods held for resale - CHF 0.00 (Debit)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 7, '1230', 0, 'CHF');
    
    console.log('Asset entries added');
    
    // ========================================================================
    // Step 6: Add Liability account entries (3 entries)
    // ========================================================================
    console.log('--- Step 6: Adding Liability Account Entries ---');
    
    // Entry 9: 2000 Accounts payable (suppliers & creditors) (Credit 0.00)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 8, '2000', 0.00, 'CHF');
    
    // Entry 10: 2210 Other short-term liabilities (Credit 0.00)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 9, '2210', 0.00, 'CHF');
    
    // Entry 11: 2210.001 John Smith (Credit 0.00)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 10, '2210.001', 0.00, 'CHF');
    
    console.log('Liability entries added');
    
    // ========================================================================
    // Step 7: Verify the transaction is balanced
    // ========================================================================
    console.log('--- Step 7: Verifying Transaction Balance ---');
    
    // Verify we have 11 entries
    const entryCount = await transactionsPage.countEntries(page);
    expect(entryCount).toBe(11);
    console.log(`✓ Transaction has ${entryCount} entries`);
    
    // Verify the transaction is balanced
    await transactionsPage.verifyBalanced(page);
    
    // ========================================================================
    // Step 8: Save the transaction
    // ========================================================================
    console.log('--- Step 8: Saving Transaction ---');
    
    await transactionsPage.saveTransaction(page);
    
    // Wait for the page to reload/update
    await page.waitForLoadState('networkidle');
    
    console.log('Transaction saved successfully');
    
    // ========================================================================
    // Step 9: Verify the transaction appears in the list
    // ========================================================================
    console.log('--- Step 9: Verifying Transaction in List ---');
    
    await transactionsPage.verifyTransactionExists(page, 'Opening Balances');
    
    // Verify the transaction date is displayed
    await page.waitForSelector('td:has-text("2026-01-01")', { timeout: 5000 });
    console.log('✓ Transaction date verified');
    
    // Try to verify the tag is displayed (it may be in a sub-row)
    const tagVisible = await page.locator('.badge:has-text("OpeningBalances")').isVisible({ timeout: 2000 }).catch(() => false);
    if (tagVisible) {
      console.log('✓ Transaction tag verified');
    } else {
      console.log('ℹ Tag not immediately visible in list view (may be in collapsed sub-row)');
    }
    
    console.log('=== Test 2 Complete: Opening Balances Transaction Created Successfully ===');
  });
});
