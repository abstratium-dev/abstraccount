import { test, expect } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as macrosPage from '../pages/macros.page';
import * as reportsPage from '../pages/reports.page';
import * as toastPage from '../pages/toast.page';
import * as closeBooksPage from '../pages/close-books.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 7: Year-End Closing - Tax Provision and Legal Reserve Allocation
 *
 * This test implements the test case from:
 * docs/test-cases/007-year-end-closing.md
 *
 * PREREQUISITE: Tests 001 through 006 must have been run successfully.
 * In particular, test 004 must have run the TaxPayment macro (004.9) so that
 * the direct tax expense account (8900) already reflects tax paid during the
 * year. This test adds the year-end closing entries:
 *   - TaxProvision: record an additional tax provision for tax estimated to be
 *     owed at year-end but not yet billed.
 *   - LegalReserveAllocation: allocate 5% of profit to legal reserves (Swiss
 *     CO Art. 671-671a).
 *
 * The test then verifies the reports reflect the updated balances.
 */

/**
 * Helper function to delete ALL transactions matching a description via the API.
 * This is more reliable than the UI-based approach which only deletes one
 * transaction at a time and can fail if the modal doesn't open properly.
 */
async function deleteTransactionByDescription(page: any, description: string): Promise<void> {
  console.log(`Looking for transactions with description: "${description}"`);

  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  if (!journalId) {
    console.log('No journalId in localStorage, skipping cleanup');
    return;
  }

  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) {
    console.log(`API request failed: ${response.status()}, skipping cleanup`);
    return;
  }
  const transactions = await response.json();

  let deletedCount = 0;
  for (const tx of transactions) {
    const txDescription: string = tx.description || '';
    if (txDescription === description || txDescription.includes(description)) {
      const txId = tx.id;
      console.log(`  Deleting transaction: "${txDescription}" (id: ${txId})`);
      const deleteResponse = await page.request.delete(`/api/transaction/${txId}`);
      if (deleteResponse.ok()) {
        deletedCount++;
      } else {
        console.log(`  Failed to delete transaction: ${deleteResponse.status()}`);
      }
    }
  }
  console.log(`Deleted ${deletedCount} transaction(s) matching "${description}"`);
}

/**
 * Helper function to delete ALL closing transactions via the API.
 * Closing transactions are created by the close-books operation and have
 * descriptions starting with "Close " and are tagged with "Closing:".
 * This cleanup makes the close-books test idempotent.
 *
 * Since closing the books locks the journal (as of the CloseBooksService
 * update), this helper unlocks the journal first before attempting to
 * delete the closing transactions.
 */
async function deleteClosingTransactions(page: any): Promise<void> {
  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  if (!journalId) {
    console.log('No journalId in localStorage, skipping cleanup');
    return;
  }

  // Check if the journal is locked; if so, unlock it first so we can
  // delete the closing transactions. The close-books operation locks
  // the journal, so previous runs of test 7.5 will have left it locked.
  const metaResponse = await page.request.get(`/api/journal/${journalId}/metadata`);
  if (metaResponse.ok()) {
    const metadata = await metaResponse.json();
    if (metadata.locked) {
      console.log('  Journal is locked, unlocking to allow cleanup...');
      const unlockResponse = await page.request.post(`/api/journal/${journalId}/unlock`);
      if (!unlockResponse.ok()) {
        console.log(`  Failed to unlock journal: ${unlockResponse.status()}, skipping cleanup`);
        return;
      }
      console.log('  Journal unlocked for cleanup');
    }
  }

  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) {
    console.log(`API request failed: ${response.status()}, skipping cleanup`);
    return;
  }
  const transactions = await response.json();

  let deletedCount = 0;
  for (const tx of transactions) {
    const txDescription: string = tx.description || '';
    if (txDescription.startsWith('Close ')) {
      const txId = tx.id;
      console.log(`  Deleting closing transaction: "${txDescription}" (id: ${txId})`);
      const deleteResponse = await page.request.delete(`/api/transaction/${txId}`);
      if (deleteResponse.ok()) {
        deletedCount++;
      } else {
        console.log(`  Failed to delete transaction: ${deleteResponse.status()}`);
      }
    }
  }
  console.log(`Deleted ${deletedCount} closing transaction(s)`);
}

