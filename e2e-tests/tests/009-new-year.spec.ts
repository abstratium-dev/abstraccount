import { test, expect, Page } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as journalManagementPage from '../pages/journal-management.page';
import * as newYearPage from '../pages/new-year.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 9: New Year — Create Next Year's Journal
 *
 * This test implements the test case from:
 * docs/test-cases/009-new-year.md
 *
 * It verifies that:
 * 1. The user can navigate to the New Year page from the header context menu.
 * 2. The preview shows the correct source journal, new journal title, opening date,
 *    and a table of accounts with their opening balances.
 * 3. Executing the creation produces a new journal with accounts and opening balance
 *    transactions.
 * 4. The user can switch back to the original journal via the journal-management page.
 *
 * IMPORTANT: This test depends on tests 001-008. The source journal "Abstratium 2024"
 * must exist with all transactions and year-end closing entries, and must be locked.
 */

const NEW_JOURNAL_TITLE = 'Abstratium 2025';
const OPENING_DATE = '2025-01-01';
const RETAINED_EARNINGS_CODE_PATH = '2:290:2970';
const ANNUAL_PROFIT_LOSS_CODE_PATH = '2:290:2979';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Gets the journal ID from localStorage.
 */
async function getJournalId(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('journalId'));
}

/**
 * Lists all journals via the API.
 */
async function listJournals(page: Page): Promise<Array<{ id: string; title: string; currency: string; previousJournalId: string | null; locked: boolean }>> {
  const response = await page.request.get('/api/journal/list');
  if (!response.ok()) {
    throw new Error(`Failed to list journals: ${response.status()}`);
  }
  return await response.json();
}

/**
 * Finds a journal by title via the API. Returns the last match (most recently created).
 */
async function findJournalByTitle(page: Page, title: string): Promise<{ id: string; title: string; currency: string; previousJournalId: string | null; locked: boolean } | null> {
  const journals = await listJournals(page);
  const matches = journals.filter(j => j.title === title);
  if (matches.length === 0) return null;
  // Return the last match (most recently created)
  return matches[matches.length - 1];
}

/**
 * Deletes a journal via the API. The journal must not be locked.
 */
async function deleteJournalViaApi(page: Page, journalId: string): Promise<void> {
  const response = await page.request.delete(`/api/journal/${journalId}`);
  if (!response.ok()) {
    throw new Error(`Failed to delete journal ${journalId}: ${response.status()}`);
  }
  console.log(`✓ Journal ${journalId} deleted via API`);
}

/**
 * Cleans up any previously created "Abstratium 2025" journal to ensure idempotency.
 */
async function cleanupNewYearJournal(page: Page): Promise<void> {
  console.log('--- Cleaning up existing new-year journal ---');
  const existing = await findJournalByTitle(page, NEW_JOURNAL_TITLE);
  if (existing) {
    console.log(`Found existing "${NEW_JOURNAL_TITLE}" journal (id: ${existing.id}), deleting...`);
    if (existing.locked) {
      // Unlock first if locked
      const unlockResponse = await page.request.post(`/api/journal/${existing.id}/unlock`);
      if (!unlockResponse.ok()) {
        throw new Error(`Failed to unlock journal for cleanup: ${unlockResponse.status()}`);
      }
      console.log('  Unlocked journal for cleanup');
    }
    await deleteJournalViaApi(page, existing.id);
  } else {
    console.log(`No existing "${NEW_JOURNAL_TITLE}" journal found, nothing to clean up`);
  }
}

/**
 * Gets all transactions for a journal via the API.
 */
async function getTransactions(page: Page, journalId: string): Promise<Array<any>> {
  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) {
    throw new Error(`Failed to get transactions: ${response.status()}`);
  }
  return await response.json();
}

/**
 * Gets the account tree for a journal via the API.
 */
async function getAccountTree(page: Page, journalId: string): Promise<Array<any>> {
  const response = await page.request.get(`/api/account/${journalId}/tree`);
  if (!response.ok()) {
    throw new Error(`Failed to get account tree: ${response.status()}`);
  }
  return await response.json();
}

/**
 * Counts all accounts in the account tree (including children recursively).
 */
function countAccounts(accounts: Array<any>): number {
  let count = 0;
  for (const account of accounts) {
    count++;
    if (account.children && account.children.length > 0) {
      count += countAccounts(account.children);
    }
  }
  return count;
}

