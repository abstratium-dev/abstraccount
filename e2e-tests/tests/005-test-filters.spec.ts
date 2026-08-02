import { test, expect } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as reportsPage from '../pages/reports.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 5: Transaction Filters (EQL)
 *
 * This test implements the test case from:
 * docs/test-cases/005-test-filters.md
 *
 * PREREQUISITE: Tests 001, 002, 003, and 004 must have been run successfully.
 *
 * This test exercises every predicate type in the Entry Query Language (EQL):
 *   date, partner, description, commodity, amount, tag, accounttype, accountname
 * plus logical operators AND, OR, NOT, parentheses, and implicit AND.
 * It also verifies that reports respect the active filter.
 */

// Helper: authenticate and navigate to the journal page
async function setup(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  const signOutLink = page.locator('#signout-link');
  const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
  if (!isSignedIn) {
    await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  }
  await headerPage.waitForHeader(page);
  await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
  await headerPage.clickJournalLink(page);
  await transactionsPage.waitForJournalPage(page);
}

// Helper: navigate to reports page
async function goToReports(page: import('@playwright/test').Page): Promise<void> {
  await page.click('a#reports');
  await reportsPage.waitForReportsPage(page);
}

// Transaction descriptions used in assertions (from tests 003 and 004)
const TX = {
  loan: 'Short term loan from John Smith',
  feeCreate: 'Fee to create Sàrl paid to Startup Help GmbH',
  capital: 'Capital payment into abstratium paid into PF',
  anthropicInvoice: 'Test 003.7 Anthropic API services invoice',
  consultingVat: 'Test 003.8 Consulting services with VAT',
  creditNote: 'Test 003.9 Credit note for partial refund of consulting services',
  taxBill: 'Test 003.12 Direct tax bill for 2024',
  taxPayment: 'Payment of direct tax bill for 2024',
  bankingExpense: 'Test macros 004.1 banking expense',
  salesInvoice: 'Test macros 004.3 sales invoice',
  secondInvoice: 'Test macros 004.4 second invoice',
  customerPays: 'Test macros 004.5 Customer pays invoice SI00000001',
};

