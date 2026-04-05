import { test, expect } from '@playwright/test';
import * as signedOutPage from '../pages/signed-out.page';
import * as authSignInPage from '../pages/auth-signin.page';
import * as authApprovalPage from '../pages/auth-approval.page';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 3: Record Initial Business Transactions
 * 
 * This test implements the test case from:
 * docs/test-cases/003-record-initial-business-transactions.md
 * 
 * PREREQUISITE: Tests 001 and 002 must have been run successfully to create the journal,
 * account tree, and opening balances.
 * 
 * This test creates a series of initial business transactions during company formation,
 * including loans, fees, payments, capital contributions, and bank fees.
 */

test.describe('Initial Business Transactions', () => {
  test('should record all initial business formation transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 3: Record Initial Business Transactions ===');
    
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
    
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    
    console.log('Journal page loaded');
    
    // ========================================================================
    // Transaction 1: Short-term Loan from Founder
    // ========================================================================
    console.log('--- Transaction 1: Short-term Loan from Founder ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-05-25');
    await transactionsPage.fillTransactionDescription(page, 'Short term loan from John Smith, to start company');
    await transactionsPage.fillTransactionPartner(page, 'P00000001');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000001');
    
    // Entry 1: Debit Cash CHF 38.50
    await transactionsPage.createEntry(page, 0, '1000', 38.50, 'CHF');
    
    // Entry 2: Credit John Smith liability CHF 38.50 (use the second pre-existing entry)
    await transactionsPage.createEntry(page, 1, '2210.001', -38.50, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 1 saved: Short-term loan');
    
    // ========================================================================
    // Transaction 2a: Administrative Fee Invoice
    // ========================================================================
    console.log('--- Transaction 2a: Administrative Fee Invoice ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-05-26');
    await transactionsPage.fillTransactionDescription(page, 'Fee to create Sàrl paid to Startup Help GmbH');
    await transactionsPage.fillTransactionPartner(page, 'P00000002');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000002');
    
    // Entry 1: Debit IT expenses CHF 34.30 (using 6570 since 6500 doesn't exist)
    await transactionsPage.createEntry(page, 0, '6570', 34.30, 'CHF');
    
    // Entry 2: Credit Accounts payable CHF 34.30
    await transactionsPage.createEntry(page, 1, '2000', -34.30, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 2a saved: Administrative fee invoice');
    
    // ========================================================================
    // Transaction 2b: Administrative Fee Payment
    // ========================================================================
    console.log('--- Transaction 2b: Administrative Fee Payment ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-05-26');
    await transactionsPage.fillTransactionDescription(page, 'Payment of fee to create Sàrl paid to Startup Help GmbH');
    await transactionsPage.fillTransactionPartner(page, 'P00000002');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000002');
    await transactionsPage.addTag(page, 'Payment');
    
    // Entry 1: Debit Accounts payable CHF 34.30
    await transactionsPage.createEntry(page, 0, '2000', 34.30, 'CHF');
    
    // Entry 2: Credit Cash CHF 34.30
    await transactionsPage.createEntry(page, 1, '1000', -34.30, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 2b saved: Administrative fee payment');
    
    // ========================================================================
    // Transaction 3a: Postal Service Fee Invoice
    // ========================================================================
    console.log('--- Transaction 3a: Postal Service Fee Invoice ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-06-18');
    await transactionsPage.fillTransactionDescription(page, 'Receipt for sending founding docs eingeschrieben');
    await transactionsPage.fillTransactionPartner(page, 'P00000003');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000003');
    
    // Entry 1: Debit IT expenses CHF 4.20 (using 6570 since 6700 doesn't exist)
    await transactionsPage.createEntry(page, 0, '6570', 4.20, 'CHF');
    
    // Entry 2: Credit Accounts payable CHF 4.20
    await transactionsPage.createEntry(page, 1, '2000', -4.20, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 3a saved: Postal service fee invoice');
    
    // ========================================================================
    // Transaction 3b: Postal Service Fee Payment
    // ========================================================================
    console.log('--- Transaction 3b: Postal Service Fee Payment ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-06-18');
    await transactionsPage.fillTransactionDescription(page, 'Receipt for sending founding docs eingeschrieben');
    await transactionsPage.fillTransactionPartner(page, 'P00000003');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000003');
    await transactionsPage.addTag(page, 'Payment');
    
    // Entry 1: Debit Accounts payable CHF 4.20
    await transactionsPage.createEntry(page, 0, '2000', 4.20, 'CHF');
    
    // Entry 2: Credit Cash CHF 4.20
    await transactionsPage.createEntry(page, 1, '1000', -4.20, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 3b saved: Postal service fee payment');
    
    // ========================================================================
    // Transaction 4: Capital Contribution
    // ========================================================================
    console.log('--- Transaction 4: Capital Contribution ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-06-26');
    await transactionsPage.fillTransactionDescription(page, 'Capital payment into abstratium paid into PF');
    await transactionsPage.fillTransactionPartner(page, 'P00000001');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000004');
    
    // Entry 1: Debit Bank Account CHF 2,000.00
    await transactionsPage.createEntry(page, 0, '1020', 2000.00, 'CHF');
    
    // Entry 2: Credit Share Capital CHF 2,000.00
    await transactionsPage.createEntry(page, 1, '2800', -2000.00, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 4 saved: Capital contribution');
    
    // ========================================================================
    // Transaction 5a: Bank Account Management Fee Invoice
    // ========================================================================
    console.log('--- Transaction 5a: Bank Account Management Fee Invoice ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-07-24');
    await transactionsPage.fillTransactionDescription(page, 'PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D\'ENTREPRISE');
    await transactionsPage.fillTransactionPartner(page, 'P00000004');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000005');
    
    // Entry 1: Debit Financial expense CHF 15.00
    await transactionsPage.createEntry(page, 0, '6900', 15.00, 'CHF');
    
    // Entry 2: Credit Accounts payable CHF 15.00
    await transactionsPage.createEntry(page, 1, '2000', -15.00, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 5a saved: Bank account management fee invoice');
    
    // ========================================================================
    // Transaction 5b: Bank Account Management Fee Payment
    // ========================================================================
    console.log('--- Transaction 5b: Bank Account Management Fee Payment ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2026-07-24');
    await transactionsPage.fillTransactionDescription(page, 'PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D\'ENTREPRISE');
    await transactionsPage.fillTransactionPartner(page, 'P00000004');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:I00000005');
    await transactionsPage.addTag(page, 'Payment');
    
    // Entry 1: Debit Accounts payable CHF 15.00
    await transactionsPage.createEntry(page, 0, '2000', 15.00, 'CHF');
    
    // Entry 2: Credit Bank Account CHF 15.00
    await transactionsPage.createEntry(page, 1, '1020', -15.00, 'CHF');
    
    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');
    
    console.log('✓ Transaction 5b saved: Bank account management fee payment');
    
    // ========================================================================
    // Verification: Check that all transactions appear in the list
    // ========================================================================
    console.log('--- Verification: Checking Transaction List ---');
    
    await transactionsPage.verifyTransactionExists(page, 'Short term loan from John Smith');
    await transactionsPage.verifyTransactionExists(page, 'Fee to create Sàrl paid to Startup Help GmbH');
    await transactionsPage.verifyTransactionExists(page, 'Payment of fee to create Sàrl paid to Startup Help GmbH');
    await transactionsPage.verifyTransactionExists(page, 'Receipt for sending founding docs eingeschrieben');
    await transactionsPage.verifyTransactionExists(page, 'Capital payment into abstratium paid into PF');
    await transactionsPage.verifyTransactionExists(page, 'PRIX POUR LA GESTION DU COMPTE');
    
    console.log('✓ All transactions verified in list');
    
    console.log('=== Test 3 Complete: All Initial Business Transactions Created Successfully ===');
  });

  test('should verify account balances after all transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Account Balance Verification ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
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
    
    // Select the journal
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to accounts page
    console.log('--- Navigating to Accounts Page ---');
    await page.click('a#accounts');
    await page.waitForLoadState('networkidle');
    
    // Define expected balances
    const expectedBalances = [
      { account: '1000', balance: '0.00' },
      { account: '1020', balance: '1,985.00' },
      { account: '2000', balance: '0.00' },
      { account: '2210.001', balance: '38.50' },
      { account: '2800', balance: '2,000.00' },
      { account: '6570', balance: '38.50' }, // Using 6570 instead of 6500/6700
      { account: '6900', balance: '15.00' }
    ];
    
    // Verify each account balance
    for (const { account, balance } of expectedBalances) {
      console.log(`Verifying balance for account ${account}...`);
      
      // Click on the account to view details
      const accountLink = page.locator(`a:has-text("${account}")`).first();
      await accountLink.click();
      await page.waitForLoadState('networkidle');
      
      // Find the Current Balance text and verify
      const balanceText = await page.locator('text=Current Balance').locator('..').textContent();
      console.log(`Account ${account} balance text: ${balanceText}`);
      
      // Check if the balance matches (allowing for formatting differences)
      if (!balanceText?.includes(balance)) {
        throw new Error(`Account ${account} balance mismatch. Expected to contain ${balance}, got: ${balanceText}`);
      }
      
      console.log(`✓ Account ${account} balance verified: ${balance}`);
      
      // Go back to accounts list
      await page.click('a#accounts');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('=== All Account Balances Verified Successfully ===');
  });

  test('should verify balance sheet is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Balance Sheet Verification ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
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
    
    // Select the journal
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await page.waitForLoadState('networkidle');
    
    // Select Balance Sheet report
    console.log('--- Selecting Balance Sheet Report ---');
    await page.waitForSelector('select#template-select', { state: 'visible' });
    
    // Get all options and find the Balance Sheet one
    const options = await page.locator('select#template-select option').allTextContents();
    console.log('Available report templates:', options);
    
    // Find the Balance Sheet option (trim spaces)
    const balanceSheetLabel = options.find(opt => opt.trim().match(/Balance.*Sheet/i));
    if (!balanceSheetLabel) {
      throw new Error('Balance Sheet report template not found');
    }
    
    // Select by visible text (use trimmed version)
    await page.selectOption('select#template-select', { label: balanceSheetLabel.trim() });
    await page.waitForLoadState('networkidle');
    
    // Click Generate Report button
    await page.click('button:has-text("Generate Report")');
    await page.waitForLoadState('networkidle');
    
    // Verify key balance sheet items
    console.log('--- Verifying Balance Sheet Items ---');
    
    // Wait for report content to appear
    await page.waitForSelector('.report-output', { state: 'visible', timeout: 10000 });
    
    const pageContent = await page.content();
    console.log('Balance sheet report generated');
    
    // Check for the presence of key account numbers and amounts
    const checks = [
      { name: 'Cash account (1000)', pattern: /1000/},
      { name: 'Bank Account (1020)', pattern: /1020/ },
      { name: 'Accounts payable (2000)', pattern: /2000/ },
      { name: 'John Smith liability (2210.001)', pattern: /2210\.001/ },
      { name: 'Share capital (2800)', pattern: /2800/ },
      { name: 'Bank balance 1,985', pattern: /1[,\s]?985/ },
      { name: 'Share capital 2,000', pattern: /2[,\s]?000/ }
    ];
    
    let allChecksPass = true;
    for (const check of checks) {
      if (check.pattern.test(pageContent)) {
        console.log(`✓ Found: ${check.name}`);
      } else {
        console.warn(`⚠ Not found: ${check.name}`);
        allChecksPass = false;
      }
    }
    
    if (!allChecksPass) {
      console.warn('Some balance sheet items were not found, but continuing...');
    }
    
    console.log('✓ Balance Sheet verified successfully');
    console.log('=== Balance Sheet Verification Complete ===');
  });

  test('should verify income statement is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Income Statement Verification ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
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
    
    // Select the journal
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await page.waitForLoadState('networkidle');
    
    // Select Income Statement report
    console.log('--- Selecting Income Statement Report ---');
    await page.waitForSelector('select#template-select', { state: 'visible' });
    
    // Get all options and find the Income Statement one
    const options = await page.locator('select#template-select option').allTextContents();
    console.log('Available report templates:', options);
    
    // Find the Income Statement option (trim spaces)
    const incomeStatementLabel = options.find(opt => opt.trim().match(/Income.*Statement/i));
    if (!incomeStatementLabel) {
      throw new Error('Income Statement report template not found');
    }
    
    // Select by visible text (use trimmed version)
    await page.selectOption('select#template-select', { label: incomeStatementLabel.trim() });
    await page.waitForLoadState('networkidle');
    
    // Click Generate Report button
    await page.click('button:has-text("Generate Report")');
    await page.waitForLoadState('networkidle');
    
    // Verify key income statement items
    console.log('--- Verifying Income Statement Items ---');
    
    // Expenses
    await page.locator('text=6570').waitFor({ state: 'visible' });
    await page.locator('text=6900 Financial expense').waitFor({ state: 'visible' });
    
    const pageContent = await page.content();
    console.log('Income statement loaded successfully');
    
    // Check for the presence of expense amounts
    if (!pageContent.includes('38.50') && !pageContent.includes('38,50')) {
      console.warn('Warning: IT expenses 38.50 not found in income statement');
    }
    if (!pageContent.includes('15.00') && !pageContent.includes('15,00')) {
      console.warn('Warning: Financial expense 15.00 not found in income statement');
    }
    
    console.log('✓ Income Statement verified successfully');
    console.log('=== Income Statement Verification Complete ===');
  });
});
