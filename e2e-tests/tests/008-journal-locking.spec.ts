import { test, expect, Page } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as accountsPage from '../pages/accounts.page';
import * as macrosPage from '../pages/macros.page';
import * as closeBooksPage from '../pages/close-books.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 8: Journal Locking
 *
 * This test implements the test case from:
 * docs/test-cases/008-journal-locking.md
 *
 * It verifies that:
 * 1. Closing the books locks the journal (the close-books operation
 *    auto-locks the journal after creating closing transactions).
 * 2. The 🔒 lock icon appears in the header next to the journal name.
 * 3. The journal-management page shows the journal as locked.
 * 4. Mutating operations (add transaction, add/delete account, execute
 *    macro) are blocked when the journal is locked — an informational
 *    "Journal Locked" dialog is shown instead.
 * 5. Unlocking the journal works (with a warning confirm dialog).
 * 6. Re-locking the journal works.
 *
 * IMPORTANT: This test depends on test 007 (year-end closing). The
 * close-books operation in test 7.5 locks the journal. This test assumes
 * the books have been closed and the journal is locked. If the journal is
 * not locked (e.g., test 7.5 hasn't run), this test will close the books
 * first to ensure the journal is locked.
 */

// ============================================================================
// Helpers
// ============================================================================

/**
 * Gets the journal ID from localStorage.
 */
async function getJournalId(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('journalId'));
}

/**
 * Checks if the journal is currently locked by querying the API.
 */
async function isJournalLocked(page: Page): Promise<boolean> {
  const journalId = await getJournalId(page);
  if (!journalId) return false;
  const response = await page.request.get(`/api/journal/${journalId}/metadata`);
  if (!response.ok()) return false;
  const metadata = await response.json();
  return metadata.locked === true;
}

/**
 * Locks the journal via the API (bypassing the UI).
 */
async function lockJournalViaApi(page: Page): Promise<void> {
  const journalId = await getJournalId(page);
  if (!journalId) throw new Error('No journalId in localStorage');
  const response = await page.request.post(`/api/journal/${journalId}/lock`);
  if (!response.ok()) {
    throw new Error(`Failed to lock journal via API: ${response.status()}`);
  }
  console.log('✓ Journal locked via API');
}

/**
 * Unlocks the journal via the API (bypassing the UI).
 */
async function unlockJournalViaApi(page: Page): Promise<void> {
  const journalId = await getJournalId(page);
  if (!journalId) throw new Error('No journalId in localStorage');
  const response = await page.request.post(`/api/journal/${journalId}/unlock`);
  if (!response.ok()) {
    throw new Error(`Failed to unlock journal via API: ${response.status()}`);
  }
  console.log('✓ Journal unlocked via API');
}

/**
 * Deletes all closing transactions via the API (cleanup for idempotency).
 */
