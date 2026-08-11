import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for the Macros page
 */

/**
 * Wait for the macros page to load
 */
export async function waitForMacrosPage(page: Page): Promise<void> {
  console.log('Waiting for macros page to load...');
  await page.waitForSelector('h2:has-text("Transaction Macros")', { timeout: 10000 });
  console.log('Macros page loaded');
}

// ============================================================================
// Menu / Import Built-in helpers
// ============================================================================

/**
 * Open the macros options menu (the ☰ button in the macros header).
 */
export async function openMenu(page: Page): Promise<void> {
  console.log('Opening macros menu...');
  const menuBtn = page.locator('[data-testid="macros-menu-btn"]');
  await expect(menuBtn).toBeVisible({ timeout: 10000 });
  await menuBtn.click();
  // Wait for the dropdown to render
  await expect(page.locator('[data-testid="import-builtin-macros-btn"]')).toBeVisible({ timeout: 5000 });
  console.log('Macros menu opened');
}

/**
 * Click the "Import Built-in" menu item. The menu must already be open
 * (see {@link openMenu}).
 */
export async function clickImportBuiltin(page: Page): Promise<void> {
  console.log('Clicking "Import Built-in" (macros)...');
  const btn = page.locator('[data-testid="import-builtin-macros-btn"]');
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  console.log('"Import Built-in" (macros) clicked');
}

/**
 * Delete every macro via the API. Used to ensure a clean state before
 * importing the built-in macros so the import succeeds with a success
 * toast rather than a conflict dialog.
 */
export async function deleteAllMacrosViaApi(page: Page): Promise<number> {
  console.log('Deleting all existing macros via API...');
  const response = await page.request.get('/api/macro');
  if (!response.ok()) {
    throw new Error(`Failed to list macros: ${response.status()}`);
  }
  const macros = await response.json() as Array<{ id: string; name: string }>;
  let deleted = 0;
  for (const macro of macros) {
    const del = await page.request.delete(`/api/macro/${macro.id}`);
    if (del.ok()) {
      deleted++;
      console.log(`  ✓ Deleted macro "${macro.name}" (${macro.id})`);
    } else {
      console.log(`  ✗ Failed to delete macro "${macro.name}" (${macro.id}): ${del.status()}`);
    }
  }
  console.log(`Deleted ${deleted} of ${macros.length} macro(s)`);
  return deleted;
}

/**
 * Get the list of macro names currently displayed on the page.
 */
export async function getMacroNames(page: Page): Promise<string[]> {
  await waitForMacrosPage(page);
  const cards = page.locator('.macro-card h3');
  const count = await cards.count();
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await cards.nth(i).textContent();
    if (text) names.push(text.trim());
  }
  return names;
}

/**
 * Click on a macro card to select it
 */
export async function selectMacro(page: Page, macroName: string): Promise<void> {
  console.log(`Selecting macro: ${macroName}`);
  // Find the macro card by looking for the exact name in the card's title/heading
  const macroCard = page.locator('.macro-card').filter({ has: page.locator(`h3:has-text("${macroName}")`) });
  await macroCard.click();
  await waitForMacroDialog(page);
  console.log(`Macro "${macroName}" selected`);
}

/**
 * Wait for the macro execution dialog to appear
 */
export async function waitForMacroDialog(page: Page): Promise<void> {
  console.log('Waiting for macro dialog...');
  await page.waitForSelector('.modal-overlay', { state: 'visible', timeout: 10000 });
  await page.waitForTimeout(500);
  console.log('Macro dialog visible');
}

/**
 * Get the value of a macro parameter field
 * Handles both regular inputs and autocomplete fields
 */
export async function getParameterValue(page: Page, paramName: string): Promise<string> {
  console.log(`Getting value of parameter: ${paramName}`);
  
  // First try regular input with id
  const regularInput = page.locator(`input[id="param-${paramName}"]`);
  const isRegularInputVisible = await regularInput.isVisible({ timeout: 1000 }).catch(() => false);
  
  if (isRegularInputVisible) {
    const value = await regularInput.inputValue();
    console.log(`Parameter ${paramName} value (regular input): "${value}"`);
    return value;
  }
  
  // If not found, try autocomplete input
  // Find all parameter fields and look for one whose label contains text related to the parameter
  const allParamFields = page.locator('.parameter-field');
  const count = await allParamFields.count();
  
  for (let i = 0; i < count; i++) {
    const paramField = allParamFields.nth(i);
    const label = paramField.locator('label');
    const labelText = await label.textContent();
    
    // Check if this is the right field by looking at the label's "for" attribute or text content
    const labelFor = await label.getAttribute('for');
    if (labelFor === `param-${paramName}` || labelText?.toLowerCase().includes(paramName.toLowerCase().replace('_', ' '))) {
      const autocompleteInput = paramField.locator('input.autocomplete-input');
      const isAutocompleteVisible = await autocompleteInput.isVisible().catch(() => false);
      
      if (isAutocompleteVisible) {
        const value = await autocompleteInput.inputValue();
        console.log(`Parameter ${paramName} value (autocomplete): "${value}"`);
        return value;
      }
    }
  }
  
  throw new Error(`Could not find input for parameter: ${paramName}`);
}

