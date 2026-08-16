import { Page, expect } from '@playwright/test';

/**
 * Page object for the Reports page
 */

/**
 * Wait for the reports page to be visible
 */
export async function waitForReportsPage(page: Page): Promise<void> {
  console.log('Waiting for reports page to be visible...');
  await page.waitForSelector('select#template-select', { state: 'visible', timeout: 10000 });
  console.log('Reports page is visible');
}

// ============================================================================
// Menu / Import Built-in helpers
// ============================================================================

/**
 * Open the reports template options menu (the ☰ button in the reports header).
 */
export async function openMenu(page: Page): Promise<void> {
  console.log('Opening reports menu...');
  const menuBtn = page.locator('[data-testid="reports-menu-btn"]');
  await expect(menuBtn).toBeVisible({ timeout: 10000 });
  await menuBtn.click();
  // Wait for the dropdown to render
  await expect(page.locator('[data-testid="import-builtin-btn"]')).toBeVisible({ timeout: 5000 });
  console.log('Reports menu opened');
}

/**
 * Click the "Import Built-in" menu item. The menu must already be open
 * (see {@link openMenu}).
 */
export async function clickImportBuiltin(page: Page): Promise<void> {
  console.log('Clicking "Import Built-in"...');
  const btn = page.locator('[data-testid="import-builtin-btn"]');
  await expect(btn).toBeVisible({ timeout: 5000 });
  await btn.click();
  console.log('"Import Built-in" clicked');
}

/**
 * Delete every report template via the API. Used to ensure a clean state
 * before importing the built-in templates so the import succeeds with a
 * success toast rather than a conflict dialog.
 */
export async function deleteAllReportTemplatesViaApi(page: Page): Promise<number> {
  console.log('Deleting all existing report templates via API...');
  const response = await page.request.get('/api/report/templates');
  if (!response.ok()) {
    throw new Error(`Failed to list report templates: ${response.status()}`);
  }
  const templates = await response.json() as Array<{ id: string; name: string }>;
  let deleted = 0;
  for (const template of templates) {
    const del = await page.request.delete(`/api/report/templates/${template.id}`);
    if (del.ok()) {
      deleted++;
      console.log(`  ✓ Deleted template "${template.name}" (${template.id})`);
    } else {
      console.log(`  ✗ Failed to delete template "${template.name}" (${template.id}): ${del.status()}`);
    }
  }
  console.log(`Deleted ${deleted} of ${templates.length} report template(s)`);
  return deleted;
}

/**
 * Get the list of report template names currently available in the template
 * select dropdown.
 */
export async function getTemplateNames(page: Page): Promise<string[]> {
  await page.waitForSelector('select#template-select', { state: 'visible' });
  const options = await page.locator('select#template-select option').allTextContents();
  return options.map(o => o.trim()).filter(o => o.length > 0);
}

/**
 * Select a report template by name
 */
export async function selectReportTemplate(page: Page, templateName: string): Promise<void> {
  console.log(`Selecting report template: ${templateName}`);

  await page.waitForSelector('select#template-select', { state: 'visible' });

  // The template options are loaded asynchronously. Wait for the target
  // option to appear rather than reading the dropdown too early (which can
  // show only the placeholder "-- Choose a report --").
  let options: string[] = [];
  let matchingOption: string | undefined;
  for (let attempt = 0; attempt < 20; attempt++) {
    options = await page.locator('select#template-select option').allTextContents();
    matchingOption = options.find(opt => opt.trim().includes(templateName));
    if (matchingOption) break;
    await page.waitForTimeout(500);
  }

  if (!matchingOption) {
    throw new Error(`Report template "${templateName}" not found. Available: ${options.join(', ')}`);
  }

  await page.selectOption('select#template-select', { label: matchingOption.trim() });
  console.log(`Report template "${templateName}" selected`);
}

/**
 * Wait for the report output to be visible (report renders automatically on template selection)
 */
export async function generateReport(page: Page): Promise<void> {
  console.log('Waiting for report output...');
  await page.waitForSelector('.report-output', { state: 'visible', timeout: 15000 });
  console.log('Report generated');
}

/**
 * Get the full page content for validation
 */
export async function getReportContent(page: Page): Promise<string> {
  return await page.content();
}

/**
 * Verify a value appears in the report
 */
export async function verifyReportContains(page: Page, value: string, description: string): Promise<void> {
  const content = await page.content();
  if (!content.includes(value)) {
    throw new Error(`Report should contain ${description}: "${value}"`);
  }
  console.log(`✓ Found ${description}: ${value}`);
}

