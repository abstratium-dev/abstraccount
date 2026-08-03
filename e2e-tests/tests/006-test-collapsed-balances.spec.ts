import { test, expect } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as accountsPage from '../pages/accounts.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

/**
 * Test 6: Collapsed Parent Account Balances
 *
 * This test implements the test case from:
 * docs/test-cases/006-test-collapsed-balances.md
 *
 * PREREQUISITE: Tests 001, 002, 003, and 004 must have been run successfully.
 *
 * This test verifies that:
 * 1. Expanded parents show only their direct balance (0 if no direct entries)
 * 2. Collapsed parents show the subtree sum (bold, displaced-balance class)
 * 3. Collapsing hides all descendants
 * 4. Expanding restores children and direct balance
 * 5. Leaf accounts have no collapse toggle
 */

// Helper: authenticate and navigate to the accounts page
async function setup(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/');
  const signOutLink = page.locator('#signout-link');
  const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
  if (!isSignedIn) {
    await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
  }
  await headerPage.waitForHeader(page);
  await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
  await headerPage.clickAccountsLink(page);
  await accountsPage.waitForAccountsPage(page);
  // Ensure all accounts start expanded
  await accountsPage.expandAllAccounts(page);
}

// Account codes from test 001 (names are included for documentation but
// matching is done by code only since all codes here are unique).
// The actual account names in test 001 are:
//   6    = "6 Other operating expenses"
//   6500 = "6500 Administrative expenses"
//   6570 = "6570 IT and computing expenses"
//   6570.001 = "6570.001 Microsoft"
//   6570.002 = "6570.002 Anthropic"
//   6700 = "6700 Other operating expenses"
//   6900 = "6900 Financial expense"
//   1    = "1 Assets"
//   10   = "10 Current Assets"
//   100  = "100 Cash and cash equivalents"
//   1000 = "1000 Cash"
//   1020 = "1020 Bank Account"
//   110  = "110 Accounts Receivable"
//   1100 = "1100 Accounts receivable (Debtors)"
//   120  = "120 Inventories and non-invoiced services"
//   1230 = "1230 Goods held for resale"
const CODE = {
  expenses: '6',
  adminExp: '6500',
  itExp: '6570',
  microsoft: '6570.001',
  anthropic: '6570.002',
  advertising: '6700',
  financialExp: '6900',
  assets: '1',
  currentAssets: '10',
  cash: '100',
  cashAccount: '1000',
  bank: '1020',
  receivables: '110',
  receivableAccount: '1100',
  inventories: '120',
  inventory: '1230',
};

// Expected balances after tests 003+004
// Note: the accounts table formats numbers WITHOUT thousands separators
const BALANCES = {
  // Leaf balances (direct = subtree since they have no children)
  adminExp: '9.30',
  microsoft: '17.00',
  anthropic: '100.00',
  advertising: '14.20',
  financialExp: '16.00',
  bank: '1680.50',
  cashAccount: '0.00',
  receivableAccount: '179.10',
  inventory: '40.00',
  // Subtree sums
  expensesSubtree: '156.50',        // 9.30 + 17.00 + 100.00 + 14.20 + 16.00
  itExpSubtree: '117.00',           // 17.00 + 100.00
  assetsSubtree: '1899.60',         // 1680.50 + 179.10 + 40.00
  currentAssetsSubtree: '1899.60',  // same as assets (only current assets exist)
  cashSubtree: '1680.50',           // 0 + 1680.50
};

