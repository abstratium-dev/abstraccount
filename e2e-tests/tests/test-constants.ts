/**
 * Shared constants for e2e tests
 */

export const TEST_JOURNAL_NAME = 'Abstratium 2024';
export const TEST_JOURNAL_CURRENCY = 'CHF';
export const TEST_JOURNAL_SUBTITLE = 'Test journal for Swiss accounting';

export const TEST_USER_EMAIL = 'test@abstratium.dev';
export const TEST_USER_PASSWORD = 'secretLong';

/**
 * Second test user belonging to a different organisation (tenant).
 * Used by multitenancy tests (011) to verify journal isolation.
 */
export const SECOND_TEST_USER_EMAIL = 'test@maxant.ch';
export const SECOND_TEST_USER_PASSWORD = 'secretLong';

/**
 * Partners needed by the e2e tests, mapped by partner number → name.
 * These are created via the Add Partner form if they don't already exist.
 */
export const TEST_PARTNERS: { partnerNumber: string; partnerName: string }[] = [
  { partnerNumber: 'P00000001', partnerName: 'John Smith' },
  { partnerNumber: 'P00000002', partnerName: 'Startup Help GmbH' },
  { partnerNumber: 'P00000003', partnerName: 'Post CH Netz AG' },
  { partnerNumber: 'P00000004', partnerName: 'PostFinance AG' },
  { partnerNumber: 'P00000005', partnerName: 'Microsoft' },
  { partnerNumber: 'P00000006', partnerName: 'Canton Vaud Tax Authority' },
  { partnerNumber: 'P00000007', partnerName: 'Anthropic' },
  { partnerNumber: 'P00000014', partnerName: 'Acme Corp' },
];