/**
 * Verify a solvency row has the expected value on the same <tr> as its title.
 * Solvency rows render as <tr> with <div class="solvency-title">{{title}}</div>
 * in the first <td> and the amount in <td class="amount-column">.
 *
 * @param rowTitle - The title text of the solvency row (e.g. "Total assets")
 * @param expectedValue - The expected value text (e.g. "1,893.10" or "97.54%")
 * @param isPercentage - If true, the value is a percentage (no commodity suffix)
 */
export async function verifySolvencyRowValue(
  page: Page,
  rowTitle: string,
  expectedValue: string,
  isPercentage: boolean = false
): Promise<void> {
  // Find the <tr> inside the solvency table whose .solvency-title matches.
  const row = page.locator('.solvency-table tr').filter({
    has: page.locator('.solvency-title', { hasText: rowTitle })
  }).first();

  await expect(row).toBeVisible({ timeout: 10000 });

  const rowText = await row.textContent();
  if (!rowText || !rowText.includes(expectedValue)) {
    throw new Error(
      `Solvency row "${rowTitle}": expected value "${expectedValue}" on the same row, but row text was: "${rowText?.trim()}"`
    );
  }

  console.log(`✓ Solvency row "${rowTitle}": ${expectedValue}${isPercentage ? ' (percentage)' : ''} (same row)`);
}

/**
 * Verify a total/subtotal line has the expected value on the same element.
 * Total lines render as <div class="total-line"> with <span class="total-label">
 * and <span class="total-amount">, or as <tr class="subtotal-row"> in tables.
 */
export async function verifyTotalLine(
  page: Page,
  totalLabel: string,
  expectedValue: string,
  commodity: string = 'CHF'
): Promise<void> {
  // Try total-line div first (used for subtotal-only sections)
  const totalDiv = page.locator('.total-line').filter({ hasText: totalLabel }).first();
  const divVisible = await totalDiv.isVisible({ timeout: 3000 }).catch(() => false);

  if (divVisible) {
    const divText = await totalDiv.textContent();
    const balancePattern = new RegExp(
      `${expectedValue.replace(/,/g, '[,\\s]?')}\\s*${commodity}`
    );
    if (!divText || !balancePattern.test(divText)) {
      throw new Error(
        `Total line "${totalLabel}": expected ${expectedValue} ${commodity} in the same element, but text was: "${divText?.trim()}"`
      );
    }
    console.log(`✓ Total line "${totalLabel}": ${expectedValue} ${commodity} (same element)`);
    return;
  }

  // Fall back to subtotal-row in tables
  const subtotalRow = page.locator('tr.subtotal-row').filter({ hasText: totalLabel }).first();
  const rowVisible = await subtotalRow.isVisible({ timeout: 3000 }).catch(() => false);

  if (rowVisible) {
    const rowText = await subtotalRow.textContent();
    const balancePattern = new RegExp(
      `${expectedValue.replace(/,/g, '[,\\s]?')}\\s*${commodity}`
    );
    if (!rowText || !balancePattern.test(rowText)) {
      throw new Error(
        `Subtotal row "${totalLabel}": expected ${expectedValue} ${commodity} in the same row, but text was: "${rowText?.trim()}"`
      );
    }
    console.log(`✓ Subtotal row "${totalLabel}": ${expectedValue} ${commodity} (same row)`);
    return;
  }

  throw new Error(`Total line "${totalLabel}" not found in report`);
}

/**
 * Verify a pattern matches in the report
 */
export async function verifyReportMatches(page: Page, pattern: RegExp, description: string): Promise<void> {
  const content = await page.content();
  if (!pattern.test(content)) {
    throw new Error(`Report should match ${description}: ${pattern}`);
  }
  console.log(`✓ Matched ${description}`);
}

/**
 * Verify a section exists in the report
 */
export async function verifySectionExists(page: Page, sectionTitle: string): Promise<void> {
  const selector = `h1:has-text("${sectionTitle}"), h2:has-text("${sectionTitle}"), h3:has-text("${sectionTitle}")`;
  await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
  console.log(`✓ Section found: ${sectionTitle}`);
}

/**
 * Verify an account appears in the report with a specific balance on the
 * same row. This is stricter than checking both strings exist somewhere on
 * the page — it ensures the balance is paired with the correct account.
 */