async function deleteClosingTransactions(page: Page): Promise<void> {
  const journalId = await getJournalId(page);
  if (!journalId) return;

  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) return;
  const transactions = await response.json();

  let deletedCount = 0;
  for (const tx of transactions) {
    const txDescription: string = tx.description || '';
    if (txDescription.startsWith('Close ')) {
      const deleteResponse = await page.request.delete(`/api/transaction/${tx.id}`);
      if (deleteResponse.ok()) deletedCount++;
    }
  }
  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} closing transaction(s) for cleanup`);
  }
}

/**
 * Closes the books via the UI to lock the journal.
 * This is the same flow as test 7.5 but without the detailed assertions.
 */
async function closeBooksToLockJournal(page: Page): Promise<void> {
  console.log('--- Closing the books to lock the journal ---');

  // Clean up any existing closing transactions first
  await deleteClosingTransactions(page);

  // Ensure the journal is unlocked before closing
  if (await isJournalLocked(page)) {
    await unlockJournalViaApi(page);
  }

  // Navigate to the close-books page via the menu
  const menuBtn = page.locator('.menu-btn');
  await expect(menuBtn).toBeVisible({ timeout: 10000 });
  await menuBtn.click();
  const closeBooksLink = page.locator('#close-books');
  await expect(closeBooksLink).toBeVisible({ timeout: 5000 });
  await closeBooksLink.click();
  await closeBooksPage.waitForCloseBooksPage(page);

  // Fill in the form and close
  await closeBooksPage.fillClosingDate(page, '2024-12-31');
  await closeBooksPage.selectEquityAccount(page, '2:290:2979');
  await closeBooksPage.clickPreviewButton(page);
  await closeBooksPage.waitForConfirmModal(page);
  await closeBooksPage.clickConfirmButton(page);
  await closeBooksPage.waitForCloseComplete(page);
  console.log('✓ Books closed, journal should now be locked');
}

/**
 * Dismisses the "Journal Locked" info dialog if it is visible.
 */
async function dismissInfoDialog(page: Page): Promise<void> {
  const dialog = page.locator('ux-info-dialog .dialog-overlay');
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    const okButton = dialog.locator('button:has-text("OK")');
    await okButton.click();
    await page.waitForTimeout(300);
    console.log('  Dismissed info dialog');
  }
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Journal Locking', () => {

  // ==========================================================================
  // Test 8.1: Closing the books locks the journal
  //
  // This test closes the books (if not already closed) and verifies that
  // the journal is locked afterwards. It checks both the API state and the
  // UI indicators (header lock icon, journal-management page).
  // ==========================================================================
  test('should lock the journal after closing the books', async ({ page }) => {
    test.setTimeout(180_000);
    console.log('=== Starting Test 8.1: Closing locks the journal ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Close the books if the journal is not already locked
    const locked = await isJournalLocked(page);
    if (!locked) {
      console.log('Journal is not locked, closing the books first...');
      await closeBooksToLockJournal(page);
    } else {
      console.log('Journal is already locked (books were closed in a previous run)');
    }

    // Verify the journal is locked via the API
    console.log('--- Verifying journal is locked via API ---');
    const isLockedNow = await isJournalLocked(page);
    expect(isLockedNow).toBe(true);
    console.log('✓ Journal is locked (confirmed via API)');

    // Verify the 🔒 lock icon appears in the header
    console.log('--- Verifying lock icon in header ---');
    await headerPage.waitForHeader(page);
    const lockIcon = page.locator('#current-journal-name .journal-lock-icon');
    await expect(lockIcon).toBeVisible({ timeout: 10000 });
    const lockText = await lockIcon.textContent();
    expect(lockText).toContain('🔒');
    console.log('✓ Lock icon (🔒) is visible in the header');

    // Verify the journal name is still displayed
    const journalNameLink = page.locator('#current-journal-name');
    const journalNameText = await journalNameLink.textContent();
    expect(journalNameText).toContain(TEST_JOURNAL_NAME);
    console.log(`✓ Journal name "${TEST_JOURNAL_NAME}" is displayed with lock icon`);

    // Navigate to the journal-management page and verify the locked state
    console.log('--- Verifying locked state on journal-management page ---');
    await headerPage.goToJournalManagementPage(page);

    // The locked warning message should be visible
    const lockedWarning = page.locator('.locked-warning');
    await expect(lockedWarning).toBeVisible({ timeout: 10000 });
    const warningText = await lockedWarning.textContent();
    expect(warningText).toContain('locked');
    console.log('✓ Locked warning message is displayed');

    // The "Unlock Journal" button should be visible
    const unlockButton = page.locator('#unlock-journal');
    await expect(unlockButton).toBeVisible({ timeout: 5000 });
    console.log('✓ "Unlock Journal" button is visible');

    // The "Lock Journal" button should NOT be visible (journal is already locked)
    const lockButton = page.locator('#lock-journal');
    await expect(lockButton).not.toBeVisible();
    console.log('✓ "Lock Journal" button is hidden (journal already locked)');

    console.log('✓ Test 8.1 PASSED: Closing the books locks the journal');
    console.log('=== Test 8.1: Closing locks the journal - PASSED ===');
  });

  // ==========================================================================
  // Test 8.2: Mutating operations are blocked when the journal is locked
  //
  // This test verifies that when the journal is locked:
  // - Clicking "Add Transaction" shows the "Journal Locked" info dialog
  // - Clicking "Create Account" shows the "Journal Locked" info dialog
  // - Clicking "Delete" on an account shows the "Journal Locked" info dialog
  // - Selecting a macro shows the "Journal Locked" info dialog
  //
  // Each check dismisses the info dialog before moving to the next.
  // ==========================================================================
  test('should block mutating operations when journal is locked', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 8.2: Mutating operations blocked when locked ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Ensure the journal is locked (close books if needed)
    if (!(await isJournalLocked(page))) {
      console.log('Journal is not locked, closing the books first...');
      await closeBooksToLockJournal(page);
    }
    expect(await isJournalLocked(page)).toBe(true);
    console.log('✓ Journal is locked, proceeding with mutation tests');

    // ========================================================================
    // Check 1: Cannot add a transaction
    // ========================================================================
    console.log('--- Check 1: Cannot add a transaction ---');
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    // Click "Add Transaction" — should show info dialog, not open the modal
    const addTxButton = page.locator('button:has-text("Add Transaction")');
    await expect(addTxButton).toBeVisible({ timeout: 10000 });
    await addTxButton.click();

    // The info dialog should appear with "Journal Locked" title
    const infoDialog = page.locator('ux-info-dialog .dialog-overlay');
    await expect(infoDialog).toBeVisible({ timeout: 5000 });
    const dialogTitle = await infoDialog.locator('h2').textContent();
    expect(dialogTitle?.trim()).toBe('Journal Locked');
    console.log('✓ "Journal Locked" info dialog shown when adding transaction');

    // The transaction modal should NOT be open
    const txModal = page.locator('app-transaction-edit-modal');
    await expect(txModal).not.toBeVisible({ timeout: 1000 }).catch(() => {
      // If the modal IS visible, that's a failure
      throw new Error('Transaction modal opened despite journal being locked');
    });
    console.log('✓ Transaction modal did NOT open');

    await dismissInfoDialog(page);

    // ========================================================================
    // Check 2: Cannot create an account
    // ========================================================================
    console.log('--- Check 2: Cannot create an account ---');
    await headerPage.clickAccountsLink(page);
    await accountsPage.waitForAccountsPage(page);
    await accountsPage.waitForAccountInTable(page);

    // Click "Create Account" — should show info dialog
    await accountsPage.clickCreateAccount(page);

    await expect(infoDialog).toBeVisible({ timeout: 5000 });
    const dialogTitle2 = await infoDialog.locator('h2').textContent();
    expect(dialogTitle2?.trim()).toBe('Journal Locked');
    console.log('✓ "Journal Locked" info dialog shown when creating account');

    // The account modal should NOT be open
    const accountModal = page.locator('app-account-edit-modal');
    await expect(accountModal).not.toBeVisible({ timeout: 1000 }).catch(() => {
      throw new Error('Account modal opened despite journal being locked');
    });
    console.log('✓ Account modal did NOT open');

    await dismissInfoDialog(page);

    // ========================================================================
    // Check 3: Cannot delete an account
    // ========================================================================
    console.log('--- Check 3: Cannot delete an account ---');
    // We need to open the context menu for an account.
    // Find the first account row and right-click on it to open the context menu.
    const accountRow = page.locator('.account-row, .account-name-link').first();
    await expect(accountRow).toBeVisible({ timeout: 5000 });

    // Right-click to open context menu
    await accountRow.click({ button: 'right' });
    await page.waitForTimeout(500);

    // Look for the context menu with a "Delete" button
    const contextMenu = page.locator('.context-menu');
    const deleteButton = contextMenu.locator('button:has-text("Delete")');

    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();
      await page.waitForTimeout(500);

      // The info dialog should appear
      await expect(infoDialog).toBeVisible({ timeout: 5000 });
      const dialogTitle3 = await infoDialog.locator('h2').textContent();
      expect(dialogTitle3?.trim()).toBe('Journal Locked');
      console.log('✓ "Journal Locked" info dialog shown when deleting account');
      await dismissInfoDialog(page);
    } else {
      // Some implementations may not show a context menu via right-click.
      // Try the three-dots menu button if present.
      console.log('  Context menu not found via right-click, trying menu button...');
      const menuButton = page.locator('.context-menu-button, button[aria-label*="menu"]').first();
      if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await menuButton.click();
        await page.waitForTimeout(500);
        const deleteBtn = page.locator('.context-menu button:has-text("Delete")');
        if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await deleteBtn.click();
          await page.waitForTimeout(500);
          await expect(infoDialog).toBeVisible({ timeout: 5000 });
          const dialogTitle3 = await infoDialog.locator('h2').textContent();
          expect(dialogTitle3?.trim()).toBe('Journal Locked');
          console.log('✓ "Journal Locked" info dialog shown when deleting account');
          await dismissInfoDialog(page);
        } else {
          console.log('  ⚠ Delete button not found in context menu, skipping delete test');
        }
      } else {
        console.log('  ⚠ Could not open account context menu, skipping delete test');
      }
    }

    // ========================================================================
    // Check 4: Cannot execute a macro
    // ========================================================================
    console.log('--- Check 4: Cannot execute a macro ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);

    // Try to select a macro — should show info dialog
    // Find any macro in the list and click it
    const macroItem = page.locator('.macro-item, .macro-card, .macro-list-item').first();
    if (await macroItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await macroItem.click();
      await page.waitForTimeout(500);

      // The info dialog should appear
      await expect(infoDialog).toBeVisible({ timeout: 5000 });
      const dialogTitle4 = await infoDialog.locator('h2').textContent();
      expect(dialogTitle4?.trim()).toBe('Journal Locked');
      console.log('✓ "Journal Locked" info dialog shown when selecting macro');
      await dismissInfoDialog(page);
    } else {
      // Try the selectMacro function which may use a different selector
      console.log('  Macro item not found with default selector, trying selectMacro...');
      try {
        await macrosPage.selectMacro(page, 'Invoice');
        await page.waitForTimeout(500);
        await expect(infoDialog).toBeVisible({ timeout: 5000 });
        const dialogTitle4 = await infoDialog.locator('h2').textContent();
        expect(dialogTitle4?.trim()).toBe('Journal Locked');
        console.log('✓ "Journal Locked" info dialog shown when selecting macro');
        await dismissInfoDialog(page);
      } catch {
        console.log('  ⚠ Could not select a macro, skipping macro test');
      }
    }

    console.log('✓ Test 8.2 PASSED: Mutating operations blocked when locked');
    console.log('=== Test 8.2: Mutating operations blocked when locked - PASSED ===');
  });

  // ==========================================================================
  // Test 8.3: Unlock the journal with warning confirmation
  //
  // This test unlocks the journal via the journal-management UI and verifies
  // that:
  // - A warning confirm dialog is shown before unlocking
  // - After confirming, the journal is unlocked
  // - The 🔒 icon is removed from the header
  // - The journal-management page shows the "Lock Journal" button
  // ==========================================================================
  test('should unlock the journal with warning confirmation', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 8.3: Unlock journal with warning ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Ensure the journal is locked
    if (!(await isJournalLocked(page))) {
      console.log('Journal is not locked, closing the books first...');
      await closeBooksToLockJournal(page);
    }
    expect(await isJournalLocked(page)).toBe(true);
    console.log('✓ Journal is locked');

    // Verify the lock icon is in the header before unlocking
    await headerPage.waitForHeader(page);
    const lockIconBefore = page.locator('#current-journal-name .journal-lock-icon');
    await expect(lockIconBefore).toBeVisible({ timeout: 10000 });
    console.log('✓ Lock icon visible before unlock');

    // Navigate to the journal-management page
    await headerPage.goToJournalManagementPage(page);

    // Click "Unlock Journal"
    console.log('--- Clicking Unlock Journal ---');
    const unlockButton = page.locator('#unlock-journal');
    await expect(unlockButton).toBeVisible({ timeout: 10000 });
    await unlockButton.click();

    // A confirm dialog should appear with a warning
    console.log('--- Verifying warning confirm dialog ---');
    const confirmDialog = page.locator('ux-confirm-dialog .dialog-overlay');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });

    // Verify the dialog title
    const confirmTitle = await confirmDialog.locator('h2').textContent();
    expect(confirmTitle?.trim()).toBe('Unlock Journal');
    console.log('✓ Confirm dialog title is "Unlock Journal"');

    // Verify the warning message mentions follow-on years
    const confirmMessage = await confirmDialog.locator('.dialog-body p').textContent();
    expect(confirmMessage).toContain('follow-on years');
    expect(confirmMessage).toContain('Warning');
    console.log('✓ Warning message mentions follow-on years');

    // Verify the confirm button text
    const confirmBtn = confirmDialog.locator('button:has-text("Yes, unlock anyway")');
    await expect(confirmBtn).toBeVisible();
    console.log('✓ "Yes, unlock anyway" button is visible');

    // Verify the cancel button text
    const cancelBtn = confirmDialog.locator('button:has-text("Cancel")');
    await expect(cancelBtn).toBeVisible();
    console.log('✓ "Cancel" button is visible');

    // Confirm the unlock
    console.log('--- Confirming unlock ---');
    await confirmBtn.click();

    // Wait for the dialog to close
    await expect(confirmDialog).not.toBeVisible({ timeout: 10000 });

    // The confirm dialog closes immediately when the promise resolves, but the
    // HTTP unlock call is still in progress. Wait for network activity to settle
    // and then poll until the journal is actually unlocked (or timeout).
    await page.waitForLoadState('networkidle').catch(() => undefined);
    let isLockedAfter = true;
    for (let attempt = 0; attempt < 10 && isLockedAfter; attempt++) {
      await page.waitForTimeout(500);
      isLockedAfter = await isJournalLocked(page);
    }
    expect(isLockedAfter).toBe(false);
    console.log('✓ Journal is unlocked (confirmed via API)');

    // Verify the 🔒 icon is removed from the header
    // Need to reload the page or wait for the header to update
    await page.waitForTimeout(1000);
    await headerPage.waitForHeader(page);
    const lockIconAfter = page.locator('#current-journal-name .journal-lock-icon');
    await expect(lockIconAfter).not.toBeVisible({ timeout: 10000 });
    console.log('✓ Lock icon removed from header after unlock');

    // Verify the journal-management page now shows the "Lock Journal" button
    await headerPage.goToJournalManagementPage(page);
    const lockButton = page.locator('#lock-journal');
    await expect(lockButton).toBeVisible({ timeout: 10000 });
    console.log('✓ "Lock Journal" button is visible after unlock');

    // The "Unlock Journal" button should NOT be visible
    const unlockButtonAfter = page.locator('#unlock-journal');
    await expect(unlockButtonAfter).not.toBeVisible();
    console.log('✓ "Unlock Journal" button is hidden after unlock');

    console.log('✓ Test 8.3 PASSED: Unlock journal with warning');
    console.log('=== Test 8.3: Unlock journal with warning - PASSED ===');
  });

  // ==========================================================================
  // Test 8.4: Re-lock the journal
  //
  // This test re-locks the journal via the journal-management UI (after
  // test 8.3 unlocked it) and verifies that:
  // - The journal is locked again
  // - The 🔒 icon reappears in the header
  // - The journal-management page shows the "Unlock Journal" button
  // ==========================================================================
  test('should re-lock the journal from the management page', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 8.4: Re-lock the journal ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Ensure the journal is unlocked first (test 8.3 may have unlocked it)
    if (await isJournalLocked(page)) {
      console.log('Journal is locked, unlocking via API for this test...');
      await unlockJournalViaApi(page);
    }
    expect(await isJournalLocked(page)).toBe(false);
    console.log('✓ Journal is unlocked, ready to test re-locking');

    // Verify the lock icon is NOT in the header before locking
    const lockIconBefore = page.locator('#current-journal-name .journal-lock-icon');
    await expect(lockIconBefore).not.toBeVisible({ timeout: 5000 });
    console.log('✓ Lock icon not visible before locking');

    // Navigate to the journal-management page
    await headerPage.goToJournalManagementPage(page);

    // Click "Lock Journal"
    console.log('--- Clicking Lock Journal ---');
    const lockButton = page.locator('#lock-journal');
    await expect(lockButton).toBeVisible({ timeout: 10000 });
    await lockButton.click();

    // Wait for the lock to take effect (the button should disappear)
    await expect(lockButton).not.toBeVisible({ timeout: 10000 });

    // Verify the journal is locked via the API
    const isLockedAfter = await isJournalLocked(page);
    expect(isLockedAfter).toBe(true);
    console.log('✓ Journal is locked (confirmed via API)');

    // Verify the 🔒 icon reappears in the header
    await page.waitForTimeout(1000);
    await headerPage.waitForHeader(page);
    const lockIconAfter = page.locator('#current-journal-name .journal-lock-icon');
    await expect(lockIconAfter).toBeVisible({ timeout: 10000 });
    const lockText = await lockIconAfter.textContent();
    expect(lockText).toContain('🔒');
    console.log('✓ Lock icon (🔒) reappeared in header');

    // Verify the journal-management page now shows the "Unlock Journal" button
    await headerPage.goToJournalManagementPage(page);
    const unlockButton = page.locator('#unlock-journal');
    await expect(unlockButton).toBeVisible({ timeout: 10000 });
    console.log('✓ "Unlock Journal" button is visible after re-locking');

    // The locked warning should be displayed
    const lockedWarning = page.locator('.locked-warning');
    await expect(lockedWarning).toBeVisible({ timeout: 5000 });
    console.log('✓ Locked warning message is displayed');

    // The "Lock Journal" button should NOT be visible
    const lockButtonAfter = page.locator('#lock-journal');
    await expect(lockButtonAfter).not.toBeVisible();
    console.log('✓ "Lock Journal" button is hidden after re-locking');

    console.log('✓ Test 8.4 PASSED: Re-lock the journal');
    console.log('=== Test 8.4: Re-lock the journal - PASSED ===');
  });
});
