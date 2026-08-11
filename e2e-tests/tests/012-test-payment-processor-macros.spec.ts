import { test, expect } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as accountsPage from '../pages/accounts.page';
import * as macrosPage from '../pages/macros.page';
import * as transactionsPage from '../pages/transactions.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 12: Payment Processor (PSP) Macros - Batch Sales + Transfer
 *
 * PREREQUISITE: Tests 001, 002 and 003 must have been run successfully to create the
 * journal and its starter chart of accounts (which includes "1021 Payment processor"
 * and "6901 Payment processing fees", see JournalCreationService).
 *
 * This test verifies that:
 * 1. Two online payment processor (PSP) sales can be posted in a single batch execution
 *    of the "PaymentProcessorSale" macro (one CSV row per sale), correctly crediting
 *    revenue, debiting the PSP fee expense account, and debiting the PSP balance account
 *    with the net amount, for both rows.
 * 2. Funds can then be transferred out of the PSP balance account to the bank account
 *    using the "TransferPaymentProcessorFunds" macro.
 * 3. The balances of all accounts involved (1021 Payment processor, 6901 Payment
 *    processing fees, 3400 Services revenue, 1020 Bank Account) are correctly updated
 *    at each stage.
 */

// Account codes used by this test (all part of the starter chart, see
// JournalCreationService and docs/test-cases/001-create-journal-with-accounts.md)
const CODE = {
  processor: '1021',       // 1021 Payment processor (CASH)
  processorFee: '6901',    // 6901 Payment processing fees (EXPENSE)
  revenue: '3400',         // 3400 Services revenue (REVENUE)
  bank: '1020',            // 1020 Bank Account (CASH)
};

// Test data for the two PSP sales posted as a single batch
const SALE_1 = { date: '2024-08-10', description: 'Test 012 PSP sale 1', gross: 100.00, fee: 5.00, stripeTxn: 'pi_test_e2e_012_1', contractId: 'C-E2E-012-1' };
const SALE_2 = { date: '2024-08-11', description: 'Test 012 PSP sale 2', gross: 200.00, fee: 10.00, stripeTxn: 'pi_test_e2e_012_2', contractId: 'C-E2E-012-2' };

const TOTAL_FEE = SALE_1.fee + SALE_2.fee; // 15.00
const TOTAL_NET = (SALE_1.gross - SALE_1.fee) + (SALE_2.gross - SALE_2.fee); // 285.00
const TOTAL_GROSS = SALE_1.gross + SALE_2.gross; // 300.00

const TRANSFER_AMOUNT = 100.00;
const TRANSFER_DESCRIPTION = 'Test 012 PSP payout to bank';

// Macro definitions matching V01.024__insertPaymentProcessorMacros.sql / macros-export.yaml.
// Defined here (rather than imported from the built-in yaml) so this test does not depend
// on, or interfere with, the "Import Built-in" macros test (004), and is safe to run alone.
const PAYMENT_PROCESSOR_SALE_MACRO: macrosPage.MacroDefinition = {
  name: 'PaymentProcessorSale',
  description: 'Record a sale made through an online payment processor (e.g. Stripe, PayPal)',
  parameters: [
    { name: 'date', type: 'date', prompt: 'Transaction date', defaultValue: '{today}', required: true },
    { name: 'partner', type: 'partner', prompt: 'Partner (customer), optional', required: false },
    { name: 'description', type: 'text', prompt: 'Description', required: true },
    { name: 'gross_amount', type: 'amount', prompt: 'Gross amount charged', required: true },
    { name: 'fee_amount', type: 'amount', prompt: 'Payment processor fee (may be 0)', required: true },
    { name: 'stripe_txn', type: 'code', prompt: 'Payment processor transaction code (e.g. pi_..., ch_..., txn_...)', required: true },
    { name: 'contract_id', type: 'code', prompt: 'Internal contract / order id', required: true },
    { name: 'revenue_account', type: 'account', prompt: 'Revenue account (3..)', filter: '^3:.*$', required: true },
    { name: 'fee_expense_account', type: 'account', prompt: 'Payment processing fee expense account (6901)', filter: '^6.*:6901.*$', required: true },
    { name: 'processor_account', type: 'account', prompt: 'Payment processor balance account (1021)', filter: '^1.*:10.*:100.*:1021.*$', required: true },
  ],
  template: '{date} * {partner} | {description}\n'
    + '    ; stripe_txn:{stripe_txn}, contract_id:{contract_id}\n'
    + '    {processor_account}       {default_currency} {gross_amount - fee_amount}\n'
    + '    {fee_expense_account}     {default_currency} {fee_amount}\n'
    + '    {revenue_account}         {default_currency} -{gross_amount}',
  validation: { balanceCheck: true, minPostings: 3 },
};

