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
 * Verify an account appears in the report with a specific balance
 */
export async function verifyAccountBalance(
  page: Page, 
  accountNumber: string, 
  balance: string,
  commodity: string = 'CHF'
): Promise<void> {
  const content = await page.content();
  
  // Check if account number appears
  if (!content.includes(accountNumber)) {
    throw new Error(`Account ${accountNumber} not found in report`);
  }
  
  // Check if balance appears (allowing for formatting variations)
  const balancePattern = new RegExp(`${balance.replace(/,/g, '[,\\s]?')}\\s*${commodity}`);
  if (!balancePattern.test(content)) {
    throw new Error(`Balance ${balance} ${commodity} not found for account ${accountNumber}`);
  }
  
  console.log(`✓ Account ${accountNumber}: ${balance} ${commodity}`);
}

/**
 * Verify total line matches expected value
 */
export async function verifyTotal(
  page: Page,
  totalLabel: string,
  expectedValue: string,
  commodity: string = 'CHF'
): Promise<void> {
  const content = await page.content();

  // Create pattern to match total line — allow HTML tags and attributes
  // (which may contain digits) between the label and the value.
  const pattern = new RegExp(
    `${totalLabel}[\\s\\S]{0,300}?${expectedValue.replace(/,/g, '[,\\s]?')}\\s*${commodity}`,
    'i'
  );

  if (!pattern.test(content)) {
    throw new Error(`Total "${totalLabel}" should be ${expectedValue} ${commodity}`);
  }

  console.log(`✓ ${totalLabel}: ${expectedValue} ${commodity}`);
}

/**
 * Verify the balance sheet balances (Assets = Liabilities + Equity)
 */
export async function verifyBalanceSheetBalances(
  page: Page,
  expectedTotal: string,
  commodity: string = 'CHF'
): Promise<void> {
  const content = await page.content();
  
  // Check Total Assets - allow for HTML tags and whitespace between label and value
  const assetsPattern = new RegExp(
    `Total Assets[\\s\\S]{0,200}?${expectedTotal.replace(/,/g, '[,\\s]?')}\\s*${commodity}`,
    'i'
  );
  if (!assetsPattern.test(content)) {
    throw new Error(`Total Assets should be ${expectedTotal} ${commodity}`);
  }
  console.log(`✓ Total Assets: ${expectedTotal} ${commodity}`);
  
  // Check Total Liabilities and Equity - allow for HTML tags and whitespace
  const lePattern = new RegExp(
    `Total Liabilities and Equity[\\s\\S]{0,200}?${expectedTotal.replace(/,/g, '[,\\s]?')}\\s*${commodity}`,
    'i'
  );
  if (!lePattern.test(content)) {
    throw new Error(`Total Liabilities and Equity should be ${expectedTotal} ${commodity} (must balance with Assets)`);
  }
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
 * Verify a partner appears in the Partner Activity Report
 */
export async function verifyPartnerActivity(
  page: Page,
  partnerId: string,
  partnerName: string
): Promise<void> {
  const content = await page.content();
  
  // Check if either partner ID or name appears (format may vary)
  if (!content.includes(partnerId) && !content.includes(partnerName)) {
    throw new Error(`Partner ${partnerId} - ${partnerName} not found in report`);
  }
  
  console.log(`✓ Partner found: ${partnerId} or ${partnerName}`);
}
