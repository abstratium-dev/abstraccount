import { test, expect } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as macrosPage from '../pages/macros.page';
import * as reportsPage from '../pages/reports.page';
import * as toastPage from '../pages/toast.page';
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
  // Test 7.3: Verify Reports After Year-End Closing
  // ==========================================================================
  test('should verify Balance Sheet report after year-end closing', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Balance Sheet Verification (After Year-End Closing) ===');

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

    // Select and generate Balance Sheet report
    await reportsPage.selectReportTemplate(page, 'Balance Sheet');
    await reportsPage.generateReport(page);

    // Verify report structure and values
    console.log('--- Verifying Balance Sheet ---');

    // Expected values after year-end closing (test 007):
    // Starting state from test 004 (after 004.1-004.6b and 004.9):
    //   1020 Bank = 1,680.50, 1100 Receivables = 179.10, 1230 Inventory = 40.00
    //   2200 VAT = 8.10, 2208 Tax liabilities = 0.00, 2210.001 = 0.00
    //   2800 = 2,000.00, 2950 Legal reserves = 0.00, 2979 Annual P/L = 0.00
    //   3400 Revenue = 178.00, 8900 = 130.00 (75.00 from T12a + 55.00 from 004.9)
    //   Net Loss before 007: 108.50 (revenue 178.00 - expenses 286.50)
    // After test 007 (TaxProvision 50.00 + LegalReserveAllocation 10.00):
    //   8900 = 130.00 + 50.00 = 180.00
    //   2208 Tax liabilities = 0.00 + 50.00 = 50.00
    //   2950 Legal reserves = 0.00 + 10.00 = 10.00
    //   2979 Annual P/L = 0.00 + 10.00 debit = 10.00 (debit, reduces distributable profit)
    //   Expenses: 286.50 + 50.00 = 336.50
    //   Net Loss: 178.00 - 336.50 = 158.50
    //   Total Assets: 1,680.50 + 179.10 + 40.00 = 1,899.60 (unchanged)
    //   Total L+E: 8.10 (VAT) + 50.00 (2208) + 2,000.00 (share capital) + 10.00 (2950)
    //              - 10.00 (2979 debit) - 158.50 (net loss) = 1,899.60

    await reportsPage.verifySectionExists(page, 'Cash and Cash Equivalents');
    await reportsPage.verifyAccountBalance(page, '1020', '1,680.50');

    await reportsPage.verifySectionExists(page, 'Assets');
    await reportsPage.verifyAccountBalance(page, '1100', '179.10');

    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00');

    // After year-end closing, the net loss is 158.50 (was 108.50 before test 007)
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*158\.50\s*CHF/, 'Net Loss');

    // Verify the balance sheet balances
    await reportsPage.verifyBalanceSheetBalances(page, '1,899.60');

    // Verify no negative signs in Liabilities section (sign inversion bug check)
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');

    console.log('✓ Balance Sheet verified successfully!');
    console.log('=== Balance Sheet Verification Complete ===');
  });

  test('should verify Income Statement report after year-end closing', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Income Statement Verification (After Year-End Closing) ===');

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

    // Verify report structure and values
    console.log('--- Verifying Income Statement ---');

    // Expected: Revenue: 3400 (178.00)
    // Expenses: 6500 (9.30) + 6570.001 (17.00) + 6570.002 (100.00) + 6700 (14.20)
    //           + 6900 (16.00) + 8900 (180.00) = 336.50
    // Net Loss: 178.00 - 336.50 = 158.50

    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifyAccountBalance(page, '3400', '178.00');

    await reportsPage.verifySectionExists(page, 'Expenses');
    await reportsPage.verifyAccountBalance(page, '6500', '9.30');
    await reportsPage.verifyAccountBalance(page, '6570.001', '17.00');
    await reportsPage.verifyAccountBalance(page, '6570.002', '100.00');
    await reportsPage.verifyAccountBalance(page, '6700', '14.20');
    await reportsPage.verifyAccountBalance(page, '6900', '16.00');
    // 8900 = 130.00 (from test 004) + 50.00 (from test 007 TaxProvision) = 180.00
    await reportsPage.verifyAccountBalance(page, '8900', '180.00');

    // Verify Net Loss (revenue 178.00 - expenses 336.50 = -158.50)
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*158\.50\s*CHF/, 'Net Loss of 158.50');

    console.log('✓ Income Statement verified successfully!');
    console.log('=== Income Statement Verification Complete ===');
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
});
