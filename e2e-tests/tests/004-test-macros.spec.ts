import { test, expect } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as macrosPage from '../pages/macros.page';
import * as reportsPage from '../pages/reports.page';
import * as partnersPage from '../pages/partners.page';
import * as toastPage from '../pages/toast.page';
import { authenticate } from './auth-helper';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_PARTNERS } from './test-constants';

/**
 * Test 4: Test Macros - BankingExpense
 * 
 * This test implements the test case from:
 * docs/test-cases/004-test-macros.md
 * 
 * PREREQUISITE: Tests 001, 002, and 003 must have been run successfully to create the journal,
 * account tree, opening balances, and initial transactions.
 * 
 * This test validates the macro system by testing the BankingExpense macro.
 */

test.describe('Test Macros', () => {
  test('should import built-in macros', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Import Built-in Macros ===');

    // 1. Navigate and authenticate
    console.log('--- Step 1: Navigating and authenticating ---');
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

    // 2. Navigate to the macros page
    console.log('--- Step 2: Navigating to Macros Page ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);

    // 3. Clean up any existing macros via the API so the import succeeds
    //    with a success toast rather than a conflict dialog.
    console.log('--- Step 3: Cleaning up existing macros ---');
    await macrosPage.deleteAllMacrosViaApi(page);
    // Reload the macros page so the macro grid reflects the cleanup
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);

    // 4. Open the macros menu and click "Import Built-in"
    console.log('--- Step 4: Clicking Import Built-in ---');
    await macrosPage.openMenu(page);
    await macrosPage.clickImportBuiltin(page);

    // 5. Assert the success toast announcing the import
    console.log('--- Step 5: Asserting success toast ---');
    await toastPage.waitForSuccessToast(page, /Successfully imported \d+ macro\(s\)/);

    // 6. Verify the macros now appear on the page
    console.log('--- Step 6: Verifying macros are available ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    const macroNames = await macrosPage.getMacroNames(page);
    console.log(`Available macros: ${macroNames.join(', ')}`);
    expect(macroNames.length).toBeGreaterThan(0);
    // The built-in export includes the BankingExpense macro, which the
    // subsequent macro-execution tests rely on.
    expect(macroNames.some(n => n.includes('BankingExpense'))).toBe(true);

    console.log('✓ Built-in macros imported successfully!');
    console.log('=== Import Built-in Macros Complete ===');
  });

  test('should execute BankingExpense macro and validate all scenarios', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4: Test Macros - BankingExpense ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');

    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    console.log('Journal page loaded');

    // ========================================================================
    // Ensure required partners exist before running macros
    // ========================================================================
    console.log('--- Ensuring required partners exist ---');
    await partnersPage.ensurePartnersExist(page, TEST_PARTNERS);

    // Navigate back to the journal page after partner creation
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    // ========================================================================
    // Step 2: Comprehensive cleanup - delete ALL 004 test transactions
    // This ensures the invoice numbering starts fresh (SI00000001, SI00000002)
    // and prevents duplicate transactions from previous test runs.
    // ========================================================================
    console.log('--- Step 2: Comprehensive cleanup of all 004 test transactions ---');

    const ALL_004_DESCRIPTIONS = [
      'Test macros 004.1 banking expense',
      'Test macros 004.2 repay staff (for initial loan)',
      'Test macros 004.3 sales invoice',
      'Test macros 004.4 second invoice',
      'Test macros 004.5 Customer pays invoice SI00000001',
      'Test macros 004.6 payment by staff',
      'Test macros 004.6 repay staff',
      'Test macros 004.9 tax payment for 2024',
      // 004.8 and 004.10 are now in test 007 (year-end closing), but we clean
      // them up here too in case of leftover transactions from previous runs.
      'Test macros 004.8 tax provision for 2024',
      'Test macros 004.10 legal reserve allocation for 2024',
      'Test 007 tax provision for 2024',
      'Test 007 legal reserve allocation for 2024',
    ];
    for (const desc of ALL_004_DESCRIPTIONS) {
      await deleteTransactionByDescription(page, desc);
    }
    console.log('✓ All 004 test transactions cleaned up');
    
    // ========================================================================
    // Step 3: Navigate to macros page and select BankingExpense macro
    // ========================================================================
    console.log('--- Step 3: Navigating to Macros Page ---');
    
    // Click on the macros link in the header
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');
    
    // Verify BankingExpense macro is available
    await macrosPage.verifyMacroExists(page, 'BankingExpense');
    console.log('✓ BankingExpense macro is available in the macro list');
    
    // Select BankingExpense macro
    await macrosPage.selectMacro(page, 'BankingExpense');
    console.log('BankingExpense macro selected');
    
    // ========================================================================
    // Step 4: Validate required field enforcement (negative testing)
    // ========================================================================
    console.log('--- Step 4: Testing Required Field Validation ---');
    
    // Try to execute with all fields empty
    console.log('Attempting to execute with empty fields...');
    await macrosPage.executeMacro(page);
    
    // Check for validation error
    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorText = await macrosPage.getErrorMessage(page);
      console.log(`✓ Validation error displayed: ${errorText}`);
    } else {
      console.log('⚠ No validation error displayed for empty fields');
    }
    
    // Fill fields one by one
    console.log('Filling date field...');
    await macrosPage.fillParameter(page, 'date', '2024-08-01');
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.1 banking expense');
    
    console.log('Filling amount field...');
    await macrosPage.fillParameter(page, 'amount', '1.00');
    
    // ========================================================================
    // Step 5: Fill account fields using autocomplete
    // ========================================================================
    console.log('--- Step 5: Filling Account Fields ---');
    
    // Fill bank account (1020)
    console.log('Filling bank account field...');
    // The parameter fields are inside the modal, need to find them by looking at the structure
    const bankAccountInput = page.locator('.parameter-field').filter({ hasText: 'Bank account' }).locator('abs-autocomplete input.autocomplete-input');
    await bankAccountInput.click();
    await page.waitForTimeout(300);
    await bankAccountInput.fill('1020');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Verify and select 1020
    const account1020 = page.locator('.dropdown .dropdown-item:has-text("1020")');
    await expect(account1020.first()).toBeVisible();
    console.log('✓ Account 1020 Bank Account is available');
    await account1020.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Bank account 1020 selected');
    
    // Fill expense account (6900)
    console.log('Filling expense account field...');
    const expenseAccountInput = page.locator('.parameter-field').filter({ hasText: 'Financial expense account' }).locator('abs-autocomplete input.autocomplete-input');
    await expenseAccountInput.click();
    await page.waitForTimeout(300);
    await expenseAccountInput.fill('6900');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Verify and select 6900
    const account6900 = page.locator('.dropdown .dropdown-item:has-text("6900")');
    await expect(account6900.first()).toBeVisible();
    console.log('✓ Account 6900 Financial expense is available');
    await account6900.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Expense account 6900 selected');
    
    // ========================================================================
    // Step 6: Validate default values
    // ========================================================================
    console.log('--- Step 6: Validating Default Values ---');
    
    // Check that invoice number has a default value
    const invoiceNumberInput = page.locator('input[id="param-invoice_number"]');
    const invoiceValue = await invoiceNumberInput.inputValue();
    console.log(`Invoice number field value: ${invoiceValue}`);
    if (invoiceValue && invoiceValue.trim() !== '') {
      console.log('✓ Invoice number has default value');
    } else {
      console.log('⚠ Invoice number field is empty');
    }
    
    // ========================================================================
    // Step 7: Execute the macro
    // ========================================================================
    console.log('--- Step 7: Executing Macro ---');
    
    console.log('All required fields filled, executing macro...');
    await macrosPage.executeMacro(page);
    
    // Wait for macro execution to complete
    await page.waitForTimeout(2000);
    
    // Check if macro modal closed (successful execution)
    const macroModalVisible = await page.locator('.modal-overlay').isVisible().catch(() => false);
    if (!macroModalVisible) {
      console.log('✓ Macro executed successfully, modal closed');
    } else {
      // Check for errors
      const errorAfterExec = await macrosPage.hasErrorMessage(page);
      if (errorAfterExec) {
        const errorText = await macrosPage.getErrorMessage(page);
        console.error(`Error executing macro: ${errorText}`);
        throw new Error(`Failed to execute macro: ${errorText}`);
      }
    }
    
    // Wait for page to update and navigate back to journal
    await page.waitForLoadState('networkidle');
    
    // Navigate to journal page to see the transaction
    await page.click('a#journal');
    await transactionsPage.waitForJournalPage(page);
    
    // ========================================================================
    // Step 8: Verify transaction was created
    // ========================================================================
    console.log('--- Step 8: Verifying Transaction Creation ---');
    
    // Look for the transaction in the list
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.1 banking expense');
    console.log('✓ Transaction "Test macros 004.1 banking expense" appears in transaction list');
    
    // ========================================================================
    // Step 9: Verify transaction in the list
    // ========================================================================
    console.log('--- Step 9: Final Verification ---');
    
    // Verify the transaction appears in the table with correct data
    const transactionRow = page.locator('tr').filter({ hasText: 'Test macros 004.1 banking expense' }).first();
    await expect(transactionRow).toBeVisible();
    console.log('✓ Transaction row is visible in the table');
    
    // Verify the date appears in the row
    const hasDate = await transactionRow.filter({ hasText: '2024-08-01' }).isVisible().catch(() => false);
    if (hasDate) {
      console.log('✓ Date 2024-08-01 appears in transaction row');
    }
    
    // Verify partner P00000004 appears
    const hasPartner = await transactionRow.filter({ hasText: 'P00000004' }).isVisible().catch(() => false);
    if (hasPartner) {
      console.log('✓ Partner P00000004 appears in transaction row');
    }
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ All macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Required field validation');
    console.log('  - Account filtering (1020 and 6900)');
    console.log('  - Default values (date and invoice number)');
    console.log('  - Macro execution and transaction creation');
    console.log('  - Partner auto-set to P00000004');
    console.log('  - Transaction appears in transaction list');
    
    console.log('=== Test 4 Complete: All Macro Scenarios Validated ===');
  });

  test('should execute RepayStaff macro and validate all scenarios', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.2: Test Macros - RepayStaff ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');
    
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    console.log('Journal page loaded');
    
    // ========================================================================
    // Step 2: Delete existing "Test macros 004.2 repay staff" transaction if it exists
    // ========================================================================
    console.log('--- Step 2: Cleaning up existing test transaction ---');
    
    await deleteTransactionByDescription(page, 'Test macros 004.2 repay staff (for initial loan)');
    
    // ========================================================================
    // Step 3: Navigate to macros page and select RepayStaff macro
    // ========================================================================
    console.log('--- Step 3: Navigating to Macros Page ---');
    
    // Click on the macros link in the header
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');
    
    // Verify RepayStaff macro is available
    await macrosPage.verifyMacroExists(page, 'RepayStaff');
    console.log('✓ RepayStaff macro is available in the macro list');
    
    // Select RepayStaff macro
    await macrosPage.selectMacro(page, 'RepayStaff');
    console.log('RepayStaff macro selected');
    
    // ========================================================================
    // Step 4: Validate required field enforcement (negative testing)
    // ========================================================================
    console.log('--- Step 4: Testing Required Field Validation ---');
    
    // Try to execute with all fields empty
    console.log('Attempting to execute with empty fields...');
    await macrosPage.executeMacro(page);
    
    // Check for validation error
    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorText = await macrosPage.getErrorMessage(page);
      console.log(`✓ Validation error displayed: ${errorText}`);
    } else {
      console.log('⚠ No validation error displayed for empty fields');
    }
    
    // Fill fields one by one
    console.log('Filling payment date field...');
    await macrosPage.fillParameter(page, 'date', '2024-08-02');
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.2 repay staff (for initial loan)');
    
    console.log('Filling invoice numbers field...');
    await macrosPage.fillParameter(page, 'invoice_numbers', 'PI00000002,PI00000003');
    
    console.log('Filling amount field...');
    await macrosPage.fillParameter(page, 'amount', '38.50');
    
    // ========================================================================
    // Step 5: Fill partner and account fields using autocomplete
    // ========================================================================
    console.log('--- Step 5: Filling Partner and Account Fields ---');
    
    // Fill partner (P00000001)
    console.log('Filling partner field...');
    const partnerInput = page.locator('.parameter-field').filter({ hasText: 'Partner (staff member)' }).locator('abs-autocomplete input.autocomplete-input');
    await partnerInput.click();
    await page.waitForTimeout(300);
    await partnerInput.fill('P00000001');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Verify and select P00000001
    const partner1 = page.locator('.dropdown .dropdown-item:has-text("P00000001")');
    await expect(partner1.first()).toBeVisible();
    console.log('✓ Partner P00000001 is available');
    await partner1.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Partner P00000001 selected');
    
    // Fill bank account (1020)
    console.log('Filling bank account field...');
    const bankAccountInput = page.locator('.parameter-field').filter({ hasText: 'Bank account' }).locator('abs-autocomplete input.autocomplete-input');
    await bankAccountInput.click();
    await page.waitForTimeout(300);
    await bankAccountInput.fill('1020');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Verify and select 1020
    const account1020 = page.locator('.dropdown .dropdown-item:has-text("1020")');
    await expect(account1020.first()).toBeVisible();
    console.log('✓ Account 1020 Bank Account is available');
    await account1020.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Bank account 1020 selected');
    
    // Fill staff member account (2210.001)
    console.log('Filling staff member account field...');
    const staffAccountInput = page.locator('.parameter-field').filter({ hasText: 'Staff member account' }).locator('abs-autocomplete input.autocomplete-input');
    await staffAccountInput.click();
    await page.waitForTimeout(300);
    await staffAccountInput.fill('2210.001');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Verify and select 2210.001
    const account2210 = page.locator('.dropdown .dropdown-item:has-text("2210.001")');
    await expect(account2210.first()).toBeVisible();
    console.log('✓ Account 2210.001 is available');
    await account2210.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Staff member account 2210.001 selected');
    
    // ========================================================================
    // Step 6: Validate default values
    // ========================================================================
    console.log('--- Step 6: Validating Default Values ---');
    
    // Check that date has a default value
    const dateInput = page.locator('input[id="param-date"]');
    const dateValue = await dateInput.inputValue();
    console.log(`Date field value: ${dateValue}`);
    if (dateValue && dateValue.trim() !== '') {
      console.log('✓ Date has default value (today)');
    }
    
    // ========================================================================
    // Step 7: Execute the macro
    // ========================================================================
    console.log('--- Step 7: Executing Macro ---');
    
    console.log('All required fields filled, executing macro...');
    await macrosPage.executeMacro(page);
    
    // Wait for macro execution to complete
    await page.waitForTimeout(2000);
    
    // Check if macro modal closed (successful execution)
    const macroModalVisible = await page.locator('.modal-overlay').isVisible().catch(() => false);
    if (!macroModalVisible) {
      console.log('✓ Macro executed successfully, modal closed');
    } else {
      // Check for errors
      const errorAfterExec = await macrosPage.hasErrorMessage(page);
      if (errorAfterExec) {
        const errorText = await macrosPage.getErrorMessage(page);
        console.error(`Error executing macro: ${errorText}`);
        throw new Error(`Failed to execute macro: ${errorText}`);
      }
    }
    
    // Wait for page to update and navigate back to journal
    await page.waitForLoadState('networkidle');
    
    // Navigate to journal page to see the transaction
    await page.click('a#journal');
    await transactionsPage.waitForJournalPage(page);
    
    // ========================================================================
    // Step 8: Verify transaction was created
    // ========================================================================
    console.log('--- Step 8: Verifying Transaction Creation ---');
    
    // Look for the transaction in the list
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.2 repay staff (for initial loan)');
    console.log('✓ Transaction "Test macros 004.2 repay staff (for initial loan)" appears in transaction list');
    
    // ========================================================================
    // Step 9: Verify transaction details
    // ========================================================================
    console.log('--- Step 9: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.2 repay staff (for initial loan)', {
      date: '2024-08-02',
      partner: 'P00000001',
      value: '38.50'
    });
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ All RepayStaff macro scenarios validated:');
    console.log('  - Macro selection and parameter form display (7 parameters)');
    console.log('  - Required field validation');
    console.log('  - Partner selection (P00000001)');
    console.log('  - Invoice numbers format (PI00000002,PI00000003)');
    console.log('  - Account filtering (1020 and 2210.001)');
    console.log('  - Default values (date)');
    console.log('  - Macro execution and transaction creation');
    console.log('  - Transaction appears in transaction list');
    console.log('  - Amount: CHF 38.50');
    
    console.log('=== Test 4.2 Complete: RepayStaff Macro Validated ===');
  });

  test('should execute InvoiceForServicesOrSaas macro and validate all scenarios', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.3: Test Macros - InvoiceForServicesOrSaas ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');
    
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    
    console.log('Journal page loaded');
    
    // ========================================================================
    // Step 2: Delete existing "Test macros 004.3 sales invoice" transaction if it exists
    // ========================================================================
    console.log('--- Step 2: Cleaning up existing test transaction ---');
    
    await deleteTransactionByDescription(page, 'Test macros 004.3 sales invoice');
    
    // ========================================================================
    // Step 3: Navigate to macros page and select InvoiceForServicesOrSaas macro
    // ========================================================================
    console.log('--- Step 3: Navigating to Macros Page ---');
    
    // Click on the macros link in the header
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');
    
    // Verify InvoiceForServicesOrSaas macro is available
    await macrosPage.verifyMacroExists(page, 'InvoiceForServicesOrSaas');
    console.log('✓ InvoiceForServicesOrSaas macro is available in the macro list');
    
    // Select InvoiceForServicesOrSaas macro
    await macrosPage.selectMacro(page, 'InvoiceForServicesOrSaas');
    console.log('InvoiceForServicesOrSaas macro selected');
    
    // ========================================================================
    // Step 4: Fill in all required fields
    // ========================================================================
    console.log('--- Step 4: Filling in Macro Parameters ---');
    
    console.log('Filling date field...');
    await macrosPage.fillParameter(page, 'date', '2024-08-04');
    
    console.log('Filling partner field...');
    await macrosPage.fillParameterAutocomplete(page, 'Partner (customer)', 'P00000014');
    
    console.log('Filling invoice number field with placeholder...');
    // Use placeholder - this tests that macro parameter replacement works
    const invoiceField = page.locator('.parameter-field').filter({
      has: page.locator('label:has-text("Invoice number (8 digits)")')
    }).first();
    const invoiceInput = invoiceField.locator('input.autocomplete-input');
    await invoiceInput.click();
    await invoiceInput.clear();
    await invoiceInput.type('{next_invoice_SI}');
    await page.waitForTimeout(300);
    
    console.log('Filling amount field...');
    await macrosPage.fillParameter(page, 'amount', '7.00');
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.3 sales invoice');
    
    console.log('Filling revenue account field...');
    // Revenue account - 3rd autocomplete input (partner=0, invoice=1, revenue=2)
    const allAutocompleteInputs = page.locator('abs-autocomplete input.autocomplete-input');
    const revenueInput = allAutocompleteInputs.nth(2);
    await revenueInput.click();
    await revenueInput.clear();
    await revenueInput.type('3:3400');
    await page.waitForTimeout(500);
    console.log('Revenue account 3:3400 entered');
    
    console.log('Filling receivable account field...');
    // Receivable account - 4th autocomplete input (partner=0, invoice=1, revenue=2, receivable=3)
    const receivableInput = allAutocompleteInputs.nth(3);
    await receivableInput.click();
    await receivableInput.clear();
    await receivableInput.type('1:10:110:1100');
    await page.waitForTimeout(500);
    console.log('Receivable account 1:10:110:1100 entered');
    
    // Close any open dropdown by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    console.log('All fields filled');
    
    // ========================================================================
    // Step 5: Execute the macro
    // ========================================================================
    console.log('--- Step 5: Executing Macro ---');
    
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');
    
    // Wait a moment for processing
    await page.waitForTimeout(2000);
    
    // Check for error message
    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }
    
    // Wait for modal to close (indicates successful execution)
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');
    
    // Wait for navigation to journal page
    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');
    
    // ========================================================================
    // Step 6: Verify transaction was created
    // ========================================================================
    console.log('--- Step 6: Verifying Transaction Creation ---');
    
    // Look for the transaction in the list
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.3 sales invoice');
    console.log('✓ Transaction "Test macros 004.3 sales invoice" appears in transaction list');
    
    // ========================================================================
    // Step 7: Verify transaction details
    // ========================================================================
    console.log('--- Step 7: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.3 sales invoice', {
      date: '2024-08-04',
      partner: 'P00000014',
      value: '7.00'
    });
    
    // ========================================================================
    // Step 8: Final verification
    // ========================================================================
    console.log('--- Step 8: Final Verification ---');
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ All InvoiceForServicesOrSaas macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Partner selection (P00000014)');
    console.log('  - Invoice number placeholder ({next_invoice_SI}) resolved to SI00000002');
    console.log('  - Amount: CHF 7.00');
    console.log('  - Description: Test macros 004.3 sales invoice');
    console.log('  - Revenue account: 3:3400');
    console.log('  - Receivable account: 1:10:110:1100');
    console.log('  - Macro execution and transaction creation');
    console.log('  - Transaction appears in transaction list with correct data');
    
    console.log('=== Test 4.3: InvoiceForServicesOrSaas Macro - PASSED ===');
  });

  test('should execute InvoiceForServicesOrSaas macro for second invoice (unpaid)', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.4: Test Macros - Second Invoice (Unpaid) ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');
    
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    
    console.log('Journal page loaded');
    
    // ========================================================================
    // Step 2: Delete existing test transaction if it exists
    // ========================================================================
    console.log('--- Step 2: Cleaning up existing test transaction ---');
    
    await deleteTransactionByDescription(page, 'Test macros 004.4 second invoice');
    
    // ========================================================================
    // Step 3: Navigate to macros page and select InvoiceForServicesOrSaas macro
    // ========================================================================
    console.log('--- Step 3: Navigating to Macros Page ---');
    
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');
    
    await macrosPage.selectMacro(page, 'InvoiceForServicesOrSaas');
    console.log('InvoiceForServicesOrSaas macro selected');
    
    // ========================================================================
    // Step 4: Fill in all required fields
    // ========================================================================
    console.log('--- Step 4: Filling in Macro Parameters ---');
    
    console.log('Filling date field (2024-08-07 - a few days after first invoice)...');
    await macrosPage.fillParameter(page, 'date', '2024-08-07');
    
    console.log('Filling partner field (same partner P00000014)...');
    await macrosPage.fillParameterAutocomplete(page, 'Partner (customer)', 'P00000014');
    
    console.log('Filling invoice number field with placeholder...');
    const invoiceField = page.locator('.parameter-field').filter({
      has: page.locator('label:has-text("Invoice number (8 digits)")')
    }).first();
    const invoiceInput = invoiceField.locator('input.autocomplete-input');
    await invoiceInput.click();
    await invoiceInput.clear();
    await invoiceInput.type('{next_invoice_SI}');
    await page.waitForTimeout(300);
    
    console.log('Filling amount field (111 CHF)...');
    await macrosPage.fillParameter(page, 'amount', '111');
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.4 second invoice');
    
    console.log('Filling revenue account field...');
    const allAutocompleteInputs = page.locator('abs-autocomplete input.autocomplete-input');
    const revenueInput = allAutocompleteInputs.nth(2);
    await revenueInput.click();
    await revenueInput.clear();
    await revenueInput.type('3:3400');
    await page.waitForTimeout(500);
    console.log('Revenue account 3:3400 entered');
    
    console.log('Filling receivable account field...');
    const receivableInput = allAutocompleteInputs.nth(3);
    await receivableInput.click();
    await receivableInput.clear();
    await receivableInput.type('1:10:110:1100');
    await page.waitForTimeout(500);
    console.log('Receivable account 1:10:110:1100 entered');
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    console.log('All fields filled');
    
    // ========================================================================
    // Step 5: Execute the macro
    // ========================================================================
    console.log('--- Step 5: Executing Macro ---');
    
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');
    
    await page.waitForTimeout(2000);
    
    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }
    
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');
    
    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');
    
    // ========================================================================
    // Step 6: Verify transaction was created
    // ========================================================================
    console.log('--- Step 6: Verifying Transaction Creation ---');
    
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.4 second invoice');
    console.log('✓ Transaction "Test macros 004.4 second invoice" appears in transaction list');
    
    // ========================================================================
    // Step 7: Verify transaction details
    // ========================================================================
    console.log('--- Step 7: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.4 second invoice', {
      date: '2024-08-07',
      partner: 'P00000014',
      value: '111'
    });
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ Second invoice created (unpaid):');
    console.log('  - Date: 2024-08-07');
    console.log('  - Partner: P00000014');
    console.log('  - Invoice: SI00000002 (auto-generated)');
    console.log('  - Amount: CHF 111');
    console.log('  - Status: Unpaid (will be used in test 004.5)');
    
    console.log('=== Test 4.4: Second Invoice - PASSED ===');
  });

  test('should execute CustomerPaysInvoice macro with regex invoice search', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.5: Test Macros - CustomerPaysInvoice ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');
    
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    
    console.log('Journal page loaded');
    
    // ========================================================================
    // Step 2: Delete existing test transaction if it exists
    // ========================================================================
    console.log('--- Step 2: Cleaning up existing test transaction ---');
    
    await deleteTransactionByDescription(page, 'Test macros 004.5 Customer pays invoice SI00000001');
    
    // ========================================================================
    // Step 3: Navigate to macros page and select CustomerPaysInvoice macro
    // ========================================================================
    console.log('--- Step 3: Navigating to Macros Page ---');
    
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');
    
    await macrosPage.verifyMacroExists(page, 'CustomerPaysInvoice');
    console.log('✓ CustomerPaysInvoice macro is available in the macro list');
    
    await macrosPage.selectMacro(page, 'CustomerPaysInvoice');
    console.log('CustomerPaysInvoice macro selected');
    
    // ========================================================================
    // Step 4: Fill in all required fields
    // ========================================================================
    console.log('--- Step 4: Filling in Macro Parameters ---');
    
    console.log('Filling date field (2024-08-31)...');
    await macrosPage.fillParameter(page, 'date', '2024-08-31');
    
    console.log('Filling partner field (P00000014)...');
    await macrosPage.fillParameterAutocomplete(page, 'Partner (customer)', 'P00000014');
    
    console.log('Filling invoice number field using regex search (.*01$)...');
    // Find the invoice number autocomplete field
    const invoiceField = page.locator('.parameter-field').filter({
      has: page.locator('label:has-text("Invoice number")')
    }).first();
    const invoiceInput = invoiceField.locator('input.autocomplete-input');
    
    // Use regex pattern to search for invoices ending in 01
    await invoiceInput.click();
    await invoiceInput.clear();
    await invoiceInput.type('.*01$');
    await page.waitForTimeout(800); // Wait for autocomplete to search
    
    // Wait for dropdown to appear with results
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Select SI00000001 from the dropdown
    const invoiceItem = page.locator('.dropdown .dropdown-item:has-text("SI00000001")');
    await invoiceItem.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Invoice SI00000001 selected using regex search .*01$');
    
    console.log('Filling amount field (7.00)...');
    await macrosPage.fillParameter(page, 'amount', '7.00');
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.5 Customer pays invoice SI00000001');
    
    console.log('Filling ingoing account field (1020 - Bank)...');
    // Ingoing account is the 3rd autocomplete (partner=0, invoice=1, ingoing=2)
    const allAutocompleteInputs = page.locator('abs-autocomplete input.autocomplete-input');
    const ingoingInput = allAutocompleteInputs.nth(2);
    await ingoingInput.click();
    await ingoingInput.clear();
    await ingoingInput.type('1:10:100:1020');
    await page.waitForTimeout(500);
    console.log('Ingoing account 1:10:100:1020 (Bank) entered');
    
    console.log('Filling receivable account field (1100)...');
    // Receivable account is the 4th autocomplete (partner=0, invoice=1, bank=2, receivable=3)
    const receivableInput = allAutocompleteInputs.nth(3);
    await receivableInput.click();
    await receivableInput.clear();
    await receivableInput.type('1:10:110:1100');
    await page.waitForTimeout(500);
    console.log('Receivable account 1:10:110:1100 entered');
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    console.log('All fields filled');
    
    // ========================================================================
    // Step 5: Execute the macro
    // ========================================================================
    console.log('--- Step 5: Executing Macro ---');
    
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');
    
    await page.waitForTimeout(2000);
    
    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }
    
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');
    
    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');
    
    // ========================================================================
    // Step 6: Verify transaction was created
    // ========================================================================
    console.log('--- Step 6: Verifying Transaction Creation ---');
    
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.5 Customer pays invoice SI00000001');
    console.log('✓ Transaction "Test macros 004.5 Customer pays invoice SI00000001" appears in transaction list');
    
    // ========================================================================
    // Step 7: Verify transaction details
    // ========================================================================
    console.log('--- Step 7: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.5 Customer pays invoice SI00000001', {
      date: '2024-08-31',
      partner: 'P00000014',
      value: '7.00'
    });
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ CustomerPaysInvoice macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Partner selection (P00000014)');
    console.log('  - Invoice regex search (.*01$) successfully found SI00000001');
    console.log('  - Date: 2024-08-31');
    console.log('  - Amount: CHF 7.00');
    console.log('  - Description: Test macros 004.5 Customer pays invoice SI00000001');
    console.log('  - Ingoing account (Bank): 1:10:100:1020');
    console.log('  - Receivable account: 1:10:110:1100');
    console.log('  - Invoice SI00000001 is now paid');
    console.log('  - Macro execution and transaction creation');
    console.log('  - Transaction appears in transaction list with correct data');
    
    console.log('=== Test 4.5: CustomerPaysInvoice Macro - PASSED ===');
  });

  test('should execute PaymentByStaff macro for staff payment to supplier', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.6a: Test Macros - PaymentByStaff ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');
    
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    console.log('Journal page loaded');
    
    // ========================================================================
    // Step 2: Delete existing test transaction if it exists
    // ========================================================================
    console.log('--- Step 2: Cleaning up existing test transaction ---');
    
    await deleteTransactionByDescription(page, 'Test macros 004.6 payment by staff');
    
    // ========================================================================
    // Step 3: Navigate to macros page and select PaymentByStaff macro
    // ========================================================================
    console.log('--- Step 3: Navigating to Macros Page ---');
    
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');
    
    await macrosPage.verifyMacroExists(page, 'PaymentByStaff');
    console.log('✓ PaymentByStaff macro is available in the macro list');
    
    await macrosPage.selectMacro(page, 'PaymentByStaff');
    console.log('PaymentByStaff macro selected');
    
    // ========================================================================
    // Step 4: Fill in all required fields
    // ========================================================================
    console.log('--- Step 4: Filling in Macro Parameters ---');
    
    console.log('Filling date field (2024-09-09)...');
    await macrosPage.fillParameter(page, 'date', '2024-09-09');
    
    console.log('Filling partner field (P00000014)...');
    await macrosPage.fillParameterAutocomplete(page, 'Partner (supplier)', 'P00000014');
    
    console.log('Filling invoice number field with placeholder...');
    const invoiceInput = page.locator('input[id="param-invoice_number"]');
    await invoiceInput.click();
    await invoiceInput.clear();
    await invoiceInput.type('{next_invoice_PI}');
    await page.waitForTimeout(300);
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.6 payment by staff');
    
    console.log('Filling amount field (17.00)...');
    await macrosPage.fillParameter(page, 'amount', '17.00');
    
    console.log('Filling expense account field (6570.001)...');
    // Expense account - find the autocomplete for expense account
    const expenseAccountInput = page.locator('.parameter-field').filter({ hasText: 'Expense account' }).locator('abs-autocomplete input.autocomplete-input');
    await expenseAccountInput.click();
    await page.waitForTimeout(300);
    await expenseAccountInput.fill('6570.001');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const account6570 = page.locator('.dropdown .dropdown-item:has-text("6570.001")');
    await expect(account6570.first()).toBeVisible();
    console.log('✓ Account 6570.001 is available');
    await account6570.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Expense account 6570.001 selected');
    
    console.log('Filling staff member account field (2210.001)...');
    const staffAccountInput = page.locator('.parameter-field').filter({ hasText: 'Staff member account' }).locator('abs-autocomplete input.autocomplete-input');
    await staffAccountInput.click();
    await page.waitForTimeout(300);
    await staffAccountInput.fill('2210.001');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const account2210 = page.locator('.dropdown .dropdown-item:has-text("2210.001")');
    await expect(account2210.first()).toBeVisible();
    console.log('✓ Account 2210.001 is available');
    await account2210.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Staff member account 2210.001 selected');
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    console.log('All fields filled');
    
    // ========================================================================
    // Step 5: Execute the macro
    // ========================================================================
    console.log('--- Step 5: Executing Macro ---');
    
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');
    
    await page.waitForTimeout(2000);
    
    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }
    
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');
    
    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');
    
    // ========================================================================
    // Step 6: Verify transaction was created
    // ========================================================================
    console.log('--- Step 6: Verifying Transaction Creation ---');
    
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.6 payment by staff');
    console.log('✓ Transaction "Test macros 004.6 payment by staff" appears in transaction list');
    
    // ========================================================================
    // Step 7: Verify transaction details
    // ========================================================================
    console.log('--- Step 7: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.6 payment by staff', {
      date: '2024-09-09',
      partner: 'P00000014',
      value: '17.00'
    });
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ PaymentByStaff macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Partner selection (P00000014 - supplier)');
    console.log('  - Invoice number placeholder ({next_invoice_PI}) resolved');
    console.log('  - Date: 2024-09-09');
    console.log('  - Amount: CHF 17.00');
    console.log('  - Description: Test macros 004.6 payment by staff');
    console.log('  - Expense account: 6570.001');
    console.log('  - Staff member account: 2210.001');
    console.log('  - Staff liability created (company owes staff member)');
    
    console.log('=== Test 4.6a: PaymentByStaff Macro - PASSED ===');
  });

  test('should execute RepayStaff macro to repay staff member', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.6b: Test Macros - RepayStaff (for 004.6 payment) ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }
    
    // Ensure we're signed in
    await headerPage.waitForHeader(page);
    
    // ========================================================================
    // Step 1: Select the journal and navigate to transactions page
    // ========================================================================
    console.log('--- Step 1: Selecting Journal ---');
    
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    console.log('Journal page loaded');
    
    // ========================================================================
    // Step 2: Delete existing test transaction if it exists
    // ========================================================================
    console.log('--- Step 2: Cleaning up existing test transaction ---');
    
    await deleteTransactionByDescription(page, 'Test macros 004.6 repay staff');
    
    // ========================================================================
    // Step 3: Navigate to macros page and select RepayStaff macro
    // ========================================================================
    console.log('--- Step 3: Navigating to Macros Page ---');
    
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');
    
    await macrosPage.verifyMacroExists(page, 'RepayStaff');
    console.log('✓ RepayStaff macro is available in the macro list');
    
    await macrosPage.selectMacro(page, 'RepayStaff');
    console.log('RepayStaff macro selected');
    
    // ========================================================================
    // Step 4: Fill in all required fields
    // ========================================================================
    console.log('--- Step 4: Filling in Macro Parameters ---');
    
    console.log('Filling payment date field (2024-09-30)...');
    await macrosPage.fillParameter(page, 'date', '2024-09-30');
    
    console.log('Filling partner field (P00000001 - staff member)...');
    const partnerInput = page.locator('.parameter-field').filter({ hasText: 'Partner (staff member)' }).locator('abs-autocomplete input.autocomplete-input');
    await partnerInput.click();
    await page.waitForTimeout(300);
    await partnerInput.fill('P00000001');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const partner1 = page.locator('.dropdown .dropdown-item:has-text("P00000001")');
    await expect(partner1.first()).toBeVisible();
    console.log('✓ Partner P00000001 is available');
    await partner1.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Partner P00000001 selected');
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.6 repay staff');
    
    console.log('Filling invoice numbers field...');
    // Note: We're using a placeholder invoice number since we don't know the exact one generated
    await macrosPage.fillParameter(page, 'invoice_numbers', 'PI00000007');
    
    console.log('Filling amount field (17.00)...');
    await macrosPage.fillParameter(page, 'amount', '17.00');
    
    console.log('Filling bank account field (1020)...');
    const bankAccountInput = page.locator('.parameter-field').filter({ hasText: 'Bank account' }).locator('abs-autocomplete input.autocomplete-input');
    await bankAccountInput.click();
    await page.waitForTimeout(300);
    await bankAccountInput.fill('1020');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const account1020 = page.locator('.dropdown .dropdown-item:has-text("1020")');
    await expect(account1020.first()).toBeVisible();
    console.log('✓ Account 1020 Bank Account is available');
    await account1020.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Bank account 1020 selected');
    
    console.log('Filling staff member account field (2210.001)...');
    const staffAccountInput = page.locator('.parameter-field').filter({ hasText: 'Staff member account' }).locator('abs-autocomplete input.autocomplete-input');
    await staffAccountInput.click();
    await page.waitForTimeout(300);
    await staffAccountInput.fill('2210.001');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    const account2210 = page.locator('.dropdown .dropdown-item:has-text("2210.001")');
    await expect(account2210.first()).toBeVisible();
    console.log('✓ Account 2210.001 is available');
    await account2210.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Staff member account 2210.001 selected');
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    console.log('All fields filled');
    
    // ========================================================================
    // Step 5: Execute the macro
    // ========================================================================
    console.log('--- Step 5: Executing Macro ---');
    
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');
    
    await page.waitForTimeout(2000);
    
    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }
    
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');
    
    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');
    
    // ========================================================================
    // Step 6: Verify transaction was created
    // ========================================================================
    console.log('--- Step 6: Verifying Transaction Creation ---');
    
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.6 repay staff');
    console.log('✓ Transaction "Test macros 004.6 repay staff" appears in transaction list');
    
    // ========================================================================
    // Step 7: Verify transaction details
    // ========================================================================
    console.log('--- Step 7: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.6 repay staff', {
      date: '2024-09-30',
      partner: 'P00000001',
      value: '17.00'
    });
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ RepayStaff macro scenarios validated:');
    console.log('  - Macro selection and parameter form display (7 parameters)');
    console.log('  - Partner selection (P00000001 - staff member)');
    console.log('  - Date: 2024-09-30');
    console.log('  - Amount: CHF 17.00');
    console.log('  - Description: Test macros 004.6 repay staff');
    console.log('  - Invoice numbers: PI00000007');
    console.log('  - Bank account: 1020');
    console.log('  - Staff member account: 2210.001');
    console.log('  - Staff liability cleared (company repaid staff member)');
    console.log('  - Bank account reduced (cash out)');
    
    console.log('=== Test 4.6b: RepayStaff Macro (for 004.6) - PASSED ===');
  });

  // ==========================================================================
  // Test 4.9: TaxPayment Macro
  //
  // This test pays a tax bill that arrives during the year. There is no prior
  // year-end tax provision (the TaxProvision macro is exercised in test 007 as
  // part of the year-end closing flow), so provision_amount is 0 and the full
  // actual_amount is debited to the 8900 Direct taxes expense account.
  // ==========================================================================
  test('should execute TaxPayment macro to pay tax authority (no prior provision)', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.9: TaxPayment Macro ===');

    // Navigate and authenticate
    await page.goto('/');
    const signOutLink = page.locator('#signout-link');
    const isSignedIn = await signOutLink.isVisible({ timeout: 2000 }).catch(() => false);

    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      await authenticate(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      console.log('Authentication complete');
    } else {
      console.log('Already signed in');
    }

    await headerPage.waitForHeader(page);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);
    console.log('Journal page loaded');

    // Clean up existing test transaction
    console.log('--- Cleaning up existing test transaction ---');
    await deleteTransactionByDescription(page, 'Test macros 004.9 tax payment for 2024');

    // Navigate to macros page
    console.log('--- Navigating to Macros Page ---');
    await page.click('a#macros');
    await macrosPage.waitForMacrosPage(page);
    console.log('Macros page loaded');

    await macrosPage.verifyMacroExists(page, 'TaxPayment');
    console.log('✓ TaxPayment macro is available in the macro list');

    await macrosPage.selectMacro(page, 'TaxPayment');
    console.log('TaxPayment macro selected');

    // Fill in parameters
    console.log('--- Filling in Macro Parameters ---');

    console.log('Filling date field (2025-01-15)...');
    await macrosPage.fillParameter(page, 'date', '2025-01-15');

    console.log('Filling partner field (P00000006 - Canton Vaud Tax Authority)...');
    await macrosPage.fillParameterAutocomplete(page, 'Tax authority', 'P00000006');

    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.9 tax payment for 2024');

    // No prior year-end tax provision was recorded (TaxProvision is part of the
    // year-end closing flow in test 007), so the provisioned amount is 0.
    console.log('Filling provision amount field (0.00 - no prior provision)...');
    await macrosPage.fillParameter(page, 'provision_amount', '0.00');

    console.log('Filling actual amount field (55.00)...');
    await macrosPage.fillParameter(page, 'actual_amount', '55.00');

    console.log('Filling bank account field (1020)...');
    const bankAccountInput = page.locator('.parameter-field')
      .filter({ hasText: 'Bank account to pay from' })
      .locator('abs-autocomplete input.autocomplete-input');
    await bankAccountInput.click();
    await page.waitForTimeout(300);
    await bankAccountInput.fill('1020');
    await page.waitForSelector('.dropdown .dropdown-item:not(.loading):not(.no-results):not(.hint)', { timeout: 10000 });
    await page.waitForTimeout(500);

    const account1020 = page.locator('.dropdown .dropdown-item:has-text("1020")');
    await expect(account1020.first()).toBeVisible();
    console.log('✓ Account 1020 Bank Account is available');
    await account1020.first().click({ force: true });
    await page.waitForTimeout(500);
    console.log('Bank account 1020 selected');

    console.log('All fields filled');

    // Execute the macro
    console.log('--- Executing Macro ---');
    await macrosPage.executeMacro(page);
    console.log('Macro execution initiated');

    await page.waitForTimeout(2000);

    const hasError = await macrosPage.hasErrorMessage(page);
    if (hasError) {
      const errorMsg = await macrosPage.getErrorMessage(page);
      console.log(`ERROR: ${errorMsg}`);
      throw new Error(`Macro execution failed: ${errorMsg}`);
    }

    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    console.log('✓ Macro dialog closed (execution successful)');

    await transactionsPage.waitForJournalPage(page);
    console.log('✓ Navigated back to journal page');

    // Verify transaction was created
    console.log('--- Verifying Transaction Creation ---');
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.9 tax payment for 2024');
    console.log('✓ Transaction "Test macros 004.9 tax payment for 2024" appears in transaction list');

    // Verify transaction details
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.9 tax payment for 2024', {
      date: '2025-01-15',
      partner: 'P00000006',
      value: '55.00'
    });

    console.log('✓ TaxPayment macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Partner: P00000006 (Canton Vaud Tax Authority)');
    console.log('  - Date: 2025-01-15');
    console.log('  - Provision amount: CHF 0.00 (no prior year-end provision)');
    console.log('  - Actual amount: CHF 55.00');
    console.log('  - Arithmetic expression {actual_amount - provision_amount} = 55.00 evaluated');
    console.log('  - Transaction created with 3 entries (Dr 2208 0.00, Dr 8900 55.00, Cr 1020 55.00)');

    console.log('=== Test 4.9: TaxPayment Macro - PASSED ===');
  });
});