/**
 * Flattens the account tree into a single list (including children recursively).
 */
function flattenAccounts(accounts: Array<any>): Array<{ id: string; name: string; type: string; note: string | null; parentId: string | null }> {
  const result: Array<{ id: string; name: string; type: string; note: string | null; parentId: string | null }> = [];
  for (const account of accounts) {
    result.push({
      id: account.id,
      name: account.name,
      type: account.type,
      note: account.note ?? null,
      parentId: account.parentId ?? null,
    });
    if (account.children && account.children.length > 0) {
      result.push(...flattenAccounts(account.children));
    }
  }
  return result;
}

/**
 * Finds an account by its code (the first token of the name) in the flattened tree.
 */
function findAccountByCode(accounts: Array<any>, code: string): { id: string; name: string; type: string; note: string | null; parentId: string | null } | null {
  const flat = flattenAccounts(accounts);
  return flat.find(a => a.name.startsWith(code + ' ')) ?? null;
}

// ============================================================================
// Tests
// ============================================================================

test.describe('New Year Journal Creation', () => {

  // ==========================================================================
  // Test 9.1: Navigate to the New Year page and verify the form
  //
  // This test navigates to the new-year page via the header context menu
  // and verifies that the form is displayed with the correct source journal.
  // ==========================================================================
  test('should display the new year page with the correct source journal', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 9.1: New Year Page Display ===');

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

    // Navigate to the new-year page via the header context menu
    console.log('--- Navigating to New Year page ---');
    const menuBtn = page.locator('.menu-btn');
    await expect(menuBtn).toBeVisible({ timeout: 10000 });
    await menuBtn.click();
    console.log('Menu button clicked');

    const newYearLink = page.locator('#new-year');
    await expect(newYearLink).toBeVisible({ timeout: 5000 });
    await newYearLink.click();
    console.log('New year link clicked');

    // Verify the new-year page is displayed
    await newYearPage.waitForNewYearPage(page);
    console.log('New-year page loaded');

    // Verify the source journal is displayed
    console.log('--- Verifying source journal ---');
    await newYearPage.verifySourceJournal(page, TEST_JOURNAL_NAME);

    // Verify the form fields are present
    console.log('--- Verifying form fields ---');
    await expect(page.locator('#new-journal-title')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#opening-date')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#retained-earnings')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#annual-profit-loss')).toBeVisible({ timeout: 5000 });
    console.log('✓ All form fields are visible');

    // Verify the preview button is present
    await expect(page.locator('button:has-text("Preview New Journal")')).toBeVisible({ timeout: 5000 });
    console.log('✓ Preview button is visible');

    console.log('✓ New Year page verified!');
    console.log('=== Test 9.1: New Year Page Display - PASSED ===');
  });

  // ==========================================================================
  // Test 9.2: Preview and execute the new year journal creation
  //
  // This test fills in the form, previews the creation, verifies the preview
  // contents, then confirms and executes. It verifies the new journal is
  // created with the correct accounts and opening balance transactions.
  // ==========================================================================
  test('should create the new year journal with opening balances', async ({ page }) => {
    test.setTimeout(180_000);
    console.log('=== Starting Test 9.2: Create New Year Journal ===');

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

    // Clean up any existing new-year journal from a previous run
    await cleanupNewYearJournal(page);

    // Remember the source journal ID for later verification
    const sourceJournalId = await getJournalId(page);
    expect(sourceJournalId).toBeTruthy();
    console.log(`Source journal ID: ${sourceJournalId}`);

    // Navigate to the new-year page via the header context menu
    console.log('--- Navigating to New Year page ---');
    const menuBtn = page.locator('.menu-btn');
    await expect(menuBtn).toBeVisible({ timeout: 10000 });
    await menuBtn.click();
    console.log('Menu button clicked');

    const newYearLink = page.locator('#new-year');
    await expect(newYearLink).toBeVisible({ timeout: 5000 });
    await newYearLink.click();
    console.log('New year link clicked');

    await newYearPage.waitForNewYearPage(page);
    console.log('New-year page loaded');

    // Fill in the form
    console.log('--- Filling New Year Form ---');
    await newYearPage.fillNewJournalTitle(page, NEW_JOURNAL_TITLE);
    await newYearPage.fillOpeningDate(page, OPENING_DATE);
    await newYearPage.selectRetainedEarningsAccount(page, RETAINED_EARNINGS_CODE_PATH);
    await newYearPage.selectAnnualProfitLossAccount(page, ANNUAL_PROFIT_LOSS_CODE_PATH);
    console.log('Form filled');

    // Preview the new journal creation
    console.log('--- Previewing New Journal ---');
    await newYearPage.clickPreviewButton(page);
    await newYearPage.waitForConfirmModal(page);
    console.log('Preview modal displayed');

    // Verify the modal shows the correct titles and date
    console.log('--- Verifying Preview Contents ---');
    await newYearPage.verifyModalNewJournalTitle(page, NEW_JOURNAL_TITLE);
    await newYearPage.verifyModalSourceJournalTitle(page, TEST_JOURNAL_NAME);
    await newYearPage.verifyModalOpeningDate(page, OPENING_DATE);

    // Verify the preview table shows the expected accounts with correct balances.
    // After the 2024 year-end closing, the balance-sheet account balances at
    // 2024-12-31 are:
    //   1020 Bank = 1,680.50 (debit/positive)
    //   1100 Receivables = 179.10 (debit/positive)
    //   1230 Inventory = 40.00 (debit/positive)
    //   2200 Payables = -8.10 (credit/negative)
    //   2208 Tax liabilities = -50.00 (credit/negative)
    //   2800 Share Capital = -2,000.00 (credit/negative)
    //   2950 Legal reserves = -10.00 (credit/negative)
    //   2979 Annual profit/loss = 168.50 (debit/positive = loss)
    //
    // The formatBalance method uses toFixed(2), so no thousand separators.
    // Format: "CHF 1680.50" (commodity + space + number)
    await newYearPage.verifyPreviewAccountCount(page, 8);
    await newYearPage.verifyPreviewAccount(page, '1020', '1680.50');
    await newYearPage.verifyPreviewAccount(page, '1100', '179.10');
    await newYearPage.verifyPreviewAccount(page, '1230', '40.00');
    await newYearPage.verifyPreviewAccount(page, '2200', '-8.10');
    await newYearPage.verifyPreviewAccount(page, '2208', '-50.00');
    await newYearPage.verifyPreviewAccount(page, '2800', '-2000.00');
    await newYearPage.verifyPreviewAccount(page, '2950', '-10.00');
    await newYearPage.verifyPreviewAccount(page, '2979', '168.50');
    console.log('✓ Preview verified: 8 accounts with correct balances');

    // Confirm and execute the new year creation
    console.log('--- Executing New Year Creation ---');
    await newYearPage.clickConfirmButton(page);
    await newYearPage.waitForCreationComplete(page);
    console.log('✓ New year creation executed successfully');

    // Verify navigation to the journal page
    console.log('--- Verifying Navigation ---');
    await headerPage.waitForHeader(page);

    // Verify the header shows the new journal name
    const journalNameLink = page.locator('#current-journal-name');
    await expect(journalNameLink).toBeVisible({ timeout: 10000 });
    // Use retrying assertion in case the signal hasn't updated yet
    await expect(journalNameLink).toContainText(NEW_JOURNAL_TITLE, { timeout: 10000 });
    console.log(`✓ Header shows new journal name: ${NEW_JOURNAL_TITLE}`);

    // Get the new journal ID from localStorage
    const newJournalId = await getJournalId(page);
    expect(newJournalId).toBeTruthy();
    expect(newJournalId).not.toBe(sourceJournalId);
    console.log(`New journal ID: ${newJournalId}`);

    // Verify the new journal via the API
    console.log('--- Verifying New Journal via API ---');
    const journals = await listJournals(page);
    const newJournal = journals.find(j => j.id === newJournalId);
    expect(newJournal).toBeTruthy();
    expect(newJournal!.title).toBe(NEW_JOURNAL_TITLE);
    expect(newJournal!.currency).toBe('CHF');
    expect(newJournal!.previousJournalId).toBe(sourceJournalId);
    console.log(`✓ New journal verified: title="${newJournal!.title}", currency=${newJournal!.currency}, previousJournalId=${newJournal!.previousJournalId}`);

    // Verify the new journal has accounts copied from the source
    console.log('--- Verifying Accounts ---');
    const accountTree = await getAccountTree(page, newJournalId);
    expect(accountTree.length).toBeGreaterThan(0);
    const totalAccounts = countAccounts(accountTree);
    expect(totalAccounts).toBeGreaterThan(0);
    console.log(`✓ New journal has ${totalAccounts} accounts`);

    // Verify that account descriptions (notes) were copied from the source journal.
    // The starter chart of accounts (created in test 001 via JournalCreationService)
    // sets a descriptive note on every account. We check 3 accounts of different
    // types to make sure the note is preserved by the new-year copy operation.
    console.log('--- Verifying account descriptions were copied ---');
    const bankAccount = findAccountByCode(accountTree, '1020');
    expect(bankAccount).toBeTruthy();
    expect(bankAccount!.note).toContain("Money held in the company's bank account");
    console.log('✓ Account 1020 (CASH) note copied correctly');

    const shareCapitalAccount = findAccountByCode(accountTree, '2800');
    expect(shareCapitalAccount).toBeTruthy();
    expect(shareCapitalAccount!.note).toContain('The nominal (registered) value of the shares');
    console.log('✓ Account 2800 (EQUITY) note copied correctly');

    const directTaxesAccount = findAccountByCode(accountTree, '8900');
    expect(directTaxesAccount).toBeTruthy();
    expect(directTaxesAccount!.note).toContain('Corporate income tax and capital tax expense');
    console.log('✓ Account 8900 (EXPENSE) note copied correctly');

    // Verify the new journal has transactions (opening balances + profit/loss transfer)
    console.log('--- Verifying Transactions ---');
    const transactions = await getTransactions(page, newJournalId);
    expect(transactions.length).toBeGreaterThan(0);
    console.log(`✓ New journal has ${transactions.length} transactions`);

    // Verify opening balance transactions exist
    const openingBalanceTransactions = transactions.filter(
      (tx: any) => tx.tags && tx.tags.some((tag: any) => tag.key === 'OpeningBalances')
    );
    expect(openingBalanceTransactions.length).toBeGreaterThan(0);
    console.log(`✓ Found ${openingBalanceTransactions.length} opening balance transactions`);

    // Verify the profit/loss transfer transaction exists (tagged with "Closing")
    const transferTransactions = transactions.filter(
      (tx: any) => tx.description && tx.description.includes('Transfer of Annual Profit/Loss')
    );
    expect(transferTransactions.length).toBe(1);
    const transferTx = transferTransactions[0];
    const hasClosingTag = transferTx.tags && transferTx.tags.some((tag: any) => tag.key === 'Closing');
    expect(hasClosingTag).toBe(true);
    console.log(`✓ Found profit/loss transfer transaction with Closing tag`);

    // Verify the transfer transaction has two entries (2979 and 2970)
    expect(transferTx.entries.length).toBe(2);
    console.log(`✓ Transfer transaction has 2 entries`);

    // Verify opening balance transactions have the expected descriptions
    const openingBankTx = openingBalanceTransactions.find(
      (tx: any) => tx.description && tx.description.includes('1020')
    );
    expect(openingBankTx).toBeTruthy();
    console.log(`✓ Found opening balance transaction for account 1020`);

    const openingCapitalTx = openingBalanceTransactions.find(
      (tx: any) => tx.description && tx.description.includes('2800')
    );
    expect(openingCapitalTx).toBeTruthy();
    console.log(`✓ Found opening balance transaction for account 2800`);

    // Verify the original journal still exists in the journal list
    const originalJournal = journals.find(j => j.id === sourceJournalId);
    expect(originalJournal).toBeTruthy();
    expect(originalJournal!.title).toBe(TEST_JOURNAL_NAME);
    expect(originalJournal!.locked).toBe(true);
    console.log(`✓ Original journal "${TEST_JOURNAL_NAME}" still exists and is locked`);

    console.log('✓ New year journal creation verified!');
    console.log('=== Test 9.2: Create New Year Journal - PASSED ===');
  });

  // ==========================================================================
  // Test 9.3: Switch back to the original journal
  //
  // This test navigates to the journal-management page, selects the original
  // journal ("Abstratium 2024") from the dropdown, and verifies that the
  // header updates to show the original journal name. It also verifies that
  // the original journal still exists with its data intact.
  // ==========================================================================
  test('should switch back to the original journal', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 9.3: Switch Back to Original Journal ===');

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

    // Check if the new journal exists (test 9.2 should have created it).
    // If not, skip this test with a message.
    const newJournal = await findJournalByTitle(page, NEW_JOURNAL_TITLE);
    if (!newJournal) {
      console.log(`"${ NEW_JOURNAL_TITLE }" not found — test 9.2 may not have run. Selecting original journal directly.`);
    }

    // Navigate to the Journal Management page
    console.log('--- Navigating to Journal Management page ---');
    await headerPage.goToJournalManagementPage(page);
    await journalManagementPage.waitForJournalManagementPage(page);

    // Verify both journals appear in the dropdown
    console.log('--- Verifying journal dropdown ---');
    const selector = page.locator('#journal-select');
    await expect(selector).toBeVisible({ timeout: 10000 });
    const options = await selector.locator('option').all();
    const optionTexts: string[] = [];
    for (const option of options) {
      const text = await option.textContent();
      if (text) optionTexts.push(text.trim());
    }
    console.log(`Journal dropdown options: ${JSON.stringify(optionTexts)}`);

    const hasOriginal = optionTexts.some(t => t.includes(TEST_JOURNAL_NAME));
    expect(hasOriginal).toBe(true);
    console.log(`✓ Original journal "${TEST_JOURNAL_NAME}" found in dropdown`);

    if (newJournal) {
      const hasNew = optionTexts.some(t => t.includes(NEW_JOURNAL_TITLE));
      expect(hasNew).toBe(true);
      console.log(`✓ New journal "${NEW_JOURNAL_TITLE}" found in dropdown`);
    }

    // Select the original journal "Abstratium 2024" from the dropdown
    console.log('--- Switching back to original journal ---');
    await headerPage.selectJournalOnManagementPage(page, TEST_JOURNAL_NAME);

    // Verify the header shows the original journal name
    console.log('--- Verifying header ---');
    await headerPage.waitForHeader(page);
    const journalNameLink = page.locator('#current-journal-name');
    await expect(journalNameLink).toBeVisible({ timeout: 10000 });
    // Use retrying assertion in case the signal hasn't updated yet
    await expect(journalNameLink).toContainText(TEST_JOURNAL_NAME, { timeout: 10000 });
    console.log(`✓ Header shows original journal name: ${TEST_JOURNAL_NAME}`);

    // Verify the original journal is still locked (🔒 icon in header)
    const lockIcon = page.locator('#current-journal-name .journal-lock-icon');
    await expect(lockIcon).toBeVisible({ timeout: 10000 });
    console.log('✓ Lock icon (🔒) is visible — original journal is still locked');

    // Verify the original journal still has its data via the API
    console.log('--- Verifying original journal data ---');
    const journalId = await getJournalId(page);
    expect(journalId).toBeTruthy();
    console.log(`Current journal ID: ${journalId}`);

    // Verify the journal metadata
    const metaResponse = await page.request.get(`/api/journal/${journalId}/metadata`);
    expect(metaResponse.ok()).toBe(true);
    const metadata = await metaResponse.json();
    expect(metadata.title).toBe(TEST_JOURNAL_NAME);
    expect(metadata.locked).toBe(true);
    console.log(`✓ Original journal metadata verified: title="${metadata.title}", locked=${metadata.locked}`);

    // Verify the original journal still has its transactions
    const txResponse = await page.request.get(`/api/journal/${journalId}/transactions`);
    expect(txResponse.ok()).toBe(true);
    const transactions = await txResponse.json();
    expect(transactions.length).toBeGreaterThan(0);
    console.log(`✓ Original journal has ${transactions.length} transactions`);

    // Verify the original journal still has closing transactions
    const closingTransactions = transactions.filter(
      (tx: any) => tx.description && tx.description.startsWith('Close ')
    );
    expect(closingTransactions.length).toBe(7);
    console.log(`✓ Original journal still has 7 closing transactions`);

    // Verify the original journal still has its accounts
    const accountTree = await getAccountTree(page, journalId);
    expect(accountTree.length).toBeGreaterThan(0);
    const totalAccounts = countAccounts(accountTree);
    expect(totalAccounts).toBeGreaterThan(0);
    console.log(`✓ Original journal still has ${totalAccounts} accounts`);

    console.log('✓ Switch back to original journal verified!');
    console.log('=== Test 9.3: Switch Back to Original Journal - PASSED ===');
  });
});