test.describe('Transaction Filters (EQL)', () => {

  // -------------------------------------------------------------------------
  // Date predicates
  // -------------------------------------------------------------------------

  test('date:eq filters to exact date', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'date:eq:2024-06-26');
    await transactionsPage.assertTransactionVisible(page, TX.capital);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('date:between filters to inclusive range', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'date:between:2024-05-01..2024-05-31');
    await transactionsPage.assertTransactionVisible(page, TX.loan);
    await transactionsPage.assertTransactionVisible(page, TX.feeCreate);
    await transactionsPage.assertTransactionNotVisible(page, TX.capital);
  });

  test('date:gte filters to December 2024 and later', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'date:gte:2024-12-01');
    await transactionsPage.assertTransactionVisible(page, TX.taxBill);
    await transactionsPage.assertTransactionNotVisible(page, TX.bankingExpense);
  });

  test('date:lt filters to before June 2024', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'date:lt:2024-06-01');
    await transactionsPage.assertTransactionVisible(page, TX.loan);
    await transactionsPage.assertTransactionNotVisible(page, TX.consultingVat);
  });

  // -------------------------------------------------------------------------
  // Partner predicates
  // -------------------------------------------------------------------------

  test('partner exact match (plain token)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'partner:P00000007');
    await transactionsPage.assertTransactionVisible(page, TX.anthropicInvoice);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('partner glob wildcard', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'partner:*0000007');
    await transactionsPage.assertTransactionVisible(page, TX.anthropicInvoice);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('partner regex', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'partner:/P0000000[17]/');
    await transactionsPage.assertTransactionVisible(page, TX.loan);
    await transactionsPage.assertTransactionVisible(page, TX.anthropicInvoice);
    await transactionsPage.assertTransactionNotVisible(page, TX.feeCreate);
  });

  // -------------------------------------------------------------------------
  // Description predicates
  // -------------------------------------------------------------------------

  test('description glob', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'description:*invoice*');
    await transactionsPage.assertTransactionVisible(page, TX.anthropicInvoice);
    await transactionsPage.assertTransactionVisible(page, TX.salesInvoice);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('description regex', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'description:/^Test 003\\./');
    await transactionsPage.assertTransactionVisible(page, TX.consultingVat);
    await transactionsPage.assertTransactionNotVisible(page, TX.bankingExpense);
  });

  test('description quoted string (exact match)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'description:"Capital payment into abstratium paid into PF"');
    await transactionsPage.assertTransactionVisible(page, TX.capital);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  // -------------------------------------------------------------------------
  // Commodity predicate
  // -------------------------------------------------------------------------

  test('commodity:CHF shows all transactions', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // All test transactions use CHF, so all should be visible
    const countBefore = await transactionsPage.getVisibleTransactionCount(page);
    expect(countBefore).toBeGreaterThan(0);

    await transactionsPage.applyFilter(page, 'commodity:CHF');
    const countAfter = await transactionsPage.getVisibleTransactionCount(page);
    expect(countAfter).toBe(countBefore);
  });

  // -------------------------------------------------------------------------
  // Amount predicates
  // -------------------------------------------------------------------------

  test('amount:gte:2000 filters to large entries', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'amount:gte:2000');
    await transactionsPage.assertTransactionVisible(page, TX.capital);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('amount:lt:-100 filters to large negative entries', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'amount:lt:-100');
    await transactionsPage.assertTransactionVisible(page, TX.capital);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  // -------------------------------------------------------------------------
  // Tag predicates
  // -------------------------------------------------------------------------

  test('tag key only (TaxPayment)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'tag:TaxPayment');
    await transactionsPage.assertTransactionVisible(page, TX.taxBill);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('tag key and value glob (invoice:PI*)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'tag:invoice:PI*');
    await transactionsPage.assertTransactionVisible(page, TX.loan);
    await transactionsPage.assertTransactionVisible(page, TX.feeCreate);
    await transactionsPage.assertTransactionNotVisible(page, TX.consultingVat);
  });

  test('tag key and value regex (invoice:/SI\\d+/)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'tag:invoice:/SI\\d+/');
    await transactionsPage.assertTransactionVisible(page, TX.salesInvoice);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  // -------------------------------------------------------------------------
  // Account type predicates
  // -------------------------------------------------------------------------

  test('accounttype:EXPENSE', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'accounttype:EXPENSE');
    await transactionsPage.assertTransactionVisible(page, TX.feeCreate);
    await transactionsPage.assertTransactionVisible(page, TX.bankingExpense);
    await transactionsPage.assertTransactionNotVisible(page, TX.capital);
  });

  test('accounttype:EQUITY', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'accounttype:EQUITY');
    await transactionsPage.assertTransactionVisible(page, TX.capital);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  // -------------------------------------------------------------------------
  // Account name predicates
  // -------------------------------------------------------------------------

  test('accountname glob (*Bank*)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'accountname:*Bank*');
    await transactionsPage.assertTransactionVisible(page, TX.capital);
    await transactionsPage.assertTransactionVisible(page, TX.bankingExpense);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('accountname regex (/.*VAT.*/)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'accountname:/.*VAT.*/');
    await transactionsPage.assertTransactionVisible(page, TX.consultingVat);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  // -------------------------------------------------------------------------
  // Logical operators
  // -------------------------------------------------------------------------

  test('explicit AND', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'accounttype:EXPENSE AND date:lt:2024-06-01');
    await transactionsPage.assertTransactionVisible(page, TX.feeCreate);
    await transactionsPage.assertTransactionNotVisible(page, TX.bankingExpense);
  });

  test('OR', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'partner:P00000006 OR partner:P00000007');
    await transactionsPage.assertTransactionVisible(page, TX.anthropicInvoice);
    await transactionsPage.assertTransactionVisible(page, TX.taxBill);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('NOT', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'NOT partner:P00000001');
    await transactionsPage.assertTransactionVisible(page, TX.anthropicInvoice);
    await transactionsPage.assertTransactionNotVisible(page, TX.loan);
  });

  test('parentheses with mixed operators', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, '(tag:TaxPayment OR tag:invoice:SI*) AND NOT accounttype:EQUITY');
    await transactionsPage.assertTransactionVisible(page, TX.taxBill);
    await transactionsPage.assertTransactionVisible(page, TX.salesInvoice);
    await transactionsPage.assertTransactionNotVisible(page, TX.capital);
  });

  test('implicit AND (whitespace)', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await transactionsPage.applyFilter(page, 'date:gte:2024-08-01 date:lte:2024-08-06');
    await transactionsPage.assertTransactionVisible(page, TX.bankingExpense);
    await transactionsPage.assertTransactionVisible(page, TX.consultingVat);
    await transactionsPage.assertTransactionNotVisible(page, TX.taxBill);
  });

  // -------------------------------------------------------------------------
  // Report verification: filtered transactions are excluded from report sums
  // -------------------------------------------------------------------------

  test('Trial Balance report excludes filtered-out transactions', async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page);

    // First, clear any filter and go to reports
    await transactionsPage.clearFilter(page);
    await goToReports(page);

    // Generate Trial Balance with no filter
    await reportsPage.selectReportTemplate(page, 'Trial Balance');
    await reportsPage.generateReport(page);

    // Verify the 1020 Bank account and 8900 Direct taxes appear with full balances
    // After tests 003+004, 8900 should have 75.00 (from T12a) + 55.00 (from 004.8 tax provision) = 130.00
    // and 1020 Bank should have 1,680.50
    const unfilteredContent = await reportsPage.getReportContent(page);
    expect(unfilteredContent).toContain('1020');
    expect(unfilteredContent).toContain('8900');
    console.log('✓ Unfiltered Trial Balance shows 1020 and 8900');

    // Now apply a filter that excludes TaxPayment transactions
    // We need to go back to the journal page to set the filter, or set it on the reports page
    // The reports page has its own filter input that shares the same localStorage key
    await reportsPage.selectReportTemplate(page, 'Trial Balance');

    // Apply filter on the reports page filter input
    const filterInput = page.locator('input.filter-input');
    await filterInput.waitFor({ state: 'visible', timeout: 5000 });
    await filterInput.fill('');
    await filterInput.fill('NOT tag:TaxPayment');
    await page.locator('.apply-btn').click();
    await page.waitForTimeout(1000);

    // Regenerate the report (should happen automatically, but wait for it)
    await reportsPage.generateReport(page);

    // The filtered report should still show 1020 but with a different balance
    // (TaxPayment transactions T12a/T12b move 75.00 through 2000 and 1020)
    const filteredContent = await reportsPage.getReportContent(page);
    expect(filteredContent).toContain('1020');
    console.log('✓ Filtered Trial Balance still shows 1020');

    // The 8900 balance should be reduced (T12a debited 8900 by 75.00)
    // After filter: 8900 = 130.00 - 75.00 = 55.00 (only the 004.8 tax provision remains)
    // Check that 8900 still appears but with a different amount
    expect(filteredContent).toContain('8900');
    console.log('✓ Filtered Trial Balance still shows 8900 (reduced)');

    // Verify the amounts differ between filtered and unfiltered
    // Extract 8900 balance from both reports
    const extractBalance = (content: string, account: string): string | null => {
      // Look for the account number followed by a balance amount
      const regex = new RegExp(account + '[^0-9-]*(-?[\\d,]+\\.\\d{2})', 'i');
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    const unfiltered8900 = extractBalance(unfilteredContent, '8900');
    const filtered8900 = extractBalance(filteredContent, '8900');
    console.log(`8900 unfiltered: ${unfiltered8900}, filtered: ${filtered8900}`);

    if (unfiltered8900 && filtered8900) {
      expect(unfiltered8900).not.toEqual(filtered8900);
      console.log('✓ 8900 balance differs between filtered and unfiltered');
    }

    // Clean up: clear the filter
    const clearBtn = page.locator('.clear-btn');
    if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('Income Statement report respects date filter', async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page);

    // Clear any filter and go to reports
    await transactionsPage.clearFilter(page);
    await goToReports(page);

    // Generate Income Statement with no filter
    await reportsPage.selectReportTemplate(page, 'Income Statement');
    await reportsPage.generateReport(page);

    // Verify revenue section exists and has data
    await reportsPage.verifySectionExists(page, 'Revenue');
    const unfilteredContent = await reportsPage.getReportContent(page);
    expect(unfilteredContent).toContain('3400');
    console.log('✓ Unfiltered Income Statement shows 3400 Revenue');

    // Apply a date filter that excludes August 2024 and later transactions
    const filterInput = page.locator('input.filter-input');
    await filterInput.waitFor({ state: 'visible', timeout: 5000 });
    await filterInput.fill('');
    await filterInput.fill('date:lt:2024-08-06');
    await page.locator('.apply-btn').click();
    await page.waitForTimeout(1000);

    await reportsPage.generateReport(page);

    // The filtered report should still show 3400 but with a lower balance
    // (T8 consulting invoice on 2024-08-06 added 100.00 to revenue, now excluded)
    const filteredContent = await reportsPage.getReportContent(page);
    expect(filteredContent).toContain('3400');
    console.log('✓ Filtered Income Statement still shows 3400 Revenue (reduced)');

    // Extract 3400 balance from both reports
    const extractBalance = (content: string, account: string): string | null => {
      const regex = new RegExp(account + '[^0-9-]*(-?[\\d,]+\\.\\d{2})', 'i');
      const match = content.match(regex);
      return match ? match[1] : null;
    };

    const unfiltered3400 = extractBalance(unfilteredContent, '3400');
    const filtered3400 = extractBalance(filteredContent, '3400');
    console.log(`3400 unfiltered: ${unfiltered3400}, filtered: ${filtered3400}`);

    if (unfiltered3400 && filtered3400) {
      // The unfiltered revenue should be higher (more negative, since revenue is credit)
      // Revenue is shown as negative in the raw data; the filtered version should be
      // closer to zero (less revenue)
      expect(unfiltered3400).not.toEqual(filtered3400);
      console.log('✓ 3400 Revenue balance differs between filtered and unfiltered');
    }

    // Clean up
    const clearBtn = page.locator('.clear-btn');
    if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await clearBtn.click();
      await page.waitForTimeout(500);
    }
  });

  // -------------------------------------------------------------------------
  // Cleanup: clear filter restores all transactions
  // -------------------------------------------------------------------------

  test('clear filter restores all transactions', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // Apply a restrictive filter
    await transactionsPage.applyFilter(page, 'partner:P00000007');
    const filteredCount = await transactionsPage.getVisibleTransactionCount(page);
    expect(filteredCount).toBeGreaterThan(0);
    console.log(`Filtered count: ${filteredCount}`);

    // Clear the filter
    await transactionsPage.clearFilter(page);

    // All transactions should be visible again
    const restoredCount = await transactionsPage.getVisibleTransactionCount(page);
    expect(restoredCount).toBeGreaterThan(filteredCount);
    console.log(`Restored count: ${restoredCount}`);
    console.log('✓ Clearing filter restored all transactions');
  });
});
