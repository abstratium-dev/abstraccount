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

/**
 * Select a report template by name
 */
export async function selectReportTemplate(page: Page, templateName: string): Promise<void> {
  console.log(`Selecting report template: ${templateName}`);
  
  await page.waitForSelector('select#template-select', { state: 'visible' });
  
  // Get all options and find the matching one
  const options = await page.locator('select#template-select option').allTextContents();
  const matchingOption = options.find(opt => opt.trim().includes(templateName));
  
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
  
  // Create pattern to match total line
  const pattern = new RegExp(
    `${totalLabel}[^0-9]*${expectedValue.replace(/,/g, '[,\\s]?')}\\s*${commodity}`,
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