/**
 * Fill a macro parameter field
 */
export async function fillParameter(page: Page, paramName: string, value: string): Promise<void> {
  console.log(`Filling parameter ${paramName}: ${value}`);
  const input = page.locator(`input[id="param-${paramName}"]`);
  await input.fill(value);
}

/**
 * Fill a macro parameter using autocomplete
 */
export async function fillParameterAutocomplete(
  page: Page,
  paramPrompt: string,
  searchValue: string
): Promise<void> {
  console.log(`Filling autocomplete parameter ${paramPrompt}: ${searchValue}`);
  
  // Find the parameter field that contains the label with this prompt
  const paramField = page.locator('.parameter-field').filter({
    has: page.locator(`label:has-text("${paramPrompt}")`)
  }).first();
  
  // Find the autocomplete input within this parameter field
  const autocompleteInput = paramField.locator('input.autocomplete-input');
  
  // Click to focus and trigger dropdown
  await autocompleteInput.click();
  await page.waitForTimeout(300);
  
  // Type the search value
  await autocompleteInput.fill(searchValue);
  
  // Wait for autocomplete results
  await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
  await page.waitForTimeout(500);
  
  // Find and click the matching item
  const dropdownItems = page.locator('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)');
  const count = await dropdownItems.count();
  
  let foundItem = null;
  for (let i = 0; i < count; i++) {
    const item = dropdownItems.nth(i);
    const text = await item.textContent();
    if (text && text.includes(searchValue)) {
      foundItem = item;
      break;
    }
  }
  
  if (foundItem) {
    await foundItem.click({ force: true });
    await page.waitForTimeout(500);
    console.log(`Parameter ${paramPrompt} filled with ${searchValue}`);
  } else {
    throw new Error(`Could not find dropdown item for: ${searchValue}`);
  }
}

/**
 * Click the Execute Macro button
 */
export async function executeMacro(page: Page): Promise<void> {
  console.log('Executing macro...');
  await page.click('button:has-text("Execute Macro")');
  await page.waitForTimeout(1000);
}

/**
 * Close the macro dialog
 */
export async function closeDialog(page: Page): Promise<void> {
  console.log('Closing macro dialog...');
  await page.click('.close-btn');
  await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 5000 });
  console.log('Macro dialog closed');
}

/**
 * Check if an error message is displayed
 */
export async function hasErrorMessage(page: Page): Promise<boolean> {
  const errorBox = page.locator('.error-message');
  return await errorBox.isVisible().catch(() => false);
}

/**
 * Get the error message text
 */
export async function getErrorMessage(page: Page): Promise<string | null> {
  const errorBox = page.locator('.error-message');
  const visible = await errorBox.isVisible().catch(() => false);
  if (visible) {
    return await errorBox.textContent();
  }
  return null;
}

/**
 * Verify a macro exists on the page
 */
export async function verifyMacroExists(page: Page, macroName: string): Promise<void> {
  console.log(`Verifying macro exists: ${macroName}`);
  await page.waitForSelector(`.macro-card:has-text("${macroName}")`, { timeout: 5000 });
  console.log(`✓ Macro "${macroName}" found`);
}

// ============================================================================
// Ensure macro exists via API (idempotent setup, without touching other macros)
// ============================================================================

/**
 * A macro definition as accepted by the macro creation API (matches MacroDTO,
 * minus the server-assigned id/createdDate/modifiedDate fields).
 */
export interface MacroDefinition {
  name: string;
  description: string;
  parameters: Array<{
    name: string;
    type: string;
    prompt: string;
    defaultValue?: string | null;
    required: boolean;
    filter?: string | null;
  }>;
  template: string;
  validation?: { balanceCheck: boolean; minPostings: number | null } | null;
  notes?: string | null;
}

/**
 * Ensure a macro with the given name exists, creating it via the API if it
 * doesn't. Unlike {@link deleteAllMacrosViaApi} + "Import Built-in", this does
 * NOT touch any other existing macro, so it is safe to call regardless of
 * test execution order.
 *
 * @returns the id of the existing or newly created macro
 */
