import { test, expect, Page } from '@playwright/test';
import * as headerPage from '../pages/header.page';
import * as transactionsPage from '../pages/transactions.page';
import { authenticate } from './auth-helper';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_JOURNAL_NAME } from './test-constants';

/**
 * Test 10: Attachments on a Locked Journal
 *
 * This test implements the test case from:
 * docs/test-cases/010-attachments.md
 *
 * PREREQUISITE: Test 003.10 must have run successfully, leaving a PDF attachment
 * ("test-receipt.pdf") on the first transaction of the "Abstratium 2024" journal.
 * Test 007 must have locked the journal.
 *
 * This test verifies that on a LOCKED journal:
 * 1. Existing attachments can still be VIEWED (download link works, API returns
 *    the attachment metadata and content).
 * 2. The "Add Attachment" option is DISABLED (the label has the `disabled` class
 *    and the file input is disabled).
 * 3. The attachment DELETE button (×) is DISABLED.
 * 4. Attempting to upload or delete via the API returns 423 (Locked).
 */

const KEEP_FILE_NAME = 'test-receipt.pdf';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Gets the journal ID from localStorage.
 */
async function getJournalId(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('journalId'));
}

// ============================================================================
// Tests
// ============================================================================

test.describe('Attachments on a Locked Journal', () => {

  // ==========================================================================
  // Test 10.1: Verify attachments can be viewed but not added or deleted
  // on a locked journal
  //
  // This test:
  // 1. Selects the locked "Abstratium 2024" journal
  // 2. Verifies the journal is locked via API
  // 3. Navigates to the journal page
  // 4. Opens the context menu (⋮) for the first transaction
  // 5. Verifies the existing attachment ("test-receipt.pdf") is visible
  // 6. Verifies the attachment can be downloaded via the API
  // 7. Verifies the "Add Attachment" label is disabled
  // 8. Verifies the attachment delete (×) button is disabled
  // 9. Verifies that uploading via the API returns 423 (Locked)
  // 10. Verifies that deleting via the API returns 423 (Locked)
  // ==========================================================================
  test('should view but not add or delete attachments on a locked journal', async ({ page }) => {
    test.setTimeout(120_000);
    console.log('=== Starting Test 10.1: Attachments on a Locked Journal ===');

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

    // Select the locked "Abstratium 2024" journal
    console.log(`--- Selecting journal: ${TEST_JOURNAL_NAME} ---`);
    await headerPage.selectJournal(page, TEST_JOURNAL_NAME);

    // Verify the journal is locked
    const journalId = await getJournalId(page);
    expect(journalId).toBeTruthy();
    const metaResponse = await page.request.get(`/api/journal/${journalId}/metadata`);
    expect(metaResponse.ok()).toBe(true);
    const metadata = await metaResponse.json();
    expect(metadata.locked).toBe(true);
    console.log('✓ Journal is locked (attachments cannot be added or deleted)');

    // Get transactions via the API and find the one with the KEEP attachment.
    // Test 003.10 uploaded the attachment to transactions[0] at the time, but
    // subsequent tests (e.g. close-books in test 007) may have added new
    // transactions that changed the ordering. Search all transactions for the
    // one that has the "test-receipt.pdf" attachment.
    console.log('--- Finding the transaction with the KEEP attachment ---');
    const txResponse = await page.request.get(`/api/journal/${journalId}/transactions`);
    expect(txResponse.ok()).toBe(true);
    const transactions = await txResponse.json();
    expect(transactions.length).toBeGreaterThan(0);

    let targetTransaction: { id: string; description: string } | null = null;
    for (const tx of transactions) {
      const attResp = await page.request.get(`/api/attachment/transaction/${tx.id}`);
      if (attResp.ok()) {
        const atts = await attResp.json();
        if (atts.some((a: { fileName: string }) => a.fileName === KEEP_FILE_NAME)) {
          targetTransaction = tx;
          break;
        }
      }
    }
    expect(targetTransaction).not.toBeNull();
    console.log(`Using transaction: "${targetTransaction!.description}" (id: ${targetTransaction!.id})`);

    // Verify the attachment from test 003.10 still exists via the API
    console.log('--- Verifying existing attachment via API ---');
    const attachmentsResponse = await page.request.get(`/api/attachment/transaction/${targetTransaction.id}`);
    expect(attachmentsResponse.ok()).toBe(true);
    const attachments = await attachmentsResponse.json();
    expect(attachments.length).toBe(1);
    expect(attachments[0].fileName).toBe(KEEP_FILE_NAME);
    expect(attachments[0].contentType).toBe('application/pdf');
    const attachmentId = attachments[0].id;
    console.log(`✓ API confirms attachment exists: fileName="${attachments[0].fileName}", id=${attachmentId}`);

    // Verify the attachment can be downloaded (viewing is allowed on locked journals)
    console.log('--- Verifying attachment can be downloaded ---');
    const downloadResponse = await page.request.get(`/api/attachment/${attachmentId}`);
    expect(downloadResponse.ok()).toBe(true);
    expect(downloadResponse.headers()['content-type']).toContain('application/pdf');
    const downloadBody = await downloadResponse.body();
    expect(downloadBody.length).toBeGreaterThan(0);
    // Verify it starts with %PDF- magic bytes
    expect(downloadBody[0]).toBe(0x25); // %
    expect(downloadBody[1]).toBe(0x50); // P
    expect(downloadBody[2]).toBe(0x44); // D
    expect(downloadBody[3]).toBe(0x46); // F
    expect(downloadBody[4]).toBe(0x2d); // -
    console.log('✓ Attachment downloaded successfully (viewing allowed on locked journal)');

    // Navigate to the journal page
    console.log('--- Navigating to Journal page ---');
    await headerPage.clickJournalLink(page);
    await transactionsPage.waitForJournalPage(page);

    // Open the context menu for the transaction that has the attachment.
    // The transaction row has id="tx-{transactionId}".
    console.log(`--- Opening context menu for transaction "${targetTransaction!.description}" ---`);
    const transactionRow = page.locator(`#tx-${targetTransaction!.id}`);
    await expect(transactionRow).toBeVisible({ timeout: 10000 });
    const contextMenuTrigger = transactionRow.locator('button.context-menu-trigger');
    await expect(contextMenuTrigger).toBeVisible({ timeout: 10000 });
    await contextMenuTrigger.click();
    console.log('Context menu trigger clicked');

    // Verify the context menu is visible
    const contextMenu = page.locator('.context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 5000 });

    // Verify the existing attachment is visible in the context menu
    console.log('--- Verifying attachment is visible in context menu ---');
    const attachmentLink = contextMenu.locator('.context-menu-attachment-name', { hasText: KEEP_FILE_NAME });
    await expect(attachmentLink).toBeVisible({ timeout: 10000 });

    // Verify the download link points to the correct API endpoint
    const href = await attachmentLink.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('/api/attachment/');
    console.log(`✓ Attachment "${KEEP_FILE_NAME}" is visible with download link: ${href}`);

    // Verify the "Add Attachment" label is disabled
    console.log('--- Verifying "Add Attachment" is disabled ---');
    const addAttachmentLabel = contextMenu.locator('label:has-text("Add Attachment")');
    await expect(addAttachmentLabel).toBeVisible();
    await expect(addAttachmentLabel).toHaveClass(/disabled/);
    console.log('✓ "Add Attachment" label has the disabled class');

    // Verify the file input is disabled
    const fileInput = contextMenu.locator('input[type="file"]');
    await expect(fileInput).toBeDisabled();
    console.log('✓ File input is disabled');

    // Verify the attachment delete (×) button is disabled
    console.log('--- Verifying attachment delete button is disabled ---');
    const deleteBtn = contextMenu.locator('.context-menu-attachment-row .btn-icon-danger').first();
    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn).toBeDisabled();
    console.log('✓ Attachment delete (×) button is disabled');

    // Close the context menu
    console.log('--- Closing context menu ---');
    await page.locator('body').click({ position: { x: 0, y: 0 } });
    await expect(contextMenu).toBeHidden({ timeout: 5000 });
    console.log('✓ Context menu closed');

    // Verify that uploading via the API returns 423 (Locked)
    console.log('--- Verifying API rejects upload on locked journal ---');
    const uploadResponse = await page.request.post(`/api/attachment/transaction/${targetTransaction.id}`, {
      multipart: {
        file: {
          name: 'should-not-upload.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n%test'),
        },
      },
    });
    expect(uploadResponse.status()).toBe(423);
    console.log(`✓ API rejects upload with status ${uploadResponse.status()} (Locked)`);

    // Verify that deleting via the API returns 423 (Locked)
    console.log('--- Verifying API rejects delete on locked journal ---');
    const deleteResponse = await page.request.delete(`/api/attachment/${attachmentId}`);
    expect(deleteResponse.status()).toBe(423);
    console.log(`✓ API rejects delete with status ${deleteResponse.status()} (Locked)`);

    // Final verification: the attachment still exists (was not deleted)
    console.log('--- Final verification: attachment still exists ---');
    const finalAttachments = await (await page.request.get(`/api/attachment/transaction/${targetTransaction.id}`)).json();
    expect(finalAttachments.length).toBe(1);
    expect(finalAttachments[0].fileName).toBe(KEEP_FILE_NAME);
    console.log(`✓ Attachment "${KEEP_FILE_NAME}" still exists after attempted delete`);

    console.log('✓ Attachments on locked journal verified: viewable but not addable or deletable!');
    console.log('=== Test 10.1: Attachments on a Locked Journal - PASSED ===');
  });
});
