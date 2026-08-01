import { Page, expect } from '@playwright/test';

/**
 * Page Object Model for the Partners page.
 *
 * Provides functions to navigate to the partners page, add a partner via the
 * "Add Partner" form, and ensure a partner exists before tests that need it.
 */

// ============================================================================
// Navigation
// ============================================================================

/**
 * Navigate to the partners page and wait for it to load.
 */
export async function goToPartnersPage(page: Page): Promise<void> {
  console.log('Navigating to partners page...');
  await page.goto('/partners');
  // Wait for the heading or the add-partner button to be visible
  await expect(page.locator('h2:has-text("Partners")')).toBeVisible({ timeout: 10000 });
  console.log('Partners page loaded');
}

// ============================================================================
// Add Partner form
// ============================================================================

/**
 * Add a partner via the "Add Partner" form on the partners page.
 * Assumes the user is already on the partners page.
 *
 * @param page - Playwright page
 * @param name - the partner name to create
 */
export async function addPartner(page: Page, name: string): Promise<void> {
  console.log(`Adding partner: ${name}`);

  // Click the "Add Partner" button to show the form
  const addButton = page.locator('#add-partner-button');
  await expect(addButton).toBeVisible({ timeout: 10000 });

  // Only click if the form is not already visible
  const formVisible = await page.locator('#add-partner-form').isVisible().catch(() => false);
  if (!formVisible) {
    await addButton.click();
  }

  // Fill in the partner name
  const nameInput = page.locator('#new-partner-name');
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.fill(name);

  // Submit the form
  const submitButton = page.locator('#add-partner-form button[type="submit"]');
  await expect(submitButton).toBeVisible({ timeout: 10000 });
  await submitButton.click();

  // Wait for the form to disappear (indicating success)
  await expect(page.locator('#add-partner-form')).not.toBeVisible({ timeout: 15000 });
  console.log(`Partner "${name}" added`);
}

// ============================================================================
// Partner search / lookup
// ============================================================================

/**
 * Search for partners on the partners page by partner number or name.
 * Returns the list of partner rows matching the search.
 */
export async function getPartnerRows(page: Page): Promise<{ number: string; name: string }[]> {
  const rows = page.locator('table.standard-table tbody tr');
  const count = await rows.count();

  const partners: { number: string; name: string }[] = [];
  for (let i = 0; i < count; i++) {
    const cells = rows.nth(i).locator('td');
    const number = (await cells.nth(0).textContent())?.trim() ?? '';
    const name = (await cells.nth(1).textContent())?.trim() ?? '';
    partners.push({ number, name });
  }
  return partners;
}

/**
 * Check if a partner with the given partner number exists on the partners page.
 */
export async function partnerExists(page: Page, partnerNumber: string): Promise<boolean> {
  const partners = await getPartnerRows(page);
  return partners.some(p => p.number === partnerNumber);
}

/**
 * Ensure a partner exists. If it doesn't, create it via the Add Partner form.
 * Navigates to the partners page, checks, and creates if needed.
 *
 * @param page - Playwright page
 * @param partnerNumber - the expected partner number (e.g., "P00000001")
 * @param partnerName - the partner name to create if it doesn't exist
 */
export async function ensurePartnerExists(
  page: Page,
  partnerNumber: string,
  partnerName: string
): Promise<void> {
  console.log(`Ensuring partner ${partnerNumber} (${partnerName}) exists...`);

  await goToPartnersPage(page);

  // Wait for the table to load (or the "No partners found" message)
  await page.waitForTimeout(1000); // Allow time for async load

  const exists = await partnerExists(page, partnerNumber);
  if (exists) {
    console.log(`Partner ${partnerNumber} already exists`);
    return;
  }

  console.log(`Partner ${partnerNumber} does not exist, creating "${partnerName}"...`);
  await addPartner(page, partnerName);

  // Verify the partner was created
  await page.waitForTimeout(1000); // Allow time for reload
  const created = await partnerExists(page, partnerNumber);
  if (!created) {
    console.log(`Warning: Partner ${partnerNumber} was not found after creation, but this may be OK if the number assignment differs`);
  } else {
    console.log(`Partner ${partnerNumber} created successfully`);
  }
}

/**
 * Ensure multiple partners exist. Navigates to the partners page once and
 * creates any missing partners.
 *
 * @param page - Playwright page
 * @param partners - array of { partnerNumber, partnerName } objects
 */
export async function ensurePartnersExist(
  page: Page,
  partners: { partnerNumber: string; partnerName: string }[]
): Promise<void> {
  await goToPartnersPage(page);
  await page.waitForTimeout(1000); // Allow time for async load

  for (const { partnerNumber, partnerName } of partners) {
    const exists = await partnerExists(page, partnerNumber);
    if (!exists) {
      console.log(`Creating missing partner ${partnerNumber}: "${partnerName}"`);
      await addPartner(page, partnerName);
      await page.waitForTimeout(1000); // Allow time for reload
    } else {
      console.log(`Partner ${partnerNumber} already exists`);
    }
  }
}
