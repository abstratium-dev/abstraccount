import { AccountEntryDTO, TransactionDTO } from '../controller';

/**
 * Report template definition from the backend
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
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
  calculated?: 'netIncome' | 'totalAssets' | 'tagGrouped' | string; // Special calculated values
  groupByPartner?: boolean; // Group entries by partner instead of account
  sortable?: boolean; // Whether columns can be sorted by clicking headers
  defaultSortColumn?: string; // Default column to sort by (e.g., 'net', 'income', 'partnerName')
  defaultSortDirection?: 'asc' | 'desc'; // Default sort direction
  tagKey?: string; // For tagGrouped: filter transactions by this tag key
  tagValuePrefix?: string; // For tagGrouped: filter by tag value prefix
  balanceAccountIds?: string[]; // For tagGrouped: calculate net only from these account IDs
  balanceAccountRegex?: string; // For tagGrouped: regex to match account IDs for balance calculation
  balanceAccountNameRegex?: string; // For tagGrouped: regex to match account names/paths (e.g., "1100" to match "1:10:110:1100")
  useJournalChain?: boolean; // If true, load data from all journals in the chain; otherwise only current journal (default: false)
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
  tagGroups?: TagGroup[]; // For tagGrouped reports
  subtotal: number;
  commodity: string;
  showDebitsCredits: boolean;
  showAccounts: boolean;
  groupByPartner: boolean;
  invertSign: boolean; // Whether to invert signs for display only
  sortable: boolean; // Whether columns can be sorted
  sortColumn: string | null; // Current sort column
  sortDirection: 'asc' | 'desc'; // Current sort direction
}

/**
 * Tag group for tag-based reports (e.g., unpaid invoices)
 */
export interface TagGroup {
  tagValue: string; // The full tag value (e.g., "SI20251010491")
  transactions: TransactionDTO[]; // All transactions with this tag value
  netAmount: number; // Net amount across all entries
  partnerId: string | null;
  partnerName: string | null;
  firstDate: string; // Earliest transaction date
  commodity: string;
}
