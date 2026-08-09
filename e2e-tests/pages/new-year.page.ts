import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for the New Year page (/new-year).
 *
 * This page implements Phase 4 of the year-end closing process:
 * creating a new journal for the next fiscal year by copying all
 * accounts from the current journal and setting their opening balances.
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

function getHeading(page: Page) {
  return page.getByRole('heading', { name: /New Year: Create New Journal/i });
}

function getSourceJournalInfo(page: Page) {
  return page.locator('.source-info');
}

function getNewJournalTitleInput(page: Page) {
  return page.locator('#new-journal-title');
}

function getOpeningDateInput(page: Page) {
  return page.locator('#opening-date');
}

function getRetainedEarningsAutocomplete(page: Page) {
  return page.locator('#retained-earnings input.autocomplete-input');
}

function getAnnualProfitLossAutocomplete(page: Page) {
  return page.locator('#annual-profit-loss input.autocomplete-input');
}

function getPreviewButton(page: Page) {
  return page.locator('button:has-text("Preview New Journal")');
}

function getConfirmButton(page: Page) {
  return page.locator('button:has-text("Confirm & Create New Journal")');
}

function getCancelButton(page: Page) {
  return page.locator('.modal-content button:has-text("Cancel")');
}

function getModalOverlay(page: Page) {
  return page.locator('.modal-overlay');
}

