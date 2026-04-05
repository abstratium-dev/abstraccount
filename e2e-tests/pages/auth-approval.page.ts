import { expect, Page } from '@playwright/test';

/**
 * Page Object Model for the Auth Provider Approval page
 * This page asks the user to approve the application's access to their account
 */

// ============================================================================
// Low-level element selectors
// ============================================================================

/**
 * Gets the "Approve" button
 */
function getApproveButton(page: Page) {
  return page.getByRole('button', { name: /Approve/i });
}

/**
 * Gets the heading "Approve Application"
 */
function getHeading(page: Page) {
  return page.getByRole('heading', { name: /Approve Application/i });
}

/**
 * Gets the "Remember this approval" checkbox
 */
function getRememberCheckbox(page: Page) {
  return page.getByRole('checkbox', { name: /Remember this approval/i });
}

// ============================================================================
// High-level page functions
// ============================================================================

/**
 * Waits for the auth provider approval page to be visible
 */
export async function waitForAuthApprovalPage(page: Page) {
  console.log('Waiting for auth provider approval page to be visible...');
  await expect(getHeading(page)).toBeVisible({ timeout: 10000 });
  console.log('Auth provider approval page is visible');
}

/**
 * Checks the "Remember this approval" checkbox
 */
export async function checkRememberApproval(page: Page) {
  console.log('Checking remember approval checkbox...');
  const checkbox = getRememberCheckbox(page);
  await expect(checkbox).toBeVisible({ timeout: 10000 });
  await checkbox.check();
  console.log('Remember approval checkbox checked');
}

/**
 * Clicks the "Approve" button
 */
export async function clickApprove(page: Page) {
  console.log('Clicking Approve button...');
  const approveButton = getApproveButton(page);
  await expect(approveButton).toBeVisible({ timeout: 10000 });
  await approveButton.click();
  console.log('Approve button clicked');
}

/**
 * Complete approval flow on the auth provider page
 * @param page - Playwright page object
 * @param rememberApproval - Whether to check the "Remember this approval" checkbox
 */
export async function approveApplication(page: Page, rememberApproval: boolean = true) {
  console.log('Approving application...');
  await waitForAuthApprovalPage(page);
  if (rememberApproval) {
    await checkRememberApproval(page);
  }
  await clickApprove(page);
  console.log('Application approved');
}

/**
 * Verifies that the auth approval page is displayed correctly
 */
export async function verifyAuthApprovalPage(page: Page) {
  console.log('Verifying auth approval page...');
  await expect(getHeading(page)).toBeVisible();
  await expect(getApproveButton(page)).toBeVisible();
  await expect(page.getByText(/wants to access/i)).toBeVisible();
  console.log('Auth approval page verified');
}