export async function verifyAccountBalance(
  page: Page, 
  accountNumber: string, 
  balance: string,
  commodity: string = 'CHF'
): Promise<void> {
  // Find the table row (<tr>) that contains the account number.
  // Account numbers appear in <a class="path-segment"> inside the first <td>.
  const row = page.locator('tr').filter({ hasText: accountNumber }).first();

  // Wait for the row to be visible
  await expect(row).toBeVisible({ timeout: 10000 });

  // Check that the same row contains the expected balance (with commodity).
  // Allow for formatting variations: "1,785.00 CHF" or "1 785.00 CHF".
  const balancePattern = new RegExp(
    `${balance.replace(/,/g, '[,\\s]?')}\\s*${commodity}`
  );
  const rowText = await row.textContent();
  if (!rowText || !balancePattern.test(rowText)) {
    throw new Error(
      `Account ${accountNumber}: expected balance ${balance} ${commodity} on the same row, but row text was: "${rowText?.trim()}"`
    );
  }

  console.log(`✓ Account ${accountNumber}: ${balance} ${commodity} (same row)`);
}

/**
 * Verify total line matches expected value. Delegates to verifyTotalLine
 * which checks the label and value are on the same row/element.
 */
export async function verifyTotal(
  page: Page,
  totalLabel: string,
  expectedValue: string,
  commodity: string = 'CHF'
): Promise<void> {
  await verifyTotalLine(page, totalLabel, expectedValue, commodity);
}

/**
 * Verify the balance sheet balances (Assets = Liabilities + Equity).
 * Checks that both "Total Assets" and "Total Liabilities and Equity" rows
 * show the expected total, with the value on the same row as the label.
 */
export async function verifyBalanceSheetBalances(
  page: Page,
  expectedTotal: string,
  commodity: string = 'CHF'
): Promise<void> {
  // Check Total Assets on its own row
  await verifyTotalLine(page, 'Total Assets', expectedTotal, commodity);
  console.log(`✓ Total Assets: ${expectedTotal} ${commodity}`);

  // Check Total Liabilities and Equity on its own row
  await verifyTotalLine(page, 'Total Liabilities and Equity', expectedTotal, commodity);
  console.log(`✓ Total Liabilities and Equity: ${expectedTotal} ${commodity}`);
  console.log('✓ Balance sheet balances!');
}

/**
 * Verify no negative signs appear in a section (for checking sign inversion)
 */
export async function verifyNoNegativeValues(page: Page, sectionName: string): Promise<void> {
  const content = await page.content();
  
  // Extract the section content
  const sectionMatch = content.match(new RegExp(`${sectionName}<[\\s\\S]*?(?=<h[12]|$)`));
  
  if (sectionMatch) {
    // Look for negative currency values (e.g., "-38.50 CHF" or "-2,000.00 CHF")
    // This pattern matches minus signs followed by numbers and currency
    const negativeValuePattern = /-\s*\d+[,.]?\d*\s*CHF/;
    if (negativeValuePattern.test(sectionMatch[0])) {
      throw new Error(`Section "${sectionName}" should not contain negative values (sign inversion bug)`);
    }
  }
  
  console.log(`✓ No negative values in ${sectionName} section`);
}

/**
 * Verify a partner appears in the Partner Activity Report with a specific
 * expense value on the same row. The partner table has <tr> rows with the
 * partner name in the first <td> and expense amount in an <td class="amount-column">.
 */
export async function verifyPartnerExpense(
  page: Page,
  partnerIdentifier: string,
  expectedExpense: string,
  commodity: string = 'CHF'
): Promise<void> {
  // Find the <tr> that contains the partner identifier (name or ID)
  const row = page.locator('tr').filter({ hasText: partnerIdentifier }).first();
  await expect(row).toBeVisible({ timeout: 10000 });

  const rowText = await row.textContent();
  const expensePattern = new RegExp(
    `${expectedExpense.replace(/,/g, '[,\\s]?')}\\s*${commodity}`
  );
  if (!rowText || !expensePattern.test(rowText)) {
    throw new Error(
      `Partner "${partnerIdentifier}": expected expense ${expectedExpense} ${commodity} on the same row, but row text was: "${rowText?.trim()}"`
    );
  }
  console.log(`✓ Partner "${partnerIdentifier}": expense ${expectedExpense} ${commodity} (same row)`);
}

/**
 * Verify a partner appears in the Partner Activity Report
 */
export async function verifyPartnerActivity(
  page: Page,
  partnerId: string,
  partnerName: string
): Promise<void> {
  // Check if either partner ID or name appears in a table row
  const row = page.locator('tr').filter({
    hasText: partnerId
  }).first();
  const rowVisible = await row.isVisible({ timeout: 5000 }).catch(() => false);

  if (!rowVisible) {
    const rowByName = page.locator('tr').filter({ hasText: partnerName }).first();
    const rowByNameVisible = await rowByName.isVisible({ timeout: 5000 }).catch(() => false);
    if (!rowByNameVisible) {
      throw new Error(`Partner ${partnerId} - ${partnerName} not found in report`);
    }
  }

  console.log(`✓ Partner found: ${partnerId} or ${partnerName}`);
}
