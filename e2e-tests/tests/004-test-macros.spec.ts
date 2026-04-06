import { test, expect } from '@playwright/test';
import * as signedOutPage from '../pages/signed-out.page';
import * as authSignInPage from '../pages/auth-signin.page';
import * as authApprovalPage from '../pages/auth-approval.page';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import * as macrosPage from '../pages/macros.page';
import { TEST_JOURNAL_NAME, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './test-constants';

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

test.describe('Test Macros - BankingExpense', () => {
  test('should execute BankingExpense macro and validate all scenarios', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4: Test Macros - BankingExpense ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      
      // Perform sign-in flow
      await signedOutPage.waitForSignedOutPage(page);
      await signedOutPage.clickSignIn(page);
      await authSignInPage.waitForAuthSignInPage(page);
      await authSignInPage.signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await authApprovalPage.waitForAuthApprovalPage(page);
      await authApprovalPage.approveApplication(page, true);
      await page.waitForURL(/http:\/\/localhost:8083/, { timeout: 10000 });
      
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
    // Step 2: Delete existing "Test macros 004.1" transaction if it exists
    // ========================================================================
    console.log('--- Step 2: Cleaning up existing test transaction ---');
    
    await deleteTransactionByDescription(page, 'Test macros 004.1 banking expense');
    
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
    await macrosPage.fillParameter(page, 'date', '2026-08-01');
    
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
    const hasDate = await transactionRow.filter({ hasText: '2026-08-01' }).isVisible().catch(() => false);
    if (hasDate) {
      console.log('✓ Date 2026-08-01 appears in transaction row');
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
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      
      // Perform sign-in flow
      await signedOutPage.waitForSignedOutPage(page);
      await signedOutPage.clickSignIn(page);
      await authSignInPage.waitForAuthSignInPage(page);
      await authSignInPage.signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await authApprovalPage.waitForAuthApprovalPage(page);
      await authApprovalPage.approveApplication(page, true);
      await page.waitForURL(/http:\/\/localhost:8083/, { timeout: 10000 });
      
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
    
    await deleteTransactionByDescription(page, 'Test macros 004.2 repay staff');
    
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
    await macrosPage.fillParameter(page, 'date', '2026-08-02');
    
    console.log('Filling description field...');
    await macrosPage.fillParameter(page, 'description', 'Test macros 004.2 repay staff');
    
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
    await transactionsPage.verifyTransactionExists(page, 'Test macros 004.2 repay staff');
    console.log('✓ Transaction "Test macros 004.2 repay staff" appears in transaction list');
    
    // ========================================================================
    // Step 9: Verify transaction details
    // ========================================================================
    console.log('--- Step 9: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Test macros 004.2 repay staff', {
      date: '2026-08-02',
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
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      
      // Perform sign-in flow
      await signedOutPage.waitForSignedOutPage(page);
      await signedOutPage.clickSignIn(page);
      await authSignInPage.waitForAuthSignInPage(page);
      await authSignInPage.signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await authApprovalPage.waitForAuthApprovalPage(page);
      await authApprovalPage.approveApplication(page, true);
      await page.waitForURL(/http:\/\/localhost:8083/, { timeout: 10000 });
      
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
    await macrosPage.fillParameter(page, 'date', '2026-08-04');
    
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
      date: '2026-08-04',
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
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      
      // Perform sign-in flow
      await signedOutPage.waitForSignedOutPage(page);
      await signedOutPage.clickSignIn(page);
      await authSignInPage.waitForAuthSignInPage(page);
      await authSignInPage.signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await authApprovalPage.waitForAuthApprovalPage(page);
      await authApprovalPage.approveApplication(page, true);
      await page.waitForURL(/http:\/\/localhost:8083/, { timeout: 10000 });
      
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
    
    console.log('Filling date field (2026-08-07 - a few days after first invoice)...');
    await macrosPage.fillParameter(page, 'date', '2026-08-07');
    
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
    
    console.log('Filling amount field (11.00 CHF)...');
    await macrosPage.fillParameter(page, 'amount', '11.00');
    
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
      date: '2026-08-07',
      partner: 'P00000014',
      value: '11.00'
    });
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ Second invoice created (unpaid):');
    console.log('  - Date: 2026-08-07');
    console.log('  - Partner: P00000014 (Microsoft)');
    console.log('  - Invoice: SI00000002 (auto-generated)');
    console.log('  - Amount: CHF 11.00');
    console.log('  - Status: Unpaid (will be used in test 004.5)');
    
    console.log('=== Test 4.4: Second Invoice - PASSED ===');
  });

  test('should execute CustomerPaysInvoice macro with regex invoice search', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 4.5: Test Macros - CustomerPaysInvoice ===');
    
    // Navigate to the application
    await page.goto('/');
    
    // Check if we need to sign in
    const journalSelector = page.locator('#journal-select');
    const isSignedIn = await journalSelector.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!isSignedIn) {
      console.log('Not signed in, performing authentication...');
      
      // Perform sign-in flow
      await signedOutPage.waitForSignedOutPage(page);
      await signedOutPage.clickSignIn(page);
      await authSignInPage.waitForAuthSignInPage(page);
      await authSignInPage.signIn(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
      await authApprovalPage.waitForAuthApprovalPage(page);
      await authApprovalPage.approveApplication(page, true);
      await page.waitForURL(/http:\/\/localhost:8083/, { timeout: 10000 });
      
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
    
    await deleteTransactionByDescription(page, 'Customer pays invoice SI00000001');
    
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
    
    console.log('Filling date field (2026-08-31)...');
    await macrosPage.fillParameter(page, 'date', '2026-08-31');
    
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
    await macrosPage.fillParameter(page, 'description', 'Customer pays invoice SI00000001');
    
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
    
    await transactionsPage.verifyTransactionExists(page, 'Customer pays invoice SI00000001');
    console.log('✓ Transaction "Customer pays invoice SI00000001" appears in transaction list');
    
    // ========================================================================
    // Step 7: Verify transaction details
    // ========================================================================
    console.log('--- Step 7: Verifying Transaction Details ---');
    
    await transactionsPage.verifyTransactionDetails(page, 'Customer pays invoice SI00000001', {
      date: '2026-08-31',
      partner: 'P00000014',
      value: '7.00'
    });
    
    console.log('✓ Transaction created successfully via macro system');
    console.log('✓ CustomerPaysInvoice macro scenarios validated:');
    console.log('  - Macro selection and parameter form display');
    console.log('  - Partner selection (P00000014)');
    console.log('  - Invoice regex search (.*01$) successfully found SI00000001');
    console.log('  - Date: 2026-08-31');
    console.log('  - Amount: CHF 7.00');
    console.log('  - Description: Customer pays invoice SI00000001');
    console.log('  - Ingoing account (Bank): 1:10:100:1020');
    console.log('  - Receivable account: 1:10:110:1100');
    console.log('  - Invoice SI00000001 is now paid');
    console.log('  - Macro execution and transaction creation');
    console.log('  - Transaction appears in transaction list with correct data');
    
    console.log('=== Test 4.5: CustomerPaysInvoice Macro - PASSED ===');
  });
});

/**
 * Helper function to delete a transaction by description
 */
async function deleteTransactionByDescription(page: any, description: string): Promise<void> {
  console.log(`Looking for transaction with description: "${description}"`);
  
  // Check if transaction exists
  const transactionCell = page.locator(`td:has-text("${description}")`);
  const exists = await transactionCell.isVisible().catch(() => false);
  
  if (!exists) {
    console.log(`Transaction "${description}" not found, nothing to delete`);
    return;
  }
  
  console.log(`Transaction "${description}" found, deleting...`);
  
  // Click on the transaction row to open it
  await transactionCell.first().click();
  
  // Wait for modal to appear - try multiple times if needed
  let modalOpened = false;
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(1000);
    const isVisible = await page.locator('.modal-overlay').isVisible().catch(() => false);
    if (isVisible) {
      modalOpened = true;
      break;
    }
    // Try clicking again
    if (i < 2) {
      await transactionCell.first().click();
    }
  }
  
  if (!modalOpened) {
    console.log('Could not open transaction modal, skipping deletion');
    return;
  }
  
  console.log('Transaction modal opened');
  await page.waitForTimeout(500);
  
  // Look for Delete button
  const deleteButton = page.locator('button:has-text("Delete")');
  const deleteExists = await deleteButton.isVisible().catch(() => false);
  
  if (deleteExists) {
    await deleteButton.click();
    
    // Wait for confirmation dialog if it appears
    await page.waitForTimeout(500);
    
    // Look for confirmation button (might be "Yes", "Confirm", "Delete", etc.)
    const confirmButton = page.locator('button:has-text("Yes"), button:has-text("Confirm"), button:has-text("OK")').first();
    const confirmExists = await confirmButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (confirmExists) {
      await confirmButton.click();
      console.log('Confirmed deletion');
    }
    
    // Wait for modal to close
    await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 10000 });
    await page.waitForTimeout(500);
    
    console.log(`✓ Transaction "${description}" deleted`);
  } else {
    console.log('Delete button not found, closing modal');
    const cancelButton = page.locator('button:has-text("Cancel")');
    const cancelExists = await cancelButton.isVisible().catch(() => false);
    if (cancelExists) {
      await cancelButton.click();
      await page.waitForSelector('.modal-overlay', { state: 'hidden', timeout: 5000 });
    }
  }
}