const TRANSFER_PAYMENT_PROCESSOR_FUNDS_MACRO: macrosPage.MacroDefinition = {
  name: 'TransferPaymentProcessorFunds',
  description: 'Record a payout from the payment processor balance to a bank or cash account',
  parameters: [
    { name: 'date', type: 'date', prompt: 'Transfer date', defaultValue: '{today}', required: true },
    { name: 'description', type: 'text', prompt: 'Description', required: true },
    { name: 'amount', type: 'amount', prompt: 'Amount transferred', required: true },
    { name: 'processor_account', type: 'account', prompt: 'Payment processor balance account (source, 1021)', filter: '^1.*:10.*:100.*:1021.*$', required: true },
    { name: 'cash_account', type: 'account', prompt: 'Destination cash account (1..)', filter: '^1.*:10.*:100.*:10[0-9][0-9].*$', required: true },
  ],
  template: '{date} * Payment processor payout | {description}\n'
    + '    ; Payment:\n'
    + '    {cash_account}       {default_currency} {amount}\n'
    + '    {processor_account}      {default_currency} -{amount}',
  validation: { balanceCheck: true, minPostings: 2 },
};

test.describe('Payment Processor Macros', () => {
  test.beforeEach(async ({ page }) => {
    console.log('=== [Setup] Signing in and selecting journal ===');
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (!isSignedIn) {
      console.log('1. Not signed in, authenticating...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    } else {
      console.log('1. Already signed in');
    }
    await headerPage.waitForHeader(page);

    console.log('2. Selecting journal:', TEST_JOURNAL_NAME);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Tests earlier in the suite (year-end closing) may have locked the journal.
    // Unlock it via the API so this test can create transactions, then reload
    // so the SPA picks up the current journal state.
    const journalsResponse = await page.request.get('/api/journal/list');
    if (journalsResponse.ok()) {
      const journals = await journalsResponse.json() as Array<{ id: string; title: string; locked: boolean }>;
      const journal = journals.find(j => j.title === TEST_JOURNAL_NAME && j.locked);
      if (journal) {
        console.log('  Journal is locked, unlocking via API:', journal.id);
        const unlockResponse = await page.request.post(`/api/journal/${journal.id}/unlock`);
        if (!unlockResponse.ok()) {
          throw new Error(`Failed to unlock journal: ${unlockResponse.status()}`);
        }
        console.log('  Journal unlocked, reloading page to refresh state');
        await page.goto('/');
        await headerPage.waitForHeader(page);
        await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
      }
    }

    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    console.log('3. Cleaning up any leftover test transactions from previous runs');
    await transactionsPage.deleteTransactionsByDescription(page, SALE_1.description);
    await transactionsPage.deleteTransactionsByDescription(page, SALE_2.description);
    await transactionsPage.deleteTransactionsByDescription(page, TRANSFER_DESCRIPTION);

    console.log('4. Ensuring the PaymentProcessorSale and TransferPaymentProcessorFunds macros exist');
    await macrosPage.ensureMacroExists(page, PAYMENT_PROCESSOR_SALE_MACRO);
    await macrosPage.ensureMacroExists(page, TRANSFER_PAYMENT_PROCESSOR_FUNDS_MACRO);
    console.log('=== [Setup] Complete ===');
  });

  test('can post two PSP sales as a batch and then transfer PSP funds to the bank', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 12: Payment Processor Macros ===');

    // ========================================================================
    // Step 1: Capture baseline balances before posting anything
    // ========================================================================
    console.log('--- Step 1: Capturing baseline balances ---');
    await headerPage.clickAccountsLink(page);
    await accountsPage.waitForAccountsPage(page);
    await accountsPage.expandAllAccounts(page);

    const baselineProcessor = await accountsPage.getAccountBalance(page, CODE.processor);
    const baselineFee = await accountsPage.getAccountBalance(page, CODE.processorFee);
    const baselineRevenue = await accountsPage.getAccountBalance(page, CODE.revenue);
    const baselineBank = await accountsPage.getAccountBalance(page, CODE.bank);
    console.log(`Baseline balances: 1021=${baselineProcessor}, 6901=${baselineFee}, 3400=${baselineRevenue}, 1020=${baselineBank}`);

    // ========================================================================
    // Step 2: Post two PSP sales as a single batch execution of PaymentProcessorSale
    // ========================================================================
    console.log('--- Step 2: Navigating to Macros page ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    await macrosPage.verifyMacroExists(page, 'PaymentProcessorSale');

    console.log('--- Step 3: Opening batch dialog for PaymentProcessorSale ---');
    await macrosPage.selectMacroForBatch(page, 'PaymentProcessorSale');

    console.log('--- Step 4: Filling shared (account) parameters ---');
    await macrosPage.fillBatchSharedParameterAutocomplete(page, 'revenue_account', CODE.revenue);
    await macrosPage.fillBatchSharedParameterAutocomplete(page, 'fee_expense_account', CODE.processorFee);
    await macrosPage.fillBatchSharedParameterAutocomplete(page, 'processor_account', CODE.processor);

    console.log('--- Step 5: Filling the CSV with two PSP sale rows ---');
    // Column order matches the macro's non-account parameters, in definition order:
    // date, partner, description, gross_amount, fee_amount, stripe_txn, contract_id
    const csv = [
      `${SALE_1.date},,${SALE_1.description},${SALE_1.gross.toFixed(2)},${SALE_1.fee.toFixed(2)},${SALE_1.stripeTxn},${SALE_1.contractId}`,
      `${SALE_2.date},,${SALE_2.description},${SALE_2.gross.toFixed(2)},${SALE_2.fee.toFixed(2)},${SALE_2.stripeTxn},${SALE_2.contractId}`,
    ].join('\n');
    await macrosPage.fillBatchCsv(page, csv);

    console.log('--- Step 6: Executing the batch ---');
    await macrosPage.executeBatch(page);

    console.log('--- Step 7: Verifying both rows succeeded ---');
    const batchResult = await macrosPage.getBatchResultSummary(page);
    expect(batchResult.totalRows).toBe(2);
    expect(batchResult.successCount).toBe(2);
    expect(batchResult.failureCount).toBe(0);
    console.log('✓ Both PSP sale rows created successfully');

    await macrosPage.closeBatchDialog(page);

    // ========================================================================
    // Step 8: Verify balances after the batch (revenue, fee, processor accounts)
    // ========================================================================
    console.log('--- Step 8: Verifying account balances after the batch ---');
    await headerPage.clickAccountsLink(page);
    await accountsPage.waitForAccountsPage(page);
    await accountsPage.expandAllAccounts(page);

    const processorAfterBatch = await accountsPage.getAccountBalance(page, CODE.processor);
    const feeAfterBatch = await accountsPage.getAccountBalance(page, CODE.processorFee);
    const revenueAfterBatch = await accountsPage.getAccountBalance(page, CODE.revenue);
    console.log(`After batch: 1021=${processorAfterBatch}, 6901=${feeAfterBatch}, 3400=${revenueAfterBatch}`);

    expect(processorAfterBatch).toBeCloseTo(baselineProcessor + TOTAL_NET, 2);
    expect(feeAfterBatch).toBeCloseTo(baselineFee + TOTAL_FEE, 2);
    expect(revenueAfterBatch).toBeCloseTo(baselineRevenue - TOTAL_GROSS, 2);
    console.log('✓ 1021 Payment processor increased by the total net amount (285.00)');
    console.log('✓ 6901 Payment processing fees increased by the total fees (15.00)');
    console.log('✓ 3400 Services revenue credited by the total gross amount (300.00)');

    // Verify both transactions are visible in the journal, correctly tagged
    console.log('--- Step 9: Verifying the created transactions in the journal ---');
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    await transactionsPage.verifyTransactionExists(page, SALE_1.description);
    await transactionsPage.verifyTransactionExists(page, SALE_2.description);
    console.log('✓ Both PSP sale transactions are visible in the journal');

    // ========================================================================
    // Step 10: Transfer part of the PSP balance to the bank account using
    // the TransferPaymentProcessorFunds macro (single, non-batch execution)
    // ========================================================================
    console.log('--- Step 10: Navigating to Macros page for the transfer ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    await macrosPage.verifyMacroExists(page, 'TransferPaymentProcessorFunds');

    console.log('--- Step 11: Selecting TransferPaymentProcessorFunds macro ---');
    await macrosPage.selectMacro(page, 'TransferPaymentProcessorFunds');

    console.log('--- Step 12: Filling transfer parameters ---');
    await macrosPage.fillParameter(page, 'date', SALE_2.date);
    await macrosPage.fillParameter(page, 'description', TRANSFER_DESCRIPTION);
    await macrosPage.fillParameter(page, 'amount', TRANSFER_AMOUNT.toFixed(2));
    await macrosPage.fillParameterAutocomplete(page, 'Payment processor balance account', CODE.processor);
    await macrosPage.fillParameterAutocomplete(page, 'Destination cash account', CODE.bank);

    console.log('--- Step 13: Executing the transfer macro ---');
    await macrosPage.executeMacro(page);

    // ========================================================================
    // Step 14: Verify balances after the transfer (processor decreases, bank increases)
    // ========================================================================
    console.log('--- Step 14: Verifying account balances after the transfer ---');
    await headerPage.clickAccountsLink(page);
    await accountsPage.waitForAccountsPage(page);
    await accountsPage.expandAllAccounts(page);

    const processorAfterTransfer = await accountsPage.getAccountBalance(page, CODE.processor);
    const bankAfterTransfer = await accountsPage.getAccountBalance(page, CODE.bank);
    console.log(`After transfer: 1021=${processorAfterTransfer}, 1020=${bankAfterTransfer}`);

    expect(processorAfterTransfer).toBeCloseTo(baselineProcessor + TOTAL_NET - TRANSFER_AMOUNT, 2);
    expect(bankAfterTransfer).toBeCloseTo(baselineBank + TRANSFER_AMOUNT, 2);
    console.log('✓ 1021 Payment processor decreased by the transferred amount (100.00)');
    console.log('✓ 1020 Bank Account increased by the transferred amount (100.00)');

    // Fee and revenue accounts must be unaffected by the transfer
    const feeAfterTransfer = await accountsPage.getAccountBalance(page, CODE.processorFee);
    const revenueAfterTransfer = await accountsPage.getAccountBalance(page, CODE.revenue);
    expect(feeAfterTransfer).toBeCloseTo(feeAfterBatch, 2);
    expect(revenueAfterTransfer).toBeCloseTo(revenueAfterBatch, 2);
    console.log('✓ 6901 and 3400 balances unaffected by the transfer');

    console.log('--- Step 15: Verifying the transfer transaction in the journal ---');
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    await transactionsPage.verifyTransactionExists(page, TRANSFER_DESCRIPTION);
    console.log('✓ Transfer transaction is visible in the journal');

    console.log('=== Test 12: Payment Processor Macros Complete ===');
  });
});