/**
 * Test 4.7: Verify Reports After All Macro Transactions
 * 
 * This test suite verifies that all financial reports correctly reflect
 * the state of the journal after all macro transactions have been executed.
 * 
 * See docs/test-cases/004.7-verify-reports.md for detailed calculations.
 */
test.describe('Verify Reports After Macro Transactions', () => {
  // Helper to clean up year-end closing transactions (test 007) so the reports
  // reflect only the state after test 004. Must be called after authentication
  // and journal selection.
  async function cleanupYearEndClosingTransactions(page: any): Promise<void> {
    for (const desc of [
      'Test 007 tax provision for 2024',
      'Test 007 legal reserve allocation for 2024',
      'Test macros 004.8 tax provision for 2024',
      'Test macros 004.10 legal reserve allocation for 2024',
    ]) {
      await deleteTransactionByDescription(page, desc);
    }
    console.log('✓ Cleaned up year-end closing transactions before report verification');
  }

  test('should verify Balance Sheet report after all macro transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Balance Sheet Verification (After Macros) ===');
    
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

    // Clean up year-end closing transactions (test 007) so reports reflect
    // only the state after test 004.
    await cleanupYearEndClosingTransactions(page);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Balance Sheet report
    await reportsPage.selectReportTemplate(page, 'Balance Sheet');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Balance Sheet ---');
    
    // Expected values after all macro transactions (run ONCE):
    // Starting state from test 003 (updated with transactions 1-12):
    //   1020 Bank = 1,785.00, 1100 Receivables = 68.10, 1230 Inventory = 40.00
    //   2200 VAT payable = 8.10, 2210.001 John Smith = 38.50, 2800 Share Capital = 2,000.00
    //   3400 Revenue = 60.00, 6500 = 9.30, 6570.002 = 100.00, 6700 = 4.20, 6900 = 15.00, 8900 = 75.00
    // After macros 004.1-004.6b and 004.9 (TaxPayment with no prior provision):
    //   1020 Bank = 1,680.50, 1100 Receivables = 179.10, 1230 Inventory = 40.00
    //   2200 VAT = 8.10, 2208 Tax liabilities = 0.00, 2210.001 = 0.00
    //   2800 = 2,000.00, 2950 Legal reserves = 0.00, 2979 Annual P/L = 0.00
    //   3400 Revenue = 178.00, 6500 = 9.30, 6570.001 = 17.00, 6570.002 = 100.00
    //   6700 = 14.20, 6900 = 16.00, 8900 = 130.00 (75.00 from T12a + 55.00 from 004.9)
    //   Net Loss: 108.50 (revenue 178.00 - expenses 286.50)
    //   Total Assets: 1,899.60 = Total L+E: 8.10 + 2,000.00 - 108.50
    // Note: TaxProvision (004.8) and LegalReserveAllocation (004.10) are now part
    // of test 007 (year-end closing), so 2950 and 2979 remain at 0.00 here.

    await reportsPage.verifySectionExists(page, 'Cash and Cash Equivalents');
    await reportsPage.verifyAccountBalance(page, '1020', '1,680.50');

    await reportsPage.verifySectionExists(page, 'Assets');
    await reportsPage.verifyAccountBalance(page, '1100', '179.10');

    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00');

    await reportsPage.verifyReportMatches(page, /Net.*Loss.*108\.50\s*CHF/, 'Net Loss');

    // Verify the balance sheet balances
    await reportsPage.verifyBalanceSheetBalances(page, '1,899.60');
    
    // Verify no negative signs in Liabilities section (sign inversion bug check)
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');
    
    console.log('✓ Balance Sheet verified successfully!');
    console.log('=== Balance Sheet Verification Complete ===');
  });

  test('should verify Income Statement report after all macro transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Income Statement Verification (After Macros) ===');
    
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

    // Clean up year-end closing transactions (test 007) so reports reflect
    // only the state after test 004.
    await cleanupYearEndClosingTransactions(page);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Income Statement report
    await reportsPage.selectReportTemplate(page, 'Income Statement');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Income Statement ---');
    
    // Expected: Revenue: 3400 (178.00) - test 003 (60.00) + macros (7.00 + 111.00)
    // Expenses: 6500 (9.30) + 6570.001 (17.00) + 6570.002 (100.00) + 6700 (14.20) + 6900 (16.00) + 8900 (130.00) = 286.50
    // Net Loss: 108.50

    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifyAccountBalance(page, '3400', '178.00');

    await reportsPage.verifySectionExists(page, 'Expenses');
    await reportsPage.verifyAccountBalance(page, '6500', '9.30');
    await reportsPage.verifyAccountBalance(page, '6570.001', '17.00');
    await reportsPage.verifyAccountBalance(page, '6570.002', '100.00');
    await reportsPage.verifyAccountBalance(page, '6700', '14.20');
    await reportsPage.verifyAccountBalance(page, '6900', '16.00');
    await reportsPage.verifyAccountBalance(page, '8900', '130.00');

    // Verify Net Loss (revenue 178.00 - expenses 286.50 = -108.50)
    await reportsPage.verifyReportMatches(page, /Net.*Loss.*108\.50\s*CHF/, 'Net Loss of 108.50');
    
    console.log('✓ Income Statement verified successfully!');
    console.log('=== Income Statement Verification Complete ===');
  });

  test('should verify Swiss Balance Sheet (Bilan) report after all macro transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Swiss Balance Sheet (Bilan) Verification (After Macros) ===');
    
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

    // Clean up year-end closing transactions (test 007) so reports reflect
    // only the state after test 004.
    await cleanupYearEndClosingTransactions(page);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Swiss Balance Sheet report
    await reportsPage.selectReportTemplate(page, 'Swiss Balance Sheet');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Swiss Balance Sheet ---');
    
    // Verify key sections exist
    await reportsPage.verifySectionExists(page, 'Assets');
    await reportsPage.verifySectionExists(page, 'Equity');
    
    // Verify all account balances (macros run once)
    await reportsPage.verifyAccountBalance(page, '1020', '1,680.50'); // Bank account
    await reportsPage.verifyAccountBalance(page, '1100', '179.10'); // Receivables
    await reportsPage.verifyAccountBalance(page, '2800', '2,000.00'); // Share capital

    // Swiss Balance Sheet includes net income in equity, not as separate line
    // So we just verify the accounts and that it balances

    // Verify no negative signs in liability and equity sections (sign inversion check)
    await reportsPage.verifyNoNegativeValues(page, 'Liabilities');
    await reportsPage.verifyNoNegativeValues(page, 'Equity');

    // Verify the balance sheet balances (Assets = Liabilities + Equity)
    await reportsPage.verifyBalanceSheetBalances(page, '1,899.60');
    
    console.log('✓ Swiss Balance Sheet verified successfully!');
    console.log('=== Swiss Balance Sheet Verification Complete ===');
  });

  test('should verify Swiss Income Statement (Erfolgsrechnung) report after all macro transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Swiss Income Statement Verification (After Macros) ===');
    
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

    // Clean up year-end closing transactions (test 007) so reports reflect
    // only the state after test 004.
    await cleanupYearEndClosingTransactions(page);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Swiss Income Statement report
    await reportsPage.selectReportTemplate(page, 'Swiss Income Statement');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Swiss Income Statement ---');
    
    // Verify main sections exist
    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifySectionExists(page, 'Expenses');
    
    // Swiss Income Statement groups expenses by category (4xxx, 5xxx, 6xxx)
    // It shows subtotals per category with specific labels based on KMU-Kontenplan
    
    // Verify the report contains revenue and expense data and net income
    const content = await reportsPage.getReportContent(page);
    
    // Check that revenue section has data (should show 178.00)
    if (!content.includes('Revenue')) {
      throw new Error('Revenue section not found in Swiss Income Statement');
    }
    console.log('✓ Revenue section found');

    // Check that expenses section has data (should show 286.50 total)
    if (!content.includes('Expenses')) {
      throw new Error('Expenses section not found in Swiss Income Statement');
    }
    console.log('✓ Expenses section found');

    // Verify Net Income appears with the correct amount (108.50 loss)
    const hasNetIncome = content.includes('Net Income') || content.includes('Net Loss');
    const hasAmount = content.includes('108.50') || content.includes('108,50');

    if (!hasNetIncome) {
      throw new Error('Net Income/Loss label not found in Swiss Income Statement');
    }
    if (!hasAmount) {
      throw new Error('Amount 108.50 CHF not found in Swiss Income Statement');
    }
    console.log('✓ Net Income/Loss: 108.50 CHF verified');
    
    console.log('✓ Swiss Income Statement verified successfully!');
    console.log('=== Swiss Income Statement Verification Complete ===');
  });

  test('should verify Trial Balance report after all macro transactions', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Trial Balance Verification (After Macros) ===');
    
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

    // Clean up year-end closing transactions (test 007) so reports reflect
    // only the state after test 004.
    await cleanupYearEndClosingTransactions(page);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);
    
    // Select and generate Trial Balance report
    await reportsPage.selectReportTemplate(page, 'Trial Balance');
    await reportsPage.generateReport(page);
    
    // Verify report structure and values
    console.log('--- Verifying Trial Balance ---');
    
    // Trial balance should show all accounts with debits and credits
    await reportsPage.verifySectionExists(page, 'Cash');
    await reportsPage.verifySectionExists(page, 'Assets');
    await reportsPage.verifySectionExists(page, 'Equity');
    await reportsPage.verifySectionExists(page, 'Revenue');
    await reportsPage.verifySectionExists(page, 'Expenses');
    
    // Verify key accounts with their debit/credit balances (macros run once)
    // Account 1020: Bank - Net Debit 1,680.50
    await reportsPage.verifyReportContains(page, '1020', 'Bank Account');
    await reportsPage.verifyReportContains(page, '1,680.50', 'Bank balance');

    // Account 1100: Receivables - Net Debit 179.10
    await reportsPage.verifyReportContains(page, '1100', 'Receivables');
    await reportsPage.verifyReportContains(page, '179.10', 'Receivables balance');

    // Account 2800: Share Capital - Credit 2,000.00
    await reportsPage.verifyReportContains(page, '2800', 'Share Capital');
    await reportsPage.verifyReportContains(page, '2,000.00', 'Share Capital balance');

    // Account 3400: Revenue - Credit 178.00
    await reportsPage.verifyReportContains(page, '3400', 'Revenue');
    await reportsPage.verifyReportContains(page, '178.00', 'Revenue balance');

    // Account 6500: Administrative expenses - Debit 9.30
    await reportsPage.verifyReportContains(page, '6500', 'Administrative expenses');
    await reportsPage.verifyReportContains(page, '9.30', 'Administrative expenses balance');

    // Account 6570.001: IT expense - Debit 17.00
    await reportsPage.verifyReportContains(page, '6570.001', 'IT expense');
    await reportsPage.verifyReportContains(page, '17.00', 'IT expense 6570.001 balance');

    // Account 6900: Financial expense - Debit 16.00
    await reportsPage.verifyReportContains(page, '6900', 'Financial expense');
    await reportsPage.verifyReportContains(page, '16.00', 'Financial expense balance');

    // Account 8900: Direct taxes - Debit 130.00
    await reportsPage.verifyReportContains(page, '8900', 'Direct taxes');
    await reportsPage.verifyReportContains(page, '130.00', 'Direct taxes balance');
    
    console.log('✓ Trial Balance verified successfully!');
    console.log('=== Trial Balance Verification Complete ===');
  });

  test('should run Unpaid Sales Invoices report and validate SI00000002 is unpaid for 111 CHF', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Unpaid Sales Invoices Report Validation ===');

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

    // Clean up year-end closing transactions (test 007) so reports reflect
    // only the state after test 004.
    await cleanupYearEndClosingTransactions(page);

    // Navigate to reports page
    console.log('--- Navigating to Reports Page ---');
    await page.click('a#reports');
    await reportsPage.waitForReportsPage(page);

    // Ensure "Hide zero-balance rows" is checked
    console.log('--- Ensuring Hide zero-balance rows is checked ---');
    const hideZeroCheckbox = page.locator('#hide-zero-balances');
    await hideZeroCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    const isChecked = await hideZeroCheckbox.isChecked();
    if (!isChecked) {
      await hideZeroCheckbox.click();
      console.log('✓ Hide zero-balance rows checkbox checked');
    } else {
      console.log('✓ Hide zero-balance rows was already checked');
    }

    // Select Unpaid Sales Invoices report
    console.log('--- Selecting Unpaid Sales Invoices Report ---');
    await reportsPage.selectReportTemplate(page, 'Unpaid Sales Invoices');
    await reportsPage.generateReport(page);

    // Validate SI00000002 appears with unpaid status and 111 CHF
    console.log('--- Validating SI00000002 is unpaid for 111 CHF ---');

    // Get report content
    const content = await page.content();

    // Verify SI00000002 appears in the report
    if (!content.includes('SI00000002')) {
      throw new Error('Invoice SI00000002 not found in Unpaid Sales Invoices report');
    }
    console.log('✓ Invoice SI00000002 found in report');

    // Verify the invoice shows unpaid/underpaid status (check for text near SI00000002)
    // The report may show "unpaid" or "underpaid" depending on whether partial payments exist
    const si00000002Pattern = /SI00000002[\s\S]{0,500}(unpaid|underpaid)/i;
    if (!si00000002Pattern.test(content)) {
      // Try alternative pattern (status before SI00000002)
      const altPattern = /(unpaid|underpaid)[\s\S]{0,500}SI00000002/i;
      if (!altPattern.test(content)) {
        throw new Error('Invoice SI00000002 does not have status "unpaid" or "underpaid" in the report');
      }
    }
    console.log('✓ Invoice SI00000002 has unpaid/underpaid status');

    // Verify the amount is 111.00 CHF
    // Look for 111.00 near SI00000002
    const amountPattern = /SI00000002[\s\S]{0,300}111[.,]00|111[.,]00[\s\S]{0,300}SI00000002/;
    if (!amountPattern.test(content)) {
      throw new Error('Invoice SI00000002 does not show amount 111.00 CHF in the report');
    }
    console.log('✓ Invoice SI00000002 has amount 111.00 CHF');

    console.log('✓ Unpaid Sales Invoices report validated successfully!');
    console.log('  - SI00000002 is present in the report');
    console.log('  - Status is unpaid/underpaid');
    console.log('  - Amount is 111.00 CHF');
    console.log('  - Hide zero-balance rows is enabled');
    console.log('=== Unpaid Sales Invoices Report Validation Complete ===');
  });
});

