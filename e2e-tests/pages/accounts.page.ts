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
 * Gets an account link by its account code/number
 * The account code is at the start of the account name in the account-name-link element
 */
function getAccountByCode(page: Page, code: string) {
  // Match code at start of the account name (e.g., "1 Assets" or just "1")
  // Using has-text with a pattern like "1 " or just the code for exact matches
  const pattern = `${code} `;
  return page.locator('.account-name-link').filter({ hasText: pattern }).first();
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
 * Verifies that an account exists by checking for its code
 */
export async function verifyAccountExists(page: Page, accountCode: string) {
  console.log(`Verifying account exists: ${accountCode}`);
  const account = getAccountByCode(page, accountCode);
  await expect(account).toBeVisible({ timeout: 5000 });
  console.log(`Account ${accountCode} exists`);
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
