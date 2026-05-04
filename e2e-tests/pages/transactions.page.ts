import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for the Transactions/Journal page
 */

/**
 * Wait for the journal/transactions page to load
 */
export async function waitForJournalPage(page: Page): Promise<void> {
  console.log('Waiting for journal page to load...');
  await page.waitForSelector('h1:has-text("Journal Viewer")', { timeout: 10000 });
  // Log which journal is selected and any active filter
  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  const filterStr = await page.evaluate(() => localStorage.getItem('abstraccount:globalEql'));
  console.log(`Journal page: selected journalId = ${journalId}, filter = "${filterStr}"`);
  // Wait for the transaction table to populate (data fetched async after page loads)
  await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {
    console.log('No transaction rows found in table');
  });
  console.log('Journal page loaded');
}

/**
 * Click the "Add Transaction" button to open the transaction modal
 */
export async function clickAddTransaction(page: Page): Promise<void> {
  console.log('Clicking Add Transaction button...');
  await page.click('button:has-text("Add Transaction")');
  await waitForTransactionModal(page);
  console.log('Transaction modal opened');
}

/**
 * Wait for the transaction edit modal to be visible
 */
export async function waitForTransactionModal(page: Page): Promise<void> {
  console.log('Waiting for transaction modal...');
  // Wait for the modal overlay to be visible (the modal uses a .modal-overlay wrapper)
  await page.waitForSelector('.modal-overlay', { state: 'visible', timeout: 10000 });
  await page.waitForSelector('h2:has-text("Transaction")', { timeout: 5000 });
  console.log('Transaction modal visible');
}

/**
 * Fill in the transaction date field
 */
export async function fillTransactionDate(page: Page, date: string): Promise<void> {
  console.log(`Filling transaction date: ${date}`);
  await page.fill('input[name="date"]', date);
}

/**
 * Fill in the transaction description field
 */
export async function fillTransactionDescription(page: Page, description: string): Promise<void> {
  console.log(`Filling transaction description: ${description}`);
  await page.fill('input[name="description"]', description);
}

/**
 * Fill in the partner field by searching for partner number (e.g., P00000001)
 * IMPORTANT: Always use partner number, not name
 */
export async function fillTransactionPartner(page: Page, partnerNumber: string): Promise<void> {
  console.log(`Filling transaction partner: ${partnerNumber}`);
  
  // Find the partner autocomplete input
  const partnerInput = page.locator('abs-autocomplete[name="partnerId"] input.autocomplete-input');
  
  // Click to focus and trigger the dropdown
  await partnerInput.click();
  
  // Wait a moment for the dropdown to appear
  await page.waitForTimeout(300);
  
  // Type the partner number
  await partnerInput.fill(partnerNumber);
  
  // Wait for autocomplete results to appear and debounce to complete
  await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
  await page.waitForTimeout(500); // Wait for debounce to complete
  
  // Find and click the dropdown item that contains the partner number
  const dropdownItems = page.locator('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)');
  const count = await dropdownItems.count();
  
  let foundItem = null;
  for (let i = 0; i < count; i++) {
    const item = dropdownItems.nth(i);
    const text = await item.textContent();
    if (text && text.includes(partnerNumber)) {
      foundItem = item;
      break;
    }
  }
  
  if (foundItem) {
    // Click the dropdown item to select it
    await foundItem.click({ force: true });
    // Wait for the dropdown to close and the value to be set
    await page.waitForTimeout(500);
    console.log(`Partner ${partnerNumber} selected`);
  } else {
    throw new Error(`Could not find dropdown item for partner: ${partnerNumber}`);
  }
}

/**
 * Set the transaction status
 */
export async function setTransactionStatus(page: Page, status: string): Promise<void> {
  console.log(`Setting transaction status: ${status}`);
  await page.selectOption('select[name="status"]', status);
}

/**
 * Add a tag to the transaction by typing in the tag input and clicking Add Tag
 */
export async function addTag(page: Page, tag: string): Promise<void> {
  console.log(`Adding tag: ${tag}`);
  // Find the tag input field - it's the autocomplete input with placeholder "key:value or key"
  const tagInput = page.locator('abs-autocomplete[name="tagInput"] input.autocomplete-input');
  await tagInput.fill(tag);
  // Click the Add Tag button
  await page.click('button:has-text("Add Tag")');
  // Wait a moment for the tag to be added
  await page.waitForTimeout(500);
  console.log(`Tag "${tag}" added`);
}

/**
 * Click the "Add Entry" button to add a new entry to the transaction
 */
export async function clickAddEntry(page: Page): Promise<void> {
  console.log('Clicking Add Entry button...');
  await page.click('button:has-text("Add Entry")');
  // Wait a moment for the entry to be added to the DOM
  await page.waitForTimeout(200);
  console.log('Entry added');
}

