import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Header component
 * The header contains navigation links and journal selection
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the journal selector dropdown
 */
function getJournalSelector(page: Page) {
  return page.locator('#journal-select');
}

/**
 * Gets the home link
 */
function getHomeLink(page: Page) {
  return page.locator('#home-link');
}

/**
 * Gets the accounts link
 */
function getAccountsLink(page: Page) {
  return page.locator('#accounts-table');
}

/**
 * Gets the journal link
 */
function getJournalLink(page: Page) {
  return page.locator('#journal');
}

/**
 * Gets the sign out link
 */
function getSignOutLink(page: Page) {
  return page.locator('#signout-link');
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the header to be visible (indicating user is signed in)
 */
export async function waitForHeader(page: Page) {
  console.log('Waiting for header to be visible...');
  await expect(getJournalSelector(page)).toBeVisible({ timeout: 10000 });
  console.log('Header is visible');
}

/**
 * Selects a journal by its title
 */
export async function selectJournal(page: Page, journalTitle: string) {
  console.log(`Selecting journal: ${journalTitle}`);
  const selector = getJournalSelector(page);
  await expect(selector).toBeVisible({ timeout: 10000 });
  
  // Find all options matching the journal title and select the LAST one
  // (most recently created) to avoid picking a stale journal from a previous test run
  const options = await selector.locator('option').all();
  let lastMatchValue: string | null = null;
  for (const option of options) {
    const text = await option.textContent();
    if (text && text.includes(journalTitle)) {
      const value = await option.getAttribute('value');
      if (value) {
        lastMatchValue = value;
      }
    }
  }

  if (lastMatchValue) {
    await selector.selectOption(lastMatchValue);
    console.log(`Journal "${journalTitle}" selected (last matching option)`);
    return;
  }

  throw new Error(`Could not find journal with title: ${journalTitle}`);
}

/**
 * Selects the "Create New Journal" option
 */
export async function selectCreateNewJournal(page: Page) {
  console.log('Selecting "Create New Journal" option...');
  const selector = getJournalSelector(page);
  await expect(selector).toBeVisible({ timeout: 10000 });
  // Find the option with "Create New Journal" text and select it by value
  const createOption = await selector.locator('option:has-text("Create New Journal")').getAttribute('value');
  if (createOption) {
    await selector.selectOption(createOption);
  }
  console.log('"Create New Journal" option selected');
}

/**
 * Clicks the accounts link to navigate to the accounts page
 */
export async function clickAccountsLink(page: Page) {
  console.log('Clicking accounts link...');
  const link = getAccountsLink(page);
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  console.log('Accounts link clicked');
}

/**
 * Clicks the journal link to navigate to the journal page
 */
export async function clickJournalLink(page: Page) {
  console.log('Clicking journal link...');
  const link = getJournalLink(page);
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  console.log('Journal link clicked');
}

/**
 * Clicks the home link to navigate to the home page
 */
export async function clickHomeLink(page: Page) {
  console.log('Clicking home link...');
  const link = getHomeLink(page);
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  console.log('Home link clicked');
}

/**
 * Clicks the settings link to navigate to the settings page
 */
export async function clickSettingsLink(page: Page) {
  console.log('Clicking settings link...');
  // First open the menu dropdown
  const menuBtn = page.locator('.menu-btn');
  await expect(menuBtn).toBeVisible({ timeout: 10000 });
  await menuBtn.click();
  console.log('Menu button clicked');
  // Now click the settings link
  const link = page.locator('#settings-link');
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  console.log('Settings link clicked');
}

/**
 * Signs out the user
 */
export async function signOut(page: Page) {
  console.log('Signing out...');
  const link = getSignOutLink(page);
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  console.log('Sign out link clicked');
}

/**
 * Verifies that the user is signed in by checking if the header is visible
 */
export async function verifySignedIn(page: Page) {
  console.log('Verifying user is signed in...');
  await expect(getJournalSelector(page)).toBeVisible();
  await expect(getAccountsLink(page)).toBeVisible();
  console.log('User is signed in');
}