test.describe('Collapsed Parent Account Balances', () => {

  // -------------------------------------------------------------------------
  // Expanded state: parent shows direct balance (0 if no direct entries)
  // -------------------------------------------------------------------------

  test('expanded root expense shows direct balance 0', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await accountsPage.expandAccount(page, CODE.expenses);
    const balance = await accountsPage.getAccountBalanceText(page, CODE.expenses);
    console.log(`Expenses balance (expanded): "${balance}"`);
    expect(balance).toContain('0.00');
    expect(balance).not.toContain(BALANCES.expensesSubtree);

    const bold = await accountsPage.isBalanceBold(page, CODE.expenses);
    expect(bold).toBe(false);
    console.log('✓ Expanded 6 Expenses shows 0.00, not bold');
  });

  test('expanded mid-level parent (6570) shows direct balance 0', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await accountsPage.expandAccount(page, CODE.itExp);
    const balance = await accountsPage.getAccountBalanceText(page, CODE.itExp);
    console.log(`IT expense balance (expanded): "${balance}"`);
    expect(balance).toContain('0.00');

    // Children should be visible
    await accountsPage.assertAccountVisible(page, CODE.microsoft);
    await accountsPage.assertAccountVisible(page, CODE.anthropic);
    console.log('✓ Expanded 6570 shows 0.00 and children are visible');
  });

  test('expanded root asset shows direct balance 0', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await accountsPage.expandAccount(page, CODE.assets);
    const balance = await accountsPage.getAccountBalanceText(page, CODE.assets);
    console.log(`Assets balance (expanded): "${balance}"`);
    expect(balance).toContain('0.00');
    console.log('✓ Expanded 1 Assets shows 0.00');
  });

  // -------------------------------------------------------------------------
  // Collapsed state: parent shows subtree sum, in bold
  // -------------------------------------------------------------------------

  test('collapsed root expense shows subtree sum 156.50', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await accountsPage.collapseAccount(page, CODE.expenses);

    // Children should be hidden
    await accountsPage.assertAccountNotVisible(page, CODE.adminExp);
    await accountsPage.assertAccountNotVisible(page, CODE.itExp);
    await accountsPage.assertAccountNotVisible(page, CODE.microsoft);
    await accountsPage.assertAccountNotVisible(page, CODE.anthropic);
    await accountsPage.assertAccountNotVisible(page, CODE.advertising);
    await accountsPage.assertAccountNotVisible(page, CODE.financialExp);

    const balance = await accountsPage.getAccountBalanceText(page, CODE.expenses);
    console.log(`Expenses balance (collapsed): "${balance}"`);
    expect(balance).toContain(BALANCES.expensesSubtree);

    const bold = await accountsPage.isBalanceBold(page, CODE.expenses);
    expect(bold).toBe(true);
    console.log('✓ Collapsed 6 Expenses shows 156.50, bold, children hidden');
  });

  test('collapsed mid-level parent (6570) shows subtree sum 117.00', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // 6570 is under 6, so 6 must be expanded to see 6570
    await accountsPage.expandAccount(page, CODE.expenses);
    await accountsPage.collapseAccount(page, CODE.itExp);

    // Children of 6570 should be hidden
    await accountsPage.assertAccountNotVisible(page, CODE.microsoft);
    await accountsPage.assertAccountNotVisible(page, CODE.anthropic);

    const balance = await accountsPage.getAccountBalanceText(page, CODE.itExp);
    console.log(`IT expense balance (collapsed): "${balance}"`);
    expect(balance).toContain(BALANCES.itExpSubtree);

    const bold = await accountsPage.isBalanceBold(page, CODE.itExp);
    expect(bold).toBe(true);
    console.log('✓ Collapsed 6570 shows 117.00, bold, children hidden');
  });

  test('collapsed root asset shows subtree sum 1,899.60', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await accountsPage.collapseAccount(page, CODE.assets);

    // All descendants should be hidden
    await accountsPage.assertAccountNotVisible(page, CODE.currentAssets);
    await accountsPage.assertAccountNotVisible(page, CODE.cash);
    await accountsPage.assertAccountNotVisible(page, CODE.bank);

    const balance = await accountsPage.getAccountBalanceText(page, CODE.assets);
    console.log(`Assets balance (collapsed): "${balance}"`);
    expect(balance).toContain(BALANCES.assetsSubtree);
    console.log('✓ Collapsed 1 Assets shows 1,899.60, descendants hidden');
  });

  test('collapsed cash parent (100) shows subtree sum 1,680.50', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // Navigate down: expand 1, 10, then collapse 100
    await accountsPage.expandAccount(page, CODE.assets);
    await accountsPage.expandAccount(page, CODE.currentAssets);
    await accountsPage.collapseAccount(page, CODE.cash);

    // Children of 100 should be hidden
    await accountsPage.assertAccountNotVisible(page, CODE.cashAccount);
    await accountsPage.assertAccountNotVisible(page, CODE.bank);

    const balance = await accountsPage.getAccountBalanceText(page, CODE.cash);
    console.log(`Cash parent balance (collapsed): "${balance}"`);
    expect(balance).toContain(BALANCES.cashSubtree);
    console.log('✓ Collapsed 100 shows 1,680.50, children hidden');
  });

  // -------------------------------------------------------------------------
  // Toggle: collapse then expand restores children and direct balance
  // -------------------------------------------------------------------------

  test('expanding a collapsed parent restores children and direct balance', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // Collapse, then expand
    await accountsPage.collapseAccount(page, CODE.expenses);
    await accountsPage.expandAccount(page, CODE.expenses);

    // Children should be visible again
    await accountsPage.assertAccountVisible(page, CODE.adminExp);
    await accountsPage.assertAccountVisible(page, CODE.itExp);

    // Balance should be back to 0 (direct balance)
    const balance = await accountsPage.getAccountBalanceText(page, CODE.expenses);
    expect(balance).toContain('0.00');

    const bold = await accountsPage.isBalanceBold(page, CODE.expenses);
    expect(bold).toBe(false);
    console.log('✓ Expanding restored children and direct balance 0.00');
  });

  test('collapsing then expanding preserves child balances', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // Expand 6 to see 6570, then collapse and expand 6570
    await accountsPage.expandAccount(page, CODE.expenses);
    await accountsPage.collapseAccount(page, CODE.itExp);
    await accountsPage.expandAccount(page, CODE.itExp);

    // Children should be visible with correct balances
    await accountsPage.assertAccountVisible(page, CODE.microsoft);
    await accountsPage.assertAccountVisible(page, CODE.anthropic);

    const msBalance = await accountsPage.getAccountBalanceText(page, CODE.microsoft);
    expect(msBalance).toContain(BALANCES.microsoft);

    const anthropicBalance = await accountsPage.getAccountBalanceText(page, CODE.anthropic);
    expect(anthropicBalance).toContain(BALANCES.anthropic);
    console.log('✓ Child balances preserved after collapse/expand cycle');
  });

  // -------------------------------------------------------------------------
  // Nested collapse: collapsing a parent hides grandchildren too
  // -------------------------------------------------------------------------

  test('collapsing a parent hides all descendants at every level', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // Collapse 10 Current Assets (which has children 100, 110, 120 and grandchildren)
    await accountsPage.expandAccount(page, CODE.assets);
    await accountsPage.collapseAccount(page, CODE.currentAssets);

    // Direct children hidden
    await accountsPage.assertAccountNotVisible(page, CODE.cash);
    await accountsPage.assertAccountNotVisible(page, CODE.receivables);
    await accountsPage.assertAccountNotVisible(page, CODE.inventories);
    // Grandchildren hidden
    await accountsPage.assertAccountNotVisible(page, CODE.cashAccount);
    await accountsPage.assertAccountNotVisible(page, CODE.bank);
    await accountsPage.assertAccountNotVisible(page, CODE.receivableAccount);
    await accountsPage.assertAccountNotVisible(page, CODE.inventory);

    const balance = await accountsPage.getAccountBalanceText(page, CODE.currentAssets);
    console.log(`Current Assets balance (collapsed): "${balance}"`);
    expect(balance).toContain(BALANCES.currentAssetsSubtree);
    console.log('✓ Collapsed 10 hides all descendants, shows 1,899.60');
  });

  // -------------------------------------------------------------------------
  // Leaf accounts: no collapse toggle, balance always shown
  // -------------------------------------------------------------------------

  test('leaf account (1020) has no collapse toggle and shows balance', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    // Navigate to 1020 by expanding ancestors
    await accountsPage.expandAccount(page, CODE.assets);
    await accountsPage.expandAccount(page, CODE.currentAssets);
    await accountsPage.expandAccount(page, CODE.cash);

    await accountsPage.assertNoCollapseToggle(page, CODE.bank);
    const balance = await accountsPage.getAccountBalanceText(page, CODE.bank);
    expect(balance).toContain(BALANCES.bank);
    console.log('✓ Leaf 1020 has no toggle, shows 1,680.50');
  });

  test('leaf account with zero balance (1000) shows 0.00', async ({ page }) => {
    test.setTimeout(60_000);
    await setup(page);

    await accountsPage.expandAccount(page, CODE.assets);
    await accountsPage.expandAccount(page, CODE.currentAssets);
    await accountsPage.expandAccount(page, CODE.cash);

    await accountsPage.assertNoCollapseToggle(page, CODE.cashAccount);
    const balance = await accountsPage.getAccountBalanceText(page, CODE.cashAccount);
    expect(balance).toContain('0.00');
    console.log('✓ Leaf 1000 has no toggle, shows 0.00');
  });
});
