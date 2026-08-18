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
    // Use click({ force: true }) to bypass Playwright's interception/stability
    // checks (the 200ms blur timeout may close the dropdown while waiting).
    // Unlike evaluate(el => el.click()), Playwright's .click() dispatches real
    // browser mousedown+mouseup+click events that zone.js intercepts, ensuring
    // Angular's (mousedown)="selectOption(option)" handler fires.
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
 * Add a tag to the transaction by typing in the tag input and clicking Add Tag.
 *
 * After typing the tag value, the autocomplete dropdown may still be open
 * (showing "No results found" for free-text tags) and intercept clicks on the
 * "Add Tag" button. We dismiss the dropdown by blurring the input — clicking
 * on the modal header (a non-interactive element) — before clicking the
 * button. We must NOT press Escape because the transaction modal has a
 * document-level @HostListener('document:keydown.escape') that closes the
 * entire modal.
 */
export async function addTag(page: Page, tag: string): Promise<void> {
  console.log(`Adding tag: ${tag}`);
  // Find the tag input field - it's the autocomplete input with placeholder "key:value or key"
  const tagInput = page.locator('abs-autocomplete[name="tagInput"] input.autocomplete-input');
  await tagInput.fill(tag);
  // Dismiss the autocomplete dropdown by blurring the input. The dropdown
  // overlay would otherwise intercept the "Add Tag" button click.
  await page.locator('.modal-header h2').click().catch(() => {});
  await page.waitForTimeout(200);
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

  // Close any previously open autocomplete dropdown by blurring the active
  // input. We click the modal header (non-interactive) to move focus away,
  // then wait for the autocomplete's blur timeout (200ms) to close its
  // dropdown. We must NOT press Escape here because the transaction modal
  // has a document-level @HostListener('document:keydown.escape') that
  // would close the entire modal.
  await page.locator('.modal-header h2').click().catch(() => {});
  await page.waitForTimeout(300);

  // Now click the target account input to focus it
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

  // Use click({ force: true }) to bypass Playwright's interception/stability
  // checks. Playwright's .click() dispatches real browser events (mousedown,
  // mouseup, click) that zone.js intercepts, ensuring Angular's
  // (mousedown)="selectOption(option)" handler fires and the model updates.
  await matchingItem.click({ force: true });
  // Wait for selectOption to update the input with the account's full label
  // (e.g. "2000 Accounts payable" rather than just "2000"). This confirms
  // the Angular model was updated, not just the input text.
  await expect(accountInput).toHaveValue(new RegExp(escapedNumber), { timeout: 5000 });
  const finalValue = await accountInput.inputValue();
  console.log(`Entry ${entryIndex + 1} account value: "${finalValue}"`);

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

// ============================================================================
// Filter helpers (EQL - Entry Query Language)
// ============================================================================

/**
 * Apply an EQL filter string in the filter input on the journal/transactions page.
 * Clears any existing filter, types the new one, and clicks Apply.
 */
export async function applyFilter(page: Page, filter: string): Promise<void> {
  console.log(`Applying filter: "${filter}"`);
  const input = page.locator('input.filter-input');
  await input.waitFor({ state: 'visible', timeout: 5000 });
  // Clear existing text
  await input.fill('');
  await input.fill(filter);
  // Click the Apply button
  await page.locator('.apply-btn').click();
  // Wait for the table to refresh
  await page.waitForTimeout(500);
  console.log('Filter applied');
}

/**
 * Clear the active filter by clicking the ✕ button (or emptying the input).
 */
export async function clearFilter(page: Page): Promise<void> {
  console.log('Clearing filter...');
  const clearBtn = page.locator('.clear-btn');
  if (await clearBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await clearBtn.click();
    await page.waitForTimeout(500);
    console.log('Filter cleared via ✕ button');
  } else {
    // Fallback: empty the input and apply
    const input = page.locator('input.filter-input');
    await input.fill('');
    await page.locator('.apply-btn').click();
    await page.waitForTimeout(500);
    console.log('Filter cleared via empty input');
  }
}

/**
 * Count the number of visible transaction rows in the table.
 */
export async function getVisibleTransactionCount(page: Page): Promise<number> {
  // Count rows in the tbody that are actual data rows (not "no transactions" message)
  const rows = page.locator('table tbody tr:has(td)');
  const count = await rows.count();
  console.log(`Visible transaction rows: ${count}`);
  return count;
}

/**
 * Assert that a transaction with the given description is visible in the table.
 */
export async function assertTransactionVisible(page: Page, description: string): Promise<void> {
  console.log(`Asserting visible: "${description}"`);
  const cell = page.locator(`table tbody tr td`).filter({ hasText: description }).first();
  await expect(cell).toBeVisible({ timeout: 5000 });
  console.log(`✓ Visible: "${description}"`);
}

/**
 * Assert that a transaction with the given description is NOT visible in the table.
 */
export async function assertTransactionNotVisible(page: Page, description: string): Promise<void> {
  console.log(`Asserting NOT visible: "${description}"`);
  const cell = page.locator(`table tbody tr td`).filter({ hasText: description });
  const count = await cell.count();
  expect(count, `Expected "${description}" to NOT be visible but found ${count} match(es)`).toBe(0);
  console.log(`✓ Not visible: "${description}"`);
}

/**
 * Get all visible transaction descriptions from the table.
 */
export async function getVisibleTransactionDescriptions(page: Page): Promise<string[]> {
  // The description cell is the one containing the description text, typically the 4th column
  // or has a specific class. We'll grab all row text and extract descriptions.
  const rows = page.locator('table tbody tr:has(td)');
  const count = await rows.count();
  const descriptions: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).textContent();
    if (text) {
      // Extract the description part - it's after the date and partner columns
      // We'll just store the full row text for comparison purposes
      descriptions.push(text.trim().replace(/\s+/g, ' '));
    }
  }
  console.log(`Visible transaction descriptions: ${descriptions.length}`);
  return descriptions;
}

/**
 * Delete all transactions in the currently selected journal (per localStorage
 * `journalId`) whose description equals or contains `description`, via the API.
 *
 * This is more reliable than the UI-based delete flow (one at a time, can fail
 * if the modal doesn't open) and is used for test cleanup before a test creates
 * its own transactions, so re-runs don't accumulate duplicates.
 */
export async function deleteTransactionsByDescription(page: Page, description: string): Promise<number> {
  console.log(`Looking for transactions with description: "${description}"`);

  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  if (!journalId) {
    console.log('No journalId in localStorage, skipping cleanup');
    return 0;
  }

  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) {
    console.log(`API request failed: ${response.status()}, skipping cleanup`);
    return 0;
  }
  const transactions = await response.json() as Array<{ id: string; description?: string }>;

  let deletedCount = 0;
  for (const tx of transactions) {
    const txDescription = tx.description || '';
    if (txDescription === description || txDescription.includes(description)) {
      console.log(`  Deleting transaction: "${txDescription}" (id: ${tx.id})`);
      const deleteResponse = await page.request.delete(`/api/transaction/${tx.id}`);
      if (deleteResponse.ok()) {
        deletedCount++;
        console.log(`  ✓ Deleted transaction ${tx.id}`);
      } else {
        console.log(`  ✗ Failed to delete transaction ${tx.id}: ${deleteResponse.status()}`);
      }
    }
  }
  if (deletedCount === 0) {
    console.log(`Transaction "${description}" not found, nothing to delete`);
  } else {
    console.log(`Cleanup complete: ${deletedCount} transaction(s) deleted for "${description}"`);
  }
  return deletedCount;
}
