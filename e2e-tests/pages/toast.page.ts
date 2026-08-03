import { Page, expect } from '@playwright/test';

/**
 * Page object for the global toast notification container.
 *
 * Toasts are rendered by the `ux-toast` component which is present on every
 * page, so these helpers can be used from any page without prior navigation.
 */

/**
 * Wait for a success toast whose message contains `expectedText` to appear.
 *
 * Asserts both the toast type (success) and that the message text matches.
 */
export async function waitForSuccessToast(page: Page, expectedText: string | RegExp, timeout = 10000): Promise<void> {
  console.log(`Waiting for success toast containing: ${expectedText}`);
  const toast = page.locator('[data-testid="toast-success"]');
  await expect(toast).toBeVisible({ timeout });
  const message = toast.locator('[data-testid="toast-message"]');
  await expect(message).toContainText(expectedText, { timeout });
  console.log(`✓ Success toast found: ${await message.textContent()}`);
}

/**
 * Wait for an error toast whose message contains `expectedText` to appear.
 */
export async function waitForErrorToast(page: Page, expectedText: string | RegExp, timeout = 10000): Promise<void> {
  console.log(`Waiting for error toast containing: ${expectedText}`);
  const toast = page.locator('[data-testid="toast-error"]');
  await expect(toast).toBeVisible({ timeout });
  const message = toast.locator('[data-testid="toast-message"]');
  await expect(message).toContainText(expectedText, { timeout });
  console.log(`✓ Error toast found: ${await message.textContent()}`);
}

/**
 * Dismiss all visible toasts by clicking their close buttons.
 */
export async function dismissAllToasts(page: Page): Promise<void> {
  const closeButtons = page.locator('[data-testid="toast-container"] .toast-close');
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    await closeButtons.nth(0).click().catch(() => {});
  }
  console.log(`Dismissed ${count} toast(s)`);
}
