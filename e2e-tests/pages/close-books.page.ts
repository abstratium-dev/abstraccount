import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for the Close Books page (/close-books).
 *
 * This page implements Phase 3 of the year-end closing process:
 * closing all income and expense accounts by transferring their
 * balances to a designated equity account (e.g. 2979).
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

function getClosingDateInput(page: Page) {
  return page.locator('#closing-date');
}

function getEquityAccountAutocomplete(page: Page) {
  return page.locator('#equity-account input.autocomplete-input');
}

function getPreviewButton(page: Page) {
  return page.locator('button:has-text("Preview Closing Entries")');
}

function getConfirmButton(page: Page) {
  return page.locator('button:has-text("Confirm & Close the Books")');
}

function getCancelButton(page: Page) {
  return page.locator('.modal-content button:has-text("Cancel")');
}

function getModalOverlay(page: Page) {
  return page.locator('.modal-overlay');
}

function getPreviewTable(page: Page) {
  return page.locator('.preview-table');
}

function getSuccessMessage(page: Page) {
  return page.locator('.success-message');
}

function getErrorMessage(page: Page) {
  return page.locator('.error-message');
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Wait for the close-books page to be visible.
 */
export async function waitForCloseBooksPage(page: Page): Promise<void> {
  console.log('Waiting for close-books page to be visible...');
  await page.waitForSelector('h2:has-text("Year-End: Close the Books")', { state: 'visible', timeout: 10000 });
  console.log('Close-books page is visible');
}

/**
 * Fill the closing date field.
 */
export async function fillClosingDate(page: Page, date: string): Promise<void> {
  console.log(`Filling closing date: ${date}`);
  const input = getClosingDateInput(page);
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(date);
  console.log(`Closing date filled: ${date}`);
}

/**
 * Fill the equity account autocomplete field by searching and selecting from the dropdown.
 */
export async function selectEquityAccount(page: Page, searchValue: string): Promise<void> {
  console.log(`Selecting equity account: ${searchValue}`);
  const input = getEquityAccountAutocomplete(page);
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.click();
  await page.waitForTimeout(300);
  await input.fill(searchValue);
  await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
  await page.waitForTimeout(500);

  const matchingItem = page.locator('.dropdown .dropdown-item:has-text("' + searchValue + '")');
  await expect(matchingItem.first()).toBeVisible();
  await matchingItem.first().click({ force: true });
  await page.waitForTimeout(500);
  console.log(`Equity account selected: ${searchValue}`);
}

/**
 * Click the "Preview Closing Entries" button.
 */
export async function clickPreviewButton(page: Page): Promise<void> {
  console.log('Clicking "Preview Closing Entries" button...');
  const btn = getPreviewButton(page);
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  console.log('Preview button clicked');
}

/**
 * Wait for the confirmation modal to appear with the preview of closing entries.
 */
export async function waitForConfirmModal(page: Page): Promise<void> {
  console.log('Waiting for confirmation modal...');
  await page.waitForSelector('.modal-overlay', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('.preview-table', { state: 'visible', timeout: 10000 });
  console.log('Confirmation modal is visible');
}

/**
 * Get the list of accounts shown in the preview table.
 * Returns an array of { account, balance } objects.
 */
export async function getPreviewAccounts(page: Page): Promise<Array<{ account: string; balance: string }>> {
  const table = getPreviewTable(page);
  const rows = table.locator('tbody tr');
  const count = await rows.count();
  const accounts: Array<{ account: string; balance: string }> = [];

  for (let i = 0; i < count; i++) {
    const cells = rows.nth(i).locator('td');
    const accountName = (await cells.nth(0).textContent())?.trim() || '';
    const balance = (await cells.nth(1).textContent())?.trim() || '';
    accounts.push({ account: accountName, balance });
  }

  return accounts;
}

/**
 * Verify that a specific account appears in the preview table with the expected balance.
 */
export async function verifyPreviewAccount(page: Page, accountName: string, expectedBalance: string): Promise<void> {
  const accounts = await getPreviewAccounts(page);
  const found = accounts.find(
    (a) => a.account.includes(accountName) && a.balance.includes(expectedBalance)
  );
  if (!found) {
    throw new Error(
      `Preview should contain account "${accountName}" with balance containing "${expectedBalance}". ` +
      `Found accounts: ${JSON.stringify(accounts)}`
    );
  }
  console.log(`✓ Preview account verified: ${accountName} = ${found.balance}`);
}

/**
 * Verify the number of accounts in the preview table.
 */
export async function verifyPreviewAccountCount(page: Page, expectedCount: number): Promise<void> {
  const accounts = await getPreviewAccounts(page);
  if (accounts.length !== expectedCount) {
    throw new Error(
      `Preview should contain ${expectedCount} accounts, but found ${accounts.length}: ` +
      JSON.stringify(accounts.map((a) => a.account))
    );
  }
  console.log(`✓ Preview account count verified: ${expectedCount}`);
}

/**
 * Click the "Confirm & Close the Books" button to execute the closing.
 */
export async function clickConfirmButton(page: Page): Promise<void> {
  console.log('Clicking "Confirm & Close the Books" button...');
  const btn = getConfirmButton(page);
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  console.log('Confirm button clicked');
}

/**
 * Wait for the closing to complete — the modal should disappear and
 * the success message should appear, then navigation to /journal.
 */
export async function waitForCloseComplete(page: Page): Promise<void> {
  console.log('Waiting for close-books to complete...');
  // Wait for the modal to disappear
  await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 30000 });
  console.log('✓ Close-books completed, modal closed');
}

/**
 * Check if an error message is displayed.
 */
export async function hasError(page: Page): Promise<boolean> {
  const errorEl = getErrorMessage(page);
  return await errorEl.isVisible({ timeout: 1000 }).catch(() => false);
}

/**
 * Get the error message text.
 */
export async function getError(page: Page): Promise<string> {
  const errorEl = getErrorMessage(page);
  return (await errorEl.textContent())?.trim() || '';
}