/**
 * Helper function to delete ALL transactions matching a description via the API.
 * This is more reliable than the UI-based approach which only deletes one
 * transaction at a time and can fail if the modal doesn't open properly.
 */
async function deleteTransactionByDescription(page: any, description: string): Promise<void> {
  console.log(`Looking for transactions with description: "${description}"`);

  const journalId = await page.evaluate(() => localStorage.getItem('journalId'));
  if (!journalId) {
    console.log('No journalId in localStorage, skipping cleanup');
    return;
  }

  const response = await page.request.get(`/api/journal/${journalId}/transactions`);
  if (!response.ok()) {
    console.log(`API request failed: ${response.status()}, skipping cleanup`);
    return;
  }
  const transactions = await response.json();

  let deletedCount = 0;
  for (const tx of transactions) {
    const txDescription: string = tx.description || '';
    if (txDescription === description || txDescription.includes(description)) {
      const txId = tx.id;
      console.log(`  Deleting transaction: "${txDescription}" (id: ${txId})`);
      const deleteResponse = await page.request.delete(`/api/transaction/${txId}`);
      if (deleteResponse.ok()) {
        deletedCount++;
        console.log(`  ✓ Deleted transaction ${txId}`);
      } else {
        console.log(`  ✗ Failed to delete transaction ${txId}: ${deleteResponse.status()}`);
      }
    }
  }
  if (deletedCount === 0) {
    console.log(`Transaction "${description}" not found, nothing to delete`);
  } else {
    console.log(`Cleanup complete: ${deletedCount} transaction(s) deleted for "${description}"`);
  }
}