/**
 * Fill in an entry's account by searching for the account number
 * @param page - Playwright page object
 * @param entryIndex - 0-based index of the entry
 * @param accountNumber - Account number to search for (e.g., "1000", "2800")
 */
export async function fillEntryAccount(page: Page, entryIndex: number, accountNumber: string): Promise<void> {
  console.log(`Filling entry ${entryIndex + 1} account with: ${accountNumber}`);
  
  // Find the entry item first, then find the account autocomplete within it
  const entryItem = page.locator('.entry-item').nth(entryIndex);
  const accountInput = entryItem.locator('abs-autocomplete input.autocomplete-input').first();
  
  // Press Escape to close any open dropdown, then click to focus
  await accountInput.press('Escape');
  await accountInput.click();

  // Fill with the account number to trigger a fresh search
  await accountInput.fill(accountNumber);

  // Build a regex that matches the account number as a complete token (not a substring of another number)
  const escapedNumber = accountNumber.replace(/\./g, '\\.');
  const matchRegex = new RegExp(`(^|[>:\\s])${escapedNumber}(\\s|:|$)`);

  // Wait for the specific matching dropdown item to appear (Playwright retries automatically).
  // filter({ hasText }) combined with a regex ensures we don't match stale results.
  const dropdownItemSelector = '.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)';
  const matchingItem = page.locator(dropdownItemSelector).filter({ hasText: matchRegex }).first();
  await expect(matchingItem).toBeVisible({ timeout: 10000 });

  // Snapshot all item texts for logging
  const allItems = page.locator(dropdownItemSelector);
  const count = await allItems.count();
  console.log(`Found ${count} dropdown items for account search: ${accountNumber}`);
  const matchedText = (await matchingItem.textContent() ?? '').trim();
  console.log(`Matched dropdown item: "${matchedText}"`);

  // Click using force:true to handle any blur-closes-dropdown timing
  await matchingItem.click({ force: true });
  // Wait for the input to update with the selected account's label
  await expect(accountInput).not.toHaveValue('', { timeout: 5000 });
  
  console.log(`Entry ${entryIndex + 1} account filled`);
}

/**
 * Fill in an entry's amount
 * @param page - Playwright page object
 * @param entryIndex - 0-based index of the entry
 * @param amount - Amount value (can be positive or negative)
 */
export async function fillEntryAmount(page: Page, entryIndex: number, amount: number): Promise<void> {
  console.log(`Filling entry ${entryIndex + 1} amount: ${amount}`);
  const entryItem = page.locator('.entry-item').nth(entryIndex);
  const amountInput = entryItem.locator('input[type="number"]').first();
  await amountInput.fill(amount.toString());
}

/**
 * Fill in an entry's commodity
 * @param page - Playwright page object
 * @param entryIndex - 0-based index of the entry
 * @param commodity - Commodity code (e.g., "CHF", "USD")
 */
export async function fillEntryCommodity(page: Page, entryIndex: number, commodity: string): Promise<void> {
  console.log(`Filling entry ${entryIndex + 1} commodity: ${commodity}`);
  const entryItem = page.locator('.entry-item').nth(entryIndex);
  // Find the commodity input - it's in the first form-row, second form-group
  // We need to skip the autocomplete input and find the regular text input for commodity
  const commodityInput = entryItem.locator('.form-row').first().locator('.form-group').nth(1).locator('input[type="text"]');
  await commodityInput.waitFor({ state: 'visible', timeout: 5000 });
  await commodityInput.fill(commodity);
}

/**
 * Fill in an entry's note
 * @param page - Playwright page object
 * @param entryIndex - 0-based index of the entry
 * @param note - Note text
 */
export async function fillEntryNote(page: Page, entryIndex: number, note: string): Promise<void> {
  console.log(`Filling entry ${entryIndex + 1} note: ${note}`);
  const entryItem = page.locator('.entry-item').nth(entryIndex);
  const noteInput = entryItem.locator('input[placeholder="Optional"]');
  await noteInput.fill(note);
}

/**
 * Get the current balance displayed in the transaction form
 */
export async function getBalance(page: Page): Promise<string> {
  const balanceText = await page.textContent('.balance-info strong');
  return balanceText || '0.00';
}

/**
 * Verify that the transaction is balanced
 */
export async function verifyBalanced(page: Page): Promise<void> {
  console.log('Verifying transaction is balanced...');
  await page.waitForSelector('.badge-success:has-text("Balanced")', { timeout: 5000 });
  console.log('Transaction is balanced ✓');
}

/**
 * Click the Save/Create button to save the transaction
 */
