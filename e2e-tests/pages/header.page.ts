import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Header component
 * The header contains navigation links and journal selection
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the sign-out link (only visible when signed in)
 */
function getSignOutLink(page: Page) {
  return page.locator('#signout-link');
}

/**
 * Gets the journal selector dropdown on the Journal Management page.
 * Note: the selector no longer lives in the header; it now lives on the
 * /journal-management page.
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

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the header to be visible (indicating user is signed in).
 * The header no longer contains the journal selector; the sign-out link is
 * the reliable signed-in indicator.
 */
export async function waitForHeader(page: Page) {
  console.log('Waiting for header to be visible...');
  await expect(getSignOutLink(page)).toBeVisible({ timeout: 10000 });
  console.log('Header is visible');
}

/**
 * Navigates to the Journal Management page (if not already there) and waits
 * for it to load. The journal selector dropdown lives on this page now.
 */
export async function goToJournalManagementPage(page: Page) {
  console.log('Navigating to Journal Management page...');
  const heading = page.getByRole('heading', { name: /^Journal Management$/i });
  const alreadyThere = await heading.isVisible({ timeout: 1000 }).catch(() => false);
  if (!alreadyThere) {
    await clickJournalManagementLink(page);
    await expect(heading).toBeVisible({ timeout: 10000 });
  }
  await expect(getJournalSelector(page)).toBeVisible({ timeout: 10000 });
  console.log('On Journal Management page');
}

/**
 * Selects a journal by its title using the dropdown on the Journal Management
 * page. Assumes the page is already on /journal-management.
 */
export async function selectJournalOnManagementPage(page: Page, journalTitle: string) {
  console.log(`Selecting journal on management page: ${journalTitle}`);
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

  if (!lastMatchValue) {
    throw new Error(`Could not find journal with title: ${journalTitle}`);
  }

  await selector.selectOption(lastMatchValue);
  console.log(`Journal "${journalTitle}" selected (last matching option)`);
}

/**
 * Selects a journal by its title.
 * Navigates to the Journal Management page first (where the dropdown now
 * lives), selects the journal, and returns. The header is global, so callers
 * can subsequently click any header link (e.g. #journal) from that page.
 */
export async function selectJournal(page: Page, journalTitle: string) {
  console.log(`Selecting journal: ${journalTitle}`);
  await goToJournalManagementPage(page);
  await selectJournalOnManagementPage(page, journalTitle);
}

/**
 * Selects the "Create New Journal" action.
 * Navigates to the Journal Management page and clicks the "Create New
 * Journal" button, which routes to /create-journal.
 *
 * When the database is empty, the auth guard redirects to /create-journal
 * directly (there are no journals, so the journal-management page is not
 * accessible). In that case we are already on the create-journal page and
 * can return immediately.
 */
export async function selectCreateNewJournal(page: Page) {
  console.log('Selecting "Create New Journal" action...');

  // If the auth guard already redirected us to /create-journal (empty db),
  // there is no journal-management page to visit.
  const currentUrl = page.url();
  if (currentUrl.includes('/create-journal')) {
    console.log('Already on /create-journal (empty database), skipping journal management');
    return;
  }

  await goToJournalManagementPage(page);
  const createButton = page.locator('#create-journal');
  await expect(createButton).toBeVisible({ timeout: 10000 });
  await createButton.click();
  console.log('"Create New Journal" button clicked');
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
 * Clicks the journal management link to navigate to the journal management page
 */
export async function clickJournalManagementLink(page: Page) {
  console.log('Clicking journal management link...');
  // First open the menu dropdown
  const menuBtn = page.locator('.menu-btn');
  await expect(menuBtn).toBeVisible({ timeout: 10000 });
  await menuBtn.click();
  console.log('Menu button clicked');
  // Now click the journal management link
  const link = page.locator('#journal-management');
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  console.log('Journal management link clicked');
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
  await expect(getSignOutLink(page)).toBeVisible();
  await expect(getJournalLink(page)).toBeVisible();
  await expect(getAccountsLink(page)).toBeVisible();
  console.log('User is signed in');
}
