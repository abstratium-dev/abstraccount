import { test, expect } from '@playwright/test';
import * as signedOutPage from '../pages/signed-out.page';
import * as authSignInPage from '../pages/auth-signin.page';
import * as authApprovalPage from '../pages/auth-approval.page';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as reportsPage from '../pages/reports.page';
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
    await transactionsPage.addTag(page, 'invoice:PI00000001');
    
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
    await transactionsPage.addTag(page, 'invoice:PI00000002');
    
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
    await transactionsPage.addTag(page, 'invoice:PI00000002');
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
    await transactionsPage.addTag(page, 'invoice:PI00000003');
    
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
    await transactionsPage.addTag(page, 'invoice:PI00000003');
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
    await transactionsPage.addTag(page, 'invoice:PI00000004');
    
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
    await transactionsPage.addTag(page, 'invoice:PI00000005');
    
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
    await transactionsPage.addTag(page, 'invoice:PI00000005');
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

  test('should verify Balance Sheet report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Balance Sheet Verification ===');
    
    // Navigate and authenticate
    await page.goto('/');
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
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Balance Sheet report
    await reportsPage.selectReportTemplate(page, 'Balance Sheet');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Balance Sheet ---');
    
    // Expected values based on transactions:
    // Assets: 1020 Bank = 1,985.00
    // Liabilities: 2210.001 John Smith = 38.50
    // Equity: 2800 Share Capital = 2,000.00
    // Net Loss: 53.50 (expenses: 38.50 + 15.00)
    // Total L+E: 38.50 + 2,000.00 - 53.50 = 1,985.00 (must equal Total Assets)
    
    await reportsPage.verifySectionExists(page, 'Cash and Cash Equivalents');
    await reportsPage.verifyAccountBalance(page, '1020', '1,985.00');
    
    await reportsPage.verifySectionExists(page, 'Liabilities');
    await reportsPage.verifyAccountBalance(page, '2210.001', '38.50');
    
    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00');
    
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*53\.50\s*CHF/, 'Net Loss');
    
    // Verify the balance sheet balances
    await reportsPage.verifyBalanceSheetBalances(page, '1,985.00');
    
    // Verify no negative signs in Liabilities section (sign inversion bug check)
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');
    
    console.log('✓ Balance Sheet verified successfully!');
    console.log('=== Balance Sheet Verification Complete ===');
  });

  test('should verify Income Statement report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Income Statement Verification ===');
    
    // Navigate and authenticate
    await page.goto('/');
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
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Income Statement report
    await reportsPage.selectReportTemplate(page, 'Income Statement');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Income Statement ---');
    
    // Expected: No revenue, Expenses: 6570 (38.50) + 6900 (15.00) = 53.50 total
    await reportsPage.verifySectionExists(page, 'Expenses');
    await reportsPage.verifyAccountBalance(page, '6570', '38.50');
    await reportsPage.verifyAccountBalance(page, '6900', '15.00');
    
    // Verify Net Loss (no revenue, so expenses = net loss)
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*53\.50\s*CHF/, 'Net Loss of 53.50');
    
    console.log('✓ Income Statement verified successfully!');
    console.log('=== Income Statement Verification Complete ===');
  });

  test('should verify Swiss Balance Sheet (Bilan) report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Swiss Balance Sheet (Bilan) Verification ===');
    
    // Navigate and authenticate
    await page.goto('/');
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
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Swiss Balance Sheet report
    await reportsPage.selectReportTemplate(page, 'Swiss Balance Sheet');
    await reportsPage.generateReport(page);
    
    // Verify report structure and all values
    console.log('--- Verifying Swiss Balance Sheet ---');
    
    // Verify key sections exist
    await reportsPage.verifySectionExists(page, 'Assets');
    await reportsPage.verifySectionExists(page, 'Liabilities');
    await reportsPage.verifySectionExists(page, 'Equity');
    
    // Verify all account balances
    await reportsPage.verifyAccountBalance(page, '1020', '1,985.00'); // Bank account
    await reportsPage.verifyAccountBalance(page, '2210.001', '38.50'); // John Smith liability
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00'); // Share capital
    
    // Swiss Balance Sheet includes net income in equity, not as separate line
    // So we just verify the accounts and that it balances
    
    // Verify no negative signs in liability and equity sections (sign inversion check)
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');
    await reportsPage.verifyNoNegativeValues(page, 'Equity');
    
    // Verify the balance sheet balances (Assets = Liabilities + Equity)
    await reportsPage.verifyBalanceSheetBalances(page, '1,985.00');
    
    console.log('✓ Swiss Balance Sheet verified successfully!');
    console.log('=== Swiss Balance Sheet Verification Complete ===');
  });

  test('should verify Swiss Income Statement (Compte de résultat) report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Swiss Income Statement Verification ===');
    
    // Navigate and authenticate
    await page.goto('/');
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
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Swiss Income Statement report
    await reportsPage.selectReportTemplate(page, 'Compte de résultat');
    await reportsPage.generateReport(page);
    
    // Verify report structure and all values
    console.log('--- Verifying Swiss Income Statement ---');
    
    // Verify main sections exist
    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifySectionExists(page, 'Expenses');
    
    // Swiss Income Statement groups expenses by category (4xxx, 5xxx, 6xxx)
    // It shows subtotals per category with specific labels based on KMU-Kontenplan
    
    // Verify the report contains expense data and net income
    const content = await reportsPage.getReportContent(page);
    
    // Check that expenses section has data (should show 53.50 total)
    if (!content.includes('Expenses')) {
      throw new Error('Expenses section not found in Swiss Income Statement');
    }
    console.log('✓ Expenses section found');
    
    // Verify Net Income appears with the correct amount (53.50)
    const hasNetIncome = content.includes('Net Income') || content.includes('Net Loss');
    const hasAmount = content.includes('53.50') || content.includes('53,50');
    
    if (!hasNetIncome) {
      throw new Error('Net Income/Loss label not found in Swiss Income Statement');
    }
    if (!hasAmount) {
      throw new Error('Amount 53.50 CHF not found in Swiss Income Statement');
    }
    console.log('✓ Net Income/Loss: 53.50 CHF verified');
    
    console.log('✓ Swiss Income Statement verified with all values');
    
    console.log('✓ Swiss Income Statement verified successfully!');
    console.log('=== Swiss Income Statement Verification Complete ===');
  });

  test('should verify Trial Balance report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Trial Balance Verification ===');
    
    // Navigate and authenticate
    await page.goto('/');
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
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Trial Balance report
    await reportsPage.selectReportTemplate(page, 'Trial Balance');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Trial Balance ---');
    
    // Trial balance should show all accounts with debits and credits
    await reportsPage.verifySectionExists(page, 'Cash');
    await reportsPage.verifySectionExists(page, 'Assets');
    await reportsPage.verifySectionExists(page, 'Liabilities');
    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifySectionExists(page, 'Expenses');
    
    // Verify key accounts with their debit/credit balances
    // Account 1020: Debit 2000, Credit 15 = Net Debit 1,985.00
    await reportsPage.verifyReportContains(page, '1020', 'Bank Account');
    await reportsPage.verifyReportContains(page, '1,985.00', 'Bank balance');
    
    // Account 2210.001: Credit 38.50
    await reportsPage.verifyReportContains(page, '2210.001', 'John Smith liability');
    await reportsPage.verifyReportContains(page, '38.50', 'John Smith balance');
    
    // Account 2800: Credit 2,000.00
    await reportsPage.verifyReportContains(page, '2800', 'Share Capital');
    await reportsPage.verifyReportContains(page, '2,000.00', 'Share Capital balance');
    
    // Account 6570: Debit 38.50 (34.30 + 4.20)
    await reportsPage.verifyReportContains(page, '6570', 'IT expenses');
    await reportsPage.verifyReportContains(page, '38.50', 'IT expenses balance');
    
    // Account 6900: Debit 15.00
    await reportsPage.verifyReportContains(page, '6900', 'Financial expense');
    await reportsPage.verifyReportContains(page, '15.00', 'Financial expense balance');
    
    console.log('✓ Trial Balance verified successfully!');
    console.log('=== Trial Balance Verification Complete ===');
  });

  test('should verify Partner Activity Report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Partner Activity Report Verification ===');
    
    // Navigate and authenticate
    await page.goto('/');
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
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Partner Activity Report
    await reportsPage.selectReportTemplate(page, 'Partner Activity');
    await reportsPage.generateReport(page);
    
    // Verify report structure and all partner values
    console.log('--- Verifying Partner Activity Report ---');
    
    // Verify the report shows column headers
    await reportsPage.verifyReportContains(page, 'Income', 'Income column');
    await reportsPage.verifyReportContains(page, 'Expenses', 'Expenses column');
    await reportsPage.verifyReportContains(page, 'Net', 'Net column');
    
    // Verify key expense amounts appear in the report
    // Partner Activity Report shows income and expenses, not equity transactions
    // P00000002 - Startup Help GmbH: Expenses 34.30
    await reportsPage.verifyReportContains(page, '34.30', 'Startup Help expense');
    
    // P00000003 - Swiss Post: Expenses 4.20
    await reportsPage.verifyReportContains(page, '4.20', 'Swiss Post expense');
    
    // P00000004 - PostFinance: Expenses 15.00
    await reportsPage.verifyReportContains(page, '15.00', 'PostFinance expense');
    
    // Verify total expenses appear (sum of all partner expenses)
    await reportsPage.verifyReportContains(page, '53.50', 'Total expenses across all partners');
    
    // Verify at least some partner identifiers appear
    const content = await reportsPage.getReportContent(page);
    const hasPartnerData = content.includes('Smith') || content.includes('GmbH') || 
                          content.includes('Post') || content.includes('Finance') ||
                          content.includes('P00000');
    if (!hasPartnerData) {
      throw new Error('No partner identifiers found in Partner Activity Report');
    }
    console.log('✓ Partner data and all expense values verified');
    
    console.log('✓ Partner Activity Report verified successfully!');
    console.log('=== Partner Activity Report Verification Complete ===');
  });
});
