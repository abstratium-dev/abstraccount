import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Accounts (Chart of Accounts) page
 */

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Extracts the account number from an account name
 * E.g., "1000 Caisse / Cash" -> 1000
 * E.g., "6570.001 Microsoft" -> 6570.001
 */
function extractAccountNumber(name: string): number | null {
  const match = name.match(/^([\d.]+)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the "Create Account" button
 */
function getCreateAccountButton(page: Page) {
  return page.getByRole('button', { name: /Create Account/i });
}

/**
 * Gets the heading "Chart of Accounts"
 */
function getHeading(page: Page) {
  return page.getByRole('heading', { name: /Chart of Accounts/i });
}

/**
 * Gets the account name input in the modal
 */
function getAccountNameInput(page: Page) {
  return page.locator('#name');
}

/**
 * Gets the account type select in the modal
 */
function getAccountTypeSelect(page: Page) {
  return page.locator('#type');
}

/**
 * Gets the parent account select in the modal
 */
function getParentAccountSelect(page: Page) {
  return page.locator('#parent');
}

/**
 * Gets the note textarea in the modal
 */
function getNoteTextarea(page: Page) {
  return page.locator('#note');
}

/**
 * Gets the display order input in the modal
 */
function getDisplayOrderInput(page: Page) {
  return page.locator('#accountOrder');
}

/**
 * Gets the Save button in the modal
 */
function getSaveButton(page: Page) {
  return page.getByRole('button', { name: /^Save$/i });
}

/**
 * Gets the Cancel button in the modal
 */
function getCancelButton(page: Page) {
  return page.getByRole('button', { name: /Cancel/i });
}

/**
 * Gets the modal heading
 */
function getModalHeading(page: Page) {
  return page.locator('.modal-header h2');
}

/**
 * Gets an account link by its account code/number.
 * The account code is at the start of the account name in the account-name-link element.
 *
 * If accountName is provided, matches on both code and full name (for disambiguation
 * when multiple accounts share the same code, e.g., "2 Liabilities" and "2 Equity").
 * If accountName is omitted, matches on code only.
 */
function getAccountByCode(page: Page, code: string, accountName?: string) {
  const escapedCode = escapeRegExp(code);
  if (accountName) {
    // Match the full account name: "code accountName"
    const fullName = `${code} ${accountName}`;
    return page.locator('.account-name-link').filter({ hasText: fullName });
  }
  // Match code at start of the account name (e.g., "1 Assets" or just "1")
  // Allow leading whitespace (Angular templates may render with surrounding whitespace)
  // The \s|$ boundary ensures "2" doesn't match "2210" or "6570.001"
  const codeRegex = new RegExp(`^\\s*${escapedCode}(\\s|$)`);
  return page.locator('.account-name-link').filter({ hasText: codeRegex });
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Gets the context menu trigger for an account by account name
 * This finds the ⋮ button in the same row as the account
 */
function getContextMenuTrigger(page: Page, accountName: string) {
  // Find the row containing the account name link with the given name
  // Then find the context menu trigger in that row
  // Escape special regex characters in the account name
  const escapedName = escapeRegExp(accountName);
  return page.locator('tr', { has: page.locator('.account-name-link').filter({ hasText: new RegExp(escapedName, 'i') }) })
    .locator('.context-menu-trigger')
    .first();
}

/**
 * Gets the "Add Child" button in the context menu
 */
function getAddChildButton(page: Page) {
  return page.getByRole('button', { name: /Add Child/i });
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the accounts page to be visible
 */
export async function waitForAccountsPage(page: Page) {
  console.log('Waiting for accounts page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Accounts page is visible');
}

/**
 * Waits for at least one account to appear in the table
 */
export async function waitForAccountInTable(page: Page) {
  console.log('Waiting for account to appear in table...');
  await expect(page.locator('.account-name-link').first()).toBeVisible({ timeout: 10000 });
  console.log('Account is visible in table');
}

/**
 * Clicks the "Create Account" button to open the create account modal
 */
export async function clickCreateAccount(page: Page) {
  console.log('Clicking Create Account button...');
  const button = getCreateAccountButton(page);
  await expect(button).toBeVisible({ timeout: 10000 });
  await button.click();
  console.log('Create Account button clicked');
}

/**
 * Waits for the account modal to be visible
 */
export async function waitForAccountModal(page: Page) {
  console.log('Waiting for account modal to be visible...');
  await expect(getModalHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Account modal is visible');
}

/**
 * Fills in the account name in the modal
 */
export async function fillAccountName(page: Page, name: string) {
  console.log(`Filling account name: ${name}`);
  const input = getAccountNameInput(page);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(name);
  console.log('Account name filled');
}

/**
 * Selects the account type in the modal
 */
export async function selectAccountType(page: Page, type: string) {
  console.log(`Selecting account type: ${type}`);
  const select = getAccountTypeSelect(page);
  await expect(select).toBeVisible({ timeout: 10000 });
  await select.selectOption(type);
  console.log('Account type selected');
}

/**
 * Selects a parent account from the dropdown in the account modal
 * @param parentPath - The path of the parent account (e.g., "1 : 10 : 100")
 */
export async function selectParentAccount(page: Page, parentPath: string) {
  console.log(`Selecting parent account: ${parentPath}`);
  const select = getParentAccountSelect(page);
  await expect(select).toBeVisible({ timeout: 10000 });
  // Find the option that contains the parent path
  const option = await select.locator(`option:has-text("${parentPath}")`).first();
  const value = await option.getAttribute('value');
  if (value) {
    await select.selectOption(value);
  }
  console.log('Parent account selected');
}

/**
 * Fills in the note in the modal
 */
export async function fillNote(page: Page, note: string) {
  console.log(`Filling note: ${note}`);
  const textarea = getNoteTextarea(page);
  await expect(textarea).toBeVisible({ timeout: 10000 });
  await textarea.fill(note);
  console.log('Note filled');
}

/**
 * Fills in the display order in the modal
 */
export async function fillDisplayOrder(page: Page, order: number) {
  console.log(`Filling display order: ${order}`);
  const input = getDisplayOrderInput(page);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(order.toString());
  console.log('Display order filled');
}

/**
 * Clicks the Save button in the modal
 */
export async function clickSave(page: Page) {
  console.log('Clicking Save button...');
  const button = getSaveButton(page);
  await expect(button).toBeVisible({ timeout: 10000 });
  await expect(button).toBeEnabled();
  await button.click();
  console.log('Save button clicked');
}

/**
 * Checks if an error message is displayed in the modal
 */
async function checkForErrorMessage(page: Page): Promise<string | null> {
  const errorDiv = page.locator('.error-message');
  if (await errorDiv.isVisible({ timeout: 1000 }).catch(() => false)) {
    return await errorDiv.textContent() ?? 'Unknown error';
  }
  return null;
}

/**
 * Waits for the modal to close
 */
export async function waitForModalClose(page: Page) {
  console.log('Waiting for modal to close...');
  try {
    await expect(getModalHeading(page)).not.toBeVisible({ timeout: 10000 });
    console.log('Modal closed');
  } catch (e) {
    // Check if there's an error message in the modal
    const errorMessage = await checkForErrorMessage(page);
    if (errorMessage) {
      console.log(`Modal error detected: ${errorMessage}`);
      throw new Error(`Account save failed with error: ${errorMessage}`);
    }
    throw e;
  }
}

/**
 * Creates a root account
 * @param page - Playwright page object
 * @param name - Account name (e.g., "1 Actifs / Assets")
 * @param type - Account type (e.g., "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE")
 * @param displayOrder - Optional display order (defaults to extracting number from name)
 */
export async function createRootAccount(page: Page, name: string, type: string, displayOrder?: number) {
  console.log(`Creating root account: ${name} (${type})`);
  await clickCreateAccount(page);
  await waitForAccountModal(page);
  await fillAccountName(page, name);
  await selectAccountType(page, type);

  // Set display order if provided, otherwise extract from account name
  const order = displayOrder ?? extractAccountNumber(name);
  if (order !== null) {
    await fillDisplayOrder(page, order);
  }

  await clickSave(page);
  await waitForModalClose(page);
  console.log('Root account created');

  // Wait for the account table to refresh and show the new account
  await waitForAccountInTable(page);
}

/**
 * Opens the context menu for an account and clicks "Add Child"
 * @param page - Playwright page object
 * @param accountName - The name of the account to add a child to
 */
export async function openAddChildModal(page: Page, accountName: string) {
  console.log(`Opening Add Child modal for account: ${accountName}`);
  const trigger = getContextMenuTrigger(page, accountName);
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.click();
  
  const addChildButton = getAddChildButton(page);
  await expect(addChildButton).toBeVisible({ timeout: 5000 });
  await addChildButton.click();
  
  await waitForAccountModal(page);
  console.log('Add Child modal opened');
}

/**
 * Creates a child account under a parent account
 * @param page - Playwright page object
 * @param parentAccountName - The name of the parent account
 * @param childName - The name of the child account
 * @param type - Account type
 * @param displayOrder - Optional display order (defaults to extracting number from name)
 */
export async function createChildAccount(
  page: Page,
  parentAccountName: string,
  childName: string,
  type: string,
  displayOrder?: number
) {
  console.log(`Creating child account "${childName}" under "${parentAccountName}"`);
  await openAddChildModal(page, parentAccountName);
  await fillAccountName(page, childName);
  await selectAccountType(page, type);
  
  // Set display order if provided, otherwise extract from account name
  const order = displayOrder ?? extractAccountNumber(childName);
  if (order !== null) {
    await fillDisplayOrder(page, order);
  }
  
  await clickSave(page);
  await waitForModalClose(page);
  console.log('Child account created');
}

/**
 * Verifies that an account exists by checking for its code (and optionally its full name).
 *
 * When accountName is provided, searches for the exact "code accountName" combination.
 * This is needed when multiple root accounts share the same code (e.g., "2 Liabilities"
 * and "2 Equity" in Swiss SME accounting).
 *
 * When accountName is omitted, searches by code only and asserts that exactly one
 * account matches, failing if there are duplicates.
 *
 * @param page - Playwright page object
 * @param accountCode - The account code (e.g., "1020", "2")
 * @param accountName - Optional full account name for disambiguation (e.g., "Liabilities")
 */
export async function verifyAccountExists(page: Page, accountCode: string, accountName?: string) {
  const label = accountName ? `${accountCode} ${accountName}` : accountCode;
  console.log(`Verifying account exists: ${label}`);
  const account = getAccountByCode(page, accountCode, accountName);

  // Use expect() with timeout for auto-retry (the table may still be refreshing)
  // First wait for at least one match to appear
  await expect(account, `Account "${label}" not found (0 matches)`).not.toHaveCount(0, { timeout: 5000 });

  // Then assert exactly one match (fails if duplicate codes exist without disambiguation)
  const count = await account.count();
  if (count > 1) {
    const texts: string[] = [];
    for (let i = 0; i < count; i++) {
      texts.push(await account.nth(i).textContent() ?? '');
    }
    throw new Error(`Account "${label}" matched ${count} accounts (expected 1): ${JSON.stringify(texts)}`);
  }

  await expect(account).toBeVisible({ timeout: 5000 });
  console.log(`Account ${label} exists (unique)`);
}

/**
 * Verifies that the accounts page is displayed correctly
 */
export async function verifyAccountsPage(page: Page) {
  console.log('Verifying accounts page...');
  await expect(getHeading(page)).toBeVisible();
  await expect(getCreateAccountButton(page)).toBeVisible();
  console.log('Accounts page verified');
}

// ============================================================================
// Collapse / expand and balance helpers
//
// These helpers use evaluate() to find elements within the same <tr> as the
// account-name-link. This avoids Playwright locator chain issues with
// page.locator('tr', { has: ... }) when the inner locator has filters.
// ============================================================================

/**
 * Find the account-name-link element for the given code/name, then run an
 * evaluate() callback on it to extract information from the same row.
 * Returns whatever the callback returns, or null if the link wasn't found.
 */
async function evaluateInAccountRow<T>(
  page: Page,
  code: string,
  accountName: string | undefined,
  fn: (el: HTMLElement) => T | null
): Promise<T | null> {
  const link = getAccountByCode(page, code, accountName);
  await expect(link.first()).toBeVisible({ timeout: 10000 });
  return link.first().evaluate(fn);
}

/**
 * Toggle the collapse state of an account by clicking its collapse toggle.
 */
export async function toggleCollapse(page: Page, code: string, accountName?: string): Promise<void> {
  console.log(`Toggling collapse for account: ${code} ${accountName ?? ''}`);
  const link = getAccountByCode(page, code, accountName);
  await expect(link.first()).toBeVisible({ timeout: 10000 });
  // Click the collapse-toggle in the same row
  await link.first().evaluate((el) => {
    const tr = el.closest('tr');
    tr?.querySelector('.collapse-toggle')?.click();
  });
  await page.waitForTimeout(300);
  console.log(`Collapse toggled for: ${code}`);
}

/**
 * Collapse an account (toggle if currently expanded).
 */
export async function collapseAccount(page: Page, code: string, accountName?: string): Promise<void> {
  if (!(await isAccountCollapsed(page, code, accountName))) {
    await toggleCollapse(page, code, accountName);
  }
}

/**
 * Expand an account (toggle if currently collapsed).
 */
export async function expandAccount(page: Page, code: string, accountName?: string): Promise<void> {
  if (await isAccountCollapsed(page, code, accountName)) {
    await toggleCollapse(page, code, accountName);
  }
}

/**
 * Check if an account is currently collapsed.
 * A collapsed account shows the ▶ icon; an expanded one shows ▼.
 * Leaf accounts (no toggle) are never collapsed.
 */
export async function isAccountCollapsed(page: Page, code: string, accountName?: string): Promise<boolean> {
  const result = await evaluateInAccountRow(page, code, accountName, (el) => {
    const tr = el.closest('tr');
    if (!tr) return null;
    const toggle = tr.querySelector('.collapse-toggle');
    if (!toggle) return false; // leaf account
    return toggle.textContent?.includes('▶') ?? false;
  });
  return result ?? false;
}

/**
 * Get the displayed balance text for an account (e.g., "CHF 1,680.50" or "CHF 0.00").
 */
export async function getAccountBalanceText(page: Page, code: string, accountName?: string): Promise<string> {
  const text = await evaluateInAccountRow(page, code, accountName, (el) => {
    const tr = el.closest('tr');
    if (!tr) return null;
    const balance = tr.querySelector('.account-balance');
    return balance?.textContent?.trim() ?? null;
  });
  if (text === null) {
    throw new Error(`Could not find balance for account ${code} ${accountName ?? ''}`);
  }
  return text;
}

/**
 * Parse a displayed balance string (e.g. "CHF 1680.50" or "-95.00") into a number.
 * Strips the currency code/symbol and any thousands separators.
 */
export function parseBalanceText(text: string): number {
  const cleaned = text.replace(/[^0-9.\-]/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value)) {
    throw new Error(`Could not parse balance text as a number: "${text}"`);
  }
  return value;
}

/**
 * Get the displayed balance for an account as a number (see {@link getAccountBalanceText}
 * and {@link parseBalanceText}).
 */
export async function getAccountBalance(page: Page, code: string, accountName?: string): Promise<number> {
  const text = await getAccountBalanceText(page, code, accountName);
  return parseBalanceText(text);
}

/**
 * Check if the account's balance is displayed in bold (displaced-balance class),
 * which indicates the account is collapsed and showing the subtree sum.
 */
export async function isBalanceBold(page: Page, code: string, accountName?: string): Promise<boolean> {
  const result = await evaluateInAccountRow(page, code, accountName, (el) => {
    const tr = el.closest('tr');
    if (!tr) return false;
    return tr.querySelector('.account-balance.displaced-balance') !== null;
  });
  return result ?? false;
}

/**
 * Check if an account row is visible in the table.
 */
export async function isAccountRowVisible(page: Page, code: string, accountName?: string): Promise<boolean> {
  const link = getAccountByCode(page, code, accountName);
  return (await link.count()) > 0 && await link.first().isVisible({ timeout: 2000 }).catch(() => false);
}

/**
 * Assert that an account row is visible in the table.
 */
export async function assertAccountVisible(page: Page, code: string, accountName?: string): Promise<void> {
  console.log(`Asserting account visible: ${code} ${accountName ?? ''}`);
  const link = getAccountByCode(page, code, accountName);
  await expect(link.first()).toBeVisible({ timeout: 5000 });
  console.log(`✓ Visible: ${code}`);
}

/**
 * Assert that an account row is NOT visible in the table (hidden by collapsed ancestor).
 */
export async function assertAccountNotVisible(page: Page, code: string, accountName?: string): Promise<void> {
  console.log(`Asserting account NOT visible: ${code} ${accountName ?? ''}`);
  const link = getAccountByCode(page, code, accountName);
  const count = await link.count();
  // Either the element doesn't exist at all, or it's not visible
  if (count > 0) {
    const visible = await link.first().isVisible().catch(() => false);
    expect(visible, `Expected account ${code} to NOT be visible but it is`).toBe(false);
  }
  console.log(`✓ Not visible: ${code}`);
}

/**
 * Assert that an account has a collapse toggle (i.e., it has children).
 */
export async function assertHasCollapseToggle(page: Page, code: string, accountName?: string): Promise<void> {
  const result = await evaluateInAccountRow(page, code, accountName, (el) => {
    const tr = el.closest('tr');
    if (!tr) return false;
    return tr.querySelector('.collapse-toggle') !== null;
  });
  expect(result, `Expected collapse toggle for ${code} but none found`).toBe(true);
}

/**
 * Assert that an account does NOT have a collapse toggle (i.e., it's a leaf).
 */
export async function assertNoCollapseToggle(page: Page, code: string, accountName?: string): Promise<void> {
  const result = await evaluateInAccountRow(page, code, accountName, (el) => {
    const tr = el.closest('tr');
    if (!tr) return false;
    return tr.querySelector('.collapse-toggle') !== null;
  });
  expect(result, `Expected no collapse toggle for ${code} but one was found`).toBe(false);
}

/**
 * Expand all accounts by clearing the collapsed state from localStorage.
 * This is faster than toggling each one individually.
 */
export async function expandAllAccounts(page: Page): Promise<void> {
  console.log('Expanding all accounts (clearing localStorage)...');
  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  if (journalId) {
    await page.evaluate((jid) => {
      localStorage.removeItem(`collapsed-accounts-table:${jid}`);
    }, journalId);
  }
  await page.reload();
  await waitForAccountsPage(page);
  // Wait for account rows to load (the table loads data async after page render)
  await page.waitForSelector('tr .account-name-link', { timeout: 15000 }).catch(() => {
    console.log('Warning: no account-name-link elements found after reload');
  });
  console.log('All accounts expanded');
}