function getModalContent(page: Page) {
  return page.locator('.modal-content');
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
 * Wait for the new-year page to be visible.
 */
export async function waitForNewYearPage(page: Page): Promise<void> {
  console.log('Waiting for new-year page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('New-year page is visible');
}

/**
 * Verify that the source journal name is displayed correctly.
 */
export async function verifySourceJournal(page: Page, expectedTitle: string): Promise<void> {
  console.log(`Verifying source journal: ${expectedTitle}`);
  const sourceInfo = getSourceJournalInfo(page);
  await expect(sourceInfo).toBeVisible({ timeout: 5000 });
  await expect(sourceInfo).toContainText(expectedTitle);
  console.log(`✓ Source journal verified: ${expectedTitle}`);
}

/**
 * Fill the new journal title field.
 */
export async function fillNewJournalTitle(page: Page, title: string): Promise<void> {
  console.log(`Filling new journal title: ${title}`);
  const input = getNewJournalTitleInput(page);
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(title);
  console.log(`New journal title filled: ${title}`);
}

/**
 * Fill the opening date field.
 */
export async function fillOpeningDate(page: Page, date: string): Promise<void> {
  console.log(`Filling opening date: ${date}`);
  const input = getOpeningDateInput(page);
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(date);
  console.log(`Opening date filled: ${date}`);
}

/**
 * Select an account from the autocomplete dropdown by searching for the code path.
 * Works for both the retained earnings and annual profit/loss account fields.
 */
async function selectAccountFromAutocomplete(
  page: Page,
  inputLocator: ReturnType<typeof getRetainedEarningsAutocomplete>,
  searchValue: string
): Promise<void> {
  console.log(`Selecting account: ${searchValue}`);
  await expect(inputLocator).toBeVisible({ timeout: 5000 });
  await inputLocator.click();
  await page.waitForTimeout(300);
  await inputLocator.fill(searchValue);
  await page.waitForSelector(
    '.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)',
    { timeout: 10000 }
  );
  await page.waitForTimeout(500);

  const matchingItem = page.locator('.dropdown .dropdown-item:has-text("' + searchValue + '")');
  await expect(matchingItem.first()).toBeVisible();
  await matchingItem.first().click({ force: true });
  await page.waitForTimeout(500);
  console.log(`Account selected: ${searchValue}`);
}

/**
 * Select the retained earnings account by code path (e.g., "2:290:2970").
 */
export async function selectRetainedEarningsAccount(page: Page, codePath: string): Promise<void> {
  await selectAccountFromAutocomplete(page, getRetainedEarningsAutocomplete(page), codePath);
}

/**
 * Select the annual profit/loss account by code path (e.g., "2:290:2979").
 */
export async function selectAnnualProfitLossAccount(page: Page, codePath: string): Promise<void> {
  await selectAccountFromAutocomplete(page, getAnnualProfitLossAutocomplete(page), codePath);
}

/**
 * Click the "Preview New Journal" button.
 */
export async function clickPreviewButton(page: Page): Promise<void> {
  console.log('Clicking "Preview New Journal" button...');
  const btn = getPreviewButton(page);
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  console.log('Preview button clicked');
}

/**
 * Wait for the confirmation modal to appear with the preview of accounts.
 */
export async function waitForConfirmModal(page: Page): Promise<void> {
  console.log('Waiting for confirmation modal...');
  await expect(getModalOverlay(page)).toBeVisible({ timeout: 15000 });
  await expect(getPreviewTable(page)).toBeVisible({ timeout: 10000 });
  console.log('Confirmation modal is visible');
}

/**
 * Get the list of accounts shown in the preview table.
 * Returns an array of { account, balance } objects.
 */
export async function getPreviewAccounts(
  page: Page
): Promise<Array<{ account: string; balance: string }>> {
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
export async function verifyPreviewAccount(
  page: Page,
  accountCode: string,
  expectedBalance: string
): Promise<void> {
  const accounts = await getPreviewAccounts(page);
  const found = accounts.find(
    (a) => a.account.includes(accountCode) && a.balance.includes(expectedBalance)
  );
  if (!found) {
    throw new Error(
      `Preview should contain account "${accountCode}" with balance containing "${expectedBalance}". ` +
        `Found accounts: ${JSON.stringify(accounts)}`
    );
  }
  console.log(`✓ Preview account verified: ${accountCode} = ${found.balance}`);
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
 * Verify that the modal shows the new journal title.
 */
export async function verifyModalNewJournalTitle(page: Page, expectedTitle: string): Promise<void> {
  console.log(`Verifying modal shows new journal title: ${expectedTitle}`);
  const modal = getModalContent(page);
  await expect(modal).toContainText(expectedTitle);
  console.log(`✓ Modal shows new journal title: ${expectedTitle}`);
}

/**
 * Verify that the modal shows the source journal title.
 */
export async function verifyModalSourceJournalTitle(
  page: Page,
  expectedTitle: string
): Promise<void> {
  console.log(`Verifying modal shows source journal title: ${expectedTitle}`);
  const modal = getModalContent(page);
  await expect(modal).toContainText(expectedTitle);
  console.log(`✓ Modal shows source journal title: ${expectedTitle}`);
}

/**
 * Verify that the modal shows the opening date.
 */
export async function verifyModalOpeningDate(page: Page, expectedDate: string): Promise<void> {
  console.log(`Verifying modal shows opening date: ${expectedDate}`);
  const modal = getModalContent(page);
  await expect(modal).toContainText(expectedDate);
  console.log(`✓ Modal shows opening date: ${expectedDate}`);
}

/**
 * Click the "Confirm & Create New Journal" button to execute the creation.
 */
export async function clickConfirmButton(page: Page): Promise<void> {
  console.log('Clicking "Confirm & Create New Journal" button...');
  const btn = getConfirmButton(page);
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  console.log('Confirm button clicked');
}

/**
 * Click the "Cancel" button in the modal.
 */
export async function clickCancelButton(page: Page): Promise<void> {
  console.log('Clicking "Cancel" button...');
  const btn = getCancelButton(page);
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  console.log('Cancel button clicked');
}

/**
 * Wait for the new year creation to complete — the modal should disappear
 * and the application should navigate to the journal page.
 */
export async function waitForCreationComplete(page: Page): Promise<void> {
  console.log('Waiting for new year creation to complete...');
  await expect(getModalOverlay(page)).toBeHidden({ timeout: 30000 });
  console.log('✓ New year creation completed, modal closed');
}

/**
 * Check if a success message is displayed.
 */
export async function hasSuccessMessage(page: Page): Promise<boolean> {
  const msg = getSuccessMessage(page);
  return await msg.isVisible({ timeout: 1000 }).catch(() => false);
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