export async function ensureMacroExists(page: Page, macro: MacroDefinition): Promise<string> {
  console.log(`Ensuring macro "${macro.name}" exists...`);

  const listResponse = await page.request.get('/api/macro');
  if (!listResponse.ok()) {
    throw new Error(`Failed to list macros: ${listResponse.status()}`);
  }
  const macros = await listResponse.json() as Array<{ id: string; name: string }>;
  const existing = macros.find(m => m.name === macro.name);
  if (existing) {
    console.log(`Macro "${macro.name}" already exists (id: ${existing.id})`);
    return existing.id;
  }

  console.log(`Macro "${macro.name}" does not exist, creating it via the API...`);
  const createResponse = await page.request.post('/api/macro', { data: macro });
  if (!createResponse.ok()) {
    throw new Error(`Failed to create macro "${macro.name}": ${createResponse.status()} ${await createResponse.text()}`);
  }
  const created = await createResponse.json() as { id: string };
  console.log(`✓ Macro "${macro.name}" created (id: ${created.id})`);
  return created.id;
}

// ============================================================================
// Batch execution helpers
// ============================================================================

/**
 * Click the "Execute Batch…" button on a macro's card to open the batch
 * execution dialog for that macro.
 */
export async function selectMacroForBatch(page: Page, macroName: string): Promise<void> {
  console.log(`Opening batch dialog for macro: ${macroName}`);
  const macroCard = page.locator('.macro-card').filter({ has: page.locator(`h3:has-text("${macroName}")`) });
  await macroCard.locator('[data-testid="batch-macro-btn"]').click();
  await waitForBatchDialog(page);
  console.log(`Batch dialog opened for "${macroName}"`);
}

/**
 * Wait for the batch execution dialog to appear.
 */
export async function waitForBatchDialog(page: Page): Promise<void> {
  console.log('Waiting for batch dialog...');
  await page.waitForSelector('[data-testid="batch-csv-input"]', { state: 'visible', timeout: 10000 });
  console.log('Batch dialog visible');
}

/**
 * Fill one of the batch dialog's shared (account-type) parameters using the
 * autocomplete field, selecting the option whose label contains `searchValue`.
 */
export async function fillBatchSharedParameterAutocomplete(
  page: Page,
  paramName: string,
  searchValue: string
): Promise<void> {
  console.log(`Filling batch shared parameter ${paramName}: ${searchValue}`);

  const paramField = page.locator('.parameter-field').filter({
    has: page.locator(`label[for="batch-param-${paramName}"]`)
  });
  const autocompleteInput = paramField.locator('input.autocomplete-input');

  await autocompleteInput.click();
  await page.waitForTimeout(300);
  await autocompleteInput.fill(searchValue);

  await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
  await page.waitForTimeout(500);

  const dropdownItems = page.locator('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)');
  const count = await dropdownItems.count();

  let foundItem = null;
  for (let i = 0; i < count; i++) {
    const item = dropdownItems.nth(i);
    const text = await item.textContent();
    if (text && text.includes(searchValue)) {
      foundItem = item;
      break;
    }
  }

  if (foundItem) {
    await foundItem.click({ force: true });
    await page.waitForTimeout(500);
    console.log(`Batch shared parameter ${paramName} filled with ${searchValue}`);
  } else {
    throw new Error(`Could not find dropdown item for batch shared parameter ${paramName}: ${searchValue}`);
  }
}

/**
 * Fill the batch dialog's CSV textarea (one row per transaction).
 */
export async function fillBatchCsv(page: Page, csv: string): Promise<void> {
  console.log(`Filling batch CSV with ${csv.split('\n').length} row(s)`);
  const textarea = page.locator('[data-testid="batch-csv-input"]');
  await textarea.fill(csv);
}

/**
 * Click the "Execute Batch" button and wait for the results section to appear.
 */
export async function executeBatch(page: Page): Promise<void> {
  console.log('Executing macro batch...');
  await page.click('[data-testid="execute-batch-btn"]');
  await page.waitForSelector('.batch-results-section', { timeout: 15000 });
  console.log('Batch execution results displayed');
}

/**
 * Summary of the batch results shown in the dialog after execution, derived
 * from the number of success/error rows rendered in the results list.
 */
export interface BatchResultSummary {
  successCount: number;
  failureCount: number;
  totalRows: number;
}

/**
 * Read the per-row batch results displayed in the dialog after execution.
 */
export async function getBatchResultSummary(page: Page): Promise<BatchResultSummary> {
  const successCount = await page.locator('.batch-results-list .batch-row-success').count();
  const failureCount = await page.locator('.batch-results-list .batch-row-error').count();
  const summary = { successCount, failureCount, totalRows: successCount + failureCount };
  console.log(`Batch result summary: ${JSON.stringify(summary)}`);
  return summary;
}

/**
 * Close the batch execution dialog.
 */
export async function closeBatchDialog(page: Page): Promise<void> {
  console.log('Closing batch dialog...');
  await page.locator('.modal-content').filter({ has: page.locator('[data-testid="batch-csv-input"]') })
    .locator('.close-btn').click();
  await page.waitForSelector('[data-testid="batch-csv-input"]', { state: 'hidden', timeout: 5000 });
  console.log('Batch dialog closed');
}
