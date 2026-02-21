import { AccountEntryDTO } from '../controller';

/**
 * Report template definition from the backend
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  templateContent: string;
}

/**
 * Parsed template configuration
 */
export interface ReportConfig {
  sections: ReportSection[];
}

export interface ReportSection {
  title: string;
  level?: number; // 1 = h1, 2 = h2, 3 = h3, etc. Default is 3 (h3)
  accountTypes?: string[];
  accountRegex?: string; // Regex pattern to match account IDs (e.g. "1:10:100:1020")
  showSubtotals?: boolean;
  showDebitsCredits?: boolean;
  showAccounts?: boolean; // Whether to show individual accounts (default true)
  invertSign?: boolean;
  includeNetIncome?: boolean;
  calculated?: string; // Special calculated values like 'netIncome', 'totalAssets'
  groupByPartner?: boolean; // Group entries by partner instead of account
}

/**
 * Reporting context provides calculated financial metrics and filtered data
 */
export interface ReportingContext {
  entries: AccountEntryDTO[];
  startDate: string | null;
  endDate: string | null;
  
  // Calculated metrics
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  
  // Helper methods for filtering and aggregating
  getEntriesByAccountType(accountType: string): AccountEntryDTO[];
  getEntriesByAccountTypes(accountTypes: string[]): AccountEntryDTO[];
  getEntriesByAccountRegex(pattern: string): AccountEntryDTO[];
  getBalanceByAccountType(accountType: string): number;
  getBalanceByAccountTypes(accountTypes: string[]): number;
  getBalanceByAccount(accountId: string): number;
}

/**
 * Account summary for report display
 */
export interface AccountSummary {
  accountId: string;
  accountName: string;
  accountType: string;
  balance: number;
  debit: number;
  credit: number;
}

/**
 * Partner summary for partner-based reports
 */
export interface PartnerSummary {
  partnerId: string;
  partnerName: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

/**
 * Report section result after processing
 */
export interface ReportSectionResult {
  title: string;
  level: number;
  accounts: AccountSummary[];
  partners?: PartnerSummary[]; // For partner-based reports
  subtotal: number;
  commodity: string;
  showDebitsCredits: boolean;
  showAccounts: boolean;
  groupByPartner: boolean;
}
