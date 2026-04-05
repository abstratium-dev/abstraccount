import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Settings page
 * This page allows deleting journals
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the heading "Settings"
 */
function getHeading(page: Page) {
  return page.getByRole('heading', { name: /^Settings$/i });
}

/**
 * Gets the confirmation input field
 */
function getConfirmationInput(page: Page) {
  return page.locator('#confirmation-input');
}

/**
 * Gets the "Delete Journal Permanently" button
 */
function getDeleteButton(page: Page) {
  return page.getByRole('button', { name: /Delete Journal Permanently/i });
}

/**
 * Gets the info message when no journal is selected
 */
function getNoJournalMessage(page: Page) {
  return page.getByText(/No journal selected/i);
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the settings page to be visible
 */
export async function waitForSettingsPage(page: Page) {
  console.log('Waiting for settings page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Settings page is visible');
}

/**
 * Checks if a journal is selected (i.e., the danger zone is visible)
 */
export async function isJournalSelected(page: Page): Promise<boolean> {
  const noJournalMsg = getNoJournalMessage(page);
  const isVisible = await noJournalMsg.isVisible({ timeout: 2000 }).catch(() => false);
  return !isVisible;
}

/**
 * Fills in the confirmation input with the journal name
 */
export async function fillConfirmation(page: Page, journalName: string) {
  console.log(`Filling confirmation input with: ${journalName}`);
  const input = getConfirmationInput(page);
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(journalName);
  console.log('Confirmation input filled');
}

/**
 * Clicks the "Delete Journal Permanently" button
 */
export async function clickDeleteButton(page: Page) {
  console.log('Clicking Delete Journal Permanently button...');
  const button = getDeleteButton(page);
  await expect(button).toBeVisible({ timeout: 10000 });
  await expect(button).toBeEnabled();
  await button.click();
  console.log('Delete button clicked');
}

/**
 * Deletes the currently selected journal
 * @param page - Playwright page object
 * @param journalName - The exact name of the journal to delete (for confirmation)
 */
export async function deleteJournal(page: Page, journalName: string) {
  console.log(`Deleting journal: ${journalName}`);
  await waitForSettingsPage(page);
  
  const hasJournal = await isJournalSelected(page);
  if (!hasJournal) {
    console.log('No journal selected, nothing to delete');
    return;
  }
  
  await fillConfirmation(page, journalName);
  await clickDeleteButton(page);
  
  // Wait for the deletion to complete (button should disappear or change)
  await expect(getDeleteButton(page)).not.toBeVisible({ timeout: 10000 });
  
  console.log('Journal deleted successfully');
}

/**
 * Verifies that the settings page is displayed correctly
 */
export async function verifySettingsPage(page: Page) {
  console.log('Verifying settings page...');
  await expect(getHeading(page)).toBeVisible();
  console.log('Settings page verified');
}
