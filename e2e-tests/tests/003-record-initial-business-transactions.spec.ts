import { test, expect, Page } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as reportsPage from '../pages/reports.page';
import * as partnersPage from '../pages/partners.page';
import * as macrosPage from '../pages/macros.page';
import * as toastPage from '../pages/toast.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_PARTNERS } from './test-constants';
import path from 'path';
import fs from 'fs';

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
 * including loans, fees, payments, capital contributions, bank fees, inventory purchases,
 * supplier invoices with delayed payment, sales invoices with VAT, credit notes,
 * expense refunds, inventory write-downs, and direct tax payments.
 *
 * Account balances are verified via the API after every transaction.
 */

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Verifies account balances by fetching all transactions from the API and
 * computing balances per account (matched by account number prefix).
 *
 * @param page - Playwright page object
 * @param expectedBalances - Map of account number -> expected balance (raw sum of amounts)
 */
async function verifyAccountBalances(page: Page, expectedBalances: Record<string, number>): Promise<void> {
  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  if (!journalId) throw new Error('No journalId in localStorage');

  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) throw new Error(`API request failed: ${response.status()}`);
  const transactions = await response.json();

  // Compute balances per account by account name prefix (account number)
  const balances = new Map<string, number>();
  for (const tx of transactions) {
    for (const entry of tx.entries) {
      const accountName: string = entry.accountName || '';
      // Extract account number from account name (e.g., "1000 Cash" -> "1000", "2210.001 John Smith" -> "2210.001")
      const match = accountName.match(/^([\d.]+)/);
      if (match) {
        const accountNumber = match[1];
        const current = balances.get(accountNumber) ?? 0;
        balances.set(accountNumber, current + entry.amount);
      }
    }
  }

  // Verify expected balances
  const errors: string[] = [];
  for (const [accountNumber, expectedBalance] of Object.entries(expectedBalances)) {
    const actualBalance = balances.get(accountNumber) ?? 0;
    if (Math.abs(actualBalance - expectedBalance) > 0.001) {
      errors.push(`Account ${accountNumber}: expected ${expectedBalance.toFixed(2)}, got ${actualBalance.toFixed(2)}`);
    } else {
      console.log(`  ✓ Account ${accountNumber}: ${actualBalance.toFixed(2)} (expected ${expectedBalance.toFixed(2)})`);
    }
  }

  if (errors.length > 0) {
    throw new Error('Balance verification failed:\n  ' + errors.join('\n  '));
  }
}

/**
 * Deletes all transactions matching the given descriptions via the API.
 * This is more reliable than UI-based deletion.
 */
async function deleteTransactionsByDescriptions(page: Page, descriptions: string[]): Promise<void> {
  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  if (!journalId) throw new Error('No journalId in localStorage');

  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) throw new Error(`API request failed: ${response.status()}`);
  const transactions = await response.json();

  let deletedCount = 0;
  for (const tx of transactions) {
    const txDescription: string = tx.description || '';
    // Check if this transaction's description matches any in our list
    const shouldDelete = descriptions.some(desc => txDescription === desc || txDescription.includes(desc));
    if (shouldDelete) {
      const txId = tx.id;
      console.log(`  Deleting transaction: "${txDescription}" (id: ${txId})`);
      const deleteResponse = await page.request.delete(`/api/transaction/${txId}`);
      if (deleteResponse.ok()) {
        deletedCount++;
        console.log(`  ✓ Deleted transaction ${txId}`);
      } else {
        console.log(`  ✗ Failed to delete transaction ${txId}: ${deleteResponse.status()}`);
      }
    }
  }
  console.log(`Cleanup complete: ${deletedCount} transactions deleted`);
}

/**
 * Fills an account autocomplete field in a macro dialog by searching for the
 * parameter field with a label matching the prompt text, then typing the
 * account number and selecting from the dropdown.
 */
async function fillAccountParameter(page: Page, labelPrompt: string, accountNumber: string): Promise<void> {
  console.log(`Filling account parameter "${labelPrompt}" with: ${accountNumber}`);
  const input = page.locator('.parameter-field')
    .filter({ hasText: labelPrompt })
    .locator('abs-autocomplete input.autocomplete-input');
  await input.click();
  await page.waitForTimeout(300);
  await input.fill(accountNumber);
  await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
  await page.waitForTimeout(500);

  // Select the matching dropdown item
  const dropdownItem = page.locator('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)')
    .filter({ hasText: accountNumber });
  await expect(dropdownItem.first()).toBeVisible();
  await dropdownItem.first().click({ force: true });
  await page.waitForTimeout(500);
  console.log(`Account parameter "${labelPrompt}" filled with ${accountNumber}`);
}

/**
 * Descriptions of all transactions for cleanup.
 * Includes both original transactions (1-5b) and new transactions (6-12).
 */
const ALL_TRANSACTION_DESCRIPTIONS = [
  // Original transactions (1-5b)
  'Short term loan from John Smith, to start company',
  'Fee to create Sàrl paid to Startup Help GmbH',
  'Payment of fee to create Sàrl paid to Startup Help GmbH',
  'Receipt for sending founding docs eingeschrieben',
  'Capital payment into abstratium paid into PF',
  'PRIX POUR LA GESTION DU COMPTE CONSIGNATION DU CAPITAL CRÉATION D\'ENTREPRISE',
  // New transactions (6-12)
  'Test 003.6 Purchase components for resale',
  'Test 003.7 Anthropic API services invoice',
  'Test 003.7 Payment of invoice',
  'Test 003.8 Consulting services with VAT',
  'Test 003.9 Credit note for partial refund of consulting services',
  'Test 003.10 Refund for overcharged administrative expense',
  'Test 003.11 Year-end inventory write-down for obsolete components',
  'Test 003.12 Direct tax bill for 2024',
  'Payment of direct tax bill for 2024',
];