export async function saveTransaction(page: Page): Promise<void> {
  console.log('Saving transaction...');
  
  // Check for any error messages before saving
  const errorBox = page.locator('.error-box');
  const hasError = await errorBox.isVisible().catch(() => false);
  if (hasError) {
    const errorText = await errorBox.textContent();
    console.error('Error before saving:', errorText);
  }
  
  // The button text is "Create" for new transactions and "Save" for edits
  const saveButton = page.locator('button:has-text("Create"), button:has-text("Save")').first();
  await saveButton.click();
  
  // Wait a moment for any error to appear
  await page.waitForTimeout(1000);
  
  // Check for error after clicking save
  const hasErrorAfterSave = await errorBox.isVisible().catch(() => false);
  if (hasErrorAfterSave) {
    const errorText = await errorBox.textContent();
    console.error('Error after clicking save:', errorText);
    throw new Error(`Failed to save transaction: ${errorText}`);
  }
  
  // Wait for the modal overlay to close
  await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
  console.log('Transaction saved successfully');
}

/**
 * Click the Cancel button to close the modal without saving
 */
export async function cancelTransaction(page: Page): Promise<void> {
  console.log('Cancelling transaction...');
  await page.click('button:has-text("Cancel")');
  await page.waitForSelector('app-transaction-edit-modal', { state: 'hidden', timeout: 5000 });
  console.log('Transaction modal closed');
}

/**
 * Verify that a transaction exists in the transactions list
 * @param page - Playwright page object
 * @param description - Transaction description to look for
 */
export async function verifyTransactionExists(page: Page, description: string): Promise<void> {
  console.log(`Verifying transaction exists: ${description}`);
  try {
    await expect(page.locator(`td:has-text("${description}")`).first()).toBeVisible({ timeout: 15000 });
    console.log(`Transaction "${description}" found in list`);
  } catch (e) {
    // Log visible transaction descriptions for debugging
    const allDescCells = page.locator('td.description-cell, td:nth-child(4)');
    const count = await allDescCells.count();
    console.error(`Transaction "${description}" NOT found. Visible rows (${count}):`);
    for (let i = 0; i < Math.min(count, 10); i++) {
      const text = await allDescCells.nth(i).textContent().catch(() => '?');
      console.error(`  [${i}]: "${text?.trim()}"`);
    }
    // Also log page URL for context
    console.error(`Current URL: ${page.url()}`);
    throw e;
  }
}

/**
 * Verify transaction details in the transactions list
 * @param page - Playwright page object
 * @param description - Transaction description to look for
 * @param expectedDate - Expected transaction date (optional)
 * @param expectedPartner - Expected partner number (optional)
 * @param expectedValue - Expected transaction value (optional, e.g., "7.00" or "38.50")
 */
export async function verifyTransactionDetails(
  page: Page,
  description: string,
  options?: {
    date?: string;
    partner?: string;
    value?: string;
  }
): Promise<void> {
  console.log(`Verifying transaction details for: ${description}`);
  
  // Find the transaction row
  const transactionRow = page.locator('tr').filter({ hasText: description }).first();
  await expect(transactionRow).toBeVisible();
  console.log('✓ Transaction row is visible in the table');
  
  // Verify date if provided
  if (options?.date) {
    await expect(transactionRow).toContainText(options.date);
    console.log(`✓ Transaction date is correct (${options.date})`);
  }
  
  // Verify partner if provided
  if (options?.partner) {
    await expect(transactionRow).toContainText(options.partner);
    console.log(`✓ Transaction partner is correct (${options.partner})`);
  }
  
  // Verify description
  await expect(transactionRow).toContainText(description);
  console.log('✓ Transaction description is correct');
  
  // Verify value if provided (only if it's displayed in the table)
  if (options?.value) {
    const rowText = await transactionRow.textContent();
    if (rowText?.includes(options.value)) {
      await expect(transactionRow).toContainText(options.value);
      console.log(`✓ Transaction value is correct (${options.value})`);
    } else {
      console.log(`ℹ Transaction value (${options.value}) not displayed in table row`);
    }
  }
}

/**
 * Count the number of entries in the current transaction form
 */
export async function countEntries(page: Page): Promise<number> {
  const entries = await page.locator('.entry-item').count();
  console.log(`Current number of entries: ${entries}`);
  return entries;
}

/**
 * Create a complete transaction entry
 * Helper function that combines all entry-related actions
 */
export async function createEntry(
  page: Page,
  entryIndex: number,
  accountNumber: string,
  amount: number,
  commodity: string = 'CHF',
  note?: string
): Promise<void> {
  console.log(`Creating entry ${entryIndex + 1}: account=${accountNumber}, amount=${amount}, commodity=${commodity}`);
  
  await fillEntryAccount(page, entryIndex, accountNumber);
  await fillEntryAmount(page, entryIndex, amount);
  
  // Fill commodity (always, to ensure it's set correctly)
  await fillEntryCommodity(page, entryIndex, commodity);
  
  if (note) {
    await fillEntryNote(page, entryIndex, note);
  }
  
  console.log(`Entry ${entryIndex + 1} created`);
}