test.describe('Year-End Closing', () => {
  // ==========================================================================
  // Test 7.1: TaxProvision Macro
  // ==========================================================================
  test('should execute TaxProvision macro to record year-end tax provision', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 7.1: TaxProvision Macro ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    console.log('Journal page loaded');

    // Clean up existing test transaction (and old 004.8 name from previous runs)
    console.log('--- Cleaning up existing test transaction ---');
    await deleteTransactionByDescription(page, 'Test 007 tax provision for 2024');
    await deleteTransactionByDescription(page, 'Test macros 004.8 tax provision for 2024');

    // Navigate to macros page
    console.log('--- Navigating to Macros Page ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');

    await macrosPage.verifyMacroExists(page, 'TaxProvision');
    console.log('✓ TaxProvision macro is available in the macro list');

    await macrosPage.selectMacro(page, 'TaxProvision');
    console.log('TaxProvision macro selected');

    // Fill in parameters
    console.log('--- Filling in Macro Parameters ---');

    console.log('Filling date field (2024-12-31)...');
    await macrosPage.fillParameter(page, 'date', '2024-12-31');

    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test 007 tax provision for 2024');

    console.log('Filling total tax amount field (50.00)...');
    await macrosPage.fillParameter(page, 'total_tax_amount', '50.00');

    console.log('All fields filled');

    // Execute the macro
    console.log('--- Executing Macro ---');
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');

    await page.waitForTimeout(2000);

    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }

    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');

    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');

    // Verify transaction was created
    console.log('--- Verifying Transaction Creation ---');
    await transactionsPage.verifyTransactionExists(page, 'Test 007 tax provision for 2024');
    console.log('✓ Transaction "Test 007 tax provision for 2024" appears in transaction list');

    // Verify transaction details
    await transactionsPage.verifyTransactionDetails(page, 'Test 007 tax provision for 2024', {
      date: '2024-12-31',
      value: '50.00'
    });

    console.log('✓ TaxProvision macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Date: 2024-12-31 (year-end)');
    console.log('  - Description: Test 007 tax provision for 2024');
    console.log('  - Total tax amount: CHF 50.00');
    console.log('  - Transaction created with 2 entries (Dr 8900, Cr 2208)');

    console.log('=== Test 7.1: TaxProvision Macro - PASSED ===');
  });

  // ==========================================================================
  // Test 7.2: LegalReserveAllocation Macro
  // ==========================================================================
  test('should execute LegalReserveAllocation macro to allocate to legal reserves', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 7.2: LegalReserveAllocation Macro ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    console.log('Journal page loaded');

    // Clean up existing test transaction (and old 004.10 name from previous runs)
    console.log('--- Cleaning up existing test transaction ---');
    await deleteTransactionByDescription(page, 'Test 007 legal reserve allocation for 2024');
    await deleteTransactionByDescription(page, 'Test macros 004.10 legal reserve allocation for 2024');

    // Navigate to macros page
    console.log('--- Navigating to Macros Page ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');

    await macrosPage.verifyMacroExists(page, 'LegalReserveAllocation');
    console.log('✓ LegalReserveAllocation macro is available in the macro list');

    await macrosPage.selectMacro(page, 'LegalReserveAllocation');
    console.log('LegalReserveAllocation macro selected');

    // Fill in parameters
    console.log('--- Filling in Macro Parameters ---');

    console.log('Filling date field (2024-12-31)...');
    await macrosPage.fillParameter(page, 'date', '2024-12-31');

    console.log('Filling allocation amount field (10.00)...');
    await macrosPage.fillParameter(page, 'allocation_amount', '10.00');

    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test 007 legal reserve allocation for 2024');

    console.log('All fields filled');

    // Execute the macro
    console.log('--- Executing Macro ---');
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');

    await page.waitForTimeout(2000);

    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }

    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');

    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');

    // Verify transaction was created
    console.log('--- Verifying Transaction Creation ---');
    await transactionsPage.verifyTransactionExists(page, 'Test 007 legal reserve allocation for 2024');
    console.log('✓ Transaction "Test 007 legal reserve allocation for 2024" appears in transaction list');

    // Verify transaction details
    await transactionsPage.verifyTransactionDetails(page, 'Test 007 legal reserve allocation for 2024', {
      date: '2024-12-31',
      value: '10.00'
    });

    console.log('✓ LegalReserveAllocation macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Date: 2024-12-31 (year-end)');
    console.log('  - Allocation amount: CHF 10.00');
    console.log('  - Description: Test 007 legal reserve allocation for 2024');
    console.log('  - Transaction created with 2 entries (Dr 2979, Cr 2950)');

    console.log('=== Test 7.2: LegalReserveAllocation Macro - PASSED ===');
  });

  // ==========================================================================
  // Test 7.3: Phase 2.6 — Print Balance Sheet for Tax Declaration
  //
  // This is the balance sheet that would be filed with the tax authorities.
  // It is generated AFTER all year-end adjustments (TaxProvision and
  // LegalReserveAllocation) but BEFORE Phase 3 closing entries zero out the
  // revenue and expense accounts. Every line is verified.
  // ==========================================================================
  test('should verify Balance Sheet report after year-end closing (Phase 2.6)', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Balance Sheet Verification (Phase 2.6 — Pre-Closing) ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Clean up any closing transactions from previous runs of test 7.5.
    // This is critical: if closing transactions exist, the revenue and
    // expense accounts will be zeroed and the pre-closing report verification
    // will fail.
    console.log('--- Cleaning up closing transactions from previous runs ---');
    await deleteClosingTransactions(page);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);

    // Select and generate Balance Sheet report
    await reportsPage.selectReportTemplate(page, 'Balance Sheet');
    await reportsPage.generateReport(page);

    // ========================================================================
    // Verify every line of the Balance Sheet
    // ========================================================================
    console.log('--- Verifying Balance Sheet (line by line) ---');

    // Expected state after test 007 (TaxProvision 50.00 + LegalReserveAllocation 10.00):
    //
    //   Assets:
    //     1000 Cash              0.00   (hidden — zero balance)
    //     1020 Bank Account      1,680.50
    //     1100 Trade receivables   179.10
    //     1230 Goods held for resale  40.00
    //     Total Assets           1,899.60
    //
    //   Liabilities:
    //     2000 Accounts payable    0.00   (hidden — zero balance)
    //     2200 VAT payable         8.10
    //     2208 Tax liabilities    50.00   (from TaxProvision)
    //     2210.001 Staff member    0.00   (hidden — zero balance)
    //     Total Liabilities       58.10
    //
    //   Equity:
    //     2800 Share capital    2,000.00
    //     2950 Legal reserves      10.00   (from LegalReserveAllocation)
    //     2979 Annual P/L          -10.00   (debit balance, reduces equity)
    //     Total Equity           2,000.00
    //
    //   Net Loss                  158.50   (178.00 revenue − 336.50 expenses)
    //   Total L+E               1,899.60   (58.10 + 2,000.00 − 158.50)

    // --- Cash and Cash Equivalents section ---
    await reportsPage.verifySectionExists(page, 'Cash and Cash Equivalents');
    // 1000 Cash = 0.00 (hidden due to hideZeroBalances)
    await reportsPage.verifyAccountBalance(page, '1020', '1,680.50');
    await reportsPage.verifyTotal(page, 'Cash and Cash Equivalents Total', '1,680.50');

    // --- Other Assets section ---
    await reportsPage.verifySectionExists(page, 'Other Assets');
    await reportsPage.verifyAccountBalance(page, '1100', '179.10');
    await reportsPage.verifyAccountBalance(page, '1230', '40.00');
    await reportsPage.verifyTotal(page, 'Other Assets Total', '219.10');

    // --- Total Assets ---
    await reportsPage.verifyTotal(page, 'Total Assets', '1,899.60');

    // --- Liabilities section ---
    await reportsPage.verifySectionExists(page, 'Liabilities');
    // 2000 Accounts payable = 0.00 (hidden)
    // 2210.001 Staff member = 0.00 (hidden)
    await reportsPage.verifyAccountBalance(page, '2200', '8.10');
    await reportsPage.verifyAccountBalance(page, '2208', '50.00');
    await reportsPage.verifyTotal(page, 'Liabilities Total', '58.10');
    // Verify no negative signs in Liabilities section (sign inversion bug check)
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');

    // --- Equity section ---
    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00');
    await reportsPage.verifyAccountBalance(page, '2950', '10.00');
    // 2979 has a DEBIT balance of 10.00 (from LegalReserveAllocation debiting it).
    // In the Equity section with invertSign, this displays as -10.00 CHF.
    await reportsPage.verifyAccountBalance(page, '2979', '-10.00');
    await reportsPage.verifyTotal(page, 'Equity Total', '2,000.00');

    // --- Net Loss line ---
    // Net Loss = 178.00 revenue − 336.50 expenses = 158.50
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*158\.50\s*CHF/, 'Net Loss');

    // --- Total Liabilities and Equity (must balance with Total Assets) ---
    await reportsPage.verifyBalanceSheetBalances(page, '1,899.60');

    console.log('✓ Balance Sheet verified — every line correct!');
    console.log('=== Balance Sheet Verification (Phase 2.6) Complete ===');
  });

  // ==========================================================================
  // Test 7.4: Phase 2.6 — Print Income Statement for Tax Declaration
  //
  // This is the income statement that would be filed with the tax authorities.
  // It is generated AFTER all year-end adjustments (TaxProvision and
  // LegalReserveAllocation) but BEFORE Phase 3 closing entries zero out the
  // revenue and expense accounts. Every line is verified.
  // ==========================================================================
  test('should verify Income Statement report after year-end closing (Phase 2.6)', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Income Statement Verification (Phase 2.6 — Pre-Closing) ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
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

    // ========================================================================
    // Verify every line of the Income Statement
    // ========================================================================
    console.log('--- Verifying Income Statement (line by line) ---');

    // Expected state after test 007:
    //
    //   Revenue:
    //     3400 Services revenue    178.00
    //     Total Revenue             178.00
    //
    //   Expenses:
    //     6500  Administrative expenses    9.30
    //     6570.001  IT expense            17.00
    //     6570.002  Anthropic            100.00
    //     6700  Advertising costs         14.20
    //     6900  Financial expense         16.00
    //     8900  Direct taxes             180.00  (130.00 from test 004 + 50.00 TaxProvision)
    //     Total Expenses                 336.50
    //
    //   Net Loss = 178.00 − 336.50 = 158.50

    // --- Revenue section ---
    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifyAccountBalance(page, '3400', '178.00');
    await reportsPage.verifyTotal(page, 'Revenue Total', '178.00');

    // --- Expenses section ---
    await reportsPage.verifySectionExists(page, 'Expenses');
    await reportsPage.verifyAccountBalance(page, '6500', '9.30');
    await reportsPage.verifyAccountBalance(page, '6570.001', '17.00');
    await reportsPage.verifyAccountBalance(page, '6570.002', '100.00');
    await reportsPage.verifyAccountBalance(page, '6700', '14.20');
    await reportsPage.verifyAccountBalance(page, '6900', '16.00');
    // 8900 = 130.00 (75.00 from test 003 T12a + 55.00 from test 004.9 TaxPayment)
    //        + 50.00 (from test 007.1 TaxProvision) = 180.00
    await reportsPage.verifyAccountBalance(page, '8900', '180.00');
    await reportsPage.verifyTotal(page, 'Expenses Total', '336.50');

    // --- Net Loss line ---
    // Net Loss = 178.00 revenue − 336.50 expenses = 158.50
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*158\.50\s*CHF/, 'Net Loss of 158.50');

    console.log('✓ Income Statement verified — every line correct!');
    console.log('=== Income Statement Verification (Phase 2.6) Complete ===');
  });

  test('should verify Trial Balance report after year-end closing', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Trial Balance Verification (After Year-End Closing) ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
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
    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifySectionExists(page, 'Expenses');

    // Verify key accounts with their debit/credit balances
    // Account 1020: Bank - Net Debit 1,680.50 (unchanged by year-end closing)
    await reportsPage.verifyReportContains(page, '1020', 'Bank Account');
    await reportsPage.verifyReportContains(page, '1,680.50', 'Bank balance');

    // Account 1100: Receivables - Net Debit 179.10 (unchanged)
    await reportsPage.verifyReportContains(page, '1100', 'Receivables');
    await reportsPage.verifyReportContains(page, '179.10', 'Receivables balance');

    // Account 2800: Share Capital - Credit 2,000.00 (unchanged)
    await reportsPage.verifyReportContains(page, '2800', 'Share Capital');
    await reportsPage.verifyReportContains(page, '2,000.00', 'Share Capital balance');

    // Account 3400: Revenue - Credit 178.00 (unchanged)
    await reportsPage.verifyReportContains(page, '3400', 'Revenue');
    await reportsPage.verifyReportContains(page, '178.00', 'Revenue balance');

    // Account 8900: Direct taxes - Debit 180.00 (130.00 from test 004 + 50.00 from test 007)
    await reportsPage.verifyReportContains(page, '8900', 'Direct taxes');
    await reportsPage.verifyReportContains(page, '180.00', 'Direct taxes balance');

    // Account 2208: Tax liabilities - Credit 50.00 (from test 007 TaxProvision)
    await reportsPage.verifyReportContains(page, '2208', 'Tax liabilities');
    await reportsPage.verifyReportContains(page, '50.00', 'Tax liabilities balance');

    // Account 2950: Legal reserves - Credit 10.00 (from test 007 LegalReserveAllocation)
    await reportsPage.verifyReportContains(page, '2950', 'Legal reserves');
    await reportsPage.verifyReportContains(page, '10.00', 'Legal reserves balance');

    console.log('✓ Trial Balance verified successfully!');
    console.log('=== Trial Balance Verification Complete ===');
  });

  // ==========================================================================
  // Test 7.5: Phase 3 — Close the Books
  //
  // This test navigates to the "close books at end of year" menu item,
  // fills in the closing form (date + equity account 2979), previews the
  // closing entries, verifies the preview shows the correct accounts and
  // balances, then confirms and executes the closing.
  //
  // After closing, all revenue and expense accounts should be zeroed out,
  // and their balances should be transferred to 2979 (Annual profit/loss).
  //
  // IMPORTANT: This test must run AFTER tests 7.3 and 7.4 (which verify
  // the pre-closing financial statements). Once this test runs, the income
  // statement will be blank.
  // ==========================================================================
  test('should close the books at year end (Phase 3)', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 7.5: Close the Books (Phase 3) ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Clean up any existing closing transactions from previous runs.
    // Closing transactions have descriptions starting with "Close " and
    // are tagged with "Closing:". We delete them via the API so the test
    // is idempotent.
    console.log('--- Cleaning up existing closing transactions ---');
    await deleteClosingTransactions(page);

    // Navigate to the close-books page via the menu
    console.log('--- Navigating to Close Books page ---');
    // Open the "More options" menu to reveal the close-books link
    const menuBtn = page.locator('.menu-btn');
    await expect(menuBtn).toBeVisible({ timeout: 10000 });
    await menuBtn.click();
    console.log('Menu button clicked');
    // Now click the close-books link
    const closeBooksLink = page.locator('#close-books');
    await expect(closeBooksLink).toBeVisible({ timeout: 5000 });
    await closeBooksLink.click();
    await closeBooksPage.waitForCloseBooksPage(page);
    console.log('Close-books page loaded');

    // Fill in the form
    console.log('--- Filling Close Books Form ---');
    await closeBooksPage.fillClosingDate(page, '2024-12-31');
    await closeBooksPage.selectEquityAccount(page, '2:290:2979');
    console.log('Form filled');

    // Preview the closing entries
    console.log('--- Previewing Closing Entries ---');
    await closeBooksPage.clickPreviewButton(page);
    await closeBooksPage.waitForConfirmModal(page);
    console.log('Preview modal displayed');

    // Verify the preview shows the correct accounts and balances.
    // All transactions in the test suite are dated in 2024, so the closing
    // at 2024-12-31 captures every income/expense entry.
    //
    // Balances at 2024-12-31 (after 007.1 TaxProvision + 007.2 LegalReserveAllocation):
    //   Revenue:  3400 = -178.00 (credit)
    //   Expenses: 6500 = 9.30, 6570.001 = 17.00, 6570.002 = 100.00,
    //             6700 = 14.20, 6900 = 16.00,
    //             8900 = 180.00 (75.00 from T12a + 55.00 from 004.9 TaxPayment
    //                     + 50.00 from TaxProvision)
    console.log('--- Verifying Preview Contents ---');
    await closeBooksPage.verifyPreviewAccountCount(page, 7);
    await closeBooksPage.verifyPreviewAccount(page, '3400', '178.00');
    await closeBooksPage.verifyPreviewAccount(page, '6500', '9.30');
    await closeBooksPage.verifyPreviewAccount(page, '6570.001', '17.00');
    await closeBooksPage.verifyPreviewAccount(page, '6570.002', '100.00');
    await closeBooksPage.verifyPreviewAccount(page, '6700', '14.20');
    await closeBooksPage.verifyPreviewAccount(page, '6900', '16.00');
    await closeBooksPage.verifyPreviewAccount(page, '8900', '180.00');
    console.log('✓ Preview verified: 7 accounts with correct balances');

    // Confirm and execute the closing
    console.log('--- Executing Close Books ---');
    await closeBooksPage.clickConfirmButton(page);
    await closeBooksPage.waitForCloseComplete(page);
    console.log('✓ Close books executed successfully');

    // Navigate to the journal page to verify the closing transactions
    console.log('--- Verifying Closing Transactions ---');
    await headerPage.waitForHeader(page);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    // The close-books service creates one transaction per income/expense
    // account with a non-zero balance. Each has a description like
    // "Close revenue account ..." or "Close expense account ...".
    // Verify that closing transactions exist (7 transactions expected).
    const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
    if (journalId) {
      const response = await page.request.get(`/api/journal/${journalId}/transactions`);
      if (response.ok()) {
        const allTransactions = await response.json();
        const closingTransactions = allTransactions.filter(
          (tx: any) => tx.description && tx.description.startsWith('Close ')
        );
        console.log(`Found ${closingTransactions.length} closing transactions`);
        expect(closingTransactions.length).toBe(7);

        // Verify each closing transaction has the Closing tag
        for (const tx of closingTransactions) {
          const hasClosingTag = tx.tags && tx.tags.some((tag: any) => tag.key === 'Closing');
          if (!hasClosingTag) {
            throw new Error(`Closing transaction "${tx.description}" is missing the Closing tag`);
          }
        }
        console.log('✓ All 7 closing transactions have the Closing tag');
      } else {
        throw new Error(`Failed to fetch transactions: ${response.status()}`);
      }
    }

    // Verify that closing the books locked the journal.
    // The CloseBooksService locks the journal after creating the closing
    // transactions, so the journal should now be in a locked state.
    console.log('--- Verifying journal is locked after closing ---');
    if (journalId) {
      const metaResponse = await page.request.get(`/api/journal/${journalId}/metadata`);
      if (metaResponse.ok()) {
        const metadata = await metaResponse.json();
        expect(metadata.locked).toBe(true);
        console.log('✓ Journal is locked (confirmed via API)');
      }
    }

    // Verify the 🔒 lock icon appears in the header
    const lockIcon = page.locator('#current-journal-name .journal-lock-icon');
    await expect(lockIcon).toBeVisible({ timeout: 10000 });
    console.log('✓ Lock icon (🔒) is visible in the header');

    console.log('✓ Close the books (Phase 3) verified!');
    console.log('=== Test 7.5: Close the Books (Phase 3) - PASSED ===');
  });

  // ==========================================================================
  // Test 7.6: Phase 3 — Verify Reports After Closing
  //
  // After Phase 3 closing (dated 2024-12-31), ALL revenue and expense
  // accounts are zeroed, because every transaction in the test suite is
  // dated in 2024 and is therefore captured by the 2024-12-31 closing.
  //
  // So after closing:
  //   - 3400 Revenue = 0 (closed)
  //   - 6500, 6570.001, 6570.002, 6700, 6900, 8900 = 0 (all closed)
  //   - 2979 = 10.00 (LegalReserveAllocation) + 158.50 (net loss from
  //     closing: 178.00 revenue − 336.50 expenses) = 168.50 (debit)
  // ==========================================================================
  test('should verify reports after closing the books (Phase 3)', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 7.6: Verify Reports After Closing (Phase 3) ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);

    // ========================================================================
    // Verify Income Statement — should be all zeros after closing
    // ========================================================================
    console.log('--- Verifying Income Statement (Post-Closing) ---');
    await reportsPage.selectReportTemplate(page, 'Income Statement');
    await reportsPage.generateReport(page);

    // After closing, all revenue and expense accounts are zeroed.
    // The income statement should show no accounts (they're hidden by
    // hideZeroBalances) and the net result should be 0.
    // Revenue and Expenses sections should still exist but with zero totals.
    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifySectionExists(page, 'Expenses');

    // After closing, the net result is 0 — the report may show "Net Income 0.00 CHF"
    // or may not show a net result line at all (if subtotal is 0, the calculated
    // section may be hidden). Either way, there should be NO "Net Loss" or "Net Income"
    // with a non-zero value.
    const content = await page.content();
    const nonZeroNetResult = content.match(/Net\s+(?:Loss|Income)[\s\S]{0,50}?(\d+[,.]?\d*)\s*CHF/);
    if (nonZeroNetResult) {
      const value = nonZeroNetResult[1].replace(/,/g, '');
      if (parseFloat(value) !== 0) {
        throw new Error(`Income statement should show zero net result after closing, but found: ${nonZeroNetResult[0]}`);
      }
    }
    console.log('✓ Income statement shows zero net result after closing');

    // ========================================================================
    // Verify Balance Sheet — should still balance, with 2979 absorbing the loss
    // ========================================================================
    console.log('--- Verifying Balance Sheet (Post-Closing) ---');
    await reportsPage.selectReportTemplate(page, 'Balance Sheet');
    await reportsPage.generateReport(page);

    // After closing:
    //   Assets: 1020=1,680.50, 1100=179.10, 1230=40.00 → Total=1,899.60 (unchanged)
    //   Liabilities: 2200=8.10, 2208=50.00 → Total=58.10 (unchanged)
    //   Equity: 2800=2,000.00, 2950=10.00, 2979=-168.50
    //     2979 = 10.00 (debit from LegalReserveAllocation)
    //          + 158.50 (net loss from closing: 178.00 − 336.50 = 158.50)
    //          = 168.50 (debit) → displays as -168.50 with invertSign
    //     Equity Total = 2,000.00 + 10.00 − 168.50 = 1,841.50
    //   Net income = 0 (all accounts closed)
    //   Total L+E = 58.10 + 1,841.50 = 1,899.60 ✓

    await reportsPage.verifySectionExists(page, 'Cash and Cash Equivalents');
    await reportsPage.verifyAccountBalance(page, '1020', '1,680.50');
    await reportsPage.verifyTotal(page, 'Cash and Cash Equivalents Total', '1,680.50');

    await reportsPage.verifySectionExists(page, 'Other Assets');
    await reportsPage.verifyAccountBalance(page, '1100', '179.10');
    await reportsPage.verifyAccountBalance(page, '1230', '40.00');
    await reportsPage.verifyTotal(page, 'Other Assets Total', '219.10');

    await reportsPage.verifyTotal(page, 'Total Assets', '1,899.60');

    await reportsPage.verifySectionExists(page, 'Liabilities');
    await reportsPage.verifyAccountBalance(page, '2200', '8.10');
    await reportsPage.verifyAccountBalance(page, '2208', '50.00');
    await reportsPage.verifyTotal(page, 'Liabilities Total', '58.10');
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');

    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00');
    await reportsPage.verifyAccountBalance(page, '2950', '10.00');
    // 2979 = 10.00 (LegalReserveAllocation debit)
    //      + 158.50 (net loss from closing all 2024 accounts)
    //      = 168.50 (debit) → displays as -168.50 with invertSign
    await reportsPage.verifyAccountBalance(page, '2979', '-168.50');
    await reportsPage.verifyTotal(page, 'Equity Total', '1,841.50');

    // After closing, net income is 0, so there should be no Net Loss/Income line
    // with a non-zero value. Total L+E = 58.10 + 1,841.50 = 1,899.60
    await reportsPage.verifyBalanceSheetBalances(page, '1,899.60');

    console.log('✓ Balance sheet verified — balances after closing!');
    console.log('=== Test 7.6: Verify Reports After Closing (Phase 3) - PASSED ===');
  });
});
