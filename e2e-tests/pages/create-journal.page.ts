import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Create Journal page
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the title input field
 */
function getTitleInput(page: Page) {
  return page.locator('#title');
}

/**
 * Gets the subtitle input field
 */
function getSubtitleInput(page: Page) {
  return page.locator('#subtitle');
}

/**
 * Gets the currency input field
 */
function getCurrencyInput(page: Page) {
  return page.locator('#currency');
}

/**
 * Gets the logo input field
 */
function getLogoInput(page: Page) {
  return page.locator('#logo');
}

/**
 * Gets the "Create Journal" button
 */
function getCreateButton(page: Page) {
  return page.getByRole('button', { name: /^Create Journal$/i });
}

/**
 * Gets the heading "Create New Journal"
 */
function getHeading(page: Page) {
  return page.getByRole('heading', { name: /Create New Journal/i });
}

/**
 * Gets the success message
 */
function getSuccessMessage(page: Page) {
  return page.getByRole('heading', { name: /Journal Created Successfully/i });
}

/**
 * Gets the "View Journal" button (shown after successful creation)
 */
function getViewJournalButton(page: Page) {
  return page.getByRole('button', { name: /View Journal/i });
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the create journal page to be visible
 */
export async function waitForCreateJournalPage(page: Page) {
  console.log('Waiting for create journal page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Create journal page is visible');
}

/**
 * Fills in the journal title
 */
export async function fillTitle(page: Page, title: string) {
  console.log(`Filling title: ${title}`);
  const input = getTitleInput(page);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(title);
  console.log('Title filled');
}

/**
 * Fills in the journal subtitle
 */
export async function fillSubtitle(page: Page, subtitle: string) {
  console.log(`Filling subtitle: ${subtitle}`);
  const input = getSubtitleInput(page);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(subtitle);
  console.log('Subtitle filled');
}

/**
 * Fills in the currency
 */
export async function fillCurrency(page: Page, currency: string) {
  console.log(`Filling currency: ${currency}`);
  const input = getCurrencyInput(page);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(currency);
  console.log('Currency filled');
}

/**
 * Fills in the logo URL
 */
export async function fillLogo(page: Page, logo: string) {
  console.log(`Filling logo: ${logo}`);
  const input = getLogoInput(page);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(logo);
  console.log('Logo filled');
}

/**
 * Clicks the "Create Journal" button
 */
export async function clickCreateButton(page: Page) {
  console.log('Clicking Create Journal button...');
  const button = getCreateButton(page);
  await expect(button).toBeVisible({ timeout: 10000 });
  await expect(button).toBeEnabled();
  await button.click();
  console.log('Create Journal button clicked');
}

/**
 * Waits for the success message to appear
 */
export async function waitForSuccessMessage(page: Page) {
  console.log('Waiting for success message...');
  await expect(getSuccessMessage(page)).toBeVisible({ timeout: 10000 });
  console.log('Success message is visible');
}

/**
 * Clicks the "View Journal" button after successful creation
 */
export async function clickViewJournal(page: Page) {
  console.log('Clicking View Journal button...');
  const button = getViewJournalButton(page);
  await expect(button).toBeVisible({ timeout: 10000 });
  await button.click();
  console.log('View Journal button clicked');
}

/**
 * Creates a new journal with the given details
 * @param page - Playwright page object
 * @param title - Journal title
 * @param currency - Journal currency
 * @param subtitle - Optional journal subtitle
 */
export async function createJournal(
  page: Page,
  title: string,
  currency: string,
  subtitle?: string
) {
  console.log(`Creating journal: ${title} (${currency})`);
  await waitForCreateJournalPage(page);
  await fillTitle(page, title);
  await fillCurrency(page, currency);
  if (subtitle) {
    await fillSubtitle(page, subtitle);
  }
  await clickCreateButton(page);
  await waitForSuccessMessage(page);
  console.log('Journal created successfully');
}

/**
 * Verifies that the create journal page is displayed correctly
 */
export async function verifyCreateJournalPage(page: Page) {
  console.log('Verifying create journal page...');
  await expect(getHeading(page)).toBeVisible();
  await expect(getTitleInput(page)).toBeVisible();
  await expect(getCurrencyInput(page)).toBeVisible();
  await expect(getCreateButton(page)).toBeVisible();
  console.log('Create journal page verified');
}