test.describe('Initial Business Transactions', () => {
  test('should record all initial business formation transactions', async ({ page }) => {
    test.setTimeout(300_000);
    console.log('=== Starting Test 3: Record Initial Business Transactions ===');

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
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');

    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    console.log('Journal page loaded');

    // ========================================================================
    // Ensure required partners exist before recording transactions
    // ========================================================================
    console.log('--- Ensuring required partners exist ---');
    await partnersPage.ensurePartnersExist(page, TEST_PARTNERS);

    // Navigate back to the journal page after partner creation
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    // ========================================================================
    // Cleanup: Delete any existing transactions from prior runs via API
    // ========================================================================
    console.log('--- Cleaning up existing transactions from prior runs ---');
    await deleteTransactionsByDescriptions(page, ALL_TRANSACTION_DESCRIPTIONS);
    await page.waitForLoadState('networkidle');
    // Reload the page to reflect the cleaned state
    await page.reload();
    await transactionsPage.waitForJournalPage(page);
    
    // ========================================================================
    // Transaction 1: Short-term Loan from Founder
    // ========================================================================
    console.log('--- Transaction 1: Short-term Loan from Founder ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-05-25');
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

    // Verify balances after Transaction 1
    console.log('--- Verifying balances after Transaction 1 ---');
    await verifyAccountBalances(page, {
      '1000': 38.50,
      '2210.001': -38.50,
    });

    // ========================================================================
    // Transaction 2a: Administrative Fee Invoice
    // ========================================================================
    console.log('--- Transaction 2a: Administrative Fee Invoice ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-05-26');
    await transactionsPage.fillTransactionDescription(page, 'Fee to create Sàrl paid to Startup Help GmbH');
    await transactionsPage.fillTransactionPartner(page, 'P00000002');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:PI00000002');
    
    // Entry 1: Debit Administrative expenses CHF 34.30
    await transactionsPage.createEntry(page, 0, '6500', 34.30, 'CHF');

    // Entry 2: Credit Accounts payable CHF 34.30
    await transactionsPage.createEntry(page, 1, '2000', -34.30, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 2a saved: Administrative fee invoice');

    // Verify balances after Transaction 2a
    console.log('--- Verifying balances after Transaction 2a ---');
    await verifyAccountBalances(page, {
      '1000': 38.50,
      '2000': -34.30,
      '2210.001': -38.50,
      '6500': 34.30,
    });

    // ========================================================================
    // Transaction 2b: Administrative Fee Payment
    // ========================================================================
    console.log('--- Transaction 2b: Administrative Fee Payment ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-05-26');
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

    // Verify balances after Transaction 2b
    console.log('--- Verifying balances after Transaction 2b ---');
    await verifyAccountBalances(page, {
      '1000': 4.20,
      '2000': 0.00,
      '2210.001': -38.50,
      '6500': 34.30,
    });

    // ========================================================================
    // Transaction 3a: Postal Service Fee Invoice
    // ========================================================================
    console.log('--- Transaction 3a: Postal Service Fee Invoice ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-06-18');
    await transactionsPage.fillTransactionDescription(page, 'Receipt for sending founding docs eingeschrieben');
    await transactionsPage.fillTransactionPartner(page, 'P00000003');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:PI00000003');

    // Entry 1: Debit Other operating expenses CHF 4.20
    await transactionsPage.createEntry(page, 0, '6700', 4.20, 'CHF');

    // Entry 2: Credit Accounts payable CHF 4.20
    await transactionsPage.createEntry(page, 1, '2000', -4.20, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 3a saved: Postal service fee invoice');

    // Verify balances after Transaction 3a
    console.log('--- Verifying balances after Transaction 3a ---');
    await verifyAccountBalances(page, {
      '1000': 4.20,
      '2000': -4.20,
      '2210.001': -38.50,
      '6500': 34.30,
      '6700': 4.20,
    });

    // ========================================================================
    // Transaction 3b: Postal Service Fee Payment
    // ========================================================================
    console.log('--- Transaction 3b: Postal Service Fee Payment ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-06-18');
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

    // Verify balances after Transaction 3b
    console.log('--- Verifying balances after Transaction 3b ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '2000': 0.00,
      '2210.001': -38.50,
      '6500': 34.30,
      '6700': 4.20,
    });

    // ========================================================================
    // Transaction 4: Capital Contribution
    // ========================================================================
    console.log('--- Transaction 4: Capital Contribution ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-06-26');
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

    // Verify balances after Transaction 4
    console.log('--- Verifying balances after Transaction 4 ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 2000.00,
      '2000': 0.00,
      '2210.001': -38.50,
      '2800': -2000.00,
      '6500': 34.30,
      '6700': 4.20,
    });

    // ========================================================================
    // Transaction 5a: Bank Account Management Fee Invoice
    // ========================================================================
    console.log('--- Transaction 5a: Bank Account Management Fee Invoice ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-07-24');
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

    // Verify balances after Transaction 5a
    console.log('--- Verifying balances after Transaction 5a ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 2000.00,
      '2000': -15.00,
      '2210.001': -38.50,
      '2800': -2000.00,
      '6500': 34.30,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 5b: Bank Account Management Fee Payment
    // ========================================================================
    console.log('--- Transaction 5b: Bank Account Management Fee Payment ---');
    
    await transactionsPage.clickAddTransaction(page);
    
    await transactionsPage.fillTransactionDate(page, '2024-07-24');
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

    // Verify balances after Transaction 5b
    console.log('--- Verifying balances after Transaction 5b ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1985.00,
      '2000': 0.00,
      '2210.001': -38.50,
      '2800': -2000.00,
      '6500': 34.30,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 6: Purchase Goods for Resale (PaymentForGoods macro)
    // ========================================================================
    console.log('--- Transaction 6: Purchase Goods for Resale (PaymentForGoods macro) ---');

    // Navigate to macros page
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    await macrosPage.selectMacro(page, 'PaymentForGoods');

    // Fill in macro parameters
    await macrosPage.fillParameter(page, 'date', '2024-08-01');
    await macrosPage.fillParameterAutocomplete(page, 'Partner (supplier)', 'P00000002');
    await macrosPage.fillParameter(page, 'invoice_number', 'PI00000006');
    await macrosPage.fillParameter(page, 'amount', '50.00');
    await macrosPage.fillParameter(page, 'description', 'Test 003.6 Purchase components for resale');

    // Fill inventory account and liability account using label-based selection
    await fillAccountParameter(page, 'Inventory account', '1230');
    await fillAccountParameter(page, 'Liability account', '1020');

    await macrosPage.executeMacro(page);
    await page.waitForTimeout(2000);

    // Close macro dialog if still open
    const macroDialog6 = page.locator('.modal-overlay');
    if (await macroDialog6.isVisible().catch(() => false)) {
      await macrosPage.closeDialog(page);
    }

    // Navigate back to journal page
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 6 saved: Purchase goods for resale');

    // Verify balances after Transaction 6
    console.log('--- Verifying balances after Transaction 6 ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1935.00,
      '1230': 50.00,
      '2000': 0.00,
      '2210.001': -38.50,
      '2800': -2000.00,
      '6500': 34.30,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 7a: Supplier Invoice (delayed payment - step 1)
    // ========================================================================
    console.log('--- Transaction 7a: Supplier Invoice (delayed payment - step 1) ---');

    await transactionsPage.clickAddTransaction(page);

    await transactionsPage.fillTransactionDate(page, '2024-08-03');
    await transactionsPage.fillTransactionDescription(page, 'Test 003.7 Anthropic API services invoice');
    await transactionsPage.fillTransactionPartner(page, 'P00000007');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:PI00000007');

    // Entry 1: Debit Expense (Anthropic) CHF 100.00
    await transactionsPage.createEntry(page, 0, '6570.002', 100.00, 'CHF');

    // Entry 2: Credit Accounts Payable CHF 100.00
    await transactionsPage.createEntry(page, 1, '2000', -100.00, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 7a saved: Supplier invoice');

    // Verify balances after Transaction 7a (invoice created, not yet paid)
    console.log('--- Verifying balances after Transaction 7a ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1935.00,
      '1230': 50.00,
      '2000': -100.00,
      '2210.001': -38.50,
      '2800': -2000.00,
      '6500': 34.30,
      '6570.002': 100.00,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 7b: Supplier Payment (delayed payment - step 2)
    // ========================================================================
    console.log('--- Transaction 7b: Supplier Payment (delayed payment - step 2) ---');

    await transactionsPage.clickAddTransaction(page);

    await transactionsPage.fillTransactionDate(page, '2024-08-10');
    await transactionsPage.fillTransactionDescription(page, 'Test 003.7 Payment of invoice');
    await transactionsPage.fillTransactionPartner(page, 'P00000007');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:PI00000007');
    await transactionsPage.addTag(page, 'Payment');

    // Entry 1: Debit Accounts Payable CHF 100.00
    await transactionsPage.createEntry(page, 0, '2000', 100.00, 'CHF');

    // Entry 2: Credit Bank Account CHF 100.00
    await transactionsPage.createEntry(page, 1, '1020', -100.00, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 7b saved: Supplier payment');

    // Verify balances after Transaction 7b (invoice paid, A/P cleared)
    console.log('--- Verifying balances after Transaction 7b ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1835.00,
      '1230': 50.00,
      '2000': 0.00,
      '2210.001': -38.50,
      '2800': -2000.00,
      '6500': 34.30,
      '6570.002': 100.00,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 8: Sales Invoice with VAT (3-entry transaction)
    // ========================================================================
    console.log('--- Transaction 8: Sales Invoice with VAT (3-entry transaction) ---');

    await transactionsPage.clickAddTransaction(page);

    await transactionsPage.fillTransactionDate(page, '2024-08-06');
    await transactionsPage.fillTransactionDescription(page, 'Test 003.8 Consulting services with VAT');
    await transactionsPage.fillTransactionPartner(page, 'P00000001');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:SV00000001');

    // Entry 1: Debit Accounts Receivable CHF 108.10
    await transactionsPage.createEntry(page, 0, '1100', 108.10, 'CHF');

    // Entry 2: Credit Revenue CHF 100.00
    await transactionsPage.createEntry(page, 1, '3400', -100.00, 'CHF');

    // Entry 3: Credit VAT payable CHF 8.10 (need to add a third entry)
    await transactionsPage.clickAddEntry(page);
    await transactionsPage.createEntry(page, 2, '2200', -8.10, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 8 saved: Sales invoice with VAT');

    // Verify balances after Transaction 8
    console.log('--- Verifying balances after Transaction 8 ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1835.00,
      '1100': 108.10,
      '1230': 50.00,
      '2000': 0.00,
      '2200': -8.10,
      '2210.001': -38.50,
      '2800': -2000.00,
      '3400': -100.00,
      '6500': 34.30,
      '6570.002': 100.00,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 9: Credit Note to Customer (Revenue Reversal)
    // ========================================================================
    console.log('--- Transaction 9: Credit Note to Customer ---');

    await transactionsPage.clickAddTransaction(page);

    await transactionsPage.fillTransactionDate(page, '2024-08-08');
    await transactionsPage.fillTransactionDescription(page, 'Test 003.9 Credit note for partial refund of consulting services');
    await transactionsPage.fillTransactionPartner(page, 'P00000001');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:CN00000001');

    // Entry 1: Debit Revenue CHF 40.00 (reverses revenue)
    await transactionsPage.createEntry(page, 0, '3400', 40.00, 'CHF');

    // Entry 2: Credit Accounts Receivable CHF 40.00 (reduces receivable)
    await transactionsPage.createEntry(page, 1, '1100', -40.00, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 9 saved: Credit note to customer');

    // Verify balances after Transaction 9
    console.log('--- Verifying balances after Transaction 9 ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1835.00,
      '1100': 68.10,
      '1230': 50.00,
      '2000': 0.00,
      '2200': -8.10,
      '2210.001': -38.50,
      '2800': -2000.00,
      '3400': -60.00,
      '6500': 34.30,
      '6570.002': 100.00,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 10: Expense Refund from Supplier (Expense Reversal)
    // ========================================================================
    console.log('--- Transaction 10: Expense Refund from Supplier ---');

    await transactionsPage.clickAddTransaction(page);

    await transactionsPage.fillTransactionDate(page, '2024-08-12');
    await transactionsPage.fillTransactionDescription(page, 'Test 003.10 Refund for overcharged administrative expense');
    await transactionsPage.fillTransactionPartner(page, 'P00000002');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'invoice:PC00000001');

    // Entry 1: Debit Bank Account CHF 25.00 (cash back)
    await transactionsPage.createEntry(page, 0, '1020', 25.00, 'CHF');

    // Entry 2: Credit Administrative Expenses CHF 25.00 (reduces expense)
    await transactionsPage.createEntry(page, 1, '6500', -25.00, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 10 saved: Expense refund from supplier');

    // Verify balances after Transaction 10
    console.log('--- Verifying balances after Transaction 10 ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1860.00,
      '1100': 68.10,
      '1230': 50.00,
      '2000': 0.00,
      '2200': -8.10,
      '2210.001': -38.50,
      '2800': -2000.00,
      '3400': -60.00,
      '6500': 9.30,
      '6570.002': 100.00,
      '6700': 4.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 11: Inventory Write-Down (InventoryAdjustment macro)
    // ========================================================================
    console.log('--- Transaction 11: Inventory Write-Down (InventoryAdjustment macro) ---');

    // Navigate to macros page
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    await macrosPage.selectMacro(page, 'InventoryAdjustment UNTESTED');

    // Fill in macro parameters
    await macrosPage.fillParameter(page, 'date', '2024-12-13');
    await macrosPage.fillParameter(page, 'description', 'Test 003.11 Year-end inventory write-down for obsolete components');
    await macrosPage.fillParameter(page, 'adjustment_amount', '10.00');

    // Fill account parameters using label-based selection
    await fillAccountParameter(page, 'Inventory account', '1230');
    await fillAccountParameter(page, 'Expense account', '6700');

    await macrosPage.executeMacro(page);
    await page.waitForTimeout(2000);

    // Close macro dialog if still open
    const macroDialog11 = page.locator('.modal-overlay');
    if (await macroDialog11.isVisible().catch(() => false)) {
      await macrosPage.closeDialog(page);
    }

    // Navigate back to journal page
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 11 saved: Inventory write-down');

    // Verify balances after Transaction 11
    console.log('--- Verifying balances after Transaction 11 ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1860.00,
      '1100': 68.10,
      '1230': 40.00,
      '2000': 0.00,
      '2200': -8.10,
      '2210.001': -38.50,
      '2800': -2000.00,
      '3400': -60.00,
      '6500': 9.30,
      '6570.002': 100.00,
      '6700': 14.20,
      '6900': 15.00,
    });

    // ========================================================================
    // Transaction 12a: Direct Tax Bill (Invoice)
    // ========================================================================
    console.log('--- Transaction 12a: Direct Tax Bill (Invoice) ---');

    await transactionsPage.clickAddTransaction(page);

    await transactionsPage.fillTransactionDate(page, '2024-12-13');
    await transactionsPage.fillTransactionDescription(page, 'Test 003.12 Direct tax bill for 2024');
    await transactionsPage.fillTransactionPartner(page, 'P00000006');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'TaxPayment:');

    // Entry 1: Debit Direct taxes CHF 75.00
    await transactionsPage.createEntry(page, 0, '8900', 75.00, 'CHF');

    // Entry 2: Credit Accounts payable CHF 75.00
    await transactionsPage.createEntry(page, 1, '2000', -75.00, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 12a saved: Direct tax bill');

    // Verify balances after Transaction 12a (A/P increased, bank unchanged)
    console.log('--- Verifying balances after Transaction 12a ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1860.00,
      '1100': 68.10,
      '1230': 40.00,
      '2000': -75.00,
      '2200': -8.10,
      '2210.001': -38.50,
      '2800': -2000.00,
      '3400': -60.00,
      '6500': 9.30,
      '6570.002': 100.00,
      '6700': 14.20,
      '6900': 15.00,
      '8900': 75.00,
    });

    // ========================================================================
    // Transaction 12b: Direct Tax Payment
    // ========================================================================
    console.log('--- Transaction 12b: Direct Tax Payment ---');

    await transactionsPage.clickAddTransaction(page);

    await transactionsPage.fillTransactionDate(page, '2024-12-13');
    await transactionsPage.fillTransactionDescription(page, 'Payment of direct tax bill for 2024');
    await transactionsPage.fillTransactionPartner(page, 'P00000006');
    await transactionsPage.setTransactionStatus(page, 'CLEARED');
    await transactionsPage.addTag(page, 'Payment:');
    await transactionsPage.addTag(page, 'TaxPayment:');

    // Entry 1: Debit Accounts payable CHF 75.00
    await transactionsPage.createEntry(page, 0, '2000', 75.00, 'CHF');

    // Entry 2: Credit Bank Account CHF 75.00
    await transactionsPage.createEntry(page, 1, '1020', -75.00, 'CHF');

    await transactionsPage.verifyBalanced(page);
    await transactionsPage.saveTransaction(page);
    await page.waitForLoadState('networkidle');

    console.log('✓ Transaction 12b saved: Direct tax payment');

    // Verify balances after Transaction 12b (final)
    console.log('--- Verifying final balances after Transaction 12b ---');
    await verifyAccountBalances(page, {
      '1000': 0.00,
      '1020': 1785.00,
      '1100': 68.10,
      '1230': 40.00,
      '2000': 0.00,
      '2200': -8.10,
      '2210.001': -38.50,
      '2800': -2000.00,
      '3400': -60.00,
      '6500': 9.30,
      '6570.002': 100.00,
      '6700': 14.20,
      '6900': 15.00,
      '8900': 75.00,
    });

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
    await transactionsPage.verifyTransactionExists(page, 'Test 003.6 Purchase components for resale');
    await transactionsPage.verifyTransactionExists(page, 'Test 003.7 Anthropic API services invoice');
    await transactionsPage.verifyTransactionExists(page, 'Test 003.7 Payment of invoice');
    await transactionsPage.verifyTransactionExists(page, 'Test 003.8 Consulting services with VAT');
    await transactionsPage.verifyTransactionExists(page, 'Test 003.9 Credit note for partial refund');
    await transactionsPage.verifyTransactionExists(page, 'Test 003.10 Refund for overcharged administrative expense');
    await transactionsPage.verifyTransactionExists(page, 'Test 003.11 Year-end inventory write-down');
    await transactionsPage.verifyTransactionExists(page, 'Test 003.12 Direct tax bill for 2024');
    await transactionsPage.verifyTransactionExists(page, 'Payment of direct tax bill for 2024');

    console.log('✓ All transactions verified in list');

    console.log('=== Test 3 Complete: All Initial Business Transactions Created Successfully ===');
  });

  test('should verify account balances after all transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Account Balance Verification ===');
    
    // Navigate to the application
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
    
    // Select the journal
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    
    // Navigate to accounts page
    console.log('--- Navigating to Accounts Page ---');
    await page.click('a#accounts-table');
    await page.waitForLoadState('networkidle');
    
    // Define expected balances (final, after all 12 transactions)
    const expectedBalances = [
      { account: '1000', balance: '0.00' },
      { account: '1020', balance: '1,785.00' },
      { account: '1100', balance: '68.10' },
      { account: '1230', balance: '40.00' },
      { account: '2000', balance: '0.00' },
      { account: '2200', balance: '8.10' },
      { account: '2210.001', balance: '38.50' },
      { account: '2800', balance: '2,000.00' },
      { account: '3400', balance: '60.00' },
      { account: '6500', balance: '9.30' },
      { account: '6570.002', balance: '100.00' },
      { account: '6700', balance: '14.20' },
      { account: '6900', balance: '15.00' },
      { account: '8900', balance: '75.00' }
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
      await page.click('a#accounts-table');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('=== All Account Balances Verified Successfully ===');
  });

  test('should import built-in report templates', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Import Built-in Report Templates ===');

    // 1. Navigate and authenticate
    console.log('--- Step 1: Navigating and authenticating ---');
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

    // 2. Navigate to the reports page
    console.log('--- Step 2: Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);

    // 3. Clean up any existing report templates via the API so the import
    //    succeeds with a success toast rather than a conflict dialog.
    console.log('--- Step 3: Cleaning up existing report templates ---');
    await reportsPage.deleteAllReportTemplatesViaApi(page);
    // Reload the reports page so the template dropdown reflects the cleanup
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);

    // 4. Open the reports menu and click "Import Built-in"
    console.log('--- Step 4: Clicking Import Built-in ---');
    await reportsPage.openMenu(page);
    await reportsPage.clickImportBuiltin(page);

    // 5. Assert the success toast announcing the import
    console.log('--- Step 5: Asserting success toast ---');
    await toastPage.waitForSuccessToast(page, /Successfully imported \d+ report template\(s\)/);

    // 6. Verify the templates now appear in the dropdown
    console.log('--- Step 6: Verifying templates are available ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    const templateNames = await reportsPage.getTemplateNames(page);
    console.log(`Available templates: ${templateNames.join(', ')}`);
    expect(templateNames.length).toBeGreaterThan(0);
    // The built-in export includes the Balance Sheet template, which the
    // subsequent report-verification tests rely on.
    expect(templateNames.some(n => n.includes('Balance Sheet'))).toBe(true);

    console.log('✓ Built-in report templates imported successfully!');
    console.log('=== Import Built-in Report Templates Complete ===');
  });

  test('should verify Balance Sheet report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Balance Sheet Verification ===');
    
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

    // Expected values based on all 12 transactions:
    // Assets: 1020 Bank = 1,785.00, 1100 A/R = 68.10, 1230 Inventory = 40.00
    // Total Assets: 1,893.10
    // Liabilities: 2200 VAT = 8.10, 2210.001 John Smith = 38.50
    // Total Liabilities: 46.60
    // Equity: 2800 Share Capital = 2,000.00
    // Net Loss: 153.50 (expenses 213.50 - revenue 60.00)
    // Total Equity: 2,000.00 - 153.50 = 1,846.50
    // Total L+E: 46.60 + 1,846.50 = 1,893.10 (must equal Total Assets)

    await reportsPage.verifySectionExists(page, 'Cash and Cash Equivalents');
    await reportsPage.verifyAccountBalance(page, '1020', '1,785.00');

    await reportsPage.verifySectionExists(page, 'Assets');
    await reportsPage.verifyAccountBalance(page, '1100', '68.10');
    await reportsPage.verifyAccountBalance(page, '1230', '40.00');

    await reportsPage.verifySectionExists(page, 'Liabilities');
    await reportsPage.verifyAccountBalance(page, '2200', '8.10');
    await reportsPage.verifyAccountBalance(page, '2210.001', '38.50');

    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00');

    await reportsPage.verifyReportMatches(page, /Net.*Loss.*153\.50\s*CHF/, 'Net Loss');

    // Verify the balance sheet balances
    await reportsPage.verifyBalanceSheetBalances(page, '1,893.10');

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

    // Expected: Revenue 3400 = 60.00, Expenses: 6500 (9.30) + 6570.002 (100.00) + 6700 (14.20) + 6900 (15.00) + 8900 (75.00) = 213.50
    // Net Loss: 213.50 - 60.00 = 153.50
    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifyAccountBalance(page, '3400', '60.00');

    await reportsPage.verifySectionExists(page, 'Expenses');
    await reportsPage.verifyAccountBalance(page, '6500', '9.30');
    await reportsPage.verifyAccountBalance(page, '6570.002', '100.00');
    await reportsPage.verifyAccountBalance(page, '6700', '14.20');
    await reportsPage.verifyAccountBalance(page, '6900', '15.00');
    await reportsPage.verifyAccountBalance(page, '8900', '75.00');

    // Verify Net Loss (expenses 213.50 - revenue 60.00 = 153.50)
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*153\.50\s*CHF/, 'Net Loss of 153.50');
    
    console.log('✓ Income Statement verified successfully!');
    console.log('=== Income Statement Verification Complete ===');
  });

  test('should verify Swiss Balance Sheet (Bilan) report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Swiss Balance Sheet (Bilan) Verification ===');
    
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
    await reportsPage.verifyAccountBalance(page, '1020', '1,785.00'); // Bank account
    await reportsPage.verifyAccountBalance(page, '1100', '68.10'); // Accounts receivable
    await reportsPage.verifyAccountBalance(page, '1230', '40.00'); // Inventory
    await reportsPage.verifyAccountBalance(page, '2200', '8.10'); // VAT payable
    await reportsPage.verifyAccountBalance(page, '2210.001', '38.50'); // John Smith liability
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00'); // Share capital

    // Swiss Balance Sheet includes net income in equity, not as separate line
    // So we just verify the accounts and that it balances

    // Verify no negative signs in liability and equity sections (sign inversion check)
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');
    await reportsPage.verifyNoNegativeValues(page, 'Equity');

    // Verify the balance sheet balances (Assets = Liabilities + Equity)
    // Total Assets: 1,785.00 + 68.10 + 40.00 = 1,893.10
    await reportsPage.verifyBalanceSheetBalances(page, '1,893.10');
    
    console.log('✓ Swiss Balance Sheet verified successfully!');
    console.log('=== Swiss Balance Sheet Verification Complete ===');
  });

  test('should verify Swiss Income Statement (Compte de résultat) report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Swiss Income Statement Verification ===');
    
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
    
    // Check that expenses section has data (should show 213.50 total expenses, 60.00 revenue, 153.50 net loss)
    if (!content.includes('Expenses')) {
      throw new Error('Expenses section not found in Swiss Income Statement');
    }
    console.log('✓ Expenses section found');

    // Verify Net Income appears with the correct amount (153.50 net loss)
    const hasNetIncome = content.includes('Net Income') || content.includes('Net Loss');
    const hasAmount = content.includes('153.50') || content.includes('153,50');

    if (!hasNetIncome) {
      throw new Error('Net Income/Loss label not found in Swiss Income Statement');
    }
    if (!hasAmount) {
      throw new Error('Amount 153.50 CHF not found in Swiss Income Statement');
    }
    console.log('✓ Net Income/Loss: 153.50 CHF verified');
    
    console.log('✓ Swiss Income Statement verified with all values');
    
    console.log('✓ Swiss Income Statement verified successfully!');
    console.log('=== Swiss Income Statement Verification Complete ===');
  });

  test('should verify Trial Balance report is correct', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Trial Balance Verification ===');
    
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
    await reportsPage.verifySectionExists(page, 'Liabilities');
    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifySectionExists(page, 'Expenses');

    // Verify key accounts with their debit/credit balances
    // Account 1020: Net Debit 1,785.00
    await reportsPage.verifyReportContains(page, '1020', 'Bank Account');
    await reportsPage.verifyReportContains(page, '1,785.00', 'Bank balance');

    // Account 1100: Net Debit 68.10
    await reportsPage.verifyReportContains(page, '1100', 'Accounts receivable');
    await reportsPage.verifyReportContains(page, '68.10', 'Receivables balance');

    // Account 1230: Net Debit 40.00
    await reportsPage.verifyReportContains(page, '1230', 'Goods held for resale');
    await reportsPage.verifyReportContains(page, '40.00', 'Inventory balance');

    // Account 2210.001: Credit 38.50
    await reportsPage.verifyReportContains(page, '2210.001', 'John Smith liability');
    await reportsPage.verifyReportContains(page, '38.50', 'John Smith balance');

    // Account 2800: Credit 2,000.00
    await reportsPage.verifyReportContains(page, '2800', 'Share Capital');
    await reportsPage.verifyReportContains(page, '2,000.00', 'Share Capital balance');

    // Account 3400: Credit 60.00 (revenue)
    await reportsPage.verifyReportContains(page, '3400', 'Revenue from services');
    await reportsPage.verifyReportContains(page, '60.00', 'Revenue balance');

    // Account 6500: Debit 9.30 (34.30 - 25.00 refund)
    await reportsPage.verifyReportContains(page, '6500', 'Administrative expenses');
    await reportsPage.verifyReportContains(page, '9.30', 'Administrative expenses balance');

    // Account 8900: Debit 75.00
    await reportsPage.verifyReportContains(page, '8900', 'Direct taxes');
    await reportsPage.verifyReportContains(page, '75.00', 'Direct taxes balance');

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
    // Note: amounts may be netted (e.g., refunds reduce gross expenses)

    // P00000003 - Swiss Post: Expenses 4.20 (no refund)
    await reportsPage.verifyReportContains(page, '4.20', 'Swiss Post expense');

    // P00000004 - PostFinance: Expenses 15.00 (no refund)
    await reportsPage.verifyReportContains(page, '15.00', 'PostFinance expense');

    // P00000007 - Anthropic: Expenses 100.00 (transaction 7a - Anthropic API services)
    await reportsPage.verifyReportContains(page, '100.00', 'Anthropic expense');

    // P00000006 - Canton Vaud: Expenses 75.00 (transaction 12 - direct tax payment)
    await reportsPage.verifyReportContains(page, '75.00', 'Canton Vaud tax expense');

    // Verify at least some partner identifiers appear
    const content = await reportsPage.getReportContent(page);
    const hasPartnerData = content.includes('Smith') || content.includes('GmbH') ||
                          content.includes('Post') || content.includes('Finance') ||
                          content.includes('Anthropic') || content.includes('Canton') ||
                          content.includes('P00000');
    if (!hasPartnerData) {
      throw new Error('No partner identifiers found in Partner Activity Report');
    }
    console.log('✓ Partner data and all expense values verified');
    
    console.log('✓ Partner Activity Report verified successfully!');
    console.log('=== Partner Activity Report Verification Complete ===');
  });

  // ==========================================================================
  // Test 3.10: Upload and delete PDF attachments on a transaction
  //
  // This test verifies that PDF attachments can be uploaded to and deleted from
  // transactions via the journal page's transaction context menu (⋮ button).
  //
  // It uploads TWO attachments, then deletes only ONE, leaving the other
  // ("test-receipt.pdf") on the transaction. This remaining attachment is used
  // later by test 010 to verify that attachments can still be viewed on a
  // locked journal but not added or deleted.
  // ==========================================================================
  test('should upload and delete PDF attachments on a transaction', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 3.10: Transaction Attachments ===');

    const PDF_FIXTURE_PATH = path.resolve(__dirname, '..', 'fixtures', 'test-receipt.pdf');
    const KEEP_FILE_NAME = 'test-receipt.pdf';
    const DELETE_FILE_NAME = 'test-receipt-2.pdf';

    // Navigate to the application
    await page.goto('/');

    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);

    // Select the journal (Abstratium 2024 — still unlocked at this point in the test sequence)
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Get the journal ID from localStorage
    const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
    expect(journalId).toBeTruthy();
    console.log(`Journal ID: ${journalId}`);

    // Verify the journal is not locked
    const metaResponse = await page.request.get(`/api/journal/${journalId}/metadata`);
    expect(metaResponse.ok()).toBe(true);
    const metadata = await metaResponse.json();
    expect(metadata.locked).toBe(false);
    console.log('✓ Journal is unlocked (attachments are allowed)');

    // Find a transaction via the API to use for the attachment test.
    // Use the first transaction ("Short term loan from John Smith").
    console.log('--- Finding a transaction for the attachment test ---');
    const txResponse = await page.request.get(`/api/journal/${journalId}/transactions`);
    expect(txResponse.ok()).toBe(true);
    const transactions = await txResponse.json();
    expect(transactions.length).toBeGreaterThan(0);
    const targetTransaction = transactions[0];
    console.log(`Using transaction: "${targetTransaction.description}" (id: ${targetTransaction.id})`);

    // Clean up any existing attachments on this transaction (idempotency)
    console.log('--- Cleaning up existing attachments ---');
    const existingAttachments = await (await page.request.get(`/api/attachment/transaction/${targetTransaction.id}`)).json();
    for (const att of existingAttachments) {
      await page.request.delete(`/api/attachment/${att.id}`);
    }
    if (existingAttachments.length > 0) {
      console.log(`  Cleaned up ${existingAttachments.length} existing attachment(s)`);
    }

    // Navigate to the journal page
    console.log('--- Navigating to Journal page ---');
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    // Open the context menu for the first transaction
    console.log('--- Opening context menu for the first transaction ---');
    const contextMenuTrigger = page.locator('button.context-menu-trigger').first();
    await expect(contextMenuTrigger).toBeVisible({ timeout: 10000 });
    await contextMenuTrigger.click();
    console.log('Context menu trigger clicked');

    // Verify the context menu is visible with the expected options
    const contextMenu = page.locator('.context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });
    await expect(contextMenu.locator('button:has-text("Edit")')).toBeVisible();
    await expect(contextMenu.locator('button:has-text("Delete")')).toBeVisible();
    await expect(contextMenu.locator('label:has-text("Add Attachment")')).toBeVisible();
    console.log('✓ Context menu displayed with Edit, Delete, and Add Attachment options');

    // Upload the first PDF attachment (this one will be KEPT for test 010)
    console.log(`--- Uploading first PDF attachment (${KEEP_FILE_NAME}) ---`);
    const fileInput = contextMenu.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await fileInput.setInputFiles(PDF_FIXTURE_PATH);
    console.log(`File selected: ${KEEP_FILE_NAME}`);

    // Wait for the upload to complete
    await expect(contextMenu.locator('text=Uploading...')).toBeHidden({ timeout: 15000 });
    const keepAttachmentLink = contextMenu.locator('.context-menu-attachment-name', { hasText: KEEP_FILE_NAME });
    await expect(keepAttachmentLink).toBeVisible({ timeout: 10000 });
    console.log(`✓ Attachment "${KEEP_FILE_NAME}" appears in the context menu`);

    // Verify the first attachment via the API
    let attachments = await (await page.request.get(`/api/attachment/transaction/${targetTransaction.id}`)).json();
    expect(attachments.length).toBe(1);
    expect(attachments[0].fileName).toBe(KEEP_FILE_NAME);
    expect(attachments[0].contentType).toBe('application/pdf');
    console.log(`✓ API confirms attachment: fileName="${attachments[0].fileName}", contentType="${attachments[0].contentType}"`);

    // Upload the second PDF attachment (this one will be DELETED)
    // We need to re-locate the file input since the context menu may have re-rendered
    console.log(`--- Uploading second PDF attachment (${DELETE_FILE_NAME}) ---`);
    const fileInput2 = contextMenu.locator('input[type="file"]');
    await expect(fileInput2).toBeAttached();
    // Playwright allows setting a different file name via setInputFiles with an object
    await fileInput2.setInputFiles({ name: DELETE_FILE_NAME, mimeType: 'application/pdf', buffer: fs.readFileSync(PDF_FIXTURE_PATH) });
    console.log(`File selected: ${DELETE_FILE_NAME}`);

    // Wait for the upload to complete
    await expect(contextMenu.locator('text=Uploading...')).toBeHidden({ timeout: 15000 });
    const deleteAttachmentLink = contextMenu.locator('.context-menu-attachment-name', { hasText: DELETE_FILE_NAME });
    await expect(deleteAttachmentLink).toBeVisible({ timeout: 10000 });
    console.log(`✓ Attachment "${DELETE_FILE_NAME}" appears in the context menu`);

    // Verify both attachments via the API
    attachments = await (await page.request.get(`/api/attachment/transaction/${targetTransaction.id}`)).json();
    expect(attachments.length).toBe(2);
    const keepAttachment = attachments.find(a => a.fileName === KEEP_FILE_NAME);
    const deleteAttachment = attachments.find(a => a.fileName === DELETE_FILE_NAME);
    expect(keepAttachment).toBeTruthy();
    expect(deleteAttachment).toBeTruthy();
    console.log(`✓ API confirms both attachments present`);

    // Verify both attachments can be downloaded
    console.log('--- Verifying both attachments can be downloaded ---');
    for (const att of attachments) {
      const downloadResponse = await page.request.get(`/api/attachment/${att.id}`);
      expect(downloadResponse.ok()).toBe(true);
      expect(downloadResponse.headers()['content-type']).toContain('application/pdf');
      const body = await downloadResponse.body();
      expect(body[0]).toBe(0x25); // %
      expect(body[1]).toBe(0x50); // P
      expect(body[2]).toBe(0x44); // D
      expect(body[3]).toBe(0x46); // F
      expect(body[4]).toBe(0x2d); // -
    }
    console.log('✓ Both attachments downloaded successfully and are valid PDFs');

    // Delete the second attachment via the × button
    console.log(`--- Deleting attachment "${DELETE_FILE_NAME}" via context menu ---`);
    // Find the × button that is a sibling of the attachment link containing DELETE_FILE_NAME
    const deleteAttachmentRow = contextMenu.locator('.context-menu-attachment-row', { hasText: DELETE_FILE_NAME });
    const deleteBtn = deleteAttachmentRow.locator('.btn-icon-danger');
    await expect(deleteBtn).toBeVisible();
    // Use force: true because the context menu overlay can intercept pointer
    // events, even though the button itself is visible and clickable.
    await deleteBtn.click({ force: true });
    console.log('Delete attachment button clicked');

    // Verify the confirmation dialog appears
    console.log('--- Verifying confirmation dialog ---');
    const confirmDialog = page.locator('ux-confirm-dialog .dialog-overlay');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    const confirmTitle = await confirmDialog.locator('h2').textContent();
    expect(confirmTitle?.trim()).toBe('Delete Attachment');
    console.log('✓ Confirm dialog title is "Delete Attachment"');

    const confirmMessage = await confirmDialog.locator('.dialog-body p').textContent();
    expect(confirmMessage).toContain(DELETE_FILE_NAME);
    expect(confirmMessage).toContain('cannot be undone');
    console.log(`✓ Confirm dialog mentions file name "${DELETE_FILE_NAME}"`);

    // Confirm the deletion
    console.log('--- Confirming deletion ---');
    const confirmBtn = confirmDialog.locator('button:has-text("Delete")');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Wait for the dialog to close
    await expect(confirmDialog).toBeHidden({ timeout: 10000 });
    console.log('✓ Confirmation dialog closed');

    // Verify the deleted attachment is no longer in the context menu
    console.log('--- Verifying deleted attachment is gone ---');
    await expect(contextMenu.locator('.context-menu-attachment-name', { hasText: DELETE_FILE_NAME })).toBeHidden({ timeout: 10000 });
    console.log(`✓ Attachment "${DELETE_FILE_NAME}" no longer appears in the context menu`);

    // Verify the kept attachment is still in the context menu
    await expect(contextMenu.locator('.context-menu-attachment-name', { hasText: KEEP_FILE_NAME })).toBeVisible({ timeout: 5000 });
    console.log(`✓ Attachment "${KEEP_FILE_NAME}" still appears in the context menu`);

    // Verify via the API that only one attachment remains
    console.log('--- Verifying via API ---');
    const remainingAttachments = await (await page.request.get(`/api/attachment/transaction/${targetTransaction.id}`)).json();
    expect(remainingAttachments.length).toBe(1);
    expect(remainingAttachments[0].fileName).toBe(KEEP_FILE_NAME);
    console.log(`✓ API confirms only "${KEEP_FILE_NAME}" remains (1 attachment)`);

    // Close the context menu by clicking outside
    console.log('--- Closing context menu ---');
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    await expect(contextMenu).toBeHidden({ timeout: 5000 });
    console.log('✓ Context menu closed');

    console.log('✓ Attachment upload, view, and delete verified!');
    console.log(`✓ "${KEEP_FILE_NAME}" left on transaction for test 010 (locked journal viewing)`);
    console.log('=== Test 3.10: Transaction Attachments - PASSED ===');
  });
